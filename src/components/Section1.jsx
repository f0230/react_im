// Section1.jsx optimizado
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import RotatingText from "./ui/RotatingText";
import AnimatedContent from './ui/AnimatedContent';
import FadeContent from './ui/FadeContent';
import OptimizedImage from "@/components/OptimizedImage";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";



import bgMobileImg from "../assets/PORTADA_1_MOVIL.webp";
import bgDesktopImg from "../assets/PORTADA_1.webp";
import grupodte from "../assets/LOGODTE.svg";
import xclose from "../assets/x-close.svg";

const HeroSection = ({ onRegisterClick, brochureUrl, whatsappUrl }) => {
  const { t } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);
  const rotatingWords = t("section1.rotatingWords", { returnObjects: true });
  const safeWords = Array.isArray(rotatingWords) ? rotatingWords : [rotatingWords];
  const whatsappMessage = t("section1.whatsappMessage");
  const whatsappLink = whatsappUrl || `https://wa.me/59896280674?text=${encodeURIComponent(whatsappMessage)}`;

  useEffect(() => {
    const popupTimer = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(popupTimer);
  }, []);

  return (
    <>
      <Helmet>
        <link rel="preload" as="image" href={bgDesktopImg} media="(min-width: 768px)" fetchpriority="high" />
        <link rel="preload" as="image" href={bgMobileImg} media="(max-width: 767px)" fetchpriority="high" />
        <link rel="preload" as="image" href={grupodte} fetchpriority="high" />
      </Helmet>
    <section className="font-product relative w-full flex justify-center items-start px-2 pt-[10px] z-10" aria-label={t("section1.aria.hero")}>
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] sm:h-[600px] md:h-[700px] lg:h-[700px] overflow-hidden mx-auto">
        <AnimatedContent distance={150} direction="vertical" reverse={false} config={{ tension: 80, friction: 20 }} initialOpacity={0.2} animateOpacity scale={1}>

          <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] overflow-hidden mt-[45px] sm:mt-0 mx-auto" style={{ zIndex: 20 }}>
            {/* Imágenes de fondo - LCP: carga prioritaria */}
            <div className="absolute inset-0 block md:hidden">
              <img
                src={bgMobileImg}
                alt={t("section1.aria.bgMobileAlt")}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                width={600}
                height={500}
              />
            </div>
            <div className="absolute inset-0 hidden md:block">
              <img
                src={bgDesktopImg}
                alt={t("section1.aria.bgDesktopAlt")}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                width={1440}
                height={700}
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
                  <h1 className="mx-auto text-[26px] sm:text-5xl md:text-[45px] lg:text-[60px] leading-none text-center whitespace-nowrap">
                    {t("section1.titleLine")}{" "}
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

                <div className="mt-4 md:mt-8 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-5">
                  <AnimatedContent distance={60} direction="horizontal" reverse config={{ tension: 100, friction: 16 }} initialOpacity={0} animateOpacity delay={900} className="inline-block">
                    <button
                      onClick={onRegisterClick}
                      className="w-[210px] md:w-auto px-6 md:px-8 text-[13px] md:text-[17px] h-[40px] md:h-[56px] bg-[#19d327] text-white rounded-full font-medium hover:bg-[#15bf22] transition-colors"
                    >
                      {t("section1.ctaContact")}
                    </button>
                  </AnimatedContent>



                  <AnimatedContent distance={60} direction="horizontal" reverse={false} config={{ tension: 100, friction: 16 }} initialOpacity={0} animateOpacity delay={1050} className="inline-block">
                    <a
                      href={brochureUrl || "/brochure-grupo-dte.pdf"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-[210px] md:w-auto px-6 md:px-8 text-[13px] md:text-[17px] h-[40px] md:h-[56px] bg-white text-skyblue border-2 border-skyblue rounded-full font-medium hover:bg-skyblue/5 transition-colors items-center justify-center"
                    >
                      {t("section1.ctaServices")}
                    </a>

                  </AnimatedContent>
                </div>

                {showPopup && (
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 30 }}
                    animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
                    transition={{ duration: 1.65, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-2 transform -translate-x-1/2 w-[250px] min-h-[110px] h-auto overflow-hidden rounded-[20px] border border-white/16 bg-black/48 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-[450px] saturate-[1] p-4 flex flex-col justify-between z-30 md:bottom-auto md:left-auto md:transform-none md:right-4 md:top-4 md:w-[389px] md:min-h-[150px]"
                    role="dialog"
                    aria-label={t("section1.aria.popup")}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08)_20%,transparent_46%,rgba(255,255,255,0.025)_100%)]" />
                    <div
                      className="pointer-events-none absolute inset-0 opacity-12 mix-blend-soft-light"
                      style={{
                        backgroundImage:
                          'radial-gradient(rgba(255,255,255,0.16) 0.55px, transparent 0.8px), radial-gradient(rgba(0,0,0,0.12) 0.6px, transparent 0.85px)',
                        backgroundPosition: '0 0, 4px 4px',
                        backgroundSize: '10px 10px, 12px 12px',
                      }}
                    />
                    <FadeContent blur duration={600} easing="ease-out" initialOpacity={0} delay={300}>
                      <div className="relative z-10 text-white text-[12px] md:text-[17px] [mix-blend-mode:difference]">
                        <h2 className="font-normal text-[20px] md:text-[40px] leading-[1] lg:leading-[1.1]">
                          {t("section1.popupTitleLine1")} <br />
                          <span className="inline-block -mt-2">{t("section1.popupTitleLine2")}</span>
                        </h2>
                        <p className="mt-1">{t("section1.popupSubtitle")}</p>
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#0DD122] py-1.5 text-[11px] font-semibold text-black transition hover:bg-[#1ebe5d] md:py-2 md:text-[15px] [mix-blend-mode:normal]"
                        >
                          {t("section1.popupCta")}
                        </a>
                      </div>
                    </FadeContent>

                    <button
                      className="absolute top-1 right-1 z-10 text-white p-1 rounded-full transition hover:bg-white/20 [mix-blend-mode:difference]"
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
    </>
  );
};

export default HeroSection;
