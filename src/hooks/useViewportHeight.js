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

            // Heuristic for keyboard open
            maxViewportHeight = Math.max(maxViewportHeight, window.innerHeight, visualHeight);
            const isKeyboardOpen = visualHeight < maxViewportHeight * 0.85;

            // iOS can shift the visual viewport (offsetTop > 0) when keyboard opens.
            // Include that offset to avoid phantom white space under the chat composer.
            const appHeight = visualHeight + Math.max(0, viewportOffsetTop);
            root.style.setProperty('--app-height', `${appHeight}px`);

            if (isKeyboardOpen) {
                root.style.setProperty('--bottom-spacing', '0px');
                root.style.setProperty('--keyboard-open', '1');
            } else {
                root.style.setProperty('--bottom-spacing', 'calc(1rem + env(safe-area-inset-bottom))');
                root.style.setProperty('--keyboard-open', '0');
            }
        };

        const viewport = window.visualViewport;
        const root = document.documentElement;
        const body = document.body;

        root.classList.add('viewport-locked');
        body.classList.add('viewport-locked');
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
            root.classList.remove('viewport-locked');
            body.classList.remove('viewport-locked');
            root.style.removeProperty('--app-height');
            root.style.removeProperty('--bottom-spacing');
            root.style.removeProperty('--keyboard-open');
        };
    }, [enabled]);
};

export default useViewportHeight;
