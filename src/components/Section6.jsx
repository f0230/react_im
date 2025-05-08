


import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SimultaneousWords = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const titleWords = gsap.utils.toArray('.title-word');
        const paragraphWords = gsap.utils.toArray('.paragraph-word');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse',
                // markers: true, // puedes descomentar esto si querés debuggear
            },
        });

        tl.fromTo(
            titleWords,
            { x: '100%', opacity: 0 },
            {
                x: '0%',
                opacity: 1,
                stagger: 0.08,
                ease: 'power3.out',
                duration: 0.6,
            }
        ).fromTo(
            paragraphWords,
            { x: '100%', opacity: 0 },
            {
                x: '0%',
                opacity: 1,
                stagger: 0.04,
                ease: 'power3.out',
                duration: 0.6,
            },
            '-=0.3' // empieza antes de que termine el título
        );

        return () => {
            tl.kill();
        };
    }, []);

    const title = 'en DTE';
    const paragraph =
        'Nos dedicamos a impulsar el crecimiento y el éxito de nuestros clientes a través del desarrollo, ejecución y asesoramiento de proyectos. Nuestro enfoque es brindar soluciones que se adapten a las necesidades específicas de cada negocio. Contamos con un equipo multidisciplinario capacitado que se enfoca en el crecimiento profesional de nuestros clientes. Tenemos una estructura de organización centralizada que nos permite encargarnos de todas las partes importantes de un proyecto, asegurando un enfoque integral y eficiente. En DTE, también nos destacamos por ser asesores interdisciplinarios, lo que significa que abordamos los negocios desde todas sus perspectivas. Estamos preparados para enfrentar cualquier desafío que se presente de manera profesional y creativa. Nuestra forma de trabajo se basa en la organización y la comunicación constante con nuestros clientes. Creemos firmemente que una buena comunicación y una organización interna sólida son fundamentales para ejecutar estrategias de manera efectiva y obtener resultados exitosos.';

    const titleWords = title.split(' ');
    const paragraphWords = paragraph.split(' ');

    return (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 flex justify-center h-[600px] md:h-[500px]  sm:h-[400px] border-y-2 border-black  relative overflow-hidden">

            <div
                ref={containerRef}
                className="w-full md:w-[680px] sm:w-[540px] lg:w-[1100px] h-auto  mt-1 sm:mt-0 overflow-hidden bg-white flex flex-col justify-center "
            >
                <h2 className="text-[30px] md:text-3xl font-bold font-product flex flex-wrap gap-2 mb-4">
                    {titleWords.map((word, index) => (
                        <span key={index} className="title-word inline-block whitespace-nowrap">
                            {word}
                        </span>
                    ))}
                </h2>
                <p className="text-[13px] md:text-[17px] font-product font-normal flex flex-wrap gap-1 leading-none mt-4">
                    {paragraphWords.map((word, index) => (
                        <span key={index} className="paragraph-word inline-block whitespace-nowrap">
                            {word}
                        </span>
                    ))}
                </p>
            </div>
        </div>
    );

};

export default SimultaneousWords;
