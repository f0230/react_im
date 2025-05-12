import React, { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import ScrollToTopButton from "./ui/ScrollToTopButton";
import Navbar from './Navbar';
import HeroG from "./Section1";
import Section2 from "./Section2";
import Section3 from "./Section3";
import Section4 from "./Section4";  
import Section5 from "./Section5";
import SimultaneousWords from "./Section6";
import InfiniteCarousel from "./Section7";
import Section7 from "./Section8";  
import Footer from "./Footer";

// Registrar ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

export const AnimaComponent = () => {
  useEffect(() => {
    // Animación global para cada sección
    gsap.utils.toArray(".reveal-section").forEach((section) => {
      gsap.fromTo(section,
        { opacity: 0, y: 100 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            toggleActions: "play none none reverse",
          }
        }
      );
    });
  }, []);

  return (
    <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative"> 
      <main className="pt-[45x] sm:pt-[45px]">
        <Navbar />
      </main>

      <div className="relative w-full reveal-section">
        <HeroG />
      </div>
      <div className="relative w-full reveal-section">
        <Section2 />
      </div>
      <div className="relative w-full reveal-section">
        <Section3 />
      </div>
      <div className="relative w-full reveal-section">
        <Section4 />
      </div>
      <div className="relative w-full reveal-section">
        <Section5 />
      </div>
      <div className="relative w-full reveal-section">
        <SimultaneousWords />   
      </div>
      <div className="relative w-full reveal-section">
        <InfiniteCarousel />  
      </div>
      <div className="relative w-full reveal-section">
        <Section7 />
      </div>

      <footer className="relative w-full reveal-section">
        <Footer />
      </footer>

      <ScrollToTopButton />
    </div>
  );
};

export default AnimaComponent;
