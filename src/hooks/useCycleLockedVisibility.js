import { useEffect, useRef, useState } from "react";

const getRemainingMs = (elapsedMs, cycleMs) => {
    if (cycleMs <= 0) return 0;
    const remainder = elapsedMs % cycleMs;
    return remainder === 0 ? 0 : cycleMs - remainder;
};

const useCycleLockedVisibility = (active, cycleMs) => {
    const [visible, setVisible] = useState(active);
    const startedAtRef = useRef(active ? Date.now() : 0);
    const hideTimeoutRef = useRef(null);
    const wasActiveRef = useRef(active);

    useEffect(() => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        if (active) {
            if (!wasActiveRef.current || startedAtRef.current === 0) {
                startedAtRef.current = Date.now();
            }
            if (!visible) {
                setVisible(true);
            }
            wasActiveRef.current = true;
            return;
        }

        if (visible) {
            const elapsedMs = startedAtRef.current
                ? Math.max(Date.now() - startedAtRef.current, 0)
                : cycleMs;
            const waitMs = getRemainingMs(elapsedMs, cycleMs);

            hideTimeoutRef.current = setTimeout(() => {
                setVisible(false);
                startedAtRef.current = 0;
            }, waitMs);
        }

        wasActiveRef.current = false;

        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
        };
    }, [active, cycleMs, visible]);

    return visible;
};

export default useCycleLockedVisibility;
