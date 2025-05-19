import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ServiceCard from '@/components/ui/ServiceCard';
import { servicios } from '@/data/serviciosList';
import TrueFocus from '@/components/ui/TrueFocus';

import PageWrapper from "@/components/layout/PageWrapper";
import CleoWidget from "@/components/CleoChat";



gsap.registerPlugin(ScrollTrigger);

const Servicios = () => {
    const containerRef = useRef(null);
    const auroraRef = useRef(null);



    return (
        <>
        <PageWrapper>
        <main
            ref={containerRef}
            className="bg-skysoft relative min-h-screen transition-colors duration-[1500ms] ease-in-out flex flex-col items-center font-product text-black bg-[#d0f0f9] w-full"
        >
            {/* 🏷️ Título principal */}
            <div className="relative z-10 mt-[80px] px-4 md:px-20 w-full md:max-w-[1080px] text-center">
                <TrueFocus
                    sentence="Servicios DTE"
                    manualMode={false}
                    blurAmount={5}
                    borderColor="red"
                    animationDuration={2}
                    pauseBetweenAnimations={1}
                    textClassName="text-5xl md:text-7xl font-black"
                />
            </div>

            {/* 📦 Lista de servicios */}
            <div
                id="servicios-lista"
                className="relative z-10 mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]"
            >
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

        </PageWrapper>
        
            <CleoWidget /> {/* Posición fija, sin interferencias */}
        </>
        
        
    );
};

export default Servicios;