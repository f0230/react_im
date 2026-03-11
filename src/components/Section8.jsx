import React from "react";
import BlurText from "./ui/TextBlur";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Section8 = ({ onMoreClick, onContactClick }) => {
    const { t, i18n } = useTranslation();
    return (
        <section
            className="p-4 pt-20 pb-8 md:py-20 md:px-0 w-full flex flex-col justify-center items-center text-center font-product"
            aria-label={t("section8.aria")}
        >
            <div className="max-w-4xl w-full flex flex-col items-center text-center">
                <h2 className="w-full text-2xl md:text-[50px] font-bold text-black mb-5 leading-[0.95] text-center flex justify-center">
                    <BlurText
                        key={i18n.language}
                        text={t("section8.title")}
                        delay={100}
                        animateBy="words"
                        className="w-full justify-center text-4xl md:text-5xl font-bold mb-4 leading-[0.95] text-center"
                    />
                </h2>
                <p className="text-black text-[14px] md:text-[20px] mb-8 max-w-2xl mx-auto leading-[1.05] text-center">
                    {t("section8.description")}
                </p>
                <div className="flex w-full flex-col gap-[10px] px-[20px] sm:flex-row sm:justify-center sm:items-center sm:gap-4">
                    <button
                        onClick={onContactClick}
                        className="h-[40px] md:h-[42px] px-6 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-bold text-[18px] md:text-[22px] flex items-center justify-center"
                    >
                        {t("section8.ctaContact")}
                    </button>

                    <Link
                        to="/servicios"
                        onClick={onMoreClick}
                        className="h-[40px] md:h-[42px] px-6 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-bold text-[18px] md:text-[22px] flex items-center justify-center text-center"
                        aria-label={t("section8.ctaMoreAria")}
                    >
                        {t("section8.ctaMore")}
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Section8;
