// ScrollToTopButton.jsx
import React, { useEffect, useState } from "react";
import punteroIcon from "../../assets/PUNTERO.svg";

const ScrollToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 800) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-10 right-12 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/55 text-black shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/42 hover:scale-110 hover:bg-white/62 hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)] active:scale-[0.78] active:shadow-[0_6px_18px_rgba(0,0,0,0.2)] ${
                isVisible ? "opacity-100" : "hidden"
            }`}
            aria-label="Scroll to top"
        >
            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full">
                <img
                    src={punteroIcon}
                    alt=""
                    className="h-5 w-5 scale-[3.4] select-none"
                    draggable="false"
                />
            </span>
        </button>
    );
};

export default ScrollToTopButton;
