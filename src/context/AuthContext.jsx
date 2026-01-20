import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

const PROFILE_CACHE_KEY = 'dte.profile.v1';

const readCachedProfile = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = window.localStorage?.getItem(PROFILE_CACHE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (parsed?.userId && parsed?.profile) return parsed;
        if (parsed?.id) {
            return { userId: parsed.id, profile: parsed };
        }
        return null;
    } catch (error) {
        console.warn('AuthProvider: Failed to parse cached profile', error);
        return null;
    }
};

const writeCachedProfile = (userId, profileData) => {
    if (typeof window === 'undefined') return;
    try {
        if (profileData && userId) {
            window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile: profileData }));
        } else {
            window.localStorage.removeItem(PROFILE_CACHE_KEY);
        }
    } catch (error) {
        console.warn('AuthProvider: Failed to persist profile', error);
    }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const cachedProfile = readCachedProfile();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(cachedProfile?.profile ?? null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [profileStatus, setProfileStatus] = useState('idle'); // idle | loading | ready | missing | error
    const [profileError, setProfileError] = useState(null);

    const authReadyRef = useRef(false);
    const activeUserIdRef = useRef(cachedProfile?.userId ?? null);
    const profileRequestIdRef = useRef(0);
    const debugEnabledRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            debugEnabledRef.current = window.localStorage?.getItem('dte.auth.debug') === '1';
        } catch (error) {
            debugEnabledRef.current = false;
        }
    }, []);

    const debugLog = useCallback((...args) => {
        if (!debugEnabledRef.current) return;
        console.log(...args);
    }, []);

    const markAuthReady = useCallback(() => {
        if (authReadyRef.current) return;
        authReadyRef.current = true;
        setAuthReady(true);
        setLoading(false);
    }, []);

    const clearSupabaseAuthStorage = useCallback(() => {
        if (typeof window === 'undefined') return;
        try {
            const keys = Object.keys(window.localStorage || {});
            keys.forEach((key) => {
                if (key.startsWith('sb-') && (key.endsWith('-auth-token') || key.endsWith('-auth-token-code-verifier'))) {
                    window.localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('AuthProvider: Failed to clear auth storage', error);
        }
    }, []);

    const clearSessionState = useCallback(() => {
        activeUserIdRef.current = null;
        profileRequestIdRef.current += 1;
        setUser(null);
        setProfile(null);
        setClient(null);
        setProfileStatus('idle');
        setProfileError(null);
        writeCachedProfile(null, null);
    }, []);

    const fetchProfile = useCallback(async (userId) => {
        const maxAttempts = 3;
        let attempts = 0;
        let finalError = null;
        const requestId = (profileRequestIdRef.current += 1);
        activeUserIdRef.current = userId;

        const isStale = () =>
            requestId !== profileRequestIdRef.current || activeUserIdRef.current !== userId;

        setProfileStatus('loading');
        setProfileError(null);

        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`🔍 AuthProvider: Fetching profile for ${userId} (Attempt ${attempts}/${maxAttempts})`);

                const { data: profileData, error: responseError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (isStale()) {
                    return null;
                }

                if (responseError) {
                    finalError = responseError;
                    console.error('❌ AuthProvider: Profile fetch error:', {
                        code: responseError.code,
                        message: responseError.message,
                        userId
                    });

                    if (attempts < maxAttempts && (responseError.code === 'PGRST116' || !profileData)) {
                        console.warn('⚠️ AuthProvider: Profile not ready, retrying in 1s...');
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }

                    break;
                }

                console.log('👤 AuthProvider: Profile loaded', profileData.role);
                setProfile(profileData ?? null);
                writeCachedProfile(userId, profileData ?? null);
                setProfileStatus('ready');
                setProfileError(null);

                // Fetch client record if role is client
                if (profileData?.role === 'client') {
                    console.log('🔍 AuthProvider: Fetching client record...');
                    const { data: clientData, error: clientError } = await supabase
                        .from('clients')
                        .select('*')
                        .eq('user_id', userId)
                        .maybeSingle();

                    if (isStale()) {
                        return null;
                    }

                    if (clientError) {
                        console.warn('⚠️ AuthProvider: Error fetching client data:', clientError);
                    }
                    console.log('💼 AuthProvider: Client data result:', !!clientData);
                    setClient(clientData ?? null);
                } else {
                    setClient(null);
                }

                return profileData ?? null; // Success

            } catch (error) {
                finalError = error;
                console.error('❌ AuthProvider: Critical error in fetchProfile:', error);
                if (attempts === maxAttempts) {
                    break;
                }
            }
        }

        setProfile(null);
        setClient(null);
        writeCachedProfile(null, null);

        const isNotFound = finalError?.code === 'PGRST116' || /No rows/.test(finalError?.message ?? '');
        if (!isStale()) {
            if (isNotFound) {
                setProfileStatus('missing');
                setProfileError(new Error('No se encontró tu perfil o aún está en proceso de creación.'));
            } else {
                setProfileStatus('error');
                setProfileError(finalError ?? new Error('No se pudo cargar tu perfil.'));
            }
        }

        return null;
    }, []);

    const applySession = useCallback(async (session) => {
        const timeout = !authReadyRef.current
            ? setTimeout(() => {
                console.warn('⏱️ AuthProvider: Session apply taking too long, forcing load finish');
                markAuthReady();
            }, 5000)
            : null;
        try {
            console.log('🔐 AuthProvider: Applying session', session?.user?.email || 'No User');
            debugLog('AuthProvider: applySession start', {
                eventUser: session?.user?.id ?? null,
                activeUser: activeUserIdRef.current ?? null
            });
            if (!session?.user) {
                console.log('ℹ️ AuthProvider: No user session found (skip apply)');
                markAuthReady();
                return;
            }

            if (activeUserIdRef.current && activeUserIdRef.current !== session.user.id) {
                setProfile(null);
                setClient(null);
                setProfileStatus('idle');
                setProfileError(null);
                writeCachedProfile(null, null);
            }

            setUser(session.user);
            await fetchProfile(session.user.id);
        } catch (error) {
            console.error('❌ AuthProvider: Error in applySession:', error);
        } finally {
            if (timeout) clearTimeout(timeout);
            markAuthReady();
            debugLog('AuthProvider: applySession done', {
                user: session?.user?.id ?? null,
                profileStatus
            });
            console.log('✅ AuthProvider: Auth flow finished');
        }
    }, [fetchProfile, markAuthReady, debugLog, profileStatus]);

    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            try {
                console.log('🚀 AuthProvider: App Start - Initializing session...');
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('⚠️ AuthProvider: getSession error', error.message);
                }
                debugLog('AuthProvider: getSession result', {
                    hasSession: !!session,
                    userId: session?.user?.id ?? null
                });
                if (isMounted) {
                    if (session?.user) {
                        await applySession(session);
                    } else {
                        // Fallback: try to recover a session from storage (refresh flow).
                        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                        debugLog('AuthProvider: refreshSession result', {
                            hasSession: !!refreshData?.session,
                            error: refreshError?.message ?? null
                        });
                        if (refreshData?.session?.user) {
                            await applySession(refreshData.session);
                        } else {
                            clearSessionState();
                            markAuthReady();
                        }
                    }
                }
            } catch (error) {
                console.error('❌ AuthProvider: Error in initSession:', error);
                if (isMounted) markAuthReady();
            }
        };

        void initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log('🔄 AuthProvider: onAuthStateChange event:', _event);
                debugLog('AuthProvider: onAuthStateChange', {
                    event: _event,
                    userId: session?.user?.id ?? null
                });
                if (isMounted) {
                    if (_event === 'SIGNED_OUT') {
                        clearSessionState();
                        markAuthReady();
                        return;
                    }
                    if (_event === 'INITIAL_SESSION' && !session?.user) {
                        // Avoid clearing or finalizing on a null initial session; getSession will finalize.
                        return;
                    }
                    if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION' || _event === 'TOKEN_REFRESHED') {
                        await applySession(session);
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [applySession, clearSessionState, markAuthReady, debugLog]);

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

    const refreshProfile = useCallback(async () => {
        if (!user) return null;
        if (profileStatus === 'loading') {
            console.log('ℹ️ AuthProvider: Already loading profile, skipping refresh');
            return null;
        }

        return await fetchProfile(user.id);
    }, [fetchProfile, user, profileStatus]);

    const signOut = useCallback(async () => {
        let hadError = false;
        try {
            console.log('🔄 AuthProvider: Initiating sign out...');
            const { error } = await supabase.auth.signOut();
            if (error) {
                hadError = true;
                console.warn('⚠️ AuthProvider: Supabase signOut error', error.message);
            }
        } catch (error) {
            hadError = true;
            console.error('❌ AuthProvider: Critical error during signOut:', error);
        } finally {
            if (hadError) {
                try {
                    await supabase.auth.signOut({ scope: 'local' });
                } catch (error) {
                    console.warn('⚠️ AuthProvider: Local signOut fallback failed', error);
                }
            }
            clearSupabaseAuthStorage();
            clearSessionState();
            markAuthReady();
            console.log('👋 AuthProvider: User signed out and state cleared');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                debugLog('AuthProvider: post-signOut session', { hasSession: !!session });
            } catch (error) {
                debugLog('AuthProvider: post-signOut getSession failed', error);
            }
        }
    }, [clearSessionState, clearSupabaseAuthStorage, debugLog, markAuthReady]);

    const value = useMemo(() => ({
        user,
        profile,
        client,
        loading,
        authReady,
        profileStatus,
        profileError,
        refreshClient,
        refreshProfile,
        signOut,
    }), [user, profile, client, loading, authReady, profileStatus, profileError, refreshClient, refreshProfile, signOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
