import React from "react";
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


import SplashCursor from './ui/SplashCursor'


export const AnimaComponent = () => {
  return (
    
      <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative"> 
        
        <main className="pt-[45x] sm:pt-[45px]">
          <Navbar />
        </main>
        <div className="relative w-full">
          <HeroG />
        </div>
        <div className="relative w-full">
          <Section2 />
        </div>
        <div className="relative w-full">
          <Section3 />
        </div>
        <div>
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



        <footer className="relative w-full">
          <Footer />
        </footer>

        <ScrollToTopButton />

      <SplashCursor />


      </div>
  );
};

export default AnimaComponent;
