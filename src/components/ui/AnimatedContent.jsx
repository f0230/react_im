// src/components/AnimatedContent.jsx
import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'framer-motion';

const variants = {
    fade: { opacity: 0, y: 0 },
    slideUp: { opacity: 0, y: 40 },
    slideLeft: { opacity: 0, x: 40 },
    zoom: { opacity: 0, scale: 0.95 },
};

const getAnimation = (type, blur) => {
    const base = variants[type] || variants.fade;
    return {
        hidden: {
            ...base,
            filter: blur ? 'blur(8px)' : 'none',
        },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            transition: {
                duration: 0.8,
                ease: 'easeOut',
            },
        },
    };
};

const AnimatedContent = ({
    children,
    type = 'fade',           // fade | slideUp | slideLeft | zoom
    className = '',
    delay = 0,
    threshold = 0.3,
    blur = false,
    once = true,
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { threshold, once });
    const controls = useAnimation();

    useEffect(() => {
        if (isInView) {
            controls.start('visible');
        }
    }, [isInView, controls]);

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={controls}
            variants={getAnimation(type, blur)}
            transition={{ delay: delay / 1000 }}
            className={`${className} ${blur ? 'backdrop-blur-sm' : ''}`}
            style={{ willChange: 'opacity, transform' }}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedContent;
