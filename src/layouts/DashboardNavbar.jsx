import React, { useState, useEffect, useRef } from 'react';
import OptimizedImage from '../components/OptimizedImage'; // Adjust path if needed
import logo from '../assets/Group 255.svg'; // Check path
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUnreadCounts } from '@/context/UnreadCountsContext';
import MessageIcon from '@/components/notifications/MessageIcon';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessagePanel from '@/components/notifications/MessagePanel';
import NotificationPanel from '@/components/notifications/NotificationPanel';

import ProfileMenu from './ProfileMenu';
import DashboardMenu from './DashboardMenu';
import ToolsPopover from '@/components/ToolsPopover';
import { PrefetchLink } from '@/components/navigation/PrefetchLink';

const detectHoverRevealSupport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const NAVBAR_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const NAVBAR_HIDE_DELAY_MS = 180;
const NAVBAR_REVEAL_DELAY_MS = 900;

const DashboardNavbar = ({ autoHideInStudio = false, onVisibilityChange }) => {
    const [scrolled, setScrolled] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMessagesOpen, setIsMessagesOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [supportsHoverReveal, setSupportsHoverReveal] = useState(() => detectHoverRevealSupport());
    const [isRevealHotspotActive, setIsRevealHotspotActive] = useState(false);
    const [isNavbarHovered, setIsNavbarHovered] = useState(false);
    const [isNavbarFocused, setIsNavbarFocused] = useState(false);
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

    // Get avatar from Google metadata (faster) or profile table
    const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url;
    const initial = (user?.user_metadata?.full_name || profile?.full_name || 'U').charAt(0);

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
            setIsMessagesOpen(false);
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
        setIsMessagesOpen(false);
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
        isMessagesOpen ||
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
                    className="fixed inset-x-0 top-0 z-30 h-5"
                    onMouseEnter={scheduleRevealIntent}
                    onMouseLeave={() => {
                        clearRevealIntent();
                        if (isNavbarVisible) {
                            scheduleHideIntent();
                        }
                    }}
                />
            )}

            <div
                className={`fixed top-0 left-0 right-0 z-40 transition-[transform,opacity] duration-400 ${
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
                    <div className="mx-auto px-4 md:px-10 flex items-center justify-between min-h-[56px] md:min-h-[45px] max-w-[1350px]">
                        {/* Logo */}
                        <PrefetchLink to="/dashboard" className="flex items-center gap-2 group">
                            <OptimizedImage
                                src={logo}
                                alt="DTE Logo"
                                width={70}
                                height={24}
                                className="h-3 w-auto "
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
                                            setIsMessagesOpen(false);
                                            setIsNotificationsOpen(false);
                                            setIsProfileOpen(false);
                                            setIsMenuOpen(false);
                                        }}
                                        onClose={() => setIsToolsOpen(false)}
                                    />
                                </div>
                            )}

                            <div className="relative shrink-0">
                                <MessageIcon
                                    unreadCount={messageUnreadTotal}
                                    isOpen={isMessagesOpen}
                                    onClick={() => {
                                        setIsMessagesOpen((prev) => !prev);
                                        setIsToolsOpen(false);
                                        setIsNotificationsOpen(false);
                                        setIsProfileOpen(false);
                                        setIsMenuOpen(false);
                                    }}
                                />
                                <MessagePanel
                                    isOpen={isMessagesOpen}
                                    onClose={() => setIsMessagesOpen(false)}
                                    teamItems={teamPreviews}
                                    whatsappItems={whatsappPreviews}
                                    clientItems={clientPreviews}
                                />
                            </div>

                            <div className="relative shrink-0">
                                <NotificationBell
                                    unreadCount={counts.unreadNotifications}
                                    isOpen={isNotificationsOpen}
                                    onClick={() => {
                                        setIsNotificationsOpen((prev) => !prev);
                                        setIsToolsOpen(false);
                                        setIsMessagesOpen(false);
                                        setIsProfileOpen(false);
                                        setIsMenuOpen(false);
                                    }}
                                />
                                <NotificationPanel
                                    isOpen={isNotificationsOpen}
                                    onClose={() => setIsNotificationsOpen(false)}
                                    notifications={notifications}
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
                                        setIsMessagesOpen(false);
                                        setIsNotificationsOpen(false);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center group"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative transition-transform group-hover:scale-105">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-skyblue flex items-center justify-center text-xs font-bold text-white">
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
                                        setIsMessagesOpen(false);
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
