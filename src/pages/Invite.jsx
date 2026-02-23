import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from "react-i18next";
import dteWhite from '../assets/dte-white.svg';
import LoginPanelBody from '../components/LoginPanelBody';

const Invite = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [inviteState, setInviteState] = useState({ loading: true, error: null, inviteData: null });

    useEffect(() => {
        const verifyInvite = async () => {
            if (!token) {
                navigate('/');
                return;
            }

            try {
                // Fetch invitation details
                // Unauthenticated users can view if expires_at > now() based on our RLS
                const { data, error } = await supabase
                    .from('client_invitations')
                    .select('*, client:clients(name)')
                    .eq('token', token)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Invite not found");

                setInviteState({ loading: false, error: null, inviteData: data });

                // Store in localStorage to process after Google Auth callback
                localStorage.setItem('pending_invite_token', token);

            } catch (err) {
                console.error("Invite error:", err);
                setInviteState({ loading: false, error: t("invite.invalidToken", "Invalid or expired invitation token."), inviteData: null });
            }
        };

        verifyInvite();
    }, [token, navigate, t]);

    if (inviteState.loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center font-product">
                <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (inviteState.error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center font-product text-white p-4">
                <h1 className="text-2xl mb-4 font-bold text-red-500">Error</h1>
                <p className="text-gray-400 mb-8">{inviteState.error}</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg">
                    Go to Homepage
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-product p-4 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[500px] bg-[#111] rounded-[10px] shadow-2xl p-8 border border-white/10 text-center">
                <h2 className="text-[25px] md:text-[35px] font-bold mb-6 text-white inline-flex items-center justify-center gap-2">
                    <img
                        src={dteWhite}
                        alt="DTE"
                        className="h-[24px] md:h-[35px] w-auto"
                    />
                    <span className="text-green">Platform</span>
                </h2>

                <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-gray-300 mb-2">
                        You have been invited to join the team:
                    </p>
                    <h3 className="text-xl font-bold text-white">
                        {inviteState.inviteData?.client?.name || "Loading..."}
                    </h3>
                </div>

                <p className="text-gray-400 mb-6 text-sm">
                    Log in with Google to accept the invitation and securely join the workspace.
                </p>

                <LoginPanelBody />
            </div>
        </div>
    );
};

export default Invite;
