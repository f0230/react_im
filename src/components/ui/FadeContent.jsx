import { useEffect, useRef, useState } from 'react';

const FadeContent = ({
    children,
    className = '',
    delay = 0,
    blur = false,
    initialOpacity = 0,
    duration = 900,
    easing = 'ease-out',
    ...props
}) => {
    const ref = useRef();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (prefersReducedMotion) {
            setIsVisible(true);
            return;
        }

        if (!('IntersectionObserver' in window)) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    const safeProps = { ...props };
    delete safeProps.blur;
    delete safeProps.delay;
    delete safeProps.stagger;
    delete safeProps.initialOpacity;

    return (
        <div
            ref={ref}
            style={{
                willChange: 'opacity, transform, filter',
                opacity: isVisible ? 1 : initialOpacity,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                filter: isVisible ? 'blur(0px)' : blur ? 'blur(8px)' : 'none',
                transitionProperty: 'opacity, transform, filter',
                transitionDuration: `${duration}ms`,
                transitionTimingFunction: easing,
                transitionDelay: `${delay}ms`,
            }}
            className={`${className} ${blur ? 'backdrop-blur-sm' : ''}`}
            {...safeProps}
        >
            {children}
        </div>
    );
};

export default FadeContent;
