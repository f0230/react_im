import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileStatus, setProfileStatus] = useState('idle'); // idle | loading | ready | missing | error
    const [profileError, setProfileError] = useState(null);

    const fetchProfile = useCallback(async (userId) => {
        const maxAttempts = 3;
        let attempts = 0;
        let finalError = null;

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

        const isNotFound = finalError?.code === 'PGRST116' || /No rows/.test(finalError?.message ?? '');
        if (isNotFound) {
            setProfileStatus('missing');
            setProfileError(new Error('No se encontró tu perfil o aún está en proceso de creación.'));
        } else {
            setProfileStatus('error');
            setProfileError(finalError ?? new Error('No se pudo cargar tu perfil.'));
        }

        return null;
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
                setProfileStatus('idle');
                setProfileError(null);
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
                        setProfileStatus('idle');
                        setProfileError(null);
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

    const refreshProfile = useCallback(async () => {
        if (!user) return null;
        if (loading) {
            console.log('ℹ️ AuthProvider: Already loading profile, skipping refresh');
            return null;
        }

        setLoading(true);
        try {
            return await fetchProfile(user.id);
        } finally {
            setLoading(false);
        }
    }, [fetchProfile, user, loading]);

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
        profileStatus,
        profileError,
        refreshClient,
        refreshProfile,
        signOut,
    }), [user, profile, client, loading, profileStatus, profileError, refreshClient, refreshProfile, signOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
