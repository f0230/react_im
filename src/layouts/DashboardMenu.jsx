import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, FileText, Settings, MessageSquare, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PopoverPanel from '../components/ui/PopoverPanel';
import { POPOVER_PANEL_CLASS } from '../components/ui/popoverStyles';

const DashboardMenu = ({ isOpen, onClose }) => {
    const { profile, signOut } = useAuth();
    const role = profile?.role || 'client';

    const menuItems = {
        client: [
            { icon: LayoutDashboard, label: 'Resumen', path: '/dashboard' },
            { icon: Briefcase, label: 'Mis Proyectos', path: '/dashboard/projects' },
            { icon: Calendar, label: 'Mis Citas', path: '/dashboard/my-appointments' },
            { icon: MessageSquare, label: 'Mensajes', path: '/dashboard/messages' },
            { icon: FileText, label: 'Facturas', path: '/dashboard/invoices' },
        ],
        worker: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: MessageSquare, label: 'Mensajería', path: '/dashboard/messages' },
            { icon: FileText, label: 'Tareas', path: '/dashboard/tasks' },
        ],
        admin: [
            { icon: LayoutDashboard, label: 'Control', path: '/dashboard' },
            { icon: Users, label: 'CRM Clientes', path: '/dashboard/clients' },
            { icon: MessageSquare, label: 'Mensajería', path: '/dashboard/messages' },
            { icon: Calendar, label: 'Citas', path: '/dashboard/appointments' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: FileText, label: 'Facturación', path: '/dashboard/billing' },
            { icon: Settings, label: 'Configuración', path: '/dashboard/settings' },
        ]
    };

    const navLinks = menuItems[role] || menuItems.client;

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={POPOVER_PANEL_CLASS}
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
        </PopoverPanel>
    );
};

export default DashboardMenu;
