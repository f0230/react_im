import React from "react";
import ScrollToTopButton from "../components/ui/ScrollToTopButton";
import HeroG from "../components/Section1";
import Section2 from "../components/Section2";
import Section3 from "../components/Section3";
import Section4 from "../components/Section4";  
import Section5 from "../components/Section5";
import SimultaneousWords from "../components/TextEnDTE";
import InfiniteCarousel from "../components/Slide";
import Section7 from "../components/Section8";  
import Footer from "../components/Footer";





export const AnimaComponent = () => {
  return (
    
      <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative"> 
        
   
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



    
        <ScrollToTopButton />



      </div>
  );
};

export default AnimaComponent;
