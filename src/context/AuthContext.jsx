import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const applySession = async (session) => {
            if (!isMounted) return;
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setClient(null);
                setLoading(false);
            }
        };

        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('Error getting session:', error);
                    if (isMounted) {
                        setUser(null);
                        setProfile(null);
                        setClient(null);
                        setLoading(false);
                    }
                    return;
                }
                await applySession(session);
            } catch (error) {
                console.error('Error initializing auth session:', error);
                if (isMounted) {
                    setUser(null);
                    setProfile(null);
                    setClient(null);
                    setLoading(false);
                }
            }
        };

        void initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                void applySession(session);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.warn('Error fetching profile:', profileError);
                setProfile(null);
            } else {
                setProfile(profileData ?? null);

                // Fetch client record if role is client
                if (profileData?.role === 'client') {
                    const { data: clientData, error: clientError } = await supabase
                        .from('clients')
                        .select('*')
                        .eq('user_id', userId)
                        .maybeSingle(); // Use maybeSingle to avoid error if not found

                    if (clientError) {
                        console.warn('Error fetching client data:', clientError);
                    }
                    setClient(clientData ?? null);
                } else {
                    setClient(null);
                }
            }
        } catch (error) {
            console.error('Error fetching profile/client:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshClient = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!error) {
            setClient(data);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setClient(null);
    };

    const value = {
        user,
        profile,
        client,
        loading,
        signOut,
        refreshClient,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
