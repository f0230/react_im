import React from 'react';
import { LayoutDashboard, Users, Briefcase, FileText, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PopoverPanel from '../components/ui/PopoverPanel';
import { MOBILE_POPOVER_BACKDROP_CLASS, POPOVER_PANEL_CLASS } from '../components/ui/popoverStyles';
import { PrefetchNavLink } from '@/components/navigation/PrefetchLink';

const DashboardMenu = ({ isOpen, onClose }) => {
    const { profile } = useAuth();
    const role = profile?.role || 'client';
    const isClientLeader = profile?.is_client_leader;

    const menuItems = {
        client: [
            { icon: LayoutDashboard, label: 'Resumen', path: '/dashboard' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: Calendar, label: 'Mis Citas', path: '/dashboard/my-appointments' },
            { icon: MessageSquare, label: 'Mensajes', path: '/dashboard/messages' },
            { icon: FileText, label: 'Facturas', path: '/dashboard/invoices' },
        ],
        worker: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: MessageSquare, label: 'Mensajeria', path: '/dashboard/messages' },
        ],
        admin: [
            { icon: LayoutDashboard, label: 'Control', path: '/dashboard' },
            { icon: Users, label: 'CRM Clientes', path: '/dashboard/clients' },
            { icon: MessageSquare, label: 'Mensajeria', path: '/dashboard/messages' },
            { icon: Calendar, label: 'Citas', path: '/dashboard/appointments' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: FileText, label: 'Facturacion', path: '/dashboard/invoices' },
            { icon: TrendingUp, label: 'Finanzas', path: '/dashboard/finances' },
        ],
    };

    let navLinks = menuItems[role] || menuItems.client;

    if (role === 'client' && !isClientLeader) {
        navLinks = navLinks.filter((item) => !['/dashboard/messages', '/dashboard/invoices'].includes(item.path));
    }

    const renderMenuItem = (item) => {
        return (
            <PrefetchNavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={onClose}
                className={({ isActive }) => `
                    dashboard-menu-item flex items-center gap-2.5 px-3 py-2 rounded-[15px] transition-all duration-200 group
                    ${isActive
                        ? 'dashboard-menu-item-active bg-white font-bold'
                        : 'dashboard-menu-item-idle hover:bg-white/10'}
                `}
            >
                <item.icon size={18} className="transition-colors text-current" />
                <span className="font-product text-sm">{item.label}</span>
            </PrefetchNavLink>
        );
    };

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={`${POPOVER_PANEL_CLASS} dashboard-menu-panel`}
            backdropClassName={MOBILE_POPOVER_BACKDROP_CLASS}
        >
            <div className="p-2 space-y-0.5">
                {navLinks.map(renderMenuItem)}
            </div>
        </PopoverPanel>
    );
};

export default DashboardMenu;
