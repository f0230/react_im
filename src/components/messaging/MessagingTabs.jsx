import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUnreadCounts } from '@/context/UnreadCountsContext';
import { getMessagingTabs } from '@/config/messagingTabs';

const MessagingTabs = () => {
    const { profile } = useAuth();
    const { counts } = useUnreadCounts();
    const tabs = getMessagingTabs(profile?.role);
    const unreadMap = {
        team: counts.unreadTeam,
        whatsapp: counts.unreadWhatsapp,
        clients: counts.unreadClients,
    };
    const formatUnread = (value) => {
        if (!value) return 0;
        return value > 99 ? '99+' : value;
    };

    return (
        <div className="shrink-0 bg-white px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.key}
                        to={tab.path}
                        className={({ isActive }) => `inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all whitespace-nowrap ${isActive
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                            }`}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                        {unreadMap[tab.key] > 0 && (
                            <span
                                className="ml-0.5 inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1"
                                aria-label={`${formatUnread(unreadMap[tab.key])} mensajes sin leer`}
                            >
                                {formatUnread(unreadMap[tab.key])}
                            </span>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default MessagingTabs;
