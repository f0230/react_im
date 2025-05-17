import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OptimizedImage from "./OptimizedImage"; // Asegúrate de que la ruta sea correcta

import logo from "../assets/iconodte.svg";
import wp from "../assets/whatsapp-icon.svg";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setShowNavbar(false);
            } else {
                setShowNavbar(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
                className="fixed top-0 left-0 w-full bg-white/75 backdrop-blur-md z-50"
            >
                <motion.nav
                    className="relative w-full max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 h-[45px] z-30"
                    variants={navAnimation}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Logo */}
                    <motion.div variants={childAnimation}>
                        <OptimizedImage
                            src={logo}
                            alt="Logo DTE"
                            width={100}
                            height={25}
                            className="h-[17.5px] sm:h-[20px] w-auto"
                        />
                    </motion.div>

                    

                    {/* Botón hamburguesa (mobile) */}
                    <motion.div
                        className="flex md:hidden"
                        variants={childAnimation}
                        initial="rest"
                        whileHover="hover"
                        whileTap={{ scale: 0.75 }}
                    >
                        <motion.button
                            className="relative w-[30px] h-[30px] z-50"
                            onClick={toggleMenu}
                            aria-label="Menú móvil"
                            aria-expanded={isMenuOpen}
                        >
                            <motion.span
                                className="absolute top-[9px] left-1 block w-[30px] h-[3px] bg-greyburger rounded-full"
                                animate={isMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                                transition={{ duration: 0.5 }}
                            />
                            <motion.span
                                className="absolute top-[18px] left-1 block w-[30px] h-[3px] bg-greyburger rounded-full"
                                animate={isMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                                transition={{ duration: 0.5 }}
                            />
                        </motion.button>
                    </motion.div>
                </motion.nav>
            </motion.div>

            {/* Menú mobile fullscreen */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        className="fixed inset-0 bg-greyburger/50 backdrop-blur-md flex flex-col justify-center items-center z-20"
                        variants={menuVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                    >
                        <nav className="w-full max-w-md">
                            <ul className="flex flex-col items-center space-y-2">
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
                                            className="text-black text-[16px] font-product font-bold tracking-wider block"
                                            whileHover={{ scale: 1.1, x: 10 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={toggleMenu}
                                        >
                                            {item.text}
                                        </motion.a>
                                    </motion.li>
                                ))}

                                {/* Ícono WhatsApp en menú mobile */}
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
                                        whileHover={{ scale: 1.2, rotate: 10 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <OptimizedImage
                                            src={wp}
                                            alt="WhatsApp"
                                            width={17}
                                            height={17}
                                            className="h-[17px] w-[17px]"
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
