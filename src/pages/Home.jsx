// Home.jsx optimizado
import React, { lazy, Suspense, useState } from "react";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import StepperModal from "@/components/StepperModal";
import Layout from "@/components/Layout";

const HeroSection = lazy(() => import("@/components/Section1"));
const Section2 = lazy(() => import("@/components/Section2"));
const Section3 = lazy(() => import("@/components/Section3"));
const Section4 = lazy(() => import("@/components/Section4"));
const Section5 = lazy(() => import("@/components/Section5"));
const SimultaneousWords = lazy(() => import("@/components/TextEnDTE"));
const InfiniteCarousel = lazy(() => import("@/components/Slide"));
const Section7 = lazy(() => import("@/components/Section8"));
const SectionDteAutomation = lazy(() => import("@/components/SectionDteAutomation"));
const SectionCardSwap = lazy(() => import("@/components/SectionCardSwap"));
const CurvedLoop = lazy(() => import("@/components/CurvedLoop"));


const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (

    <Layout>
    <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative">
      
        <div className="relative w-full">
          
          <HeroSection onContactClick={() => setIsModalOpen(true)} />
        </div>
        <div className="relative w-full">
          <Section2 onContactClick={() => setIsModalOpen(true)} />
        </div>
        <div className="relative w-full">
          <SectionDteAutomation onContactClick={() => setIsModalOpen(true)} />
        </div>
        <div className="relative w-full">
          <SectionCardSwap onContactClick={() => setIsModalOpen(true)} />
       
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
          <Section5 />
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
