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

    // Fetch profile and client data
    const fetchProfileData = useCallback(async (currentUser) => {
        if (!currentUser) {
            setProfile(null);
            setClient(null);
            setProfileStatus('idle');
            setProfileError(null);
            return;
        }

        try {
            setProfileLoading(true);
            setProfileStatus('loading');
            setProfileError(null);

            // 1. Fetch Profile
            // Retry logic for profile creation latency
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
                    // If error is not "row not found", checking if we should retry or fail immediately?
                    // PGRST116 is row not found.
                    if (error.code === 'PGRST116') {
                        // It might be created async, so we retry.
                    }

                    attempts++;
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
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
                } else {
                    setClient(null);
                }

            } else {
                setProfile(null);
                setClient(null);

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
        } finally {
            setProfileLoading(false);
        }
    }, []);

    // Initial Session Check & Subscription
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Get initial session
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfileData(session.user);
                    } else {
                        setUser(null);
                        setProfile(null);
                        setClient(null);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email);

            if (!mounted) return;

            if (session?.user) {
                // Only update if user changed to avoid loops, or if it's a sign-in event
                setUser((prev) => {
                    if (prev?.id !== session.user.id) {
                        fetchProfileData(session.user);
                        return session.user;
                    }
                    return prev;
                });

                // If we have a user but no profile yet (e.g. slight race on initial load), fetch it
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    // Force refresh profile on explicit sign in to ensure latest data
                    fetchProfileData(session.user);
                }

                if (event === 'SIGNED_IN') {
                    // Signal app-wide redirect to dashboard after login
                    sessionStorage.setItem('postLoginRedirect', '1');
                }

            } else {
                setUser(null);
                setProfile(null);
                setClient(null);
                setProfileStatus('idle');
                setProfileError(null);
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

    const value = {
        user,
        profile,
        client,
        loading: loading || profileLoading, // Combined loading state for smoother UX on initial load
        authReady: !loading, // Backward compatibility
        profileStatus,
        profileError,
        signOut,
        refreshProfile,
        refreshClient: refreshProfile // Map to same refresh for simplicity
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
