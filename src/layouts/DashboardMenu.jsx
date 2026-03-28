import React, { useState } from 'react';
import { LayoutDashboard, Users, Briefcase, FileText, MessageSquare, Calendar, TrendingUp, Wallet, BarChart3, PieChart, Receipt, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PopoverPanel from '../components/ui/PopoverPanel';
import { PrefetchNavLink } from '@/components/navigation/PrefetchLink';

const DashboardMenu = ({ isOpen, onClose }) => {
    const { profile } = useAuth();
    const [financeExpanded, setFinanceExpanded] = useState(false);
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
            { 
                icon: TrendingUp, 
                label: 'Finanzas', 
                path: '/dashboard/finances',
                children: [
                    { icon: Wallet, label: 'Resumen', path: '/dashboard/finances' },
                    { icon: BarChart3, label: 'Cash Flow', path: '/dashboard/finances/cashflow' },
                    { icon: PieChart, label: 'Proyectos', path: '/dashboard/finances/projects' },
                    { icon: Receipt, label: 'Ledger', path: '/dashboard/finances/ledger' },
                    { icon: TrendingUp, label: 'Reportes', path: '/dashboard/finances/reports' },
                    { icon: Settings, label: 'Configuración', path: '/dashboard/finances/settings' },
                ]
            },
        ],
    };

    let navLinks = menuItems[role] || menuItems.client;

    if (role === 'client' && !isClientLeader) {
        navLinks = navLinks.filter((item) => !['/dashboard/messages', '/dashboard/invoices'].includes(item.path));
    }

    const renderMenuItem = (item, index) => {
        if (item.children) {
            return (
                <div key={item.path} className="space-y-0.5">
                    <button
                        onClick={() => setFinanceExpanded(!financeExpanded)}
                        className={`
                            w-full flex items-center gap-2.5 px-3 py-2 rounded-[15px] transition-all duration-200 group
                            text-neutral-700 hover:bg-white/5 hover:text-black
                        `}
                    >
                        <item.icon size={18} className="transition-colors text-current" />
                        <span className="font-product text-sm flex-1 text-left">{item.label}</span>
                        <ChevronDown size={14} className={`transition-transform ${financeExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {financeExpanded && (
                        <div className="ml-6 space-y-0.5 border-l border-white/10 pl-2">
                            {item.children.map((child, idx) => (
                                <PrefetchNavLink
                                    key={child.path}
                                    to={child.path}
                                    end={child.path === '/dashboard/finances'}
                                    onClick={onClose}
                                    className={({ isActive }) => `
                                        flex items-center gap-2.5 px-3 py-2 rounded-[15px] transition-all duration-200
                                        ${isActive
                                            ? 'bg-white text-black font-bold'
                                            : 'text-neutral-600 hover:bg-white/5 hover:text-black'}
                                    `}
                                >
                                    <child.icon size={16} className="transition-colors text-current" />
                                    <span className="font-product text-sm">{child.label}</span>
                                </PrefetchNavLink>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
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
        );
    };

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={menuPanelClass}
            backdropClassName={backdropClassName}
        >
            <div className="p-2 space-y-0.5">
                {navLinks.map(renderMenuItem)}
            </div>
        </PopoverPanel>
    );
};

export default DashboardMenu;
