import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FadeContent = ({
    children,
    className = '',
    delay = 0,
    blur = false,
    ...props // ✅ capturamos el resto de los props
}) => {
    const ref = useRef();

    useEffect(() => {
        gsap.fromTo(
            ref.current,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                delay: delay / 1000,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: ref.current,
                    start: 'top 90%',
                },
            }
        );
    }, [delay]);

    return (
        <div
            ref={ref}
            className={`${className} ${blur ? 'backdrop-blur-sm' : ''}`}
            {...props} // ✅ pasamos todos los props aquí
        >
            {children}
        </div>
    );
};

export default FadeContent;
