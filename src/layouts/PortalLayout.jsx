import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import DashboardNavbar from './DashboardNavbar';
import { useAuth } from '../context/AuthContext';
import LoadingFallback from '../components/ui/LoadingFallback';

const PortalLayout = () => {
    const { user, loading } = useAuth();

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
        </div>
    );
};

export default PortalLayout;
