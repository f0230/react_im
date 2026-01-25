import { useEffect } from 'react';

const getViewportMetrics = () => {
    if (typeof window === 'undefined') return { height: 0, offsetTop: 0 };
    const viewport = window.visualViewport;
    return {
        height: viewport?.height || window.innerHeight,
        offsetTop: viewport?.offsetTop || 0,
    };
};

const isTextInputFocused = () => {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable;
};

const useViewportHeight = (enabled = true) => {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return undefined;

        const root = document.documentElement;
        const viewport = window.visualViewport;
        let baseHeight = getViewportMetrics().height;

        const setVars = (height, keyboardOffset = 0) => {
            root.style.setProperty('--app-height', `${height}px`);
            root.style.setProperty('--keyboard-offset', `${Math.max(0, keyboardOffset)}px`);
        };

        const update = () => {
            const { height, offsetTop } = getViewportMetrics();
            if (isTextInputFocused()) {
                const keyboardOffset = baseHeight - height - offsetTop;
                setVars(baseHeight, keyboardOffset);
                return;
            }
            baseHeight = height;
            setVars(baseHeight, 0);
        };

        update();

        const handleFocusOut = () => {
            // Give the viewport a moment to settle after the keyboard closes.
            window.setTimeout(update, 50);
        };

        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        document.addEventListener('focusin', update);
        document.addEventListener('focusout', handleFocusOut);
        if (viewport) {
            viewport.addEventListener('resize', update);
        }

        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
            document.removeEventListener('focusin', update);
            document.removeEventListener('focusout', handleFocusOut);
            if (viewport) {
                viewport.removeEventListener('resize', update);
            }
        };
    }, [enabled]);
};

export default useViewportHeight;
