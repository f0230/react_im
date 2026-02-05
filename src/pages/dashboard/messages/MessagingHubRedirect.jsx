import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDefaultMessagingPath, getMessagingTabs } from '@/config/messagingTabs';

const MessagingHubRedirect = () => {
    const { profile } = useAuth();
    const location = useLocation();
    const role = profile?.role || 'client';
    const tabs = getMessagingTabs(role);
    const params = new URLSearchParams(location.search);
    const tabKey = params.get('tab');
    const tab = tabs.find((item) => item.key === tabKey);
    const target = tab?.path || getDefaultMessagingPath(role);
    return <Navigate to={target} replace />;
};

export default MessagingHubRedirect;
