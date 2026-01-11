import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Clock, MessageSquare, ArrowUpRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';




const DashboardHome = () => {
    const { profile } = useAuth();

    return (
        <div className="space-y-8 font-product">

        </div>
    );
};

export default DashboardHome;
