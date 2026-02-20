import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const root = document.documentElement;
        const body = document.body;
        const previousRootOverflow = root.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousRootOverscroll = root.style.overscrollBehavior;
        const previousBodyOverscroll = body.style.overscrollBehavior;

        // Keep scroll interactions inside the chat panels only.
        root.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        root.style.overscrollBehavior = 'none';
        body.style.overscrollBehavior = 'none';

        const setHeight = () => {
            const viewport = window.visualViewport;
            const offsetTop = Math.max(0, viewport?.offsetTop || 0);
            const visibleBottom = viewport
                ? viewport.height + offsetTop
                : window.innerHeight;
            root.style.setProperty('--app-height', `${Math.round(visibleBottom)}px`);
        };

        const viewport = window.visualViewport;
        setHeight();

        if (viewport) {
            viewport.addEventListener('resize', setHeight);
            viewport.addEventListener('scroll', setHeight);
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
            root.style.overflow = previousRootOverflow;
            body.style.overflow = previousBodyOverflow;
            root.style.overscrollBehavior = previousRootOverscroll;
            body.style.overscrollBehavior = previousBodyOverscroll;
            root.style.removeProperty('--app-height');
            root.style.removeProperty('--app-viewport-offset-top');
        };
    }, [enabled]);
};

export default useViewportHeight;
