// src/components/WorkCard.jsx
import { motion } from 'framer-motion';
import OptimizeImage from './OptimizedImage'; // Asegúrate de tener este componente

const WorkCard = ({ imageSrc, altText }) => {
    return (
        <motion.div
            className="flex-shrink-0 rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
        >
            <OptimizeImage
                src={imageSrc}
                alt={altText}
                className="object-cover w-[480px] h-[275px] md:w-[480px] md:h-[275px] w-[350px]"
            />
        </motion.div>
    );
};

export default WorkCard;
