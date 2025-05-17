import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FadeContent = ({
    children,
    blur = false,
    duration = 1,
    ease = 'power2.out',
    delay = 0,
    stagger = 0.15,
    className = '',
}) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const targets = containerRef.current.children;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                targets,
                {
                    y: 50,
                    opacity: 0,
                    filter: blur ? 'blur(10px)' : 'none',
                },
                {
                    y: 0,
                    opacity: 1,
                    filter: blur ? 'blur(0px)' : 'none',
                    duration,
                    ease,
                    stagger,
                    delay: delay / 1000,
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top 90%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        }, containerRef);

        return () => ctx.revert();
    }, [blur, duration, ease, delay, stagger]);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
};

export default FadeContent;
