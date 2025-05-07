import { useRef } from 'react';
import { ScrollReveal } from './ScrollReveal'; // Import the Tailwind version of ScrollReveal

const EnDTESection = () => {
    const containerRef = useRef(null);

    const title = 'en DTE';
    const paragraph =
        'Nos dedicamos a impulsar el crecimiento y el éxito de nuestros clientes a través del desarrollo, ejecución y asesoramiento de proyectos. Nuestro enfoque es brindar soluciones que se adapten a las necesidades específicas de cada negocio. Contamos con un equipo multidisciplinario capacitado que se enfoca en el crecimiento profesional de nuestros clientes. Tenemos una estructura de organización centralizada que nos permite encargarnos de todas las partes importantes de un proyecto, asegurando un enfoque integral y eficiente. En DTE, también nos destacamos por ser asesores interdisciplinarios, lo que significa que abordamos los negocios desde todas sus perspectivas. Estamos preparados para enfrentar cualquier desafío que se presente de manera profesional y creativa. Nuestra forma de trabajo se basa en la organización y la comunicación constante con nuestros clientes. Creemos firmemente que una buena comunicación y una organización interna sólida son fundamentales para ejecutar estrategias de manera efectiva y obtener resultados exitosos.';

    return (
        <div className="border-y-2 border-black w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-20 flex justify-center md:h-[500px]">
            <div
                ref={containerRef}
                className="w-full md:w-[1080px] h-auto mt-1 sm:mt-0 overflow-hidden bg-white flex flex-col justify-center"
            >
                {/* Title with ScrollReveal */}
                <ScrollReveal
                    containerClassName="mb-4"
                    textClassName="!text-[30px] md:!text-3xl font-bold font-product"
                    baseRotation={2}
                    baseOpacity={0.2}
                    blurStrength={3}
                    enableBlur={true}
                    rotationEnd="center center"
                    wordAnimationEnd="center center"
                >
                    {title}
                </ScrollReveal>
                
                {/* Paragraph with ScrollReveal */}
                <ScrollReveal
                    containerClassName="mt-4"
                    textClassName="!text-[13px] md:!text-[17px] font-product font-normal !leading-none"
                    baseRotation={1}
                    baseOpacity={0.1}
                    blurStrength={2}
                    enableBlur={true}
                    rotationEnd="bottom bottom"
                    wordAnimationEnd="bottom 60%"
                >
                    {paragraph}
                </ScrollReveal>
            </div>
        </div>
    );
};

export default EnDTESection;