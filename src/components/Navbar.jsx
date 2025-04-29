import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo-dte.svg";
import wp from "../assets/whatsapp-icon.svg";


const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
    
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setShowNavbar(false); // Si baja, ocultar
            } else {
                setShowNavbar(true);  // Si sube, mostrar
            }
    
            setLastScrollY(currentScrollY);
        };
    
        window.addEventListener("scroll", handleScroll);
    
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [lastScrollY]);
    

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const navAnimation = {
        hidden: { y: -50, opacity: 0 },
        visible: { 
        y: 0, 
        opacity: 1,
        transition: { 
            duration: 0.8, 
            ease: "easeOut",
            when: "beforeChildren",
            staggerChildren: 0.1
        }
        }
    };

    const childAnimation = {
        hidden: { opacity: 0, y: -20 },
        visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.5 }
        }
    };

    const menuButtonHover = {
        rest: { scale: 1 },
        hover: { scale: 1.1, transition: { duration: 0.2 } }
    };

    const topBarVariants = {
        closed: { rotate: 0, y: 0 },
        open: { rotate: 45, y: 8 }
    };
    
    const middleBarVariants = {
        closed: { opacity: 1 },
        open: { opacity: 0 }
    };
    
    const bottomBarVariants = {
        closed: { rotate: 0, y: 0 },
        open: { rotate: -45, y: -8 }
    };

    const menuVariants = {
        closed: {
        opacity: 0,
        clipPath: "circle(0% at calc(100% - 35px) 35px)",
        transition: {
            duration: 0.7,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.1
        }
        },
        open: {
        opacity: 1,
        clipPath: "circle(150% at calc(100% - 35px) 35px)",
        transition: {
            duration: 0.7,
            ease: [0.4, 0, 0.2, 1]
        }
        }
    };

    const menuItemVariants = {
        closed: { opacity: 0, y: 20 },
        open: i => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.5
        }
        })
    };

    const menuItems = [
        { text: "Home", url: "#" },
        { text: "About", url: "#about" },
        { text: "Services", url: "#services" },
        { text: "Contact", url: "#contact" }
    ];

    return (
        <>
       {/* Navbar principal */}
        <motion.div
            initial={{ y: 0 }}
            animate={{ y: showNavbar ? 0 : "-100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed top-0 left-0 w-full bg-transparent bg-white/75 backdrop-blur-md z-50" // <--- cambiado aquí
        >
            <motion.nav
                className="relative w-full max-w-[1920px] mx-auto flex items-center justify-between
                px-2 md:px-3
                h-[35px] sm:h-[50px]
                z-30"  
                variants={navAnimation}
                initial="hidden"
                animate="visible"
            >

                    {/* Logo */}
                    <motion.div variants={childAnimation}>
                    <motion.img
                        src={logo}
                        alt="Logo DTE"
                        className="h-[12px] w-auto object-contain sm:h-[20px]"
                        whileHover={{ scale: 1.05 }}
                    />
                    </motion.div>

                    {/* Íconos de contacto (desktop) */}
                    <motion.div 
                    className="hidden md:flex items-center space-x-4"
                    variants={childAnimation}
                    >
                    <motion.a
                        href="https://wa.me/59812345678"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp chat"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <img
                        src={wp}
                        alt="Icono WhatsApp"
                        className="h-[12px] w-[12px] object-contain sm:h-[17px] sm:w-[18px]"
                        />
                        
                    </motion.a>
                    </motion.div>

                    {/* Botón menú hamburguesa (mobile) */}
                    <motion.div
                    className="flex md:hidden"
                    variants={childAnimation}
                    initial="rest"
                    whileHover="hover"
                    whileTap={{ scale: 0.95 }}
                    >
                    <motion.button
                        className="relative w-[30px] h-[30px] flex flex-col justify-center items-center z-50"
                        onClick={toggleMenu}
                        variants={menuButtonHover}
                        aria-label="Menu"
                        aria-expanded={isMenuOpen}
                    >
                        <motion.span
                        className="block w-[24px] h-[2px] bg-black rounded-full mb-[6px]"
                        variants={topBarVariants}
                        animate={isMenuOpen ? "open" : "closed"}
                        transition={{ duration: 0.3 }}
                        />
                        <motion.span
                        className="block w-[24px] h-[2px] bg-black rounded-full mb-[6px]"
                        variants={middleBarVariants}
                        animate={isMenuOpen ? "open" : "closed"}
                        transition={{ duration: 0.3 }}
                        />
                        <motion.span
                        className="block w-[24px] h-[2px] bg-black rounded-full"
                        variants={bottomBarVariants}
                        animate={isMenuOpen ? "open" : "closed"}
                        transition={{ duration: 0.3 }}
                        />
                    </motion.button>
                    </motion.div>
                </motion.nav>
                </motion.div>

        {/* Menú full screen (mobile) */}
        <AnimatePresence>
            {isMenuOpen && (
            <motion.div
            className="fixed inset-0 bg-white/30 backdrop-blur-md flex flex-col justify-center items-center z-20"
            variants={menuVariants}
                initial="closed"
                animate="open"
                exit="closed"
            >
                <nav className="w-full max-w-md">
                <ul className="flex flex-col items-center space-y-6">
                    {menuItems.map((item, i) => (
                    <motion.li 
                        key={i} 
                        className="w-full text-center"
                        custom={i}
                        variants={menuItemVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                    >
                        <motion.a
                        href={item.url}
                        className="text-white text-3xl font-bold tracking-wider block py-3"
                        whileHover={{ scale: 1.1, x: 10 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleMenu}
                        >
                        {item.text}
                        </motion.a>
                    </motion.li>
                    ))}

                    {/* Íconos en el menú mobile */}
                    <motion.div 
                    className="flex items-center space-x-8 mt-12"
                    custom={menuItems.length}
                    variants={menuItemVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    >
                    <motion.a
                        href="https://wa.me/59812345678"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                        className="bg-white p-3 rounded-full"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <img
                        src={wp}
                        alt="WhatsApp"
                        className="h-[25px] w-[25px] object-contain"
                        />
                    </motion.a>
                    </motion.div>
                </ul>
                </nav>
            </motion.div>
            )}
        </AnimatePresence>
        </>
    );
    };

    export default Navbar;
