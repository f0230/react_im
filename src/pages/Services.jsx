import { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '../components/ui/ServiceCard';
import { servicios } from '../data/serviciosList';

gsap.registerPlugin(ScrollTrigger);

const Servicios = () => {
    const containerRef = useRef(null);
    const auroraRef = useRef(null);


    // 🌟 Partículas generadas una vez por montaje
    const particles = useMemo(() => (
        [...Array(25)].map((_, i) => ({
            key: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            duration: `${6 + Math.random() * 6}s`,
            delay: `${Math.random() * 5}s`,
        }))
    ), []);

    // 🎬 Animaciones de fondo dinámico y aurora
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

    const fondos = [
        '#ff6b6b',   // rojo coral intenso
        '#ffa94d',   // naranja vibrante
        '#ffd43b',   // amarillo cálido potente
        '#51cf66',   // verde menta fuerte
        '#339af0',   // azul brillante pero sobrio
        '#845ef7',   // violeta eléctrico moderno
        '#f06595',   // rosa intenso (tipo frambuesa)
        '#20c997',   // turquesa saturado
        '#5f3dc4',   // púrpura fuerte
        '#ff922b',   // naranja quemado saturado
    ];




    return (
        <main
            ref={containerRef}
            className="relative overflow-hidden transition-colors duration-[1500ms] ease-in-out min-h-screen flex flex-col items-center font-product text-black bg-white w-full"
        >
            {/* 🌈 Aurora animada */}
            <div
                ref={auroraRef}
                className="absolute -top-[30%] left-[10%] w-[200%] h-[200%] bg-gradient-to-r from-pink-200 via-blue-200 to-green-200 opacity-30 blur-[150px] rounded-full mix-blend-soft-light pointer-events-none z-0"
            />


            {/* 🌌 Fondo respirando fuerte */}
            <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
                <div
                    className="absolute w-[150%] h-[150%] left-[-25%] top-[-25%] bg-[radial-gradient(circle_at_50%_50%,#dcd6f7_0%,transparent_80%)]
               animate-breathingPulse opacity-50 blur-[100px] mix-blend-soft-light"
                />
            </div>


            {/* 🌟 Partículas flotantes oscuras estilo blobs */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {particles.map(({ key, top, left, duration, delay }) => (
                    <div
                        key={key}
                        className="absolute w-[120px] h-[90px] bg-black/20 animate-floatBlob mix-blend-overlay blur-[12px]"
                        style={{
                            top,
                            left,
                            animationDuration: duration,
                            animationDelay: delay,
                            borderRadius: `${60 + Math.random() * 30}% ${70 + Math.random() * 20}% ${50 + Math.random() * 40}% ${60 + Math.random() * 20}%`,
                        }}
                    />
                ))}
            </div>


            {/* 📦 Contenido de servicios */}
            <div className="relative z-10 mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]">
                {servicios.map((servicio, index) => (
                    <ServiceCard
                        key={index}
                        title={servicio.title}
                        text={servicio.text}
                        index={index}
                        bg={fondos[index % fondos.length]} // ✅ data-bg dinámico
                    />
                ))}
            </div>
        </main>
    );
};

export default Servicios;
