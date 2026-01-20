import React from 'react';
import { useAuth } from '../../context/AuthContext';

const DashboardHome = () => {
    const { profile } = useAuth();

    return (
        <div className="space-y-8 font-product">
            <h1 className="text-3xl text-white">Bienvenido, {profile?.name}</h1>
        </div>
    );
};

export default DashboardHome;
