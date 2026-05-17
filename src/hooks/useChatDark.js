import { useCallback, useState } from 'react';

const useChatDark = () => {
    const [isDark, setIsDark] = useState(() => {
        try { return localStorage.getItem('chat-dark') === 'true'; } catch { return false; }
    });

    const toggle = useCallback(() => {
        setIsDark((prev) => {
            const next = !prev;
            try { localStorage.setItem('chat-dark', String(next)); } catch { }
            return next;
        });
    }, []);

    return { isDark, toggle };
};

export default useChatDark;
