import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getMessagingTabs } from '@/config/messagingTabs';

const MessagingTabs = () => {
    const { profile } = useAuth();
    const tabs = getMessagingTabs(profile?.role);

    return (
        <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.key}
                        to={tab.path}
                        className={({ isActive }) => `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${isActive
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default MessagingTabs;
