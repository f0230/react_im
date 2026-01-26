import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const setHeight = () => {
            const viewport = window.visualViewport;
            const height = viewport ? viewport.height : window.innerHeight;
            const root = document.documentElement;

            // Update CSS variable for components
            root.style.setProperty('--app-height', `${height}px`);

            // Heuristic for keyboard open
            const isKeyboardOpen = height < window.screen.availHeight * 0.8;

            if (isKeyboardOpen) {
                root.style.setProperty('--bottom-spacing', '0.5rem');
                root.style.setProperty('--keyboard-open', '1');
            } else {
                root.style.setProperty('--bottom-spacing', 'calc(1rem + env(safe-area-inset-bottom))');
                root.style.setProperty('--keyboard-open', '0');
            }

            // Lock body/html to prevent background scrolling
            // We use the pixel height to force it to match the visual viewport
            document.body.style.height = `${height}px`;
            document.body.style.overflow = 'hidden';

            root.style.height = `${height}px`;
            root.style.overflow = 'hidden';
        };

        const viewport = window.visualViewport;

        setHeight();

        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);

        if (viewport) {
            viewport.addEventListener('resize', setHeight);
            viewport.addEventListener('scroll', setHeight);
        }

        return () => {
            window.removeEventListener('resize', setHeight);
            window.removeEventListener('orientationchange', setHeight);
            if (viewport) {
                viewport.removeEventListener('resize', setHeight);
                viewport.removeEventListener('scroll', setHeight);
            }

            // Clean up: Reset body/html styles
            document.body.style.height = '';
            document.body.style.overflow = '';
            document.documentElement.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.removeProperty('--app-height');
            document.documentElement.style.removeProperty('--bottom-spacing');
            document.documentElement.style.removeProperty('--keyboard-open');
        };
    }, [enabled]);
};

export default useViewportHeight;
