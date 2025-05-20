// Section2.jsx optimizado
import React from "react";
import OptimizedImage from "@/components/OptimizedImage";
import bgMobileProfe from "../assets/ProfMov.webp";
import bgWebProfe from "../assets/Profeweb.webp";
import { Link } from 'react-router-dom';


const Section2 = () => {
  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10"
      aria-label="Sección sobre profesionales"
    >
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] xl:h-[700px] mt-[5px] sm:mt-[0px] overflow-hidden">
        <picture className="absolute inset-0 z-0">
          <source srcSet={bgWebProfe} media="(min-width: 768px)" />
          <OptimizedImage
            src={bgWebProfe}          // imagen por defecto (web)
            mobileSrc={bgMobileProfe} // imagen para mobile
            alt="Fondo profesionales DTE"
            className="w-full h-full"
            decoding="async"
            loading="lazy"
          />

        </picture>

        <div className="relative z-10 w-full mx-auto h-full flex flex-col items-center justify-center text-center">
          <h1 className="text-white text-[30px] sm:text-[40px] md:text-[50px] lg:text-[60px] font-normal leading-none">
            <span className="block md:inline">+ ideas</span>
            <span className="block md:inline md:ml-2">+ profesionales</span>
          </h1>

          <p className="w-[222px] md:w-[400px] font-normal text-[12px] md:text-[17px] text-white mt-4 sm:mt-6 md:mt-8 leading-none">
            DTE ahora es un grupo que busca sumarse a otras empresas para apoyar el crecimiento y buscar el máximo beneficio. Somos más profesionales.
          </p>

          <div className="mt-4 md:mt-8 inline-block space-x-1 md:space-x-2 lg:space-x-3">
            <a href="#contact" aria-label="Ir a contacto">
              <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px] hover:bg-skyblue/95 hover:text-white transition duration-300">
                Contactanos
              </button>
            </a>
            <Link to="/servicios">
            <button className="z-100 text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px] hover:bg-white/95 hover:text-skyblue transition duration-300">
                Servicios
              </button>
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;
