import React, { useState, useEffect, useRef } from "react";

import OptimizedImage from "./OptimizedImage";
import HamburgerButton from "./ui/HamburgerButton";
import logo from "../assets/iconodte.svg";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const menuItems = [
    { text: "Servicios", url: "/servicios" },
    { text: "Nosotros", url: "#about" },
    { text: "Contacto", url: "#contact" },
];

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [hasScrolled, setHasScrolled] = useState(false);
    const menuRef = useRef();
    const glowRef = useRef();

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setShowNavbar(currentScrollY < lastScrollY || currentScrollY < 100);
            setLastScrollY(currentScrollY);
            setIsMenuOpen(false);
        };

        const onScroll = () => setHasScrolled(window.scrollY > 10);

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("scroll", onScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("scroll", onScroll);
        };
    }, [lastScrollY]);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? "hidden" : "auto";
        return () => (document.body.style.overflow = "auto");
    }, [isMenuOpen]);

    useEffect(() => {
        if (isMenuOpen) {
            setIsMenuVisible(true);
        }
    }, [isMenuOpen]);

    useEffect(() => {
        if (isMenuOpen && isMenuVisible) {
            const ctx = gsap.context(() => {
                gsap.fromTo(
                    "#mobile-menu",
                    {
                        x: "-120%",
                        y: "-120%",
                        opacity: 0,
                        scale: 0.75,
                        rotateZ: -8,
                        boxShadow: "0px 0px 0px rgba(0,0,0,0)",
                        transformOrigin: "top left",
                        filter: "blur(24px)",
                    },
                    {
                        x: "0%",
                        y: "0%",
                        opacity: 1,
                        scale: 1,
                        rotateZ: 0,
                        boxShadow: "0 50px 120px rgba(0,0,0,0.2)",
                        filter: "blur(0px)",
                        duration: 1.3,
                        ease: "power4.out",
                    }
                );

                const items = gsap.utils.toArray(".menu-item");
                gsap.fromTo(
                    items,
                    {
                        y: 30,
                        opacity: 0,
                        filter: "blur(6px)",
                    },
                    {
                        y: 0,
                        opacity: 1,
                        filter: "blur(0px)",
                        stagger: 0.12,
                        duration: 0.7,
                        ease: "power3.out",
                    }
                );

                // ✨ Loop de brillo sutil
                if (glowRef.current) {
                    gsap.to(glowRef.current, {
                        boxShadow: "0 0 40px rgba(255, 255, 255, 0.4)",
                        duration: 2,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut",
                    });
                }
            }, menuRef);

            return () => ctx.revert();
        }

        if (!isMenuOpen && isMenuVisible) {
            const tl = gsap.timeline({
                onComplete: () => setIsMenuVisible(false),
            });

            tl.to("#mobile-menu", {
                x: "-120%",
                y: "-120%",
                opacity: 0,
                scale: 0.75,
                rotateZ: -10,
                boxShadow: "0px 0px 0px rgba(0,0,0,0)",
                filter: "blur(12px)",
                duration: 0.7,
                ease: "power2.inOut",
            });
        }
    }, [isMenuOpen, isMenuVisible]);

    return (
        <>
            <div
                className={`fixed top-0 left-0 w-full bg-white/75 backdrop-blur-md z-50 transition-shadow duration-300 ${hasScrolled ? "shadow-md" : ""}`}
            >
                <nav
                    className="relative w-full max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 h-[45px] z-30"
                    aria-controls="mobile-menu"
                >
                    {/* Logo */}
                    <Link to="/">
                        <OptimizedImage
                            src={logo}
                            alt="Logo DTE"
                            width={100}
                            height={25}
                            className="h-[17.5px] sm:h-[20px] w-auto"
                        />
                    </Link>

                    {/* Ítems desktop */}
                    <ul className="hidden md:flex items-center gap-6">
                        {menuItems.map((item, i) => (
                            <li key={i}>
                                <a
                                    href={item.url}
                                    className="text-black text-sm font-bold hover:underline"
                                >
                                    {item.text}
                                </a>
                            </li>
                        ))}
                    </ul>

                    {/* Botón hamburguesa */}
                    <div className="flex md:hidden">
                        <HamburgerButton isOpen={isMenuOpen} toggle={toggleMenu} />
                    </div>
                </nav>
            </div>

            {/* Menú móvil con animación desde arriba a la izquierda */}
            {isMenuVisible && (
                <div
                    ref={menuRef}
                    id="mobile-menu"
                    className="fixed inset-0 bg-white/80 backdrop-blur-lg flex justify-start items-end flex-col p-6 pt-20 z-40"
                >
                    <div ref={glowRef} className="absolute inset-0 pointer-events-none rounded-2xl" />
                    <nav className="w-full max-w-md">
                        <ul className="flex flex-col items-start space-y-4">
                            {menuItems.map((item, i) => (
                                <li
                                    key={i}
                                    className="menu-item text-right opacity-0 transform"
                                >
                                    <a
                                        href={item.url}
                                        className="text-black text-[18px] leading-tight font-product font-normal tracking-wide block hover:scale-105 transition-transform duration-300"
                                        onClick={toggleMenu}
                                    >
                                        {item.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            )}
        </>
    );
};

export default Navbar;
