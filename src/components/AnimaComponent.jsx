import React from "react";
import Hero from "./Hero";
import ScrollToTopButton from "./ScrollToTopButton";
import Navbar from './Navbar';
import HeroG from "./HeroG";
import Section2 from "./Section2";
import Section3 from "./Section3";

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



        <ScrollToTopButton />
      </div>
  );
};

export default AnimaComponent;
