import React, { useState, useEffect } from 'react';
import OptimizedImage from '../components/OptimizedImage'; // Adjust path if needed
import logo from '../assets/Group 255.svg'; // Check path
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import MessageIcon from '@/components/notifications/MessageIcon';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessagePanel from '@/components/notifications/MessagePanel';
import NotificationPanel from '@/components/notifications/NotificationPanel';

import ProfileMenu from './ProfileMenu';
import DashboardMenu from './DashboardMenu';
import ToolsPopover from '@/components/ToolsPopover';
import { PrefetchLink } from '@/components/navigation/PrefetchLink';

const DashboardNavbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMessagesOpen, setIsMessagesOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const { user, profile } = useAuth();
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
    const firstName = (user?.user_metadata?.full_name || profile?.full_name || '').split(' ')[0];

    useEffect(() => {
        const handleScroll = () => {
            const nextScrolled = window.scrollY > 20;
            setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b  ${scrolled ? 'bg-black/80 backdrop-blur-md border-white/10 ' : 'bg-transparent border-transparent '}`}
        >
            <div className="mx-auto px-6 md:px-10 flex items-center justify-between bg-black min-h-[45px]">
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
                <div className="flex items-center gap-2">
                    {/* Tools Popover (Admin/Worker only) */}
                    {(profile?.role === 'admin' || profile?.role === 'worker') && (
                        <div className="relative flex items-center">
                            <ToolsPopover />
                        </div>
                    )}

                    <div className="relative">
                        <MessageIcon
                            unreadCount={messageUnreadTotal}
                            isOpen={isMessagesOpen}
                            onClick={() => {
                                setIsMessagesOpen((prev) => !prev);
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

                    <div className="relative">
                        <NotificationBell
                            unreadCount={counts.unreadNotifications}
                            isOpen={isNotificationsOpen}
                            onClick={() => {
                                setIsNotificationsOpen((prev) => !prev);
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
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsProfileOpen((prev) => !prev);
                                setIsMessagesOpen(false);
                                setIsNotificationsOpen(false);
                                setIsMenuOpen(false);
                            }}
                            className="flex items-center  group"
                        >
                            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 relative">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-skyblue flex items-center justify-center text-[10px] font-bold text-white">
                                        {initial}
                                    </div>
                                )}
                            </div>

                        </button>

                        <ProfileMenu isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
                    </div>

                    {/* Menu Trigger Container (Relative for Popover) */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsMenuOpen((prev) => !prev);
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
    );
};

export default DashboardNavbar;
