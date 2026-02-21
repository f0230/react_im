import React, { useState, useEffect, useRef, useCallback } from "react";
import OptimizedImage from "./OptimizedImage";
import HamburgerButton from "./ui/HamburgerButton";
import logo from "../assets/Group 255.svg";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";

import { menuItems } from "@/config/nav";
import LoginModal from "./LoginModal";
import ToolsPopover from "./ToolsPopover";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { PrefetchLink } from "@/components/navigation/PrefetchLink";
import { preloadRoute } from "@/router/routePrefetch";



const Navbar = () => {
    const { t, i18n } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { setIsNavbarOpen, isLoginModalOpen, setIsLoginModalOpen } = useUI();
    const { user, profile, signOut } = useAuth();
    const userMenuRef = useRef(null);
    const gsapRef = useRef(null);

    const ensureGsap = useCallback(async () => {
        if (gsapRef.current) return gsapRef.current;
        const gsapModule = await import("gsap");
        const scrollTriggerModule = await import("gsap/ScrollTrigger");
        const gsap = gsapModule.default || gsapModule.gsap || gsapModule;
        const ScrollTrigger =
            scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default || scrollTriggerModule;
        gsap.registerPlugin(ScrollTrigger);
        gsapRef.current = gsap;
        return gsap;
    }, []);

    const handleMenuItemClick = async (url) => {
        const menu = document.getElementById("mobile-menu");
        void preloadRoute(url);

        // Protege si no se encuentra el menú
        if (!menu) {
            navigate(url);
            return;
        }

        const gsap = await ensureGsap().catch(() => null);
        if (!gsap) {
            setIsMenuOpen(false);
            setIsMenuVisible(false);
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

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    const lastScrollYRef = useRef(0);
    const menuRef = useRef();
    const glowRef = useRef();
    const currentLang = (i18n.resolvedLanguage || i18n.language || "es").split("-")[0];

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    // REMOVED local isLoginOpen state
    const setLanguage = (lng) => i18n.changeLanguage(lng);
    const languageButtonClass = (lng) =>
        `text-[11px] px-2 py-1 rounded-full border transition ${currentLang === lng
            ? "bg-white text-black border-white"
            : "text-white border-white/40 hover:border-white"
        }`;

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const shouldShowNavbar = !(currentScrollY > lastScrollYRef.current && currentScrollY > 100);

            setShowNavbar((prev) => (prev === shouldShowNavbar ? prev : shouldShowNavbar));
            setHasScrolled((prev) => (prev === (currentScrollY > 10) ? prev : currentScrollY > 10));

            lastScrollYRef.current = currentScrollY;
            setIsMenuOpen((prev) => (prev ? false : prev));
            setIsUserMenuOpen((prev) => (prev ? false : prev));
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen || isLoginModalOpen ? "hidden" : "auto";
        return () => (document.body.style.overflow = "auto");
    }, [isMenuOpen, isLoginModalOpen]);

    useEffect(() => {
        if (isMenuOpen) {
            setIsMenuVisible(true);
        }
        setIsNavbarOpen(isMenuOpen);
    }, [isMenuOpen, setIsNavbarOpen]);

    useEffect(() => {
        let ctx;
        let cancelled = false;

        const runOpen = async () => {
            const gsap = await ensureGsap().catch(() => null);
            if (!gsap || cancelled) return;

            ctx = gsap.context(() => {
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
        };

        const runClose = async () => {
            const gsap = await ensureGsap().catch(() => null);
            if (!gsap || cancelled) {
                setIsMenuVisible(false);
                return;
            }

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
        };

        if (isMenuOpen && isMenuVisible) runOpen();
        if (!isMenuOpen && isMenuVisible) runClose();

        return () => {
            cancelled = true;
            ctx?.revert();
        };
    }, [isMenuOpen, isMenuVisible, ensureGsap]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let idleId;
        const warmup = () => ensureGsap().catch(() => null);

        if ('requestIdleCallback' in window) {
            idleId = window.requestIdleCallback(warmup, { timeout: 2000 });
        } else {
            idleId = window.setTimeout(warmup, 2000);
        }

        return () => {
            if ('cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleId);
            } else {
                clearTimeout(idleId);
            }
        };
    }, [ensureGsap]);

    const handleSignOut = async () => {
        await signOut();
        setIsUserMenuOpen(false);
        navigate('/');
    };

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
                    <PrefetchLink to="/">
                        <OptimizedImage
                            src={logo}
                            alt="Logo DTE"
                            width={56}
                            height={18}
                            className="h-[18px] w-auto"
                        />
                    </PrefetchLink>

                    {/* Ítems desktop */}
                    <ul className="hidden md:flex items-center gap-6">
                        {menuItems?.map((item, i) => (
                            <li key={i}>
                                <PrefetchLink
                                    to={item.url}
                                    className="text-white text-sm font-bold hover:underline"
                                >
                                    {t(item.key)}
                                </PrefetchLink>
                            </li>
                        ))}
                        <li aria-label={t("nav.languageLabel")}>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    className={languageButtonClass("es")}
                                    onClick={() => setLanguage("es")}
                                    aria-pressed={currentLang === "es"}
                                >
                                    ES
                                </button>
                                <button
                                    type="button"
                                    className={languageButtonClass("en")}
                                    onClick={() => setLanguage("en")}
                                    aria-pressed={currentLang === "en"}
                                >
                                    EN
                                </button>
                            </div>
                        </li>
                        {/* Tools Popover (Admin/Worker only) */}
                        {(profile?.role === 'admin' || profile?.role === 'worker') && (
                            <li className="relative flex items-center">
                                <ToolsPopover />
                            </li>
                        )}

                        {/* Login Button / User Menu Desktop */}
                        <li className="relative" ref={userMenuRef}>
                            {user ? (
                                <>
                                    <button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors border border-white/10 flex items-center gap-2"
                                    >
                                        <User size={14} />
                                        <span>User</span>
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* User Dropdown */}
                                    {isUserMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50">
                                            <PrefetchLink
                                                to="/dashboard"
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <LayoutDashboard size={16} />
                                                Dashboard
                                            </PrefetchLink>
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors text-left"
                                            >
                                                <LogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors border border-white/10 flex items-center gap-2"
                                >
                                    <span>{t("nav.portalClients")}</span>
                                </button>
                            )}
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
                            {menuItems?.map((item, i) => (
                                <li
                                    key={i}
                                    className="menu-item text-right opacity-0 transform"
                                >
                                    <button
                                        onClick={() => handleMenuItemClick(item.url)}
                                        className="text-white text-[13px] leading-tight font-product font-normal tracking-wide block hover:scale-105 transition-transform duration-300"
                                    >
                                        {t(item.key)}
                                    </button>

                                </li>
                            ))}
                            <li className="menu-item opacity-0 transform">
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-[11px]">{t("nav.languageLabel")}</span>
                                    <button
                                        type="button"
                                        className={languageButtonClass("es")}
                                        onClick={() => setLanguage("es")}
                                        aria-pressed={currentLang === "es"}
                                    >
                                        ES
                                    </button>
                                    <button
                                        type="button"
                                        className={languageButtonClass("en")}
                                        onClick={() => setLanguage("en")}
                                        aria-pressed={currentLang === "en"}
                                    >
                                        EN
                                    </button>
                                </div>
                            </li>
                            {/* Login Button / User Actions Mobile */}
                            <li className="menu-item opacity-0 transform pt-4 flex flex-col gap-3 w-full items-end">
                                {user ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                void preloadRoute('/dashboard');
                                                navigate('/dashboard');
                                            }}
                                            className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform w-[200px] flex items-center justify-center gap-2"
                                        >
                                            <LayoutDashboard size={18} />
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={handleSignOut}
                                            className="text-red-400 text-sm font-medium hover:text-red-300 transition-colors pr-4 py-2 flex items-center gap-2"
                                        >
                                            <LogOut size={16} />
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsLoginModalOpen(true);
                                        }}
                                        className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform w-[200px]"
                                    >
                                        {t("nav.accessClients")}
                                    </button>
                                )}
                            </li>
                            {/* Tools Popover Mobile (Admin/Worker only) */}
                            {(profile?.role === 'admin' || profile?.role === 'worker') && (
                                <li className="menu-item opacity-0 transform w-full flex justify-end">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white text-[13px] font-product">Tools</span>
                                        <ToolsPopover />
                                    </div>
                                </li>
                            )}
                        </ul>
                    </nav>
                </div >
            )}

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </>
    );
};

export default Navbar;
