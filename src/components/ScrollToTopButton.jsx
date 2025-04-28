// ScrollToTopButton.jsx
import React, { useEffect, useState } from "react";

    const ScrollToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
        if (window.scrollY > 300) {
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
            className={`fixed bottom-10 right-6 z-50 w-10 h-10 rounded-full bg-slate-950 dark:bg-black-500 p-2 text-white shadow-lg transition-all duration-300 hover:bg-with-800 hover:scale-110 hover:shadow-xl active:scale-90 ${
            isVisible ? "opacity-100" : "hidden"
            }`}
            >
            <i className="fas fa-chevron-up text-lg"></i>
            </button>
    );
    };

    export default ScrollToTopButton;
