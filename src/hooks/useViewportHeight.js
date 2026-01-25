import { useEffect } from 'react';

const getViewportHeight = () => {
    if (typeof window === 'undefined') return 0;
    return window.visualViewport?.height || window.innerHeight;
};

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const root = document.documentElement;
        const viewport = window.visualViewport;

        const update = () => {
            const height = getViewportHeight();
            if (height) {
                root.style.setProperty('--app-height', `${height}px`);
            }
        };

        update();

        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        if (viewport) {
            viewport.addEventListener('resize', update);
        }

        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
            if (viewport) {
                viewport.removeEventListener('resize', update);
            }
        };
    }, [enabled]);
};

export default useViewportHeight;
