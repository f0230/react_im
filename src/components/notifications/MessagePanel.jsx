import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Phone } from 'lucide-react';
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

const EmptyState = () => (
    <div className="px-4 py-6 text-center text-xs text-white/60">
        No hay mensajes nuevos.
    </div>
);

const MessagePanel = ({ isOpen, onClose, teamItems = [], whatsappItems = [] }) => {
    const hasItems = teamItems.length > 0 || whatsappItems.length > 0;

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={POPOVER_PANEL_CLASS}
        >
            <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <MessageSquare size={16} />
                    <span className="text-sm font-semibold">Mensajes</span>
                </div>
                <Link
                    to="/dashboard/team-chat"
                    onClick={onClose}
                    className="text-[11px] text-white/60 hover:text-white"
                >
                    Ver chat
                </Link>
            </div>

            {!hasItems && <EmptyState />}

            {teamItems.length > 0 && (
                <div className="px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 px-2 py-1">Team</div>
                    <div className="space-y-1">
                        {teamItems.map((item) => (
                            <Link
                                key={item.channel_id || item.title}
                                to="/dashboard/team-chat"
                                onClick={onClose}
                                className="flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-white/5 transition"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                                    {item.title?.slice(0, 2)?.toUpperCase() || 'TC'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                                        <span className="text-[10px] text-white/40 shrink-0">
                                            {formatTimestamp(item.event_at)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/60 truncate">
                                        {item.author ? `${item.author}: ` : ''}{item.preview}
                                    </p>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {whatsappItems.length > 0 && (
                <div className="px-3 py-2 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 px-2 py-1">WhatsApp</div>
                    <div className="space-y-1">
                        {whatsappItems.map((item) => (
                            <Link
                                key={item.wa_id || item.title}
                                to={`/dashboard/inbox?wa=${encodeURIComponent(item.wa_id || '')}`}
                                onClick={onClose}
                                className="flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-white/5 transition"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                                    <Phone size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                                        <span className="text-[10px] text-white/40 shrink-0">
                                            {formatTimestamp(item.event_at)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/60 truncate">{item.preview}</p>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </PopoverPanel>
    );
};

export default MessagePanel;
