import React from "react";
import { useTranslation } from "react-i18next";
import OptimizedImage from "./OptimizedImage";

import SlideDesktop1 from "../assets/d_slide_1.webp";
import SlideDesktop2 from "../assets/d_slide_2.webp";
import SlideMobile1 from "../assets/movil_slide1.webp";
import SlideMobile2 from "../assets/movil_slide2.webp";

const SectionDteAutomation = () => {
  const { t } = useTranslation();

  const slides = [
    {
      desktop: SlideDesktop1,
      mobile: SlideMobile1,
      alt: t("sectionDteAutomation.slides.dteLoHaceAlt")
    },
    {
      desktop: SlideDesktop2,
      mobile: SlideMobile2,
      alt: t("sectionDteAutomation.slides.automationAlt")
    },
  ];

  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10 mt-2"
      aria-label={t("sectionDteAutomation.aria")}
    >
      <div className="relative flex flex-col justify-center items-center w-full h-[525px] md:h-[900px] xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] overflow-hidden">
        <div className="flex md:grid md:grid-cols-2 gap-3 md:gap-2 w-full overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scroll-smooth no-scrollbar">
          {slides.map((slide, index) => (
            <article
              key={index}
              className="min-w-full md:min-w-0 snap-center h-[525px] md:h-[800px] overflow-hidden relative"
            >
              <picture className="absolute inset-0">
                <source media="(min-width: 768px)" srcSet={slide.desktop} />
                <OptimizedImage
                  src={slide.mobile}
                  alt={slide.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectionDteAutomation;
