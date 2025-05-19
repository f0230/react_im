// Services.jsx optimizado con buenas prácticas y comentarios en línea
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '@/components/ui/ServiceCard';
import { servicios } from '@/data/serviciosList';
import TrueFocus from '@/components/ui/TrueFocus';
import PageWrapper from '@/components/layout/PageWrapper';

gsap.registerPlugin(ScrollTrigger);

const Servicios = () => {
    const containerRef = useRef(null);

    // GSAP ScrollTrigger animaciones personalizadas podrían ir acá si se agregan más interacciones
    useEffect(() => {
        // No hay animaciones por ahora, pero esta estructura permite añadirlas fácilmente
    }, []);

    return (
        <PageWrapper>
            {/* Contenedor principal de contenido de la página de servicios */}
            <main
                ref={containerRef}
                className="bg-skysoft relative min-h-screen transition-colors duration-[1500ms] ease-in-out flex flex-col items-center font-product text-black bg-[#d0f0f9] w-full"
            >
                {/* 🏷️ Título animado con enfoque visual personalizado */}
                <header className="relative z-10 mt-[80px] px-4 md:px-20 w-full md:max-w-[1080px] text-center">
                    <TrueFocus
                        sentence="Servicios DTE"
                        manualMode={false}
                        blurAmount={5}
                        borderColor="red"
                        animationDuration={2}
                        pauseBetweenAnimations={1}
                        textClassName="text-5xl md:text-7xl font-black"
                    />
                </header>

                {/* 📦 Lista de servicios - render dinámica desde arreglo */}
                <section
                    id="servicios-lista"
                    aria-label="Lista de servicios de la empresa"
                    className="relative z-10 mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]"
                >
                    <ul className="space-y-10">
                        {servicios.map((servicio, index) => (
                            <li key={index}>
                                <ServiceCard
                                    title={servicio.title}
                                    text={servicio.text}
                                    index={index}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </PageWrapper>
    );
};

export default Servicios;
