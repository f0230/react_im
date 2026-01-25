import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
}) => {
    return (
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
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PopoverPanel;
