import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from "react-i18next";
import dteWhite from '../assets/dte-white.svg';

const LoginPanelBody = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error('Login error:', err);
            setError(t("auth.login.error"));
            setLoading(false);
        }
    };

    return (
        <div className="p-8 pt-10 text-center">
            <h2 className="text-[25px] md:text-[45px] font-bold mb-2 text-white inline-flex items-center justify-center gap-2">
                <img
                    src={dteWhite}
                    alt="DTE"
                    className="h-[24px] md:h-[40px] w-auto"
                />
                <span className="text-green">Platform</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm font-inter">
                {t("auth.login.description")}
            </p>

            <div className="flex flex-col gap-4 max-w-xs mx-auto">
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 w-full bg-black text-white hover:scale-[1.02] active:scale-[0.98] font-bold py-3.5 px-4 rounded-[5px]"
                >
                    <span>{t("auth.login.googleCta")}</span>
                </button>

                {error && (
                    <p className="text-red-500 text-xs mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoginPanelBody;
