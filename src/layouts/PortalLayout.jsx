import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import DashboardNavbar from './DashboardNavbar';
import { useAuth } from '../context/AuthContext';
import LoadingFallback from '../components/ui/LoadingFallback';
import CompleteProfileModal from '../components/CompleteProfileModal';

const PortalLayout = () => {
    const { user, profile, client, loading } = useAuth();
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
