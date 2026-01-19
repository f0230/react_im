import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (userId) => {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`🔍 AuthProvider: Fetching profile for ${userId} (Attempt ${attempts}/${maxAttempts})`);

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profileError) {
                    // Only retry if it's a "no rows" error (implies trigger hasn't finished)
                    // PGRST116 is 'The result contains 0 rows'
                    if (attempts < maxAttempts && (profileError.code === 'PGRST116' || !profileData)) {
                        console.warn('⚠️ AuthProvider: Profile not ready, retrying in 1s...');
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }

                    console.warn('⚠️ AuthProvider: Profile record not found or error', profileError.message);
                    setProfile(null);
                    setClient(null);
                    return; // Stop if error is permanent or retries exhausted
                }

                console.log('👤 AuthProvider: Profile loaded', profileData.role);
                setProfile(profileData ?? null);

                // Fetch client record if role is client
                if (profileData?.role === 'client') {
                    console.log('🔍 AuthProvider: Fetching client record...');
                    const { data: clientData, error: clientError } = await supabase
                        .from('clients')
                        .select('*')
                        .eq('user_id', userId)
                        .maybeSingle();

                    if (clientError) {
                        console.warn('⚠️ AuthProvider: Error fetching client data:', clientError);
                    }
                    console.log('💼 AuthProvider: Client data result:', !!clientData);
                    setClient(clientData ?? null);
                } else {
                    setClient(null);
                }

                return; // Success, exit loop

            } catch (error) {
                console.error('❌ AuthProvider: Critical error in fetchProfile:', error);
                if (attempts === maxAttempts) {
                    setProfile(null);
                    setClient(null);
                }
            }
        }
    }, []);

    const applySession = useCallback(async (session) => {
        const timeout = setTimeout(() => {
            console.warn('⏱️ AuthProvider: Session apply taking too long, forcing load finish');
            setLoading(false);
        }, 5000); // 5s budget for profile fetch

        try {
            console.log('🔐 AuthProvider: Applying session', session?.user?.email || 'No User');
            if (!session?.user) {
                console.log('ℹ️ AuthProvider: No user session found');
                setUser(null);
                setProfile(null);
                setClient(null);
                setLoading(false); // <--- Add this!
                return;
            }

            setUser(session.user);
            await fetchProfile(session.user.id);
        } catch (error) {
            console.error('❌ AuthProvider: Error in applySession:', error);
        } finally {
            clearTimeout(timeout);
            setLoading(false);
            console.log('✅ AuthProvider: Auth flow finished');
        }
    }, [fetchProfile]);

    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            try {
                console.log('🚀 AuthProvider: App Start - Initializing session...');
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('⚠️ AuthProvider: getSession error', error.message);
                    if (isMounted) setLoading(false);
                    return;
                }
                if (isMounted) {
                    await applySession(session);
                }
            } catch (error) {
                console.error('❌ AuthProvider: Error in initSession:', error);
                if (isMounted) setLoading(false);
            }
        };

        void initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log('🔄 AuthProvider: onAuthStateChange event:', _event);
                if (isMounted) {
                    if (_event === 'SIGNED_OUT') {
                        setUser(null);
                        setProfile(null);
                        setClient(null);
                        setLoading(false);
                    } else if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION' || _event === 'TOKEN_REFRESHED') {
                        await applySession(session);
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [applySession]);

    const refreshClient = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!error) {
            setClient(data);
        }
    }, [user]);

    const signOut = useCallback(async () => {
        try {
            console.log('🔄 AuthProvider: Initiating sign out...');
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.warn('⚠️ AuthProvider: Supabase signOut error', error.message);
            }
        } catch (error) {
            console.error('❌ AuthProvider: Critical error during signOut:', error);
        } finally {
            setUser(null);
            setProfile(null);
            setClient(null);
            setLoading(false);
            console.log('👋 AuthProvider: User signed out and state cleared');
        }
    }, []);

    const value = useMemo(() => ({
        user,
        profile,
        client,
        loading,
        signOut,
        refreshClient,
    }), [user, profile, client, loading, signOut, refreshClient]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
