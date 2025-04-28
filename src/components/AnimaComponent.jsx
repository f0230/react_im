import React from "react";

import { Hero } from './Hero';
import { Benefits } from './Benefits';



export const AnimaComponent = () => {
  return (
    <div className=" flex flex-row justify-center w-full">
      <div className=" w-full max-w-[1920px] relative">
      <Hero/>
      <Benefits/>
      </div>
    </div>
  );
};

export default AnimaComponent;
