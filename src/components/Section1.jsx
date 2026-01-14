// Section1.jsx optimizado
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import RotatingText from "./ui/RotatingText";
import AnimatedContent from './ui/AnimatedContent';
import FadeContent from './ui/FadeContent';
import OptimizedImage from "@/components/OptimizedImage";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";



import bgMobileImg from "../assets/PORTADA_1_MOVIL.webp";
import bgDesktopImg from "../assets/PORTADA_1.webp";
import grupodte from "../assets/LOGODTE.svg";
import xclose from "../assets/x-close.svg";

const HeroSection = ({ onContactClick }) => {
  const { t } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);
  const rotatingWords = t("section1.rotatingWords", { returnObjects: true });
  const safeWords = Array.isArray(rotatingWords) ? rotatingWords : [rotatingWords];
  const whatsappMessage = t("section1.whatsappMessage");
  const whatsappLink = `https://wa.me/59899123456?text=${encodeURIComponent(whatsappMessage)}`;

  useEffect(() => {
    const popupTimer = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(popupTimer);
  }, []);

  return (
    <section className="font-product relative w-full flex justify-center items-start px-2 z-10" aria-label={t("section1.aria.hero")}>
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] sm:h-[600px] md:h-[700px] lg:h-[700px] overflow-hidden mx-auto">
        <AnimatedContent distance={150} direction="vertical" reverse={false} config={{ tension: 80, friction: 20 }} initialOpacity={0.2} animateOpacity scale={1}>

          <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] overflow-hidden mt-[45px] sm:mt-0 mx-auto" style={{ zIndex: 20 }}>
            {/* Imágenes de fondo */}
            <div className="absolute inset-0 block md:hidden">
              <OptimizedImage
                src={bgMobileImg}
                alt={t("section1.aria.bgMobileAlt")}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="absolute inset-0 hidden md:block">
              <OptimizedImage
                src={bgDesktopImg}
                alt={t("section1.aria.bgDesktopAlt")}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Contenido principal */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-black">

                <FadeContent duration={800} easing="ease-out" initialOpacity={0} delay={200}>
                  <OptimizedImage
                    src={grupodte}
                    alt={t("section1.aria.logoAlt")}
                    width={200}
                    height={200}
                    className="mx-auto w-[150px] sm:w-[175px] md:w-[200px]"
                    loading="lazy"
                    decoding="async"
                  />
                </FadeContent>

                <AnimatedContent distance={40} direction="vertical" reverse config={{ tension: 120, friction: 14 }} initialOpacity={0} animateOpacity delay={400}>
                  <h1 className="mx-auto text-[30px] sm:text-5xl md:text-[45px] lg:text-[60px] leading-none text-center">
                    {t("section1.titleLine")}<br />
                    <span className="font-bold inline-block">
                      <RotatingText
                        texts={safeWords}
                        rotationInterval={2500}
                        splitBy="words"
                        staggerDuration={0.03}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        mainClassName="font-bold"
                      />
                    </span>
                  </h1>
                </AnimatedContent>

                <FadeContent duration={1000} easing="ease-in-out" initialOpacity={0} delay={700}>
                  <p className="text-[12px] md:text-[17px] mt-4">{t("section1.subtitle")}</p>
                </FadeContent>

                <div className="mt-4 md:mt-8 flex flex-wrap justify-center gap-2 md:gap-4">
                  <AnimatedContent distance={60} direction="horizontal" reverse config={{ tension: 100, friction: 16 }} initialOpacity={0} animateOpacity delay={900} className="inline-block">
                    <button onClick={onContactClick} className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px] hover:bg-skyblue/95 transition">
                        {t("section1.ctaContact")}
                      </button>
                  </AnimatedContent>

                  

                  <AnimatedContent distance={60} direction="horizontal" reverse={false} config={{ tension: 100, friction: 16 }} initialOpacity={0} animateOpacity delay={1050} className="inline-block">
                    <Link to="/servicios">
                  <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px] hover:bg-white/95 transition">
                        {t("section1.ctaServices")}
                      </button></Link>
                    
                  </AnimatedContent>
                </div>

                {showPopup && (
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 30 }}
                    animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
                    transition={{ duration: 1.65, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-2 transform -translate-x-1/2 w-[250px] min-h-[110px] h-auto bg-black shadow-lg p-4 flex flex-col justify-between z-30 md:bottom-auto md:left-auto md:transform-none md:right-4 md:top-4 md:w-[389px] md:min-h-[150px]"
                    role="dialog"
                    aria-label={t("section1.aria.popup")}
                  >
                    <FadeContent blur duration={600} easing="ease-out" initialOpacity={0} delay={300}>
                      <div className="text-white text-[12px] md:text-[17px]">
                        <h2 className="font-normal text-[20px] md:text-[40px] leading-[1] lg:leading-[1.1]">
                          {t("section1.popupTitleLine1")} <br />
                          <span className="inline-block -mt-2">{t("section1.popupTitleLine2")}</span>
                        </h2>
                        <p className="mt-1">{t("section1.popupSubtitle")}</p>
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#0DD122] py-1.5 text-[11px] font-semibold text-black transition hover:bg-[#1ebe5d] md:py-2 md:text-[15px]"
                        >
                          {t("section1.popupCta")}
                        </a>
                      </div>
                    </FadeContent>

                    <button
                      className="absolute top-1 right-1 text-white p-1 rounded-full hover:bg-white/20 transition"
                      onClick={() => setShowPopup(false)}
                      aria-label={t("section1.aria.close")}
                    >
                      <OptimizedImage
                        src={xclose}
                        alt={t("section1.aria.closePopupAlt")}
                        width={16}
                        height={16}
                        className="w-4 h-4"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

        </AnimatedContent>
      </div>
    </section>
  );
};

export default HeroSection;
