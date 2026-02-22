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
        navigate(to);
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
                                    <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
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
