// Section5.jsx optimizado
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import OptimizedImage from "@/components/OptimizedImage";
import { useTranslation } from "react-i18next";
import xclose from "../assets/x-close.svg";

const Section5 = ({ onScheduleClick }) => {
    const { t } = useTranslation();
    const [showPopup, setShowPopup] = useState(false);
    const [popupDismissed, setPopupDismissed] = useState(false);
    const sectionRef = useRef(null);
    const popupTimerRef = useRef(null);
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
        if (popupDismissed) {
            return undefined;
        }

        const target = sectionRef.current;
        if (!target) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!hasTriggeredRef.current && entry.isIntersecting) {
                    hasTriggeredRef.current = true;
                    popupTimerRef.current = setTimeout(() => setShowPopup(true), 600);
                    observer.disconnect();
                }
            },
            { threshold: 0.35 }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
            if (popupTimerRef.current) {
                clearTimeout(popupTimerRef.current);
            }
        };
    }, [popupDismissed]);

    const handleClosePopup = () => {
        setShowPopup(false);
        setPopupDismissed(true);
    };

    return (
        <section
            className="font-product relative w-full flex h-[550px] md:h-[350px] justify-center items-center"
            aria-label={t("section5.aria.services")}
            ref={sectionRef}
        >
            <div className="flex flex-col md:flex-row w-full max-w-[1440px] px-4 gap-10 items-center justify-between">
                {/* Columna izquierda */}
                <div className="w-full md:w-1/2 flex flex-col items-center">
                    <h2 className="text-[60px] text-green font-normal leading-none">{t("section5.headline")}</h2>
                    <div className="mt-12 w-[162px] h-[10px] bg-green" aria-hidden="true" />
                </div>

                {/* Columna derecha */}
                <div className="w-full md:w-1/2 flex flex-col items-center text-center mt-8 md:mt-0">
                    <p className="text-[25px] md:text-[37px] max-w-[250px] md:max-w-[500px] font-normal leading-none">
                        {t("section5.list")}
                    </p>
                </div>
            </div>

            <AnimatePresence>
            {showPopup && (
                <motion.div
                    key="section5-popup"
                    initial={{ opacity: 0, scale: 0.94, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 14, filter: "blur(8px)" }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    style={{ backdropFilter: "blur(50px)", WebkitBackdropFilter: "blur(50px)" }}
                    className="fixed bottom-4 left-4 w-[250px] min-h-[120px] overflow-hidden rounded-[20px] bg-black/40 pt-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] saturate-[1] p-4 flex flex-col justify-between z-50 md:bottom-[44px] md:left-[68px] md:w-[389px]"
                    role="dialog"
                    aria-label={t("section5.aria.popup")}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05)_22%,transparent_48%,rgba(255,255,255,0.02)_100%)]" />
                    <div
                        className="pointer-events-none absolute inset-0 opacity-6 mix-blend-soft-light"
                        style={{
                            backgroundImage:
                                'radial-gradient(rgba(255,255,255,0.12) 0.5px, transparent 0.75px), radial-gradient(rgba(0,0,0,0.08) 0.55px, transparent 0.8px)',
                            backgroundPosition: '0 0, 4px 4px',
                            backgroundSize: '10px 10px, 12px 12px',
                        }}
                    />
                    <div className="relative z-10 font-google-sans-flex text-[12px] text-white mix-blend-difference">
                        <h2 className="text-[16px] font-normal leading-none whitespace-nowrap md:text-[29px]">
                            {t("section5.popupTitle")}
                        </h2>
                        <p className="mt-2 text-[10px] font-normal whitespace-nowrap md:text-[17px]">
                            {t("section5.popupSubtitle")}
                        </p>
                        <button
                            type="button"
                            onClick={() => onScheduleClick?.()}
                            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[#FF0000] py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#e00000] md:py-2 md:text-[15px] [mix-blend-mode:normal]"
                        >
                            {t("section5.popupCta")}
                        </button>
                    </div>

                    <button
                        className="absolute top-1 right-1 z-10 rounded-full p-1 text-white mix-blend-difference transition hover:bg-white/20"
                        onClick={handleClosePopup}
                        aria-label={t("section5.aria.close")}
                    >
                        <OptimizedImage
                            src={xclose}
                            alt={t("section5.aria.closePopupAlt")}
                            width={16}
                            height={16}
                            className="w-4 h-4"
                            loading="lazy"
                            decoding="async"
                        />
                    </button>
                </motion.div>
            )}
            </AnimatePresence>
        </section>
    );
};

export default Section5;
