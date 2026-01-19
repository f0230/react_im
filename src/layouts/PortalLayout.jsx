import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import DashboardNavbar from './DashboardNavbar';
import { useAuth } from '../context/AuthContext';
import LoadingFallback from '../components/ui/LoadingFallback';
import CompleteProfileModal from '../components/CompleteProfileModal';
import { AlertCircle } from 'lucide-react';

const PortalLayout = () => {
    const {
        user,
        profile,
        client,
        loading,
        profileStatus,
        profileError,
        refreshProfile,
        signOut,
    } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        if (!loading && user && profile?.role === 'client') {
            // Show modal if client record is missing or incomplete
            if (!client || !client.company_name || !client.phone) {
                setShowProfileModal(true);
            } else {
                setShowProfileModal(false);
            }
        }
    }, [loading, user, profile, client]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <LoadingFallback type="spinner" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    const shouldShowProfileError =
        !loading &&
        user &&
        !profile &&
        (profileStatus === 'missing' || profileStatus === 'error');

    const errorTitle = profileStatus === 'missing' ? 'Perfil en proceso' : 'Error de Perfil';
    const errorBody =
        profileError?.message ||
        (profileStatus === 'missing'
            ? 'Todavía no se detecta tu perfil en la base de datos; intentamos reintentar automáticamente.'
            : 'No pudimos leer tu perfil. Podría ser un problema de permisos (RLS).');

    if (shouldShowProfileError) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#f2f2f2] font-product px-4 text-center">
                <div className="bg-red-50 p-4 rounded-full">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">{errorTitle}</h2>
                <p className="text-zinc-500 text-sm max-w-md text-center">
                    {errorBody}
                    <br />
                    ID: {user.id}
                </p>
                <div className="flex gap-3 mt-2 flex-wrap justify-center">
                    <button
                        onClick={() => {
                            void refreshProfile();
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Intentar nuevamente
                    </button>
                    <button
                        onClick={() => {
                            signOut();
                        }}
                        className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f2f2f2] font-product">
            <DashboardNavbar />

            <main className="relative  max-w-[1440px] px-4 md:px-10 mx-auto pt-[45px] animate-fade-in">
                <Outlet />
            </main>

            <CompleteProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </div>
    );
};

export default PortalLayout;
