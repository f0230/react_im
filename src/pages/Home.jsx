// Home.jsx optimizado
import React, { lazy, Suspense } from "react";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";

import Layout from "@/components/Layout";

const HeroSection = lazy(() => import("@/components/Section1"));
const Section2 = lazy(() => import("@/components/Section2"));
const Section3 = lazy(() => import("@/components/Section3"));
const Section4 = lazy(() => import("@/components/Section4"));
const Section5 = lazy(() => import("@/components/Section5"));
const SimultaneousWords = lazy(() => import("@/components/TextEnDTE"));
const InfiniteCarousel = lazy(() => import("@/components/Slide"));
const Section7 = lazy(() => import("@/components/Section8"));

const Home = () => {
  return (

    <Layout>
    <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative">
        <div className="relative w-full">
          <HeroSection />
        </div>
        <div className="relative w-full">
          <Section2 />
        </div>
        <div className="relative w-full">
          <Section3 />
        </div>
        <div className="relative w-full">
          <Section4 />
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
          <Section7 />
        </div>
        <ScrollToTopButton />
    </div>
    </Layout>
  );
};

export default Home;
