import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const root = document.documentElement;
        const setHeight = () => {
            const height = window.visualViewport?.height || window.innerHeight;
            root.style.setProperty('--app-height', `${Math.round(height)}px`);
        };

        const viewport = window.visualViewport;
        setHeight();

        if (viewport) {
            viewport.addEventListener('resize', setHeight);
        }
        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);

        return () => {
            if (viewport) {
                viewport.removeEventListener('resize', setHeight);
            }
            window.removeEventListener('resize', setHeight);
            window.removeEventListener('orientationchange', setHeight);
            root.style.removeProperty('--app-height');
            root.style.removeProperty('--app-viewport-offset-top');
        };
    }, [enabled]);
};

export default useViewportHeight;
