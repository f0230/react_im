import React from "react";
import Hero from "./Hero";
import ScrollToTopButton from "./ScrollToTopButton";
import Navbar from './Navbar';
import HeroG from "./HeroG";

export const AnimaComponent = () => {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full mx-auto relative"> {/* <= ACA, relative */}
        <main className="pt-[35px] sm:pt-[50px]">
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
