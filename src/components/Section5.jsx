// Section5.jsx optimizado
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import OptimizedImage from "@/components/OptimizedImage";
import { useTranslation } from "react-i18next";
import xclose from "../assets/x-close.svg";

const Section5 = ({ onContactClick }) => {
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

            {showPopup && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 20 }}
                    animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed bottom-4 left-4 w-[250px] min-h-[120px] pt-6 bg-black shadow-lg p-4 flex flex-col justify-between z-50 md:bottom-6 md:left-12 md:w-[389px]"
                    role="dialog"
                    aria-label={t("section5.aria.popup")}
                >
                    <div className="text-white text-[12px] md:text-[17px] ">
                        <h2 className="font-normal text-[18px] md:text-[34px] leading-none  ">
                            <span className="inline-block leading-none">{t("section5.popupTitle")}</span>
                        </h2>
                        <p className="mt-1">{t("section5.popupSubtitle")}</p>
                        <button
                            type="button"
                            onClick={() => onContactClick?.()}
                            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#FFD400] py-1.5 text-[11px] font-semibold text-black transition hover:bg-[#f3c800] md:py-2 md:text-[15px]"
                        >
                            {t("section5.popupCta")}
                        </button>
                    </div>

                    <button
                        className="absolute top-1 right-1 text-white p-1 rounded-full hover:bg-white/20 transition"
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
        </section>
    );
};

export default Section5;

