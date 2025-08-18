import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import WorkCard from './WorkCard';
import { worksData } from '../data/worksData';

// Cargar imágenes de forma dinámica
const workImages = import.meta.glob('../assets/wc*.webp', { eager: true });

// Construir el array de trabajos dinámicamente
const works = worksData.map(work => ({
  src: workImages[`../assets/${work.filename}`]?.default,
  alt: work.alt,
})).filter(work => work.src); // Filtrar por si alguna imagen no se encuentra

const GaleriaScroll = () => {
    const carouselRef = useRef();
    const innerRef = useRef();
    const [constraints, setConstraints] = useState({ left: 0, right: 0 });

    useEffect(() => {
        const updateConstraints = () => {
            if (carouselRef.current && innerRef.current) {
                const containerWidth = carouselRef.current.offsetWidth;
                const contentWidth = innerRef.current.scrollWidth;
                setConstraints({
                    left: -(contentWidth - containerWidth),
                    right: 0,
                });
            }
        };

        updateConstraints();
        window.addEventListener('resize', updateConstraints);
        return () => window.removeEventListener('resize', updateConstraints);
    }, []);

    return (
        <section className="w-full bg-white">
            <motion.div
                ref={carouselRef}
                className="w-full overflow-x-hidden overflow-y-hidden no-scrollbar"
                whileTap={{ cursor: 'grabbing' }}
            >
                <motion.div
                    ref={innerRef}
                    className="flex gap-4 w-max px-4"
                    drag="x"
                    dragConstraints={constraints}
                    animate={{ x: [0, constraints.left] }} // mover de 0 a la izquierda
                    transition={{
                        duration: 15, // duración total
                        ease: "linear",
                        repeat: Infinity, // repetir infinitamente
                        repeatType: "loop",
                    }}
                >

                    {works.map((work, i) => (
                        <WorkCard key={i} imageSrc={work.src} altText={work.alt} />
                    ))}
                </motion.div>
            </motion.div>
        </section>
    );
};

export default GaleriaScroll;
