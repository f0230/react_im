import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);

    // Compatibility states for PortalLayout
    const [profileStatus, setProfileStatus] = useState('idle'); // idle | loading | ready | missing | error
    const [profileError, setProfileError] = useState(null);

    const [onboardingStatus, setOnboardingStatus] = useState('loading'); // loading | new | completed

    // Fetch profile and client data
    const fetchProfileData = useCallback(async (currentUser) => {
        if (!currentUser) {
            setProfile(null);
            setClient(null);
            setProfileStatus('idle');
            setProfileError(null);
            setOnboardingStatus('completed');
            return;
        }

        try {
            setProfileLoading(true);
            setProfileStatus('loading');
            setProfileError(null);
            setOnboardingStatus('loading');

            // 1. Fetch Profile
            let profileData = null;
            let attempts = 0;
            const maxAttempts = 3;
            let lastError = null;

            while (attempts < maxAttempts && !profileData) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();

                if (!error && data) {
                    profileData = data;
                } else {
                    lastError = error;
                    if (error.code === 'PGRST116') {
                        // User might be being created
                    }
                    attempts++;
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            if (profileData) {
                setProfile(profileData);
                setProfileStatus('ready');

                // 2. Fetch Client (if applicable)
                if (profileData.role === 'client') {
                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('*')
                        .eq('user_id', currentUser.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    setClient(clientData);

                    // 3. Check Onboarding Status (Projects/Appointments)
                    const { count: projectCount } = await supabase
                        .from('projects')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', currentUser.id);

                    const { count: appointmentCount } = await supabase
                        .from('appointments')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', currentUser.id);

                    if ((projectCount || 0) === 0 && (appointmentCount || 0) === 0) {
                        setOnboardingStatus('new');
                    } else {
                        setOnboardingStatus('completed');
                    }
                } else {
                    setClient(null);
                    setOnboardingStatus('completed'); // Admins/Workers don't do onboarding
                }

            } else {
                setProfile(null);
                setClient(null);
                setOnboardingStatus('completed');

                if (lastError && lastError.code === 'PGRST116') {
                    setProfileStatus('missing');
                } else {
                    setProfileStatus('error');
                    setProfileError(lastError || new Error('Profile fetch failed'));
                }
            }

        } catch (error) {
            console.error('Error fetching user data:', error);
            setProfileStatus('error');
            setProfileError(error);
            setOnboardingStatus('completed');
        } finally {
            setProfileLoading(false);
        }
    }, []);

    // Initial Session Check & Subscription
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfileData(session.user);
                    } else {
                        setUser(null);
                        setProfile(null);
                        setClient(null);
                        setOnboardingStatus('completed');
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setOnboardingStatus('completed');
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (session?.user) {
                setUser((prev) => {
                    if (prev?.id !== session.user.id) {
                        fetchProfileData(session.user);
                        return session.user;
                    }
                    return prev;
                });

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    fetchProfileData(session.user);
                }

                if (event === 'SIGNED_IN') {
                    // Logic for App.jsx to handle initial landing from login
                    sessionStorage.setItem('justLoggedIn', '1');
                }

            } else {
                setUser(null);
                setProfile(null);
                setClient(null);
                setProfileStatus('idle');
                setProfileError(null);
                setOnboardingStatus('completed');
            }

            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfileData]);

    const signOut = useCallback(async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            setClient(null);
            setProfileStatus('idle');
            setProfileError(null);
            setOnboardingStatus('completed');
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfileData(user);
        }
    }, [user, fetchProfileData]);

    const isProfileIncomplete = profile?.role === 'client' && (!client || !client.full_name || !client.phone);

    const value = {
        user,
        profile,
        client,
        loading: loading || profileLoading,
        authReady: !loading,
        profileStatus,
        profileError,
        onboardingStatus,
        isProfileIncomplete, // New flag
        signOut,
        refreshProfile,
        refreshClient: refreshProfile
    };


    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
