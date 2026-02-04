import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const setHeight = () => {
            const viewport = window.visualViewport;
            // Fallback to innerHeight if visualViewport is not supported (older browsers)
            // But for modern mobile web, visualViewport is the gold standard.
            const height = viewport ? viewport.height : window.innerHeight;

            // Set the CSS variable to the *exact* current visible height
            document.documentElement.style.setProperty('--app-height', `${height}px`);

            // Helpful for specific bottom spacing if needed, but usually redundant if layout is flex-col
            // keeping it simple.
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
        };
    }, [enabled]);
};

export default useViewportHeight;
