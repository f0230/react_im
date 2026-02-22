import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [client, setClient] = useState(null);
    // `authInitialized`: true only after the FIRST session check completes. This is
    // the only flag that should gate the brand loader / authReady. profileLoading
    // is intentionally kept separate so background re-fetches never trigger loaders.
    const [authInitialized, setAuthInitialized] = useState(false);
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
                    setAuthInitialized(true);
                }
            }
        };

        initAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (session?.user) {
                // SIGNED_IN fires on real logins AND on silent session recovery (e.g. tab refocus
                // after an extended absence). Only re-fetch the profile if this is a genuinely
                // new user or if the profile was never loaded. Otherwise just update the user obj.
                // USER_UPDATED always re-fetches (e.g. email change confirmed).
                // TOKEN_REFRESHED / INITIAL_SESSION / other events: silently update user only.
                if (event === 'SIGNED_IN') {
                    setUser((prevUser) => {
                        const isNewUser = !prevUser || prevUser.id !== session.user.id;
                        if (isNewUser) {
                            // Genuinely new login — fetch profile and mark as just-logged-in
                            fetchProfileData(session.user);
                            sessionStorage.setItem('justLoggedIn', '1');
                        }
                        // If same user (silent session recovery): do nothing, keep existing profile
                        return session.user;
                    });
                } else if (event === 'USER_UPDATED') {
                    setUser(session.user);
                    fetchProfileData(session.user);
                } else {
                    // TOKEN_REFRESHED, INITIAL_SESSION, etc. — only update user obj if it changed
                    setUser((prev) => {
                        if (!prev || prev.id !== session.user.id) {
                            fetchProfileData(session.user);
                        }
                        return session.user;
                    });
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setClient(null);
                setProfileStatus('idle');
                setProfileError(null);
                setOnboardingStatus('completed');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfileData]);

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            // State is reset by the SIGNED_OUT event in onAuthStateChange
        } catch (error) {
            console.error('Sign out error:', error);
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
        // `loading` only reflects the initial one-time auth check, NOT background re-fetches.
        // This prevents the brand loader from reappearing on tab focus / token refresh.
        loading: !authInitialized,
        authReady: authInitialized,
        profileStatus,
        profileError,
        onboardingStatus,
        isProfileIncomplete,
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
