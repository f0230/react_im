import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const setHeight = () => {
            const viewport = window.visualViewport;
            // Fallback to innerHeight if visualViewport is not supported (older browsers)
            // But for modern mobile, visualViewport.height tells us the height *above* the keyboard.
            const height = viewport ? viewport.height : window.innerHeight;

            // Set the variable to the current visible height
            document.documentElement.style.setProperty('--app-height', `${height}px`);

            // We can also track offsetTop if we ever need to correct fixed elements, 
            // but for a full-screen flex layout, just height is usually enough 
            // if we don't try to be clever with fixed positioning relative to the bottom.
        };

        const viewport = window.visualViewport;

        setHeight();

        // Resize happens when keyboard opens/closes or rotation
        window.addEventListener('resize', setHeight);
        window.addEventListener('orientationchange', setHeight);

        // This is the critical one for virtual keyboard
        if (viewport) {
            viewport.addEventListener('resize', setHeight);
            viewport.addEventListener('scroll', setHeight); // iOS sometimes needs this
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
