// src/components/GaleriaScroll.jsx
import { motion } from 'framer-motion';
import WorkCard from './WorkCard';
import wc1 from '../assets/wc1.webp';
import wc2 from '../assets/wc2.webp';
import wc3 from '../assets/wc3.webp';
import wc4 from '../assets/wc4.webp';

const works = [
    { src: wc1, alt: 'Trabajo 1' },
    { src: wc2, alt: 'Trabajo 2' },
    { src: wc3, alt: 'Trabajo 3' },
    { src: wc4, alt: 'Trabajo 4' },
];

const GaleriaScroll = () => {
    return (
        <section className="w-full overflow-hidden flex items-center bg-white">
            <motion.div
                className="cursor-grab active:cursor-grabbing w-full overflow-x-hidden"
                whileTap={{ cursor: 'grabbing' }}
            >
                <motion.div
                    className="flex gap-2 w-max px-2 py-2"
                    drag="x"
                    dragConstraints={{ left: -500, right: 0 }} // Puedes ajustar el valor de 'left' según el ancho real
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
