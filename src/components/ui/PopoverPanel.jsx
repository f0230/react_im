import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

const PopoverPanel = ({
    isOpen,
    onClose,
    children,
    className = '',
    backdropClassName = 'fixed inset-0 z-40',
    initial = { opacity: 0, scale: 0.96, y: -8 },
    animate = { opacity: 1, scale: 1, y: 0 },
    exit = { opacity: 0, scale: 0.96, y: -8 },
    transition = { duration: 0.2, ease: 'easeOut' },
    anchorRef,
    mobileAnchorWidth = 320,
}) => {
    const [mobileAnchorStyle, setMobileAnchorStyle] = useState(null);
    const [usePortal, setUsePortal] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 1024;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            setUsePortal(false);
            return undefined;
        }

        const updatePortalMode = () => {
            setUsePortal(window.innerWidth < 1024);
        };

        updatePortalMode();
        window.addEventListener('resize', updatePortalMode);

        return () => {
            window.removeEventListener('resize', updatePortalMode);
        };
    }, []);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined' || typeof document === 'undefined' || !usePortal) {
            setMobileAnchorStyle(null);
            return undefined;
        }

        const updatePosition = () => {
            const isDesktop = window.innerWidth >= 1024;
            const anchor = anchorRef?.current;

            if (isDesktop || !anchor) {
                setMobileAnchorStyle(null);
                return;
            }

            const rect = anchor.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const width = Math.min(mobileAnchorWidth, viewportWidth - 24);
            const minLeft = 12;
            const maxLeft = viewportWidth - width - 12;
            const centeredLeft = rect.left + (rect.width / 2) - (width / 2);
            const left = Math.min(Math.max(centeredLeft, minLeft), Math.max(minLeft, maxLeft));

            setMobileAnchorStyle({
                left: `${left}px`,
                right: 'auto',
                top: `${Math.round(rect.bottom + 1)}px`,
                width: `${width}px`,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRef, isOpen, mobileAnchorWidth]);

    if (typeof document === 'undefined') {
        return null;
    }

    const content = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className={backdropClassName} onClick={onClose} />
                    <motion.div
                        initial={initial}
                        animate={animate}
                        exit={exit}
                        transition={transition}
                        className={className}
                        style={mobileAnchorStyle || undefined}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    if (!usePortal) {
        return content;
    }

    return createPortal(content, document.body);
};

export default PopoverPanel;
