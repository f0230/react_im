import { useRef, useEffect, useState } from 'react';

const FadeContent = ({
    children,
    blur = false,
    duration = 800,
    easing = 'ease-out',
    delay = 0,
    threshold = 0.25,
    initialOpacity = 0,
    className = ''
}) => {
    const [inView, setInView] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    observer.unobserve(el);
                    setTimeout(() => setInView(true), delay);
                }
            },
            {
                threshold,
                rootMargin: '0px 0px -10% 0px', // activa más “tarde” para que se vea más
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, delay]);

    return (
        <div
            ref={ref}
            className={`${className} transition-all duration-[${duration}ms] ease-[${easing}]`}
            style={{
                opacity: inView ? 1 : initialOpacity,
                transform: inView ? 'translateY(0px)' : 'translateY(50px)',
                filter: blur ? (inView ? 'blur(0px)' : 'blur(12px)') : 'none',
                transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, filter ${duration}ms ${easing}`,
                willChange: 'opacity, transform, filter'
            }}
        >
            {children}
        </div>
    );
};

export default FadeContent;
