import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfileMenu = ({ isOpen, onClose }) => {
    const { user, profile, signOut } = useAuth();

    // Prefer Google metadata for avatar/name as it's often more up to date or readily available
    const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url;
    const fullName = user?.user_metadata?.full_name || profile?.full_name || 'Usuario';
    const email = user?.email || profile?.email;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Invisible backdrop */}
                    <div className="fixed inset-0 z-40" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full right-0 mt-4 w-[260px] bg-[#111] border border-white/10 rounded-[20px] shadow-2xl z-50 overflow-hidden font-product"
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
                                onClick={() => { signOut(); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-[15px] text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                            >
                                <LogOut size={18} />
                                <span className="text-sm">Cerrar Sesión</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfileMenu;
