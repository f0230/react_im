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
                    .select('*, client:clients(id, full_name, company_name)')
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
        <div className="min-h-screen bg-[#050505] flex items-center justify-center font-product p-4 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative w-full max-w-[480px]">
                {/* Logo Header */}
                <div className="text-center mb-8">
                    <h2 className="text-[32px] md:text-[40px] font-bold text-white inline-flex items-center justify-center gap-3">
                        <img
                            src={dteWhite}
                            alt="DTE"
                            className="h-[30px] md:h-[38px] w-auto"
                        />
                        <span className="text-green">Platform</span>
                    </h2>
                </div>

                <div className="bg-[#111]/80 backdrop-blur-xl rounded-[24px] shadow-2xl p-8 md:p-10 border border-white/10 text-center relative overflow-hidden">
                    {/* Subtle inner gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="mb-10">
                            <span className="inline-block px-3 py-1 bg-green/10 text-green text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 border border-green/20">
                                Invitación Exclusiva
                            </span>
                            <p className="text-gray-400 mb-3 text-sm">
                                Has sido invitado a unirte al equipo de:
                            </p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                {inviteState.inviteData?.client?.company_name || inviteState.inviteData?.client?.full_name || "tu equipo"}
                            </h3>
                        </div>

                        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

                        <p className="text-gray-300 mb-8 text-sm leading-relaxed max-w-[280px] mx-auto">
                            Inicia sesión con Google para aceptar la invitación y acceder a tu espacio de trabajo.
                        </p>

                        <LoginPanelBody showLogo={false} showDescription={false} />
                    </div>
                </div>

                <p className="text-center text-gray-500 mt-8 text-xs font-inter">
                    {t("footer.copyright", "© 2025 Grupo DTE")} • All rights reserved
                </p>
            </div>
        </div>
    );
};

export default Invite;
