import React from "react";
import { Hero } from "./Hero";
import ScrollToTopButton from "./ScrollToTopButton";
import Navbar from './Navbar';

export const AnimaComponent = () => {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full max-w-[1920px] mx-auto relative">
      <main className="pt-[50px] sm:pt-[100px]">
      <Navbar />
      </main>

        <Hero />
        <ScrollToTopButton />

      </div>
    </div>
  );
};

export default AnimaComponent;
