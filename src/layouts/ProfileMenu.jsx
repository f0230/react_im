import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PopoverPanel from '../components/ui/PopoverPanel';
import { POPOVER_PANEL_CLASS } from '../components/ui/popoverStyles';

const ProfileMenu = ({ isOpen, onClose }) => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        onClose();
        await signOut();
        navigate('/');
    };

    // Prefer Google metadata for avatar/name as it's often more up to date or readily available
    const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url;
    const fullName = user?.user_metadata?.full_name || profile?.full_name || 'Usuario';
    const email = user?.email || profile?.email;

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`${POPOVER_PANEL_CLASS} font-product`}
        >
            {/* User Info Header */}
            <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-skyblue flex items-center justify-center text-white font-bold">
                                {fullName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white font-bold text-sm truncate">{fullName}</p>
                        <p className="text-gray-400 text-xs truncate font-inter">{email}</p>
                    </div>
                </div>
            </div>

            <div className="p-2 space-y-1">
                <NavLink
                    to="/dashboard/profile"
                    onClick={onClose}
                    className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-[15px] transition-all duration-200 group
                            ${isActive
                            ? 'bg-white/10 text-white font-bold'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                        `}
                >
                    <User size={18} className="group-hover:text-skyblue transition-colors" />
                    <span className="text-sm">Mi Perfil</span>
                </NavLink>

                <NavLink
                    to="/dashboard/settings"
                    onClick={onClose}
                    className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-[15px] transition-all duration-200 group
                            ${isActive
                            ? 'bg-white/10 text-white font-bold'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                        `}
                >
                    <Settings size={18} className="group-hover:text-skyblue transition-colors" />
                    <span className="text-sm">Configuración</span>
                </NavLink>

                <div className="h-px bg-white/5 my-2 mx-2" />

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[15px] text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                >
                    <LogOut size={18} />
                    <span className="text-sm">Cerrar Sesión</span>
                </button>
            </div>
        </PopoverPanel>
    );
};

export default ProfileMenu;
