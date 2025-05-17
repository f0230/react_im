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
        const ctx = gsap.context(() => {
            gsap.fromTo(
                ref.current,
                {
                    opacity: initialOpacity,
                    y: 20, // 🔽 Más suave que 40
                    filter: blur ? 'blur(12px)' : 'none',
                },
                {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    ease: 'power2.out',
                    duration: 1.2,
                    scrollTrigger: {
                        trigger: ref.current,
                        start: 'top 90%',
                        end: 'bottom 60%',
                        scrub: true, // 🟢 Vincula la animación al scroll
                    },
                }
            );
        }, ref);

        return () => ctx.revert();
    }, [delay, blur, initialOpacity]);

    const safeProps = { ...props };
    delete safeProps.blur;
    delete safeProps.delay;
    delete safeProps.stagger;
    delete safeProps.initialOpacity;

    return (
        <div
            ref={ref}
            className={`${className} ${blur ? 'backdrop-blur-sm' : ''}`}
            {...safeProps}
        >
            {children}
        </div>
    );
};

export default FadeContent;
