import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '../components/ui/ServiceCard';
import { servicios } from '../data/serviciosList';

gsap.registerPlugin(ScrollTrigger);

const bgColors = ['#fce4ec', '#e0f7fa', '#fff8e1', '#e8f5e9', '#ede7f6'];

const Servicios = () => {
    const containerRef = useRef(null);
    const auroraRef = useRef(null);

    useEffect(() => {
        const sections = gsap.utils.toArray('.service-block');

        const ctx = gsap.context(() => {
            sections.forEach((section, index) => {
                const color = section.dataset.bg;
                gsap.to(containerRef.current, {
                    backgroundColor: color,
                    duration: 1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: section,
                        start: 'top center',
                        end: 'bottom center',
                        scrub: true,
                    },
                });
            });

            gsap.to(auroraRef.current, {
                y: '-30%',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top top',
                    scrub: true,
                },
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <main
            ref={containerRef}
            className="relative overflow-hidden transition-colors duration-[1500ms] ease-in-out min-h-screen flex flex-col items-center font-product text-black bg-gradient-to-tl from-[#e0e7ff] via-[#f0f4ff] to-[#ffffff]"
            style={{ width: '100%' }}
        >
            {/* Patrón visual decorativo */}
            <div className="absolute inset-0 z-0 pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-black before:opacity-5 after:bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] after:bg-[length:24px_24px] after:opacity-20 after:content-['']" />

            {/* Aurora animada */}
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-indigo-300/20 via-purple-300/10 to-transparent animate-auroraBreath mix-blend-lighten backdrop-blur-xl z-0" />

            {/* Contenido */}
            <div className="relative z-10 mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]">
                {servicios.map((servicio, index) => (
                    <ServiceCard
                        key={index}
                        title={servicio.title}
                        text={servicio.text}
                        index={index}
                    />
                ))}
            </div>
        </main>


    );
};

export default Servicios;