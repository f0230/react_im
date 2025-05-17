import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FadeContent = ({
    children,
    className = '',
    delay = 0,
    blur = false,
    initialOpacity = 0,
    ...props
}) => {
    const ref = useRef();

    useEffect(() => {
        const el = ref.current;

        const animation = gsap.fromTo(
            el,
            {
                opacity: initialOpacity,
                y: 40,
                filter: blur ? 'blur(8px)' : 'none', // 🔽 blur más liviano
            },
            {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                delay: delay / 1000,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse',
                },
            }
        );

        return () => {
            animation.scrollTrigger?.kill(); // ✅ cleanup del trigger
            animation.kill(); // ✅ cleanup de la animación
        };
    }, [delay, blur, initialOpacity]);

    const safeProps = { ...props };
    delete safeProps.blur;
    delete safeProps.delay;
    delete safeProps.stagger;
    delete safeProps.initialOpacity;

    return (
        <div
            ref={ref}
            style={{ willChange: 'opacity, transform' }} // ✅ mejora rendimiento de animación
            className={`${className} ${blur ? 'backdrop-blur-sm' : ''}`}
            {...safeProps}
        >
            {children}
        </div>
    );
};

export default FadeContent;
