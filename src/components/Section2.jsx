import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import iphonegreen from "../assets/iphone-green-web.png";

const revealUp = {
  hidden: { opacity: 0, y: 100, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

const Section2 = () => {
    return (
 
      <section className=" font-product relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10">
  <div className="bg-black relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px]
                  h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] xl:h-[700px]
                  mt-[5px] sm:mt-[0px] overflow-hidden">
    
    <div className="relative z-10 w-full mx-auto h-full flex flex-col items-center justify-top text-center mt-[45px] md:mt-[100px] lg:mt-[175px]">
      <h1 className="text-green text-[30px] sm:text-[40px] md:text-[50px] lg:text-[60px] font-normal leading-none">
        <span className="block md:inline">+ ideas</span>
        <span className="block md:inline md:ml-2">+ profesionales</span>
      </h1>

        <p className="w-[222px] md:w-[400px]  font-normal text-[12px] md:text-[17px] text-white mt-4 sm:mt-6 md:mt-8 leading-none">
        DTE ahora es un grupo que busca sumarse a otras empresas para apoyar el crecimiento y buscar el máximo beneficio. Somos más profesionales.
      </p>

      <div className="mt-4 md:mt-8 inline-block space-x-1 md:space-x-2 lg:space-x-3">
        <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px]  hover:bg-skyblue/95 hover:text-white transition duration-300">
          Contactanos
        </button>
        <button className="z-100 text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px] hover:bg-white/95 hover:text-skyblue transition duration-300">
          Servicios
        </button>
      </div>
    </div>
          {/* Imagen para dispositivos de escritorio */}
          <div className="absolute  bottom-0 right-0">
            <img src={iphonegreen} alt="imagen de celular de" className="md:w-[810px] md:h-[540px]" />
          </div>
  </div>
</section>

    );
  };

  
  export default Section2;