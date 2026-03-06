import React, { createContext, useContext } from 'react';
import { useUnreadCounts as useUnreadCountsHook } from '@/hooks/useUnreadCounts';

const UnreadCountsContext = createContext(null);

export const UnreadCountsProvider = ({ children }) => {
    const unreadCounts = useUnreadCountsHook();
    return (
        <UnreadCountsContext.Provider value={unreadCounts}>
            {children}
        </UnreadCountsContext.Provider>
    );
};

export const useUnreadCounts = () => {
    const context = useContext(UnreadCountsContext);
    if (!context) {
        throw new Error('useUnreadCounts must be used within an UnreadCountsProvider');
    }
    return context;
};

