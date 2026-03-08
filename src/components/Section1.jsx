// Section1.jsx optimizado
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import RotatingText from "./ui/RotatingText";
import AnimatedContent from './ui/AnimatedContent';
import FadeContent from './ui/FadeContent';
import OptimizedImage from "@/components/OptimizedImage";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";



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
    <>
      <Helmet>
        <link rel="preload" as="image" href={bgDesktopImg} media="(min-width: 768px)" fetchpriority="high" />
        <link rel="preload" as="image" href={bgMobileImg} media="(max-width: 767px)" fetchpriority="high" />
        <link rel="preload" as="image" href={grupodte} fetchpriority="high" />
      </Helmet>
    <section className="font-product relative w-full flex justify-center items-start px-2 z-10" aria-label={t("section1.aria.hero")}>
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

          
          </div>

        </AnimatedContent>
      </div>
    </section>
    </>
  );
};

export default HeroSection;
