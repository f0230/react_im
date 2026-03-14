import React from 'react';
import { LayoutDashboard, Users, Briefcase, FileText, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PopoverPanel from '../components/ui/PopoverPanel';
import { PrefetchNavLink } from '@/components/navigation/PrefetchLink';

const DashboardMenu = ({ isOpen, onClose }) => {
    const { profile } = useAuth();
    const role = profile?.role || 'client';
    const isClientLeader = profile?.is_client_leader;
    const menuPanelClass = [
        'fixed left-3 right-3 top-[61px] z-50 max-h-[calc(100dvh-73px)] overflow-y-auto rounded-[28px] border border-white/12',
        'bg-gradient-to-r from-black/72 via-black/58 to-black/78 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl supports-[backdrop-filter]:bg-black/48',
        'lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-[1px] lg:w-[360px] lg:max-h-[calc(100vh-80px)] lg:overflow-hidden',
    ].join(' ');

    const backdropClassName = 'fixed inset-x-0 top-[56px] bottom-0 z-40 lg:inset-0';

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

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={menuPanelClass}
            backdropClassName={backdropClassName}
        >
            <div className="p-2 space-y-0.5">
                {navLinks.map((item) => (
                    <PrefetchNavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={onClose}
                        className={({ isActive }) => `
                            flex items-center gap-2.5 px-3 py-2 rounded-[15px] transition-all duration-200 group
                            ${isActive
                                ? 'bg-white text-black font-bold'
                                : 'text-neutral-700 hover:bg-white/5 hover:text-black'}
                        `}
                    >
                        <item.icon size={18} className="transition-colors text-current" />
                        <span className="font-product text-sm">{item.label}</span>
                    </PrefetchNavLink>
                ))}
            </div>
        </PopoverPanel>
    );
};

export default DashboardMenu;
