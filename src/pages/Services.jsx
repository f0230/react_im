import { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '../components/ui/ServiceCard';
import { servicios } from '../data/serviciosList';
import TrueFocus from '../components/ui/TrueFocus';

gsap.registerPlugin(ScrollTrigger);

const Servicios = () => {
    const containerRef = useRef(null);
    const auroraRef = useRef(null);

   

    // 🎬 Animaciones
    useEffect(() => {
        const sections = gsap.utils.toArray('.service-block');

        const ctx = gsap.context(() => {
            sections.forEach((section) => {
                const color = section.dataset.bg;
                if (color) {
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
                }
            });

            if (auroraRef.current) {
                gsap.to(auroraRef.current, {
                    y: '-30%',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top top',
                        scrub: true,
                    },
                });
            }
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <main
            ref={containerRef}
            className="relative overflow-hidden transition-colors duration-[1500ms] ease-in-out min-h-screen flex flex-col items-center font-product text-black bg-[#d0f0f9] w-full"
        >


            {/* 🏷️ Título principal con TrueFocus */}
            <div className="relative z-10 mt-[80px] px-4 md:px-20 w-full md:max-w-[1080px] text-center">
                <TrueFocus
                    sentence="Servicios DTE"// ✅ foco primero en "Servicios", luego en "DTE"
                    manualMode={false}
                    blurAmount={5}
                    borderColor="red"
                    animationDuration={2}
                    pauseBetweenAnimations={1}
                />
            </div>

            {/* 📦 Tarjetas de servicios */}
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
