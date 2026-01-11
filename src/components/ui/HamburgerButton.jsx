import { motion } from "framer-motion";

const HamburgerButton = ({ isOpen, toggle }) => {
    return (
        <motion.button
            className="relative w-[30px] h-[30px] z-50 flex items-center justify-center"
            onClick={toggle}
            aria-label="Menú móvil"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
        >
            {/* Línea superior */}
            <motion.span
                className="absolute block w-[26px] h-[3px] bg-white rounded-full origin-center"
                animate={isOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -5 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            />
            {/* Línea inferior */}
            <motion.span
                className="absolute block w-[26px] h-[3px] bg-white rounded-full origin-center"
                animate={isOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 5 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            />
        </motion.button>
    );
};

export default HamburgerButton;
