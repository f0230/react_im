import React, { useState, useEffect, useRef } from 'react';
import OptimizedImage from '../components/OptimizedImage'; // Adjust path if needed
import logo from '../assets/Group 255.svg'; // Check path
import sidebarLogo from '../assets/LOGO GRUPO DTE - LOGO.webp';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Calendar, FileText, LayoutDashboard, Menu, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUnreadCounts } from '@/context/UnreadCountsContext';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationPanel from '@/components/notifications/NotificationPanel';

import ProfileMenu from './ProfileMenu';
import DashboardMenu from './DashboardMenu';
import ToolsPopover from '@/components/ToolsPopover';
import { PrefetchLink, PrefetchNavLink } from '@/components/navigation/PrefetchLink';

const detectHoverRevealSupport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const NAVBAR_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const NAVBAR_HIDE_DELAY_MS = 180;
const NAVBAR_REVEAL_DELAY_MS = 900;
const SIDEBAR_PANEL_CLASS = 'lg:!left-full lg:!right-auto lg:!top-auto lg:!bottom-0 lg:!ml-2 lg:!mt-0 lg:origin-bottom-left';

const DashboardNavbar = ({ autoHideInStudio = false, onVisibilityChange }) => {
    const [scrolled, setScrolled] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [supportsHoverReveal, setSupportsHoverReveal] = useState(() => detectHoverRevealSupport());
    const [isRevealHotspotActive, setIsRevealHotspotActive] = useState(false);
    const [isNavbarHovered, setIsNavbarHovered] = useState(false);
    const [isNavbarFocused, setIsNavbarFocused] = useState(false);
    const [imgError, setImgError] = useState(false);
    const hideIntentTimeoutRef = useRef(null);
    const revealIntentTimeoutRef = useRef(null);
    const { user, profile } = useAuth();
    const location = useLocation();
    const {
        counts,
        teamPreviews,
        whatsappPreviews,
        clientPreviews,
        notifications,
        messageUnreadTotal,
        markAllNotificationsRead,
        markNotificationRead,
    } = useUnreadCounts();

    // Get avatar from profile table (user-uploaded) or Google metadata
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const initial = (profile?.full_name || user?.user_metadata?.full_name || 'U').charAt(0);
    const role = profile?.role || 'client';
    const isClientLeader = profile?.is_client_leader;
    const dashboardMenuItems = {
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
            { icon: Users, label: 'CRM', path: '/dashboard/clients' },
            { icon: MessageSquare, label: 'Mensajes', path: '/dashboard/messages' },
            { icon: Calendar, label: 'Citas', path: '/dashboard/appointments' },
            { icon: Briefcase, label: 'Proyectos', path: '/dashboard/projects' },
            { icon: FileText, label: 'Facturas', path: '/dashboard/invoices' },
            { icon: TrendingUp, label: 'Finanzas', path: '/dashboard/finances' },
        ],
    };

    let navLinks = dashboardMenuItems[role] || dashboardMenuItems.client;

    if (role === 'client' && !isClientLeader) {
        navLinks = navLinks.filter((item) => !['/dashboard/messages', '/dashboard/invoices'].includes(item.path));
    }

    const sidebarNavItemClass = ({ isActive }) => `
        mx-auto flex h-12 w-12 items-center justify-center rounded-2xl transition-colors
        ${isActive
            ? 'bg-white text-black'
            : 'text-white/72 hover:bg-white/10 hover:text-white'}
    `;

    const clearHideIntent = () => {
        if (hideIntentTimeoutRef.current) {
            window.clearTimeout(hideIntentTimeoutRef.current);
            hideIntentTimeoutRef.current = null;
        }
    };

    const clearRevealIntent = () => {
        if (revealIntentTimeoutRef.current) {
            window.clearTimeout(revealIntentTimeoutRef.current);
            revealIntentTimeoutRef.current = null;
        }
    };

    const scheduleHideIntent = () => {
        clearHideIntent();
        clearRevealIntent();
        hideIntentTimeoutRef.current = window.setTimeout(() => {
            setIsRevealHotspotActive(false);
            setIsNavbarHovered(false);
            hideIntentTimeoutRef.current = null;
        }, NAVBAR_HIDE_DELAY_MS);
    };

    const scheduleRevealIntent = () => {
        clearHideIntent();
        clearRevealIntent();
        revealIntentTimeoutRef.current = window.setTimeout(() => {
            setIsRevealHotspotActive(true);
            revealIntentTimeoutRef.current = null;
        }, NAVBAR_REVEAL_DELAY_MS);
    };

    useEffect(() => {
        const handleScroll = () => {
            const nextScrolled = window.scrollY > 20;
            setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
            setIsToolsOpen(false);
            setIsMenuOpen(false);
            setIsProfileOpen(false);
            setIsNotificationsOpen(false);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        const syncHoverReveal = () => setSupportsHoverReveal(mediaQuery.matches);

        syncHoverReveal();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncHoverReveal);
            return () => mediaQuery.removeEventListener('change', syncHoverReveal);
        }

        mediaQuery.addListener(syncHoverReveal);
        return () => mediaQuery.removeListener(syncHoverReveal);
    }, []);

    useEffect(() => {
        return () => {
            clearHideIntent();
            clearRevealIntent();
        };
    }, []);

    useEffect(() => {
        setIsToolsOpen(false);
        setIsMenuOpen(false);
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
        clearHideIntent();
        clearRevealIntent();
        setIsRevealHotspotActive(false);
        setIsNavbarHovered(false);
        setIsNavbarFocused(false);
    }, [location.pathname, autoHideInStudio]);

    const hasOpenPopover =
        isToolsOpen ||
        isMenuOpen ||
        isProfileOpen ||
        isNotificationsOpen;

    const shouldAutoHide = autoHideInStudio && supportsHoverReveal;
    const isNavbarVisible =
        !shouldAutoHide ||
        isRevealHotspotActive ||
        isNavbarHovered ||
        isNavbarFocused ||
        hasOpenPopover;

    useEffect(() => {
        onVisibilityChange?.(isNavbarVisible);
    }, [isNavbarVisible, onVisibilityChange]);

    return (
        <>
            {shouldAutoHide && (
                <div
                    aria-hidden="true"
                    className="fixed inset-x-0 top-0 z-30 h-5 lg:hidden"
                    onMouseEnter={scheduleRevealIntent}
                    onMouseLeave={() => {
                        clearRevealIntent();
                        if (isNavbarVisible) {
                            scheduleHideIntent();
                        }
                    }}
                />
            )}

            <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[80px] flex-col bg-black px-2 py-4 text-white shadow-[1px_0_0_rgba(255,255,255,0.08)] lg:flex">
                <div className="flex min-h-0 flex-1 flex-col">
                    <PrefetchLink
                        to="/dashboard"
                        className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors hover:bg-white/10"
                        aria-label="DTE Platform"
                        title="DTE Platform"
                    >
                        <OptimizedImage
                            src={sidebarLogo}
                            alt="DTE Logo"
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                        />
                    </PrefetchLink>

                    <nav className="flex-1 space-y-2 overflow-y-auto pb-3 font-google-sans-flex no-scrollbar" aria-label="Navegacion del portal">
                        {navLinks.map((item) => (
                            <PrefetchNavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/dashboard'}
                                className={sidebarNavItemClass}
                                aria-label={item.label}
                                title={item.label}
                                onClick={() => {
                                    setIsToolsOpen(false);
                                    setIsNotificationsOpen(false);
                                    setIsProfileOpen(false);
                                    setIsMenuOpen(false);
                                }}
                            >
                                <item.icon size={24} className="shrink-0 text-current" aria-hidden="true" />
                                <span className="sr-only">{item.label}</span>
                            </PrefetchNavLink>
                        ))}
                    </nav>

                    <div className="space-y-2 border-t border-white/10 pt-3 font-google-sans-flex">
                        {(profile?.role === 'admin' || profile?.role === 'worker') && (
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-white/[0.04] [&>div>button]:h-12 [&>div>button]:w-12 [&>div>button]:text-white/70 [&>div>button:hover]:bg-white/10 [&>div>button:hover]:text-white">
                                <ToolsPopover
                                    isOpen={isToolsOpen}
                                    onToggle={() => {
                                        setIsToolsOpen((prev) => !prev);
                                        setIsNotificationsOpen(false);
                                        setIsProfileOpen(false);
                                        setIsMenuOpen(false);
                                    }}
                                    onClose={() => setIsToolsOpen(false)}
                                    panelClassName={SIDEBAR_PANEL_CLASS}
                                    iconSize={24}
                                />
                            </div>
                        )}

                        <div className="relative mx-auto h-12 w-12 rounded-2xl bg-white/[0.04] [&>button]:h-12 [&>button]:w-12 [&>button]:text-white/70 [&>button:hover]:bg-white/10 [&>button:hover]:text-white">
                            <NotificationBell
                                unreadCount={counts.unreadNotifications + messageUnreadTotal}
                                isOpen={isNotificationsOpen}
                                iconSize={24}
                                onClick={() => {
                                    setIsNotificationsOpen((prev) => !prev);
                                    setIsToolsOpen(false);
                                    setIsProfileOpen(false);
                                    setIsMenuOpen(false);
                                }}
                            />
                            <NotificationPanel
                                isOpen={isNotificationsOpen}
                                onClose={() => setIsNotificationsOpen(false)}
                                notifications={notifications}
                                teamItems={teamPreviews}
                                whatsappItems={whatsappPreviews}
                                clientItems={clientPreviews}
                                onMarkAllRead={markAllNotificationsRead}
                                onMarkRead={markNotificationRead}
                                panelClassName={SIDEBAR_PANEL_CLASS}
                            />
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsProfileOpen((prev) => !prev);
                                    setIsToolsOpen(false);
                                    setIsNotificationsOpen(false);
                                    setIsMenuOpen(false);
                                    setImgError(false);
                                }}
                                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition-colors hover:bg-white/10"
                                aria-label="Perfil"
                                title="Perfil"
                            >
                                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-skyblue">
                                    {avatarUrl && !imgError ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Profile"
                                            className="h-full w-full object-cover"
                                            onError={() => setImgError(true)}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                                            {initial}
                                        </div>
                                    )}
                                </div>
                                <span className="sr-only">Perfil</span>
                            </button>

                            <ProfileMenu
                                isOpen={isProfileOpen}
                                onClose={() => setIsProfileOpen(false)}
                                panelClassName={SIDEBAR_PANEL_CLASS}
                            />
                        </div>
                    </div>
                </div>
            </aside>

            <div
                className={`fixed top-0 left-0 right-0 z-40 transition-[transform,opacity] duration-400 lg:hidden ${
                    isNavbarVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
                }`}
                style={{ transitionTimingFunction: NAVBAR_EASING }}
                onMouseEnter={() => {
                    clearHideIntent();
                    clearRevealIntent();
                    setIsNavbarHovered(true);
                }}
                onMouseLeave={scheduleHideIntent}
                onFocusCapture={() => {
                    clearHideIntent();
                    clearRevealIntent();
                    setIsNavbarFocused(true);
                }}
                onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsNavbarFocused(false);
                    }
                }}
            >
                <header
                    className={`transition-all duration-300 border-b bg-black ${
                        scrolled ? 'bg-black/80 backdrop-blur-md border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)]' : 'border-transparent'
                    }`}
                    style={{ transitionTimingFunction: NAVBAR_EASING }}
                >
                    <div className="mx-auto px-4 md:px-10 flex items-center justify-between min-h-[44px] md:min-h-[45px] max-w-[1350px]">
                        {/* Logo */}
                        <PrefetchLink to="/dashboard" className="flex items-center gap-2 group">
                            <OptimizedImage
                                src={logo}
                                alt="DTE Logo"
                                width={70}
                                height={24}
                                className="h-4 w-auto "
                            />
                            <span className="text-white/30 text-xs font-product tracking-widest pl-2 border-l border-white/10 ml-2 hidden sm:block">
                                PLATFORM
                            </span>
                        </PrefetchLink>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1 md:gap-2">
                            {/* Tools Popover (Admin/Worker only) */}
                            {(profile?.role === 'admin' || profile?.role === 'worker') && (
                                <div className="relative flex shrink-0 items-center">
                                    <ToolsPopover
                                        isOpen={isToolsOpen}
                                        onToggle={() => {
                                            setIsToolsOpen((prev) => !prev);
                                            setIsNotificationsOpen(false);
                                            setIsProfileOpen(false);
                                            setIsMenuOpen(false);
                                        }}
                                        onClose={() => setIsToolsOpen(false)}
                                    />
                                </div>
                            )}

                            <div className="relative shrink-0">
                                <NotificationBell
                                    unreadCount={counts.unreadNotifications + messageUnreadTotal}
                                    isOpen={isNotificationsOpen}
                                    onClick={() => {
                                        setIsNotificationsOpen((prev) => !prev);
                                        setIsToolsOpen(false);
                                        setIsProfileOpen(false);
                                        setIsMenuOpen(false);
                                    }}
                                />
                                <NotificationPanel
                                    isOpen={isNotificationsOpen}
                                    onClose={() => setIsNotificationsOpen(false)}
                                    notifications={notifications}
                                    teamItems={teamPreviews}
                                    whatsappItems={whatsappPreviews}
                                    clientItems={clientPreviews}
                                    onMarkAllRead={markAllNotificationsRead}
                                    onMarkRead={markNotificationRead}
                                />
                            </div>

                            {/* Profile Menu Trigger (Desktop & Mobile) */}
                            <div className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileOpen((prev) => !prev);
                                        setIsToolsOpen(false);
                                        setIsNotificationsOpen(false);
                                        setIsMenuOpen(false);
                                        setImgError(false); // Reset error when opening
                                    }}
                                    className="flex items-center group"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative transition-transform group-hover:scale-105 bg-skyblue">
                                        {avatarUrl && !imgError ? (
                                            <img 
                                                src={avatarUrl} 
                                                alt="Profile" 
                                                className="w-full h-full object-cover"
                                                onError={() => setImgError(true)}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                                {initial}
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <ProfileMenu isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
                            </div>

                            {/* Menu Trigger Container (Relative for Popover) */}
                            <div className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen((prev) => !prev);
                                        setIsToolsOpen(false);
                                        setIsProfileOpen(false);
                                        setIsNotificationsOpen(false);
                                    }}
                                    className={`flex items-center group ${isMenuOpen ? 'text-skyblue' : 'text-white hover:text-skyblue'}`}
                                >
                                    <div className={`p-2 rounded-full transition-colors ${isMenuOpen ? 'text-skyblue' : 'text-white'}`}>
                                        <Menu size={20} />
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                <DashboardMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
                            </div>
                        </div>
                    </div>
                </header>
            </div>
        </>
    );
};

export default DashboardNavbar;
