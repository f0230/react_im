import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ContImg from "../assets/BANNER_ESPACIOS-1.webp";
import MContImg from "../assets/BANNER_ESPACIOS_M-1.webp";


import SpaceImg from "../assets/BANNER_ESPACIOS_M.webp";
import MSpaceImg from "../assets/BANNER_ESPACIOS_M.webp";

gsap.registerPlugin(ScrollTrigger);

const Section2 = () => {
  const spaceWebRef = useRef(null);
  const spaceMobileRef = useRef(null);
  const contWebRef = useRef(null);
  const contMobileRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const animateImage = (ref) => {
      if (ref.current) {
        gsap.fromTo(
          ref.current,
          { opacity: 0.95, y: 50 }, // Inicia con opacidad 0 y desplazado 50px hacia abajo
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            duration: 1,
            scrollTrigger: {
              trigger: ref.current.parentElement, // El trigger es el contenedor de la imagen
              start: "top 100%", // La animación comienza cuando la parte superior del contenedor alcanza el 80% de la ventana
              end: "bottom 70%", // La animación termina cuando la parte inferior del contenedor alcanza el 20% de la ventana
              scrub: 1, // Suaviza la animación al hacer scroll
            },
          }
        );
      }
    };

    animateImage(spaceWebRef);
    animateImage(spaceMobileRef);
    animateImage(contWebRef);
    animateImage(contMobileRef);

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="font-product relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10 mt-2"
    >
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] h-auto mt-1 sm:mt-0 overflow-hidden">
        <div className="flex flex-col md:flex-row w-full gap-2">
          {/* Espacios */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">Espacios</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                Diseñamos espacios físicos que traducen la identidad de tu marca.
              </p>
              <button className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full  hover:bg-blue-400 transition duration-300 mb-6">
                Ver más
              </button>
            </div>

            {/* Imágenes animadas */}
            <div
              ref={spaceWebRef}
              className="absolute top-0 left-0 w-full h-full hidden sm:flex z-10 opacity-0 translate-y-10 transition-opacity duration-500 ease-out transform"
              style={{
                backgroundImage: `url(${SpaceImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <div
              ref={spaceMobileRef}
              className="absolute top-0 left-0 w-full h-full block sm:hidden z-10 opacity-0 translate-y-10 transition-opacity duration-500 ease-out transform"
              style={{
                backgroundImage: `url(${MSpaceImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </div>

          {/* Contenidos */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">Contenidos</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                Creativos y estratégicos que conectan con tu público
              </p>
              <button className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full  hover:bg-blue-400 transition duration-300 mb-6">
                Ver más
              </button>
            </div>

            {/* Imágenes animadas */}
            <div
              ref={contWebRef}
              className="absolute top-0 left-0 w-full h-full hidden sm:flex z-10 opacity-0 translate-y-10 transition-opacity duration-500 ease-out transform"
              style={{
                backgroundImage: `url(${ContImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <div
              ref={contMobileRef}
              className="absolute top-0 left-0 w-full h-full block sm:hidden z-10 opacity-0 translate-y-10 transition-opacity duration-500 ease-out transform"
              style={{
                backgroundImage: `url(${MContImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;