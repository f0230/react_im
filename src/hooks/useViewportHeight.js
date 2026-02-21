import { useEffect } from 'react';

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const root = document.documentElement;
        const body = document.body;
        const appRoot = document.getElementById('root');
        const scrollY = window.scrollY;

        const previousRootOverflow = root.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousRootOverscroll = root.style.overscrollBehavior;
        const previousBodyOverscroll = body.style.overscrollBehavior;
        const previousBodyPosition = body.style.position;
        const previousBodyTop = body.style.top;
        const previousBodyLeft = body.style.left;
        const previousBodyRight = body.style.right;
        const previousBodyWidth = body.style.width;
        const previousBodyHeight = body.style.height;
        const previousRootHeight = root.style.height;
        const previousAppRootOverflow = appRoot?.style.overflow ?? '';

        // Keep scroll interactions inside the chat panels only.
        root.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        root.style.overscrollBehavior = 'none';
        body.style.overscrollBehavior = 'none';
        root.style.height = '100%';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.height = '100%';
        if (appRoot) appRoot.style.overflow = 'hidden';

        const setHeight = () => {
            const viewport = window.visualViewport;
            const viewportHeight = viewport?.height || window.innerHeight;
            const viewportOffsetTop = Math.max(0, viewport?.offsetTop || 0);
            root.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
            root.style.setProperty('--app-viewport-offset-top', `${Math.round(viewportOffsetTop)}px`);
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
            root.style.height = previousRootHeight;
            body.style.position = previousBodyPosition;
            body.style.top = previousBodyTop;
            body.style.left = previousBodyLeft;
            body.style.right = previousBodyRight;
            body.style.width = previousBodyWidth;
            body.style.height = previousBodyHeight;
            if (appRoot) appRoot.style.overflow = previousAppRootOverflow;
            root.style.removeProperty('--app-height');
            root.style.removeProperty('--app-viewport-offset-top');
            window.scrollTo(0, scrollY);
        };
    }, [enabled]);
};

export default useViewportHeight;
