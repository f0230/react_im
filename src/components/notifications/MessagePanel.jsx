import React from 'react';
import { Link } from 'react-router-dom';
import { Hash, MessageSquare, Phone, Users } from 'lucide-react';
import PopoverPanel from '../ui/PopoverPanel';
import { POPOVER_PANEL_CLASS } from '../ui/popoverStyles';
import { formatTimestamp, getInitial } from '@/utils/messagingFormatters';

const EmptyState = () => (
    <div className="px-4 py-6 text-center text-xs text-white/60">
        No hay mensajes nuevos.
    </div>
);

const sectionConfig = [
    { key: 'team', label: 'Team', itemsProp: 'teamItems', icon: Hash, getTo: (item) => `/dashboard/team-chat?channel=${encodeURIComponent(item.channel_id || '')}` },
    { key: 'whatsapp', label: 'WhatsApp', itemsProp: 'whatsappItems', icon: Phone, getTo: (item) => `/dashboard/inbox?wa=${encodeURIComponent(item.wa_id || '')}` },
    { key: 'clients', label: 'Clients', itemsProp: 'clientItems', icon: Users, getTo: (item) => `/dashboard/client-chat?client=${encodeURIComponent(item.client_id || '')}` },
];

const MessagePanel = ({ isOpen, onClose, teamItems = [], whatsappItems = [], clientItems = [] }) => {
    const sectionItems = {
        teamItems,
        whatsappItems,
        clientItems,
    };
    const hasItems = Object.values(sectionItems).some((items) => items.length > 0);

    return (
        <PopoverPanel
            isOpen={isOpen}
            onClose={onClose}
            className={POPOVER_PANEL_CLASS}
        >
            <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2 text-white">
                    <MessageSquare size={16} />
                    <span className="text-sm font-semibold">Mensajes</span>
                </div>

                <Link
                    to="/dashboard/messages"
                    onClick={onClose}
                    className="text-[11px] text-white/60 hover:text-white"
                >
                    Abrir panel
                </Link>
            </div>

            {!hasItems && <EmptyState />}

            {sectionConfig.map((section) => {
                const items = sectionItems[section.itemsProp] || [];
                if (items.length === 0) return null;
                return (
                    <div key={section.key} className="px-3 py-2 border-t border-white/5 first:border-t-0">
                        <div className="space-y-1">
                            {items.map((item) => {
                                const SectionIcon = section.icon;
                                return (
                                    <Link
                                        key={item.channel_id || item.wa_id || item.client_id || item.title}
                                        to={section.getTo(item)}
                                        onClick={onClose}
                                        className="flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-white/5 transition"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                                            {section.key === 'whatsapp'
                                                ? <SectionIcon size={14} />
                                                : getInitial(item.title, section.key === 'team' ? 'TC' : 'CL')}
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
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </PopoverPanel>
    );
};

export default MessagePanel;
