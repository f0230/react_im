import React, { useState, useEffect, useRef, useCallback } from "react";
import OptimizedImage from "./OptimizedImage";
import HamburgerButton from "./ui/HamburgerButton";
import logo from "../assets/Group 255.svg";
import sidebarLogo from "../assets/LOGO GRUPO DTE - LOGO.webp";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Briefcase, ChevronDown, Languages, User, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";

import { menuItems } from "@/config/nav";
import LoginModal from "./LoginModal";
import ToolsPopover from "./ToolsPopover";
import ToolsOverlay from "./ToolsOverlay";
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
    const [isToolsOverlayOpen, setIsToolsOverlayOpen] = useState(false);
    const navigate = useNavigate();
    const { setIsNavbarOpen, isLoginModalOpen, setIsLoginModalOpen } = useUI();
    const { user, profile, signOut } = useAuth();
    const desktopUserMenuRef = useRef(null);
    const headerUserMenuRef = useRef(null);
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
            const clickedDesktopMenu = desktopUserMenuRef.current?.contains(event.target);
            const clickedHeaderMenu = headerUserMenuRef.current?.contains(event.target);

            if (!clickedDesktopMenu && !clickedHeaderMenu) {
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
    const mobileLanguageButtonClass = (lng) =>
        `h-8 min-w-8 rounded-full text-[12px] font-semibold transition-all ${currentLang === lng
            ? "bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.22)]"
            : "bg-white/8 text-white/70 ring-1 ring-white/12 hover:bg-white/12 hover:text-white"
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
                    ".mobile-menu-backdrop",
                    {
                        opacity: 0,
                    },
                    {
                        opacity: 1,
                        duration: 0.28,
                        ease: "power2.out",
                    }
                );

                gsap.fromTo(
                    "#mobile-menu",
                    {
                        opacity: 0,
                        y: -10,
                        scale: 0.98,
                        boxShadow: "0px 0px 0px rgba(0,0,0,0)",
                        filter: "blur(8px)",
                    },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        boxShadow: "0 50px 120px rgba(0,0,0,0.2)",
                        filter: "blur(0px)",
                        duration: 0.32,
                        ease: "power2.out",
                    }
                );

                const items = gsap.utils.toArray(".menu-item");
                gsap.fromTo(
                    items,
                    {
                        y: 10,
                        opacity: 0,
                        filter: "blur(4px)",
                    },
                    {
                        y: 0,
                        opacity: 1,
                        filter: "blur(0px)",
                        stagger: 0.04,
                        duration: 0.22,
                        ease: "power2.out",
                    }
                );

                if (glowRef.current) {
                    gsap.set(glowRef.current, {
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
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

            tl.to(".mobile-menu-backdrop", {
                opacity: 0,
                duration: 0.22,
                ease: "power2.out",
            }, 0);

            tl.to("#mobile-menu", {
                opacity: 0,
                scale: 0.985,
                y: -6,
                filter: "blur(6px)",
                duration: 0.22,
                ease: "power2.out",
            }, 0);
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

    const handleAdminAccess = () => {
        setIsMenuOpen(false);
        void preloadRoute('/admin');
        navigate('/admin');
    };
    const toggleLanguage = () => setLanguage(currentLang === "es" ? "en" : "es");

    return (
        <>
            {/* Sidebar desktop */}
            <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[80px] flex-col bg-black px-2 py-4 text-white shadow-[1px_0_0_rgba(255,255,255,0.08)] lg:flex">
                <div className="flex min-h-0 flex-1 flex-col">
                    <PrefetchLink
                        to="/"
                        className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors hover:bg-white/10"
                        aria-label="DTE Home"
                        title="DTE"
                    >
                        <OptimizedImage
                            src={sidebarLogo}
                            alt="Logo DTE"
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                        />
                    </PrefetchLink>

                    <nav className="flex-1 space-y-2 font-google-sans-flex" aria-label="Navegacion principal">
                        {menuItems?.map((item, i) => (
                            <PrefetchLink
                                key={i}
                                to={item.url}
                                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white/72 transition-colors hover:bg-white/10 hover:text-white"
                                aria-label={t(item.key)}
                                title={t(item.key)}
                            >
                                <Briefcase size={24} aria-hidden="true" />
                            </PrefetchLink>
                        ))}
                    </nav>

                    <div className="space-y-2 border-t border-white/10 pt-3 font-google-sans-flex">
                        <button
                            type="button"
                            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-white/72 transition-colors hover:bg-white/10 hover:text-white"
                            onClick={toggleLanguage}
                            aria-label={t("nav.languageLabel")}
                            title={`${t("nav.languageLabel")}: ${currentLang.toUpperCase()}`}
                        >
                            <Languages size={24} aria-hidden="true" />
                        </button>

                        {(profile?.role === 'admin' || profile?.role === 'worker') && (
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-white/[0.04] [&>div>button]:h-12 [&>div>button]:w-12 [&>div>button]:text-white/70 [&>div>button:hover]:bg-white/10 [&>div>button:hover]:text-white">
                                <ToolsPopover
                                    iconSize={24}
                                    panelClassName="lg:!left-full lg:!right-auto lg:!top-auto lg:!bottom-0 lg:!ml-2 lg:!mt-0 lg:origin-bottom-left"
                                />
                            </div>
                        )}

                        <div className="relative" ref={desktopUserMenuRef}>
                            {user ? (
                                <>
                                    <button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition-colors hover:bg-white/10"
                                        aria-label="User"
                                        title="User"
                                    >
                                        <User size={24} aria-hidden="true" />
                                    </button>

                                    {isUserMenuOpen && (
                                        <div className="absolute bottom-0 left-full ml-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#111111] py-1 shadow-2xl">
                                            <PrefetchLink
                                                to="/dashboard"
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 transition-colors hover:bg-white/10"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <LayoutDashboard size={16} />
                                                Dashboard
                                            </PrefetchLink>
                                            <button
                                                onClick={handleSignOut}
                                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-white/10"
                                            >
                                                <LogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="grid gap-2">
                                    <button
                                        onClick={() => setIsLoginModalOpen(true)}
                                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition-colors hover:bg-white/10"
                                        aria-label={t("nav.portalClients")}
                                        title={t("nav.portalClients")}
                                    >
                                        <Users size={24} aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={handleAdminAccess}
                                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black transition-colors hover:bg-green"
                                        aria-label={t("nav.teamAccess")}
                                        title={t("nav.teamAccess")}
                                    >
                                        <ShieldCheck size={24} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Navbar principal */}
            <div
                className={`fixed top-0 left-0 z-50 w-full bg-black transition-all duration-300 transform lg:hidden ${hasScrolled ? "shadow-md" : ""
                    } ${showNavbar ? "translate-y-0" : "-translate-y-full"}`}
            >
                <nav
                    className="relative w-full max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 h-[45px] z-30 font-google-sans-flex"
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
                                    className="rounded-full px-3 py-1 text-neutral-300 text-sm font-normal transition-colors hover:bg-green hover:text-black"
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
                        <li className="relative" ref={headerUserMenuRef}>
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
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsLoginModalOpen(true)}
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors border border-white/10 flex items-center gap-2"
                                    >
                                        <Users size={14} />
                                        <span>{t("nav.portalClients")}</span>
                                    </button>
                                    <button
                                        onClick={handleAdminAccess}
                                        className="bg-white text-black hover:bg-green text-xs px-3 py-1.5 rounded-full font-semibold transition-colors flex items-center gap-2"
                                    >
                                        <ShieldCheck size={14} />
                                        <span>{t("nav.teamAccess")}</span>
                                    </button>
                                </div>
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
                <>
                <div className="mobile-menu-backdrop fixed inset-0 top-[45px] z-30 pointer-events-none bg-black/62 backdrop-blur-[6px]" />
                <div
                    ref={menuRef}
                    id="mobile-menu"
                    className="fixed top-[55px] right-3 z-40 flex w-[min(260px,calc(100vw-24px))] flex-col overflow-hidden rounded-[28px] border border-white/18 bg-[rgba(36,36,38,0.66)] p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl backdrop-saturate-150"
                >
                    <div
                        ref={glowRef}
                        className="absolute inset-0 pointer-events-none rounded-[28px]"
                    />
                    <nav className="w-full">
                        <ul className="relative flex flex-col gap-1.5">
                            {menuItems?.map((item, i) => (
                                <li key={i} className="menu-item opacity-0 transform">
                                    <button
                                        onClick={() => handleMenuItemClick(item.url)}
                                        className="w-full rounded-[18px] px-3.5 py-3 text-left text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                                    >
                                        {t(item.key)}
                                    </button>
                                </li>
                            ))}

                            {/* Idioma */}
                            <li className="menu-item opacity-0 transform flex items-center justify-between rounded-[18px] px-3.5 py-2.5">
                                <span className="text-[13px] font-medium text-white/70">{t("nav.languageLabel")}</span>
                                <div className="flex items-center gap-1.5 rounded-full bg-black/18 p-1 ring-1 ring-white/8">
                                    <button type="button" className={mobileLanguageButtonClass("es")} onClick={() => setLanguage("es")} aria-pressed={currentLang === "es"}>ES</button>
                                    <button type="button" className={mobileLanguageButtonClass("en")} onClick={() => setLanguage("en")} aria-pressed={currentLang === "en"}>EN</button>
                                </div>
                            </li>

                            {/* Divider */}
                            <li className="mx-3 border-t border-white/10" />

                            {/* Login / User */}
                            <li className="menu-item opacity-0 transform flex flex-col gap-2">
                                {user ? (
                                    <>
                                        <button
                                            onClick={() => { setIsMenuOpen(false); void preloadRoute('/dashboard'); navigate('/dashboard'); }}
                                            className="flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-bold text-black shadow-[0_12px_34px_rgba(255,255,255,0.18)] transition-transform hover:scale-[0.99]"
                                        >
                                            <LayoutDashboard size={15} />
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={handleSignOut}
                                            className="flex items-center gap-2 rounded-[18px] px-3.5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                                        >
                                            <LogOut size={14} />
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <div className="grid gap-2">
                                        <button
                                            onClick={() => { setIsMenuOpen(false); setIsLoginModalOpen(true); }}
                                            className="flex items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-3 text-[15px] font-bold text-black shadow-[0_14px_34px_rgba(255,255,255,0.2)] transition-transform hover:scale-[0.99]"
                                        >
                                            <Users size={15} />
                                            {t("nav.accessClients")}
                                        </button>
                                        <button
                                            onClick={handleAdminAccess}
                                            className="flex items-center justify-center gap-2 rounded-[20px] border border-white/12 bg-white/9 px-4 py-3 text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-white/14"
                                        >
                                            <ShieldCheck size={15} />
                                            {t("nav.teamAccess")}
                                        </button>
                                    </div>
                                )}
                            </li>

                            {/* Tools (Admin/Worker) */}
                            {(profile?.role === 'admin' || profile?.role === 'worker') && (
                                <li className="menu-item opacity-0 transform">
                                    <button
                                        onClick={() => { setIsMenuOpen(false); setIsToolsOverlayOpen(true); }}
                                        className="w-full rounded-[18px] px-3.5 py-3 text-left text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                                    >
                                        Tools
                                    </button>
                                </li>
                            )}
                        </ul>
                    </nav>
                </div>
                </>
            )}

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <ToolsOverlay isOpen={isToolsOverlayOpen} onClose={() => setIsToolsOverlayOpen(false)} />
        </>
    );
};

export default Navbar;
