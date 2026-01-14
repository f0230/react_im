import React from "react";
import BlurText from "./ui/TextBlur";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Section8 = ({ onMoreClick, onContactClick }) => {
    const { t, i18n } = useTranslation();
    return (
        <section
            className="p-4 py-20 px-4 md:px-0 w-full flex flex-col justify-center items-center text-center font-product"
            aria-label={t("section8.aria")}
        >
            <div className="max-w-4xl">
                <h2 className="text-2xl md:text-[50px] font-bold text-black mb-6 leading-none">
                    <BlurText
                        key={i18n.language}
                        text={t("section8.title")}
                        delay={100}
                        animateBy="words"
                        className="text-4xl md:text-5xl font-bold mb-4"
                    />
                </h2>
                <p className="text-black text-[14px] md:text-[20px] mb-10 max-w-2xl mx-auto leading-none">
                    {t("section8.description")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={onContactClick}
                        className="w-full sm:w-auto px-10 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-bold text-lg"
                    >
                        {t("section8.ctaContact")}
                    </button>

                    <Link
                        to="/servicios"
                        onClick={onMoreClick}
                        className="w-full sm:w-auto px-10 py-4 border-2 border-black text-black rounded-full hover:bg-black hover:text-white transition-all font-bold text-lg"
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
