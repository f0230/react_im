// Home.jsx optimizado
import React, { lazy, Suspense, useState } from "react";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import StepperModal from "@/components/StepperModal";
import Layout from "@/components/Layout";

const lazyLog = (importFn, name) => {
  return lazy(async () => {
    try {
      const module = await importFn();
      console.log(`[HomeLazyLog] Loaded ${name}:`, module);
      return module;
    } catch (error) {
      console.error(`[HomeLazyLog] Error loading ${name}:`, error);
      throw error;
    }
  });
};

const HeroSection = lazyLog(() => import("@/components/Section1"), "HeroSection");
const Section2 = lazyLog(() => import("@/components/Section2"), "Section2");
const Section3 = lazyLog(() => import("@/components/Section3"), "Section3");
const Section4 = lazyLog(() => import("@/components/Section4"), "Section4");
const Section5 = lazyLog(() => import("@/components/Section5"), "Section5");
const SimultaneousWords = lazyLog(() => import("@/components/TextEnDTE"), "SimultaneousWords");
const InfiniteCarousel = lazyLog(() => import("@/components/Slide"), "InfiniteCarousel");
const Section7 = lazyLog(() => import("@/components/Section8"), "Section7");
const SectionDteAutomation = lazyLog(() => import("@/components/SectionDteAutomation"), "SectionDteAutomation");
const CurvedLoop = lazyLog(() => import("@/components/CurvedLoop"), "CurvedLoop");


const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (

    <Layout>
      <div className="w-full overflow-x-hidden max-w-[1440px] mx-auto relative">

        <div className="relative w-full">

          <HeroSection onContactClick={() => setIsModalOpen(true)} />
        </div>
        <div className="relative w-full">
          <Section2 onContactClick={() => setIsModalOpen(true)} />
        </div>


        <div className="relative w-full">
          <Section3 onContactClick={() => setIsModalOpen(true)} />
        </div>
        <div className="relative w-full">
          <Section4 />

        </div>
        <div className="relative w-full">
          <CurvedLoop
            marqueeText="BE ✦ Creative ✦ With ✦ DTE ✦"
            speed={3}
            curveAmount={300}
            direction="right"
            interactive={true}
          />
        </div>
        <div className="relative w-full">
          <Section5 onContactClick={() => setIsModalOpen(true)} />
        </div>

        <div className="relative w-full">
          <SimultaneousWords />
        </div>
        <div className="relative w-full">
          <InfiniteCarousel />
        </div>
        <div className="relative w-full">
          <Section7 onContactClick={() => setIsModalOpen(true)} />
        </div>
        <ScrollToTopButton />
      </div>
      <StepperModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  );
};

export default Home;
