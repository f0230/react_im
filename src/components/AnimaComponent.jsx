import React from "react";
import Hero from "./Hero";
import ScrollToTopButton from "./ScrollToTopButton";
import Navbar from './Navbar';
import HeroG from "./HeroG";

export const AnimaComponent = () => {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto relative"> {/* <= ACA, relative */}
        <main className="pt-[50px] sm:pt-[100px]">
          <Navbar />
        </main>

        <div className="relative z-10"> {/* HeroG arriba */}
          <HeroG />
        </div>

        <div className="relative z-0"> {/* Hero debajo */}
          <Hero />
        </div>

        <ScrollToTopButton />
      </div>
    </div>
  );
};

export default AnimaComponent;
