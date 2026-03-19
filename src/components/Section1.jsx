// Section1.jsx optimizado
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RotatingText from "./ui/RotatingText";
import AnimatedContent from './ui/AnimatedContent';
import FadeContent from './ui/FadeContent';
import OptimizedImage from "@/components/OptimizedImage";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import desktopSectionImage from "../assets/FONODO CON TEXTO 1440.webp";
import grupodte from "../assets/LOGODTE.svg";
import heroCenterImage from "../assets/DOS IMG 1.png";
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
        <link rel="preload" as="image" href={desktopSectionImage} media="(min-width: 1024px)" fetchpriority="high" />
        <link rel="preload" as="image" href={grupodte} fetchpriority="high" />
        <link rel="preload" as="image" href={heroCenterImage} fetchpriority="high" />
      </Helmet>
    <section className="font-product relative z-10 flex w-full items-start justify-center bg-[linear-gradient(to_bottom,#CFCFCF_0%,#F5F5F7_100%)] px-4 pt-[10px] md:px-6" aria-label={t("section1.aria.hero")}>
      <div className="relative mx-auto w-full overflow-visible px-4 xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] sm:h-[600px] md:h-[700px] lg:h-[700px]">
        <AnimatedContent distance={150} direction="vertical" reverse={false} config={{ tension: 80, friction: 20 }} initialOpacity={0.2} animateOpacity scale={1}>

          <div className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] overflow-hidden mt-[45px] sm:mt-0 mx-auto" style={{ zIndex: 20 }}>
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#CFCFCF_0%,#F5F5F7_100%)]" />
            <img
              src={desktopSectionImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 hidden h-full w-full object-cover lg:block"
              loading="eager"
              decoding="async"
              fetchpriority="high"
            />

            {/* Contenido principal */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-black">

                <AnimatedContent distance={40} direction="vertical" reverse config={{ tension: 120, friction: 14 }} initialOpacity={0} animateOpacity delay={400}>
                  <div className="mx-auto flex flex-nowrap items-end justify-center gap-2 whitespace-nowrap px-3 sm:gap-3 md:gap-4" style={{ color: "#3E3E3E" }}>
                    <span className="text-[26px] font-normal leading-none tracking-[-0.04em] sm:text-[36px] md:text-[45px] lg:text-[45px]" style={{ color: "#3E3E3E" }}>
                      impulsa tu
                    </span>
                    <span className="inline-block text-[26px] font-bold leading-none tracking-[-0.04em] sm:text-[36px] md:text-[45px] lg:text-[45px]">
                      <RotatingText
                        texts={safeWords}
                        rotationInterval={2500}
                        splitBy="words"
                        staggerDuration={0.03}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        mainClassName="font-bold"
                      />
                    </span>
                  </div>
                </AnimatedContent>

                <FadeContent duration={1000} easing="ease-in-out" initialOpacity={0} delay={700}>
                  <p className="mt-4 max-w-[720px] text-center text-[12px] leading-[1.14] md:text-[17px]" style={{ color: "#656565" }}>
                    En DTE unimos tecnologia y automatizaciones con estrategia y diseno
                    <br />
                    para que tu empresa crezca con claridad y opere con control.
                  </p>
                </FadeContent>

                <FadeContent duration={1000} easing="ease-out" initialOpacity={0} delay={820}>
                  <div className="relative mt-8 md:mt-10">
                    <div className="pointer-events-none absolute left-[56%] top-[18%] h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-white/95 blur-[90px] sm:h-[260px] sm:w-[260px] md:h-[320px] md:w-[320px]" />
                    <div className="pointer-events-none absolute left-[36%] top-[58%] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/25 blur-[80px] sm:h-[260px] sm:w-[260px] md:h-[300px] md:w-[300px]" />
                    <OptimizedImage
                      src={heroCenterImage}
                      alt="Composicion visual DTE"
                      width={620}
                      height={380}
                      className="relative z-10 w-[360px] max-w-[88vw] sm:w-[430px] md:w-[520px] lg:w-[660px]"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </FadeContent>

                <div className="mt-8 md:mt-10 flex w-full max-w-[460px] flex-wrap items-center justify-center gap-3 md:max-w-[520px] md:gap-5">
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

                <AnimatePresence>
                {showPopup && (
                  <motion.div
                    key="section1-popup"
                    initial={{ opacity: 0, scale: 0.94, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 14, filter: "blur(8px)" }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    style={{ backdropFilter: "blur(99px)", WebkitBackdropFilter: "blur(99px)" }}
                    className="absolute bottom-2 transform -translate-x-1/2 w-[250px] min-h-[110px] h-auto overflow-hidden rounded-[20px] border border-white/16 bg-transparent pt-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)] saturate-[1] p-4 flex flex-col justify-between z-30 md:bottom-auto md:left-auto md:transform-none md:right-4 md:top-4 md:w-[389px] md:min-h-[150px]"
                    role="dialog"
                    aria-label={t("section1.aria.popup")}
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
                    <FadeContent blur duration={600} easing="ease-out" initialOpacity={0} delay={300}>
                      <div className="relative z-10 text-center text-[12px] text-[#1F1F1F] md:text-[17px]">
                        <h2 className="text-[19px] leading-none whitespace-nowrap text-[#1F1F1F] md:text-[40px]">
                          <span className="font-bold">{t("section1.popupTitleLine1")}</span>{" "}
                          <span className="font-normal">{t("section1.popupTitleLine2")}</span>
                        </h2>
                        <p className="mt-2 text-[#1F1F1F]">
                          {t("section1.popupSubtitle")}
                        </p>
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[#0DD122] py-1.5 text-center text-[11px] font-semibold text-black transition hover:bg-[#1ebe5d] md:py-2 md:text-[15px] [mix-blend-mode:normal]"
                        >
                          {t("section1.popupCta")}
                        </a>
                      </div>
                    </FadeContent>

                    <button
                      className="absolute top-1 right-1 z-10 rounded-full p-1 text-white transition hover:bg-white/20"
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
                </AnimatePresence>
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
