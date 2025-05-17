import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FadeContent = ({
    children,
    className = '',
    delay = 0,
    blur = false,
    ...props
}) => {
    const ref = useRef();

    useEffect(() => {
        gsap.fromTo(
            ref.current,
            {
                opacity: 0,
                y: 40,
                filter: blur ? 'blur(12px)' : 'none',
            },
            {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                delay: delay / 1000,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: ref.current,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse',
                },
            }
        );
    }, [delay, blur]);

    return (
        <div
            ref={ref}
            className={`${className} ${blur ? 'backdrop-blur-sm' : ''}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default FadeContent;
