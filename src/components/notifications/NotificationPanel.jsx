import React, { useCallback, useMemo } from 'react';
import { Bell, X, Check, Hash, Phone, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PopoverPanel from '../ui/PopoverPanel';
import { MOBILE_POPOVER_BACKDROP_CLASS, POPOVER_PANEL_CLASS } from '../ui/popoverStyles';
import { getInitial } from '@/utils/messagingFormatters';

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

const messageSectionConfig = [
    { key: 'team', label: 'Team', itemsProp: 'teamItems', icon: Hash, getTo: (item) => `/dashboard/team-chat?channel=${encodeURIComponent(item.channel_id || '')}` },
    { key: 'whatsapp', label: 'WhatsApp', itemsProp: 'whatsappItems', icon: Phone, getTo: (item) => `/dashboard/inbox?wa=${encodeURIComponent(item.wa_id || '')}` },
    { key: 'clients', label: 'Clients', itemsProp: 'clientItems', icon: Users, getTo: (item) => `/dashboard/client-chat?client=${encodeURIComponent(item.client_id || '')}` },
];

const NotificationPanel = ({
    isOpen,
    onClose,
    notifications = [],
    teamItems = [],
    whatsappItems = [],
    clientItems = [],
    onMarkAllRead,
    onMarkRead,
}) => {
    const navigate = useNavigate();

    const unreadNotifications = useMemo(() =>
        notifications.filter(n => !n.read_at),
        [notifications]);
    const messageSections = useMemo(() => ({
        teamItems,
        whatsappItems,
        clientItems,
    }), [clientItems, teamItems, whatsappItems]);
    const hasUnreadMessages = useMemo(
        () => Object.values(messageSections).some((items) => items.length > 0),
        [messageSections]
    );
    const hasUnreadItems = unreadNotifications.length > 0 || hasUnreadMessages;

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
            case 'new_appointment':
                return '/dashboard/appointments';
            default:
                return '/dashboard';
        }
    }, []);

    const handleItemClick = async (item) => {
        const to = getTo(item);

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
            if (unreadNotifications.length === 1) {
                onClose();
            }
        }
    };

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={POPOVER_PANEL_CLASS}
            backdropClassName={MOBILE_POPOVER_BACKDROP_CLASS}
        >
            <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2 text-neutral-700">
                    <Bell size={16} />
                    <span className="text-sm font-semibold">Notificaciones</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/dashboard/inbox"
                        onClick={onClose}
                        className="text-[11px] text-neutral-700 hover:text-black transition-colors"
                    >
                        Inbox
                    </Link>
                    {unreadNotifications.length > 0 && (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            className="text-[11px] text-neutral-700 hover:text-black transition-colors"
                        >
                            Marcar todo leído
                        </button>
                    )}
                </div>
            </div>

            {!hasUnreadItems && (
                <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-500">
                        <Check size={16} />
                    </div>
                    <span className="text-xs text-neutral-700">No tienes notificaciones pendientes.</span>
                </div>
            )}

            {hasUnreadItems && (
                <div className="max-h-[380px] overflow-y-auto py-2 custom-scrollbar">
                    {messageSectionConfig.map((section) => {
                        const items = messageSections[section.itemsProp] || [];
                        if (items.length === 0) return null;
                        const SectionIcon = section.icon;

                        return (
                            <div key={section.key} className="px-3 py-2 border-b border-white/5">
                                <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                                    {section.label}
                                </div>
                                <div className="space-y-1">
                                    {items.map((item) => (
                                        <Link
                                            key={item.channel_id || item.wa_id || item.client_id || item.title}
                                            to={section.getTo(item)}
                                            onClick={onClose}
                                            className="flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-white/5 transition"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-neutral-700">
                                                {section.key === 'whatsapp'
                                                    ? <SectionIcon size={14} />
                                                    : getInitial(item.title, section.key === 'team' ? 'TC' : 'CL')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-neutral-700 truncate">{item.title}</p>
                                                    <span className="text-[10px] text-neutral-500 shrink-0">
                                                        {formatTimestamp(item.event_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-neutral-600 truncate">
                                                    {item.author ? `${item.author}: ` : ''}{item.preview}
                                                </p>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {unreadNotifications.map((item) => (
                        <div
                            key={item.id}
                            className="px-4 py-3 hover:bg-white/5 transition border-b border-white/5 last:border-b-0 group"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-neutral-700 truncate">
                                            {item.title || 'Notificación'}
                                        </p>
                                        <span className="text-[10px] text-neutral-500 shrink-0">
                                            {formatTimestamp(item.created_at)}
                                        </span>
                                    </div>
                                    {item.body && (
                                        <p className="text-[11px] text-neutral-600 mt-0.5 break-words line-clamp-2">
                                            {item.body}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => handleDismiss(e, item)}
                                    className="mt-1 text-neutral-500 hover:text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    aria-label="Descartar notificación"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PopoverPanel>
    );
};

export default NotificationPanel;
