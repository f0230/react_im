import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '../components/ui/ServiceCard';
import { servicios } from '../data/serviciosList';

gsap.registerPlugin(ScrollTrigger);


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
            {/* Partículas animadas flotantes */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {[...Array(25)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-[60px] h-[60px] bg-[#00000033] rounded-full animate-floatParticle blur-[12px] mix-blend-overlay"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDuration: `${6 + Math.random() * 6}s`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Contenido de servicios */}
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