import { Hash, MessageSquare, Phone } from 'lucide-react';

const MESSAGING_TABS = {
    admin: [
        { key: 'team', label: 'Team', path: '/dashboard/team-chat', icon: Hash },
        { key: 'whatsapp', label: 'WhatsApp', path: '/dashboard/inbox', icon: Phone },
        { key: 'clients', label: 'Clients', path: '/dashboard/client-chat', icon: MessageSquare },
    ],
    worker: [
        { key: 'team', label: 'Team', path: '/dashboard/team-chat', icon: Hash },
        { key: 'whatsapp', label: 'WhatsApp', path: '/dashboard/inbox', icon: Phone },
        { key: 'clients', label: 'Clients', path: '/dashboard/client-chat', icon: MessageSquare },
    ],
    client: [
        { key: 'clients', label: 'Soporte', path: '/dashboard/client-chat', icon: MessageSquare },
    ],
};

export const getMessagingTabs = (role = 'client') => MESSAGING_TABS[role] || MESSAGING_TABS.client;

export const getDefaultMessagingPath = (role = 'client') => {
    const tabs = getMessagingTabs(role);
    return tabs[0]?.path || '/dashboard/client-chat';
};
