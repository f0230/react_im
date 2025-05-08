import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BannerWeb from "../assets/BANNER_CAMPAÑA.webp";
import BannerMovil from "../assets/BANNER_CAMPAÑA_MOVIL.webp";

gsap.registerPlugin(ScrollTrigger);

const Section2 = () => {
  const bannerWebRef = useRef(null);
  const bannerMobileRef = useRef(null);
  const sectionRef = useRef(null);
  const firstSectionRef = useRef(null); // Nueva referencia para la primera sección

  useEffect(() => {
    const animateElement = (ref) => {
      if (ref.current) {
        gsap.fromTo(
          ref.current,
          { opacity: 0.95, y: 50 }, // Inicia con opacidad 0.95 y desplazado 50px hacia abajo
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            duration: 1,
            scrollTrigger: {
              trigger: ref.current, // El trigger es el elemento mismo
              start: "top 100%", // La animación comienza cuando la parte superior del elemento alcanza el 100% de la ventana
              end: "bottom 70%", // La animación termina cuando la parte inferior del elemento alcanza el 70% de la ventana
              scrub: 1, // Suaviza la animación al hacer scroll
            },
          }
        );
      }
    };

    // Animar la primera sección
    animateElement(firstSectionRef);

    // Animar las imágenes como antes
    animateImage(bannerWebRef);
    animateImage(bannerMobileRef);

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  // Función específica para animar imágenes (mantengo la original para las imágenes)
  const animateImage = (ref) => {
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
  };

  return (
    <section
      ref={sectionRef}
      className="font-product relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10 mt-2"
    >
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px]
                    h-auto mt-1 sm:mt-0 overflow-hidden">

        {/* Contenedor flexible que cambia de dirección según el viewport */}
        <div className="flex flex-col md:flex-row w-full gap-2">

          {/* Primera sección - Fondo blanco - Ahora con ref */}
          <div
            ref={firstSectionRef}
            className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] bg-crem/10 p-6 opacity-0 translate-y-10"
          >
            <div className="h-full flex flex-col justify-center items-center">
              <h2 className="font-normal text-[40px] md:text-[60px]">DTE lo <span className="px-3 bg-green">hace</span></h2>
              <h3 className="mt-[-10px] md:mt-[-20px] mb-[20px] text-greyburger font-normal text-[20px] md:text-[40px]">proyectos + ideas</h3>
              <p className="mb-[40px] md:mb-[75px] w-[250px] md:w-[323px] text-[12px] md:text-[17px] text-gray-600 text-center leading-none">
                Te ayudamos a tomar decisiones estratégicas para que tu nuevo proyecto crezca con foco, coherencia y resultados.
              </p>
              <button className="text-[13px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-full hover:bg-skyblue/95 hover:text-white transition duration-300">
                Ver más
              </button>
            </div>
          </div>

          {/* Segunda sección - Con imagen de fondo */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative overflow-hidden flex items-center justify-center">
            {/* Contenedor común para el contenido (alineado al fondo y centrado) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <h2 className="font-normal text-white text-[40px] md:text-[60px]">Campañas</h2>
              <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                creativas y estratégicas que conectan con tu público
              </p>
              <button className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-400 hover:text-white transition duration-300 mb-6">
                Contáctanos
              </button>
            </div>

            {/* Fondo para web (oculto en sm y se muestra en md y superiores) */}
            <div
              ref={bannerWebRef}
              className="absolute top-0 left-0 w-full h-full hidden sm:flex z-10 opacity-0 translate-y-10 transition-opacity duration-500 ease-out transform"
              style={{ backgroundImage: `url(${BannerWeb})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            ></div>

            {/* Fondo para móvil (se muestra por defecto y se oculta en md y superiores) */}
            <div
              ref={bannerMobileRef}
              className="absolute top-0 left-0 w-full h-full block sm:hidden z-10 opacity-0 translate-y-10 transition-opacity duration-500 ease-out transform"
              style={{ backgroundImage: `url(${BannerMovil})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            ></div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Section2;