import { useCallback, useEffect, useRef } from 'react';

const useThrottledCallback = (fn, delay = 3000) => {
    const lastRef = useRef(0);
    const timeoutRef = useRef(null);
    const fnRef = useRef(fn);

    useEffect(() => {
        fnRef.current = fn;
    }, [fn]);

    const throttled = useCallback((...args) => {
        const now = Date.now();
        const remaining = delay - (now - lastRef.current);

        if (remaining <= 0) {
            lastRef.current = now;
            fnRef.current(...args);
            return;
        }

        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            lastRef.current = Date.now();
            fnRef.current(...args);
        }, remaining);
    }, [delay]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    return throttled;
};

export default useThrottledCallback;
