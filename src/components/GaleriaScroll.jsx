import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import WorkCard from './WorkCard';
import wc1 from '../assets/wc1.webp';
import wc2 from '../assets/wc2.webp';
import wc3 from '../assets/wc3.webp';
import wc4 from '../assets/wc4.webp';
import wc5 from '../assets/wc5.webp';
import wc6 from '../assets/wc6.webp';
import wc7 from '../assets/wc7.webp';


const works = [
    { src: wc1, alt: 'Trabajo 1' },
    { src: wc2, alt: 'Trabajo 2' },
    { src: wc3, alt: 'Trabajo 3' },
    { src: wc4, alt: 'Trabajo 4' },
    { src: wc5, alt: 'Trabajo 5' },
    { src: wc6, alt: 'Trabajo 6' },
    { src: wc7, alt: 'Trabajo 7' },

];

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
