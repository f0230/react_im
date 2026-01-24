import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';

const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const NotificationPanel = ({ isOpen, onClose, notifications = [], onMarkAllRead }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -8 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute top-full right-0 mt-4 w-[320px] bg-[#111] border border-white/10 rounded-[22px] shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Bell size={16} />
                                <span className="text-sm font-semibold">Notificaciones</span>
                            </div>
                            <button
                                type="button"
                                onClick={onMarkAllRead}
                                className="text-[11px] text-white/60 hover:text-white"
                            >
                                Marcar todo leido
                            </button>
                        </div>

                        {notifications.length === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-white/60">
                                No hay notificaciones nuevas.
                            </div>
                        )}

                        {notifications.length > 0 && (
                            <div className="max-h-[380px] overflow-y-auto py-2">
                                {notifications.map((item) => {
                                    const isUnread = !item.read_at;
                                    return (
                                        <div
                                            key={item.id}
                                            className="px-4 py-3 hover:bg-white/5 transition border-b border-white/5 last:border-b-0"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`mt-1 w-2 h-2 rounded-full ${isUnread ? 'bg-red-500' : 'bg-white/10'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-semibold text-white truncate">
                                                            {item.title || 'Notificacion'}
                                                        </p>
                                                        <span className="text-[10px] text-white/40 shrink-0">
                                                            {formatTimestamp(item.created_at)}
                                                        </span>
                                                    </div>
                                                    {item.body && (
                                                        <p className="text-[11px] text-white/60 mt-1 break-words">
                                                            {item.body}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationPanel;
