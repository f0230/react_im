import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCreative } from "swiper/modules";
import { motion } from "framer-motion";
import "swiper/css";
import "swiper/css/effect-creative";

import heroBgImage from "../assets/rectangle-3.png";

export const Hero = () => {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setAtTop(window.pageYOffset <= 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className="relative w-full min-h-screen bg-cover bg-center text-white overflow-hidden"
      style={{ backgroundImage: `url(${heroBgImage})` }}
    >
      {/* --- Navbar flotante --- */}
      <div
        className={`fixed z-50 w-full inset-x-0 max-w-2xl mx-auto px-6 py-3 mt-4 rounded-full transform transition-all duration-1000 ease-in-out ${
          atTop
            ? "max-w-2xl"
            : "bg-blue-800 bg-opacity-90 backdrop-blur-xl max-w-4xl"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between p-2 w-full mx-auto">
          <div className="flex flex-row items-center justify-between w-full">
            <span
              className={`font-bold tracking-tighter uppercase text-xl sm:text-2xl transition-colors ${
                atTop ? "text-white" : "text-white"
              }`}
            >
              ✺ IM Seguros
            </span>
          </div>

          {/* Navegación */}
          <nav className="hidden md:flex flex-grow justify-end gap-6 mt-4 md:mt-0">
            <a
              href="#"
              className="text-sm lg:text-base transition-colors hover:text-teal-300"
            >
              Inicio
            </a>
            <a
              href="#"
              className="text-sm lg:text-base transition-colors hover:text-teal-300"
            >
              Servicios
            </a>
            <a
              href="#"
              className="text-sm lg:text-base transition-colors hover:text-teal-300"
            >
              Contacto
            </a>
          </nav>
        </div>
      </div>

      {/* --- Contenido Principal Hero --- */}
      <div className="flex flex-col justify-center items-center text-center px-4 pt-24 sm:pt-32 relative z-10">
        <div className="relative w-full max-w-3xl mt-16 sm:mt-24">
          <Swiper
            modules={[Autoplay, EffectCreative]}
            spaceBetween={50}
            centeredSlides={true}
            effect="creative"
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            loop={true}
            creativeEffect={{
              prev: { shadow: true, translate: ["-120%", 0, -500], opacity: 0 },
              next: { shadow: true, translate: ["120%", 0, -500], opacity: 0 },
            }}
            className="w-full"
          >
            {[
              {
                title: "Bienvenido a IM Seguros",
                subtitle: "Protegemos tu futuro con soluciones a medida.",
                button: "Conocé Más",
              },
              {
                title: "Seguros de Vida y Salud",
                subtitle: "Coberturas diseñadas para cada etapa de tu vida.",
                button: "Saber Más",
              },
              {
                title: "Tu tranquilidad, nuestra prioridad",
                subtitle: "Confianza, respaldo y compromiso para vos y tu familia.",
                button: "Descubrí Más",
              },
            ].map((slide, index) => (
              <SwiperSlide key={index} className="self-stretch">
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="flex flex-col items-center justify-center min-h-[300px]"
                >
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
                    {slide.title}
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl mb-6 max-w-md sm:max-w-xl">
                    {slide.subtitle}
                  </p>
                  <button className="bg-white text-teal-600 font-semibold text-sm sm:text-base px-6 py-3 rounded-full hover:bg-gray-100 transition shadow-md hover:shadow-lg">
                    {slide.button}
                  </button>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* --- Overlay oscuro --- */}
      <div className="absolute inset-0 bg-black/30 z-0"></div>
    </header>
  );
};

export default Hero;
