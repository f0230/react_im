import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const setHeight = () => {
            const viewport = window.visualViewport;
            const height = viewport ? viewport.height : window.innerHeight;
            const heightDelta = Math.max(0, window.innerHeight - height);
            const keyboardIsLikelyOpen = heightDelta > 120;
            const offsetTop = viewport && keyboardIsLikelyOpen
                ? Math.max(0, viewport.offsetTop || 0)
                : 0;

            document.documentElement.style.setProperty('--app-height', `${height}px`);
            document.documentElement.style.setProperty('--app-viewport-offset-top', `${offsetTop}px`);
        };

        const viewport = window.visualViewport;
        setHeight();

        // Listeners
        if (viewport) {
            viewport.addEventListener('resize', setHeight);
            viewport.addEventListener('scroll', setHeight); // Sometimes scroll affects viewport in weird ways
        }
        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);

        return () => {
            if (viewport) {
                viewport.removeEventListener('resize', setHeight);
                viewport.removeEventListener('scroll', setHeight);
            }
            window.removeEventListener('resize', setHeight);
            window.removeEventListener('orientationchange', setHeight);

            // Optional: Clean up
            // document.documentElement.style.removeProperty('--app-height');
            // document.documentElement.style.removeProperty('--app-viewport-offset-top');
        };
    }, [enabled]);
};

export default useViewportHeight;
