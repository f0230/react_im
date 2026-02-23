import React, { useCallback, useMemo } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PopoverPanel from '../ui/PopoverPanel';
import { POPOVER_PANEL_CLASS } from '../ui/popoverStyles';

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

const NotificationPanel = ({ isOpen, onClose, notifications = [], onMarkAllRead, onMarkRead }) => {
    const navigate = useNavigate();

    // Only show unread notifications in this panel, similar to how MessagePanel works
    const unreadNotifications = useMemo(() =>
        notifications.filter(n => !n.read_at),
        [notifications]);

    const getTo = useCallback((item) => {
        const data = item.data || {};
        const projectId = data.project_id;
        const serviceId = data.service_id;

        switch (item.type) {
            case 'new_task':
            case 'task_assignment':
            case 'new_comment':
                if (projectId && serviceId) {
                    return `/dashboard/tasks?projectId=${projectId}&serviceId=${serviceId}`;
                }
                if (projectId) {
                    return `/dashboard/tasks?projectId=${projectId}`;
                }
                return '/dashboard/tasks';
            case 'new_project':
                if (projectId) {
                    return `/dashboard/projects?projectId=${projectId}`;
                }
                return '/dashboard/projects';
            case 'figma_comment':
                if (data.figma_url) {
                    return data.figma_url;
                }
                if (projectId) {
                    return `/dashboard/tasks?projectId=${projectId}`;
                }
                return '/dashboard/projects';
            default:
                return '/dashboard';
        }
    }, []);

    const handleItemClick = async (item) => {
        const to = getTo(item);

        // Mark as read if unread
        if (!item.read_at && onMarkRead) {
            await onMarkRead(item.id);
        }

        onClose();

        if (to.startsWith('http')) {
            window.open(to, '_blank', 'noopener,noreferrer');
        } else {
            navigate(to);
        }
    };

    const handleDismiss = async (e, item) => {
        e.stopPropagation();
        if (onMarkRead) {
            await onMarkRead(item.id);
        }
    };

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={POPOVER_PANEL_CLASS}
        >
            <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2 text-white">
                    <Bell size={16} />
                    <span className="text-sm font-semibold">Notificaciones</span>
                </div>
                <div className="flex items-center gap-3">
                    {unreadNotifications.length > 0 && (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            className="text-[11px] text-white/60 hover:text-white"
                        >
                            Marcar todo leido
                        </button>
                    )}
                </div>
            </div>

            {unreadNotifications.length === 0 && (
                <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                        <Check size={16} />
                    </div>
                    <span className="text-xs text-white/60">No tienes notificaciones pendientes.</span>
                </div>
            )}

            {unreadNotifications.length > 0 && (
                <div className="max-h-[380px] overflow-y-auto py-2 custom-scrollbar">
                    {unreadNotifications.map((item) => {
                        return (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="px-4 py-3 hover:bg-white/5 transition border-b border-white/5 last:border-b-0 cursor-pointer group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1.5 shrink-0 relative">
                                        <span className="block w-2 h-2 rounded-full bg-red-500" />
                                        {item.type === 'figma_comment' && (
                                            <div className="absolute -top-1.5 -left-1.5 bg-white rounded-full p-0.5 shadow-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 38 57" fill="none">
                                                    <path d="M19 28.5C19 25.9861 20.0009 23.5752 21.7825 21.7936C23.5641 20.0121 25.975 19.0112 28.4889 19.0112H38V28.5H28.4889C25.975 28.5 23.5641 29.5009 21.7825 31.2825C20.0009 33.0641 19 35.475 19 37.9889V47.5C19 50.0139 17.9991 52.4248 16.2175 54.2064C14.4359 55.9879 12.025 56.9888 9.51111 56.9888C6.99725 56.9888 4.58636 55.9879 2.80481 54.2064C1.02326 52.4248 0.022421 50.0139 0.022421 47.5C0.022421 44.9861 1.02326 42.5752 2.80481 40.7936C4.56408 39.0121 6.99725 38.0112 9.51111 38.0112H19V28.5Z" fill="#1ABCFE" />
                                                    <path d="M0 9.5C0 6.98614 1.00089 4.57522 2.78249 2.79363C4.56408 1.01205 6.975 0.0112247 9.48889 0.0112247H19V19H9.48889C6.975 19 4.56408 17.9991 2.78249 16.2175C1.00089 14.4359 0 12.025 0 9.5Z" fill="#F24E1E" />
                                                    <path d="M19 0.0112247H28.5111C31.025 0.0112247 33.4359 1.01205 35.2175 2.79363C36.9991 4.57522 38 6.98614 38 9.5C38 12.0139 36.9991 14.4248 35.2175 16.2064C33.4359 17.9879 31.025 18.9888 28.5111 18.9888H19V0.0112247Z" fill="#FF7262" />
                                                    <path d="M0 28.5C0 25.9861 1.00089 23.5752 2.78249 21.7936C4.56408 20.0121 6.975 19.0112 9.48889 19.0112H19V38H9.48889C6.975 38 4.56408 36.9991 2.78249 35.2175C1.00089 33.4359 0 31.025 0 28.5Z" fill="#A259FF" />
                                                    <path d="M19 19H28.5111C31.025 19 33.4359 20.0009 35.2175 21.7825C36.9991 23.5641 38 25.975 38 28.4889C38 31.0028 36.9991 33.4137 35.2175 35.1952C33.4359 36.9768 31.025 37.9777 28.5111 37.9777H19V19Z" fill="#1ABCFE" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold text-white truncate">
                                                {item.title || 'Notificación'}
                                            </p>
                                            <span className="text-[10px] text-white/40 shrink-0">
                                                {formatTimestamp(item.created_at)}
                                            </span>
                                        </div>
                                        {item.body && (
                                            <p className="text-[11px] text-white/60 mt-0.5 break-words line-clamp-2">
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
        </PopoverPanel>
    );
};

export default NotificationPanel;
