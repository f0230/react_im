import React, { useState, useEffect, useRef } from "react";
import OptimizedImage from "./OptimizedImage";
import HamburgerButton from "./ui/HamburgerButton";
import logo from "../assets/Group 255.svg";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { menuItems } from "@/config/nav";
import LoginModal from "./LoginModal";


gsap.registerPlugin(ScrollTrigger);



const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [hasScrolled, setHasScrolled] = useState(false);
    const navigate = useNavigate();

    const handleMenuItemClick = (url) => {
        const menu = document.getElementById("mobile-menu");

        // Protege si no se encuentra el menú
        if (!menu) {
            navigate(url);
            return;
        }

        // Animación de salida más limpia y sincronizada
        gsap.to(menu, {
            opacity: 0,
            y: 20,
            scale: 0.96,
            filter: "blur(4px)",
            duration: 0.5,
            ease: "power2.out",
            onStart: () => {
                setIsMenuOpen(false); // cierra el menú en React
            },
            onComplete: () => {
                setIsMenuVisible(false); // remueve del DOM
                navigate(url); // navega a la página
            },
        });
    };




    const lastScrollYRef = useRef(0);
    const menuRef = useRef();
    const glowRef = useRef();

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Mostrar navbar al hacer scroll hacia arriba o estar arriba de todo
            if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
                setShowNavbar(false);
            } else {
                setShowNavbar(true);
            }

            lastScrollYRef.current = currentScrollY;
            setIsMenuOpen(false);
        };

        const onScroll = () => setHasScrolled(window.scrollY > 10);

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("scroll", onScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen || isLoginOpen ? "hidden" : "auto";
        return () => (document.body.style.overflow = "auto");
    }, [isMenuOpen, isLoginOpen]);

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
                opacity: 0,
                scale: 0.96,
                y: 20,
                filter: "blur(4px)",
                duration: 0.6,
                ease: "power2.out",
            });


        }
    }, [isMenuOpen, isMenuVisible]);

    return (
        <>
            {/* Navbar principal */}
            <div
                className={`fixed top-0 left-0 w-full bg-black backdrop-blur-md z-50 transition-all duration-300 transform ${hasScrolled ? "shadow-md" : ""
                    } ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}
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
                            width={56}
                            height={18}
                            className="h-[18px] w-auto"
                        />
                    </Link>

                    {/* Ítems desktop */}
                    <ul className="hidden md:flex items-center gap-6">
                        {menuItems.map((item, i) => (
                            <li key={i}>
                                <Link
                                    to={item.url}
                                    className="text-white text-sm font-bold hover:underline"
                                >
                                    {item.text}
                                </Link>
                            </li>
                        ))}
                        {/* Login Button Desktop */}
                        <li>
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors border border-white/10 flex items-center gap-2"
                            >
                                <span>Portal Clientes</span>

                            </button>
                        </li>
                    </ul>

                    {/* Botón hamburguesa */}
                    <div className="flex md:hidden">
                        <HamburgerButton isOpen={isMenuOpen} toggle={toggleMenu} />
                    </div>
                </nav>
            </div>

            {/* Menú móvil */}
            {isMenuVisible && (
                <div
                    ref={menuRef}
                    id="mobile-menu"
                    className="fixed rounded-[20px] backdrop-blur-md  flex-col p-6 pt-20 z-40 right-0"
                >
                    <div
                        ref={glowRef}
                        className="absolute inset-0 pointer-events-none rounded-2xl"
                    />
                    <nav className="w-full max-w-md ">
                        <ul className="flex flex-col items-start space-y-4">
                            {menuItems.map((item, i) => (
                                <li
                                    key={i}
                                    className="menu-item text-right opacity-0 transform"
                                >
                                    <button
                                        onClick={() => handleMenuItemClick(item.url)}
                                        className="text-white text-[13px] leading-tight font-product font-normal tracking-wide block hover:scale-105 transition-transform duration-300"
                                    >
                                        {item.text}
                                    </button>

                                </li>
                            ))}
                            {/* Login Button Mobile */}
                            <li className="menu-item opacity-0 transform pt-4">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsLoginOpen(true);
                                    }}
                                    className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform w-[200px]"
                                >
                                    Acceso Clientes
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
};

export default Navbar;
