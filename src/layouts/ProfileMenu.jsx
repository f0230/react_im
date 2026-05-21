import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PopoverPanel from '../components/ui/PopoverPanel';
import { MOBILE_POPOVER_BACKDROP_CLASS, POPOVER_PANEL_CLASS } from '../components/ui/popoverStyles';
import { PrefetchNavLink } from '@/components/navigation/PrefetchLink';

const ProfileMenu = ({ isOpen, onClose }) => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [imgError, setImgError] = useState(false);

    // Reset error when popover opens
    useEffect(() => {
        if (isOpen) {
            setImgError(false);
        }
    }, [isOpen]);

    const handleSignOut = async () => {
        onClose();
        await signOut();
        navigate('/');
    };

    // Prefer profile avatar_url from Supabase (set by user in Settings)
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const fullName = profile?.full_name || user?.user_metadata?.full_name || 'Usuario';
    const email = user?.email || profile?.email;
    const initial = fullName.charAt(0).toUpperCase();

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={`${POPOVER_PANEL_CLASS} font-product`}
            backdropClassName={MOBILE_POPOVER_BACKDROP_CLASS}
        >

            {/* User Info Header */}
            <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-skyblue">
                        {avatarUrl && !imgError ? (
                            <img 
                                src={avatarUrl} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                {initial}
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white font-bold text-sm truncate">{fullName}</p>
                        <p className="text-white/55 text-xs truncate font-inter">{email}</p>
                    </div>
                </div>
            </div>

            <div className="p-2 space-y-1">
                <PrefetchNavLink
                    to="/dashboard/profile"
                    onClick={onClose}
                    className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-[15px] transition-all duration-200 group
                            ${isActive
                            ? 'bg-white text-black font-bold'
                            : 'text-white/78 hover:bg-white/10 hover:text-white'}
                        `}
                >
                    <User size={18} className="transition-colors text-current" />
                    <span className="text-sm">Mi Perfil</span>
                </PrefetchNavLink>

                <PrefetchNavLink
                    to="/dashboard/settings"
                    onClick={onClose}
                    className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-[15px] transition-all duration-200 group
                            ${isActive
                            ? 'bg-white text-black font-bold'
                            : 'text-white/78 hover:bg-white/10 hover:text-white'}
                        `}
                >
                    <Settings size={18} className="transition-colors text-current" />
                    <span className="text-sm">Configuración</span>
                </PrefetchNavLink>

                <div className="h-px bg-white/5 my-2 mx-2" />

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[15px] text-white/78 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                >
                    <LogOut size={18} />
                    <span className="text-sm">Cerrar Sesión</span>
                </button>
            </div>
        </PopoverPanel>
    );
};

export default ProfileMenu;
