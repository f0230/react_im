import { useCallback, useRef } from 'react';

const useLongPress = (onLongPress, ms = 450) => {
    const timerRef = useRef(null);

    const clear = useCallback(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const start = useCallback(() => {
        clear();
        timerRef.current = window.setTimeout(() => {
            onLongPress();
            clear();
        }, ms);
    }, [clear, ms, onLongPress]);

    return {
        onPointerDown: (event) => {
            if (event.pointerType === 'touch') start();
        },
        onPointerUp: clear,
        onPointerLeave: clear,
        onContextMenu: (event) => {
            event.preventDefault();
            clear();
        },
    };
};

export default useLongPress;
