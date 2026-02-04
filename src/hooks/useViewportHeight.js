import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;
        let maxViewportHeight = window.innerHeight;

        const setHeight = () => {
            const viewport = window.visualViewport;
            const visualHeight = viewport ? viewport.height : window.innerHeight;
            const root = document.documentElement;

            // Heuristic for keyboard open
            maxViewportHeight = Math.max(maxViewportHeight, visualHeight);
            const isKeyboardOpen = visualHeight < maxViewportHeight * 0.85;

            // Match the visible viewport so fixed/sticky chat input stays attached to keyboard.
            root.style.setProperty('--app-height', `${visualHeight}px`);

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
            document.documentElement.style.removeProperty('--app-height');
            document.documentElement.style.removeProperty('--bottom-spacing');
            document.documentElement.style.removeProperty('--keyboard-open');
        };
    }, [enabled]);
};

export default useViewportHeight;
