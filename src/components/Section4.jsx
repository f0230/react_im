import React from "react";
import OptimizedImage from "@/components/OptimizedImage";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";

import ContImg from "../assets/BANNER_ESPACIOS-1.webp";
import MContImg from "../assets/BANNER_ESPACIOS_M-1.webp";
import SpaceImg from "../assets/BANNER_ESPACIOS_M.webp";
import MSpaceImg from "../assets/BANNER_ESPACIOS_M.webp";

const Section4 = () => {
  const { t } = useTranslation();

  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10"
      aria-label={t("section4.aria")}
    >
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] h-auto overflow-hidden">
        <div className="flex flex-col md:flex-row w-full gap-2">
          {/* ESPACIOS */}
          <div className="group w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">{t("section4.spacesTitle")}</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                {t("section4.spacesDescription")}
              </p>
              <Link to="/servicios">
                <button
                  className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition duration-300 mb-6"
                  aria-label={t("section4.ctaAria")}
                >
                  {t("section4.cta")}
                </button>
              </Link>
            </div>

            <div className="absolute inset-0 hidden sm:block z-10">
              <OptimizedImage
                src={SpaceImg}
                alt={t("section4.ariaSpacesDesktopAlt")}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="absolute inset-0 sm:hidden z-10">
              <OptimizedImage
                src={MSpaceImg}
                alt={t("section4.ariaSpacesMobileAlt")}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* CONTENIDOS */}
          <div className="group w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">{t("section4.contentTitle")}</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                {t("section4.contentDescription")}
              </p>
              <Link to="/servicios">
                <button
                  className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition duration-300 mb-6"
                  aria-label={t("section4.ctaAria")}
                >
                  {t("section4.cta")}
                </button>
              </Link>
            </div>

            <div className="absolute inset-0 hidden sm:block z-10">
              <OptimizedImage
                src={ContImg}
                alt={t("section4.ariaContentDesktopAlt")}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="absolute inset-0 sm:hidden z-10">
              <OptimizedImage
                src={MContImg}
                alt={t("section4.ariaContentMobileAlt")}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section4;
