import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, Menu, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { profile, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleSignOut = async () => {
        setIsOpen(false);
        await signOut();
        navigate('/');
    };

    const role = profile?.role || 'client';

    const menuItems = {
        client: [
            { icon: LayoutDashboard, label: 'Resumen', path: '/dashboard' },
            { icon: Briefcase, label: 'Servicios', path: '/dashboard/services' },
            { icon: MessageSquare, label: 'Mensajes', path: '/dashboard/messages' },
            { icon: FileText, label: 'Facturas', path: '/dashboard/invoices' },
            { icon: FileText, label: 'Reportes', path: '/dashboard/reports' },
        ],
        worker: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: Briefcase, label: 'Servicios', path: '/dashboard/services' },
            { icon: MessageSquare, label: 'Mensajería', path: '/dashboard/messages' },
            { icon: FileText, label: 'Reportes', path: '/dashboard/reports' },
        ],
        admin: [
            { icon: LayoutDashboard, label: 'Control', path: '/dashboard' },
            { icon: Users, label: 'CRM Clientes', path: '/dashboard/clients' },
            { icon: MessageSquare, label: 'Mensajería', path: '/dashboard/messages' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: FileText, label: 'Facturación', path: '/dashboard/invoices' },
            { icon: FileText, label: 'Reportes', path: '/dashboard/reports' },
            { icon: Settings, label: 'Configuración', path: '/dashboard/settings' },
        ]
    };

    const navLinks = menuItems[role] || menuItems.client;

    return (
        <>
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-black text-white transition-transform duration-300 ease-in-out transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen flex flex-col border-r border-white/10
      `}>
                <div className="p-8 border-b border-white/10">
                    <h1 className="text-2xl font-product font-bold tracking-tight">
                        DTE <span className="text-skyblue">Platform</span>
                    </h1>
                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-inter">
                        {role.toUpperCase()} PORTAL
                    </p>
                </div>

                <nav className="flex-1 overflow-y-auto py-8 px-3 space-y-3 font-product">
                    {navLinks.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/dashboard'}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-[26px] transition-all duration-300 group
                ${isActive
                                    ? 'bg-white text-black font-bold shadow-lg shadow-white/5'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
                            onClick={() => setIsOpen(false)}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={22} className={`transition-colors ${isActive ? "text-skyblue" : "group-hover:text-white"}`} />
                                    <span className="text-[15px]">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/10 font-product">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-4 px-6 py-3.5 w-full text-gray-400 hover:bg-white/5 hover:text-red-400 rounded-[30px] transition-all duration-300"
                    >
                        <LogOut size={22} />
                        <span className="text-[15px]">Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
