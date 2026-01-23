import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardMenu = ({ isOpen, onClose }) => {
    const { profile, signOut } = useAuth();
    const role = profile?.role || 'client';

    const menuItems = {
        client: [
            { icon: LayoutDashboard, label: 'Resumen', path: '/dashboard' },
            { icon: Briefcase, label: 'Mis Proyectos', path: '/dashboard/projects' },
            { icon: FileText, label: 'Facturas', path: '/dashboard/invoices' },
        ],
        worker: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: MessageSquare, label: 'Chat interno', path: '/dashboard/team-chat' },
            { icon: MessageSquare, label: 'WhatsApp', path: '/dashboard/inbox' },
            { icon: FileText, label: 'Tareas', path: '/dashboard/tasks' },
        ],
        admin: [
            { icon: LayoutDashboard, label: 'Control', path: '/dashboard' },
            { icon: Users, label: 'CRM Clientes', path: '/dashboard/clients' },
            { icon: MessageSquare, label: 'Chat interno', path: '/dashboard/team-chat' },
            { icon: MessageSquare, label: 'WhatsApp', path: '/dashboard/inbox' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: FileText, label: 'Facturación', path: '/dashboard/billing' },
            { icon: Settings, label: 'Configuración', path: '/dashboard/settings' },
        ]
    };

    const navLinks = menuItems[role] || menuItems.client;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Invisible backdrop to close on click outside */}
                    <div className="fixed inset-0 z-40" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full right-0 mt-4 w-[240px] bg-[#111] border border-white/10 rounded-[20px] shadow-2xl z-50 overflow-hidden"
                    >


                        <div className="p-2 space-y-1">
                            {navLinks.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/dashboard'}
                                    onClick={onClose}
                                    className={({ isActive }) => `
                                flex items-center gap-2.5 px-3 py-2.5 rounded-[15px] transition-all duration-200 group
                                ${isActive
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                            `}
                                >
                                    <item.icon size={18} className="group-hover:text-skyblue transition-colors" />
                                    <span className="font-product text-sm">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default DashboardMenu;
