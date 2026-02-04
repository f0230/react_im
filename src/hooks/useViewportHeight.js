import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;
        let maxViewportHeight = window.innerHeight;

        const setHeight = () => {
            const viewport = window.visualViewport;
            const visualHeight = viewport ? viewport.height : window.innerHeight;
            const viewportOffsetTop = viewport ? viewport.offsetTop : 0;
            const root = document.documentElement;

            // Detect keyboard by measured inset instead of ratio-based heuristics.
            maxViewportHeight = Math.max(maxViewportHeight, window.innerHeight, visualHeight);
            const keyboardInset = Math.max(0, Math.round(maxViewportHeight - (visualHeight + viewportOffsetTop)));
            const isKeyboardOpen = keyboardInset > 120;

            // Keep app height synced to the currently visible area.
            const appHeight = Math.max(0, Math.round(maxViewportHeight - (isKeyboardOpen ? keyboardInset : 0)));
            root.style.setProperty('--app-height', `${appHeight}px`);
            root.style.setProperty('--keyboard-inset', `${isKeyboardOpen ? keyboardInset : 0}px`);

            if (isKeyboardOpen) {
                root.style.setProperty('--bottom-spacing', '0px');
                root.style.setProperty('--keyboard-open', '1');
            } else {
                root.style.setProperty('--bottom-spacing', 'calc(1rem + env(safe-area-inset-bottom))');
                root.style.setProperty('--keyboard-open', '0');
            }
        };

        const viewport = window.visualViewport;
        setHeight();

        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);

        if (viewport) {
            viewport.addEventListener('resize', setHeight);
        }

        return () => {
            window.removeEventListener('resize', setHeight);
            window.removeEventListener('orientationchange', setHeight);
            if (viewport) {
                viewport.removeEventListener('resize', setHeight);
            }

            // Clean up CSS variables
            const root = document.documentElement;
            root.style.removeProperty('--app-height');
            root.style.removeProperty('--bottom-spacing');
            root.style.removeProperty('--keyboard-open');
            root.style.removeProperty('--keyboard-inset');
        };
    }, [enabled]);
};

export default useViewportHeight;
