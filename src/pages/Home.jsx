// Home.jsx — mobile-first optimizado
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { breadcrumbSchema } from "@/config/seo";

import HeroSection from "@/components/Section1";
import Section2 from "@/components/Section2";
const Section3 = lazy(() => import("@/components/Section3"));
const Section4 = lazy(() => import("@/components/Section4"));
const Section5 = lazy(() => import("@/components/Section5"));
const SimultaneousWords = lazy(() => import("@/components/TextEnDTE"));
const InfiniteCarousel = lazy(() => import("@/components/Slide"));
const Section7 = lazy(() => import("@/components/Section8"));
const CurvedLoop = lazy(() => import("@/components/CurvedLoop"));

// Fallback mínimo: evita layout shift sin coste de render
const LazySection = ({ children }) => (
  <Suspense fallback={<div className="h-px" aria-hidden="true" />}>{children}</Suspense>
);

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [renderDeferred, setRenderDeferred] = useState(false);
  const sentinelRef = useRef(null);

  // Estable entre renders — no recrear en cada llamada
  const whatsappUrl = useMemo(
    () => `https://wa.me/59896280674?text=${encodeURIComponent(t("section1.whatsappMessage"))}`,
    [t]
  );

  const handleContactClick = useCallback(() => {
    window.location.assign(whatsappUrl);
  }, [whatsappUrl]);

  const handleRegisterClick = useCallback(() => {
    navigate("/registro");
  }, [navigate]);

  // IntersectionObserver: carga diferida solo cuando el usuario se acerca,
  // no forzamos un timer arbitrario de 1.2–1.5s en dispositivos lentos.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRenderDeferred(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" } // Pre-carga 300px antes de que el sentinel sea visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Layout
      seo={{
        title: t("layout.seo.defaultTitle"),
        description: t("layout.seo.defaultDescription"),
        url: "/",
        structuredData: [
          breadcrumbSchema([{ name: "Inicio", path: "/" }]),
        ],
      }}
    >
      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-[10px] overflow-x-hidden">
        <div className="relative w-full">
          <HeroSection
            onRegisterClick={handleRegisterClick}
            brochureUrl="/brochure-grupo-dte.pdf"
            whatsappUrl={whatsappUrl}
          />
        </div>
        <div className="relative w-full">
          <Section2 onContactClick={handleContactClick} />
        </div>

        {/* Sentinel: dispara la carga diferida cuando el usuario se acerca al final de Section2 */}
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />

        {renderDeferred && (
          <>
            <div className="relative w-full">
              <LazySection>
                <Section3 onContactClick={handleContactClick} />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <Section4 />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <InfiniteCarousel />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <SimultaneousWords />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <CurvedLoop
                  marqueeText="BE ✦ Creative ✦ With ✦ DTE ✦"
                  speed={3}
                  curveAmount={300}
                  direction="right"
                  interactive={true}
                />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <Section5 onScheduleClick={handleContactClick} />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <Section7 onContactClick={handleContactClick} />
              </LazySection>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Home;
