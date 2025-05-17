import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import OptimizedImage from "@/OptimizedImage";
import HamburgerButton from "@/ui/HamburgerButton";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import logo from "@/assets/iconodte.svg";

gsap.registerPlugin(ScrollTrigger);

const menuItems = [
    { text: "Servicios", url: "#services" },
    { text: "Nosotros", url: "#about" },
    { text: "Contacto", url: "#contact" },
];

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [hasScrolled, setHasScrolled] = useState(false);
    const menuRef = useRef();

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
            const ctx = gsap.context(() => {
                const items = gsap.utils.toArray(".menu-item");
                gsap.fromTo(
                    items,
                    {
                        y: 50,
                        opacity: 0,
                        rotateX: 90,
                        scale: 0.95,
                        filter: "blur(10px)",
                    },
                    {
                        y: 0,
                        opacity: 1,
                        rotateX: 0,
                        scale: 1,
                        filter: "blur(0px)",
                        stagger: 0.08,
                        duration: 0.8,
                        ease: "power3.out",
                    }
                );
            }, menuRef);

            return () => ctx.revert();
        }
    }, [isMenuOpen]);

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

            {/* Menú móvil con animación moderna */}
            {isMenuOpen && (
                <div
                    ref={menuRef}
                    id="mobile-menu"
                    className="fixed inset-0 bg-white/90 backdrop-blur-lg flex flex-col justify-center items-center z-40"
                >
                    <nav className="w-full max-w-md px-6">
                        <ul className="flex flex-col items-center space-y-10">
                            {menuItems.map((item, i) => (
                                <li
                                    key={i}
                                    className="menu-item w-full text-center opacity-0 transform"
                                >
                                    <a
                                        href={item.url}
                                        className="text-black text-[24px] font-product font-bold tracking-wide block hover:scale-110 transition-transform duration-300"
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
