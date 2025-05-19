// Section4.jsx optimizado
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import OptimizedImage from "@/components/OptimizedImage";
import { Link } from 'react-router-dom';


import ContImg from "../assets/BANNER_ESPACIOS-1.webp";
import MContImg from "../assets/BANNER_ESPACIOS_M-1.webp";
import SpaceImg from "../assets/BANNER_ESPACIOS_M.webp";
import MSpaceImg from "../assets/BANNER_ESPACIOS_M.webp";

gsap.registerPlugin(ScrollTrigger);

const Section4 = () => {
  const spaceWebRef = useRef(null);
  const spaceMobileRef = useRef(null);
  const contWebRef = useRef(null);
  const contMobileRef = useRef(null);

  useEffect(() => {
    const refs = [spaceWebRef, spaceMobileRef, contWebRef, contMobileRef];
    refs.forEach((ref) => {
      if (ref.current) {
        gsap.fromTo(
          ref.current,
          { opacity: 0.95, y: 50 },
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            duration: 1,
            scrollTrigger: {
              trigger: ref.current.parentElement,
              start: "top 100%",
              end: "bottom 70%",
              scrub: 1,
            },
          }
        );
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10 mt-2"
      aria-label="Sección de espacios y contenidos"
    >
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] h-auto mt-1 sm:mt-0 overflow-hidden">
        <div className="flex flex-col md:flex-row w-full gap-2">
          {/* ESPACIOS */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">Espacios</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                Diseñamos espacios físicos que traducen la identidad de tu marca.
              </p>
              <Link to="/servicios">
              <button
                className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition duration-300 mb-6"
                aria-label="Ver más sobre espacios"
              >
                Ver más
              </button>
              </Link>
            </div>

            <div ref={spaceWebRef} className="absolute inset-0 hidden sm:block z-10 opacity-0 translate-y-10">
              <OptimizedImage
                src={SpaceImg}
                alt="Imagen de espacios desktop"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div ref={spaceMobileRef} className="absolute inset-0 sm:hidden z-10 opacity-0 translate-y-10">
              <OptimizedImage
                src={MSpaceImg}
                alt="Imagen de espacios móvil"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* CONTENIDOS */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">Contenidos</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                Creativos y estratégicos que conectan con tu público
              </p>
              <Link to="/servicios">
                <button
                  className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition duration-300 mb-6"
                  aria-label="Ver más sobre espacios"
                >
                  Ver más
                </button>
              </Link>
            </div>

            <div ref={contWebRef} className="absolute inset-0 hidden sm:block z-10 opacity-0 translate-y-10">
              <OptimizedImage
                src={ContImg}
                alt="Imagen de contenidos desktop"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div ref={contMobileRef} className="absolute inset-0 sm:hidden z-10 opacity-0 translate-y-10">
              <OptimizedImage
                src={MContImg}
                alt="Imagen de contenidos móvil"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section4;