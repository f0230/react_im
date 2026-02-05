import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import DashboardNavbar from './DashboardNavbar';
import { useAuth } from '../context/AuthContext';
import LoadingFallback from '../components/ui/LoadingFallback';
import CompleteProfileModal from '../components/CompleteProfileModal';
import CreateProjectModal from '../components/CreateProjectModal';
import { AlertCircle } from 'lucide-react';

const PortalLayout = () => {
    const {
        user,
        profile,
        client,
        loading,
        authReady,
        profileStatus,
        profileError,
        refreshProfile,
        signOut,
    } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const role = profile?.role;

    const isAuthReady = typeof authReady === 'boolean' ? authReady : !loading;

    const isRouteAllowed = useMemo(() => {
        if (!profile?.role) return true;
        const path = location.pathname;
        const checksByRole = {
            client: [
                (p) => p === '/dashboard',
                (p) => p.startsWith('/dashboard/services'),
                (p) => p.startsWith('/dashboard/reports'),
                (p) => p.startsWith('/dashboard/projects'),
                (p) => p.startsWith('/dashboard/invoices'),
                (p) => p.startsWith('/dashboard/settings'),
                (p) => p.startsWith('/dashboard/profile'),
                (p) => p.startsWith('/dashboard/my-appointments'),
                (p) => p.startsWith('/dashboard/client-chat'),
                (p) => p.startsWith('/dashboard/messages'),
            ],
            worker: [
                (p) => p === '/dashboard',
                (p) => p.startsWith('/dashboard/services'),
                (p) => p.startsWith('/dashboard/reports'),
                (p) => p.startsWith('/dashboard/projects'),
                (p) => p.startsWith('/dashboard/inbox'),
                (p) => p.startsWith('/dashboard/team-chat'),
                (p) => p.startsWith('/dashboard/client-chat'),
                (p) => p.startsWith('/dashboard/messages'),
                (p) => p.startsWith('/dashboard/settings'),
                (p) => p.startsWith('/dashboard/profile'),
            ],
            admin: [
                () => true,
            ],
        };

        const checks = checksByRole[profile.role];
        if (!checks) return false;
        return checks.some((check) => check(path));
    }, [profile?.role, location.pathname]);

    useEffect(() => {
        if (!loading && user && role === 'client') {
            // Show modal if client record is missing or incomplete
            if (!client || !client.full_name || !client.phone) {
                setShowProfileModal(true);
            } else {
                setShowProfileModal(false);
            }
        }
    }, [loading, user, role, client]);

    if (!isAuthReady) {
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
        isAuthReady &&
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

    if (profile?.role && profileStatus !== 'loading' && !isRouteAllowed) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#f2f2f2] font-product px-4 text-center">
                <div className="bg-red-50 p-4 rounded-full">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Acceso restringido</h2>
                <p className="text-zinc-500 text-sm max-w-md text-center">
                    Tu rol no tiene permisos para esta sección.
                </p>
                <div className="flex gap-3 mt-2 flex-wrap justify-center">
                    <button
                        onClick={() => {
                            navigate('/dashboard', { replace: true });
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Volver al Dashboard
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
                onComplete={() => {
                    setShowCreateProjectModal(true);
                }}
            />

            <CreateProjectModal
                isOpen={showCreateProjectModal}
                onClose={() => setShowCreateProjectModal(false)}
                onCreated={() => setShowCreateProjectModal(false)}
                role={role}
            />
        </div>
    );
};

export default PortalLayout;
