// Home.jsx optimizado
import React, { lazy, Suspense, useEffect, useState } from "react";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import Layout from "@/components/Layout";

import HeroSection from "@/components/Section1";
import Section2 from "@/components/Section2";
const Section3 = lazy(() => import("@/components/Section3"));
const Section4 = lazy(() => import("@/components/Section4"));
const Section5 = lazy(() => import("@/components/Section5"));
const SimultaneousWords = lazy(() => import("@/components/TextEnDTE"));
const InfiniteCarousel = lazy(() => import("@/components/Slide"));
const Section7 = lazy(() => import("@/components/Section8"));
const CurvedLoop = lazy(() => import("@/components/CurvedLoop"));

const WHATSAPP_URL = "https://wa.me/59896280674?text=Hola%2C%20quisiera%20hacer%20una%20consulta";
const REGISTRATION_URL = "https://www.grupodte.com/registro";
const SCHEDULE_CALL_URL = "https://www.grupodte.com/meet";
const BROCHURE_URL = "/brochure-grupo-dte.pdf";

const LazySection = ({ children }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

const Home = () => {
  const [renderDeferred, setRenderDeferred] = useState(false);

  const openExternalLink = (url) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleWhatsAppClick = () => openExternalLink(WHATSAPP_URL);
  const handleRegisterClick = () => openExternalLink(REGISTRATION_URL);
  const handleScheduleCallClick = () => openExternalLink(SCHEDULE_CALL_URL);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let idleId;
    const start = () => setRenderDeferred(true);

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(start, { timeout: 1500 });
    } else {
      idleId = window.setTimeout(start, 1200);
    }

    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
  }, []);
  return (

    <Layout>
      <div className="w-full overflow-x-hidden max-w-[1440px] mx-auto relative">

        <div className="relative w-full">

          <HeroSection
            onRegisterClick={handleRegisterClick}
            brochureUrl={BROCHURE_URL}
            whatsappUrl={WHATSAPP_URL}
          />
        </div>
        <div className="relative w-full mt-[10px]">
          <Section2 onContactClick={handleWhatsAppClick} />
        </div>


        {renderDeferred && (
          <>
            <div className="relative w-full">
              <LazySection>
                <Section3 onContactClick={handleWhatsAppClick} />
              </LazySection>
            </div>
            <div className="relative w-full mt-[10px]">
              <LazySection>
                <Section4 />
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
                <Section5 onScheduleClick={handleScheduleCallClick} />
              </LazySection>
            </div>

            <div className="relative w-full">
              <LazySection>
                <SimultaneousWords />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <InfiniteCarousel />
              </LazySection>
            </div>
            <div className="relative w-full">
              <LazySection>
                <Section7 onContactClick={handleWhatsAppClick} />
              </LazySection>
            </div>
          </>
        )}
        <ScrollToTopButton />
      </div>
    </Layout>
  );
};

export default Home;
