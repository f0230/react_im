import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const setHeight = () => {
            const viewport = window.visualViewport;
            const height = viewport ? viewport.height : window.innerHeight;
            const root = document.documentElement;

            root.style.setProperty('--app-height', `${height}px`);

            // Heuristic for keyboard open:
            // If viewport height is significantly less than screen height (e.g. < 80%),
            // or significantly less than the initial innerHeight (though innerHeight might change too).
            // A simple check is: is visualViewport.height < window.innerHeight?
            // On iOS, visualViewport shrinks, innerHeight often stays same (layout viewport).
            // On Android, sometimes both shrink.

            // Let's rely on a reasonable threshold relative to available screen height.
            // If the viewport is < 75% of the screen height, it's likely a keyboard or other panel.
            // Or we can check if height is significantly smaller than the *maximum* height we've seen?
            // Actually, comparing to window.outerHeight or screen.height is decent.
            const isKeyboardOpen = height < window.screen.availHeight * 0.8;

            // Set spacing variables
            if (isKeyboardOpen) {
                // Keyboard open: minimal padding (just a bit of breathing room)
                root.style.setProperty('--bottom-spacing', '0.5rem');
                root.style.setProperty('--keyboard-open', '1');
            } else {
                // Keyboard closed: full padding including safe area
                root.style.setProperty('--bottom-spacing', 'calc(1rem + env(safe-area-inset-bottom))');
                root.style.setProperty('--keyboard-open', '0');
            }
        };

        const viewport = window.visualViewport;

        setHeight();

        // Resize happens when keyboard opens/closes or rotation
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
        };
    }, [enabled]);
};

export default useViewportHeight;
