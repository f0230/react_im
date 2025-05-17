import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FadeContent from '../components/ui/FadeContent';
import ServiceCard from '../components/ServiceCard';
import { servicios } from '../data/serviciosList';

gsap.registerPlugin(ScrollTrigger);

const bgColors = ['#fce4ec', '#e0f7fa', '#fff8e1', '#e8f5e9', '#ede7f6'];

const Servicios = () => {
    const containerRef = useRef(null);

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
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <main
            ref={containerRef}
            className="transition-colors duration-[1500ms] ease-in-out min-h-screen flex flex-col items-center font-product text-black"
            style={{ backgroundColor: bgColors[0], width: '100%' }}
        >
            <div className="mt-[50px] flex flex-col px-4 md:px-20 w-full md:max-w-[1080px]">
                {servicios.map((servicio, index) => (
                    <FadeContent
                        key={index}
                        blur
                        delay={index * 80}
                        className="mb-16 service-block"
                        data-bg={bgColors[index % bgColors.length]}
                    >
                        <ServiceCard title={servicio.title} text={servicio.text} />
                    </FadeContent>
                ))}
            </div>
        </main>
    );
};

export default Servicios;
