import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import Slider1 from "../assets/PYMES.webp";
import Slider2 from "../assets/EMPRESAS.webp";
import Slider3 from "../assets/EM_ESTABLAECIDAS.webp";
import MSlider1 from "../assets/PYMES_M.webp";
import MSlider2 from "../assets/EMPRESAS_M.webp";
import MSlider3 from "../assets/EM_ESTABLAECIDAS_M.webp";

// Slide individual
const CarouselSlide = ({ slide }) => {
  return (
    <div
      className="snap-center w-full h-full bg-cover bg-center rounded-xl flex items-center justify-center"
      style={{ backgroundImage: `url(${slide.background})` }}
    >
      <div className="flex flex-row justify-center items-center p-4 md:p-8 w-[100%] font-product font-normal">
        {slide.content}
      </div>
    </div>
  );
};

const ScrollSnapCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(1); // Iniciamos en el slide 2 (índice 1)
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);

  // Detectar tamaño de pantalla para imágenes responsive
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const slides = [
    {
      background: isMobile ? MSlider1 : Slider1,
      content: (
        <div className="item-content flex flex-col md:flex-row justify-center items-center w-full sm:w-[500px] md:w-[620px] lg:w-[800px]">
          <div className="flex items-center w-full md:w-1/2 mb-4 md:mb-0">
            <h3 className="text-black text-[37px]">Pymes</h3>
          </div>
          <div className="flex items-center w-full md:w-1/2">
            <p className="text-black text-[12px] md:text-[17px]">
              Sabemos lo que cuesta hacer crecer una empresa. Por eso trabajamos con pymes que quieren profesionalizar su marca, ordenar su comunicación y mejorar su presencia. Te ayudamos a dar ese salto que hace falta para destacarte en tu rubro y competir con solidez, sin perder tu esencia.
            </p>
          </div>
        </div>
      ),
    },
    {
      background: isMobile ? MSlider2 : Slider2,
      content: (
        <div className="item-content flex flex-col md:flex-row justify-center items-center w-full sm:w-[500px] md:w-[620px] lg:w-[800px]">
          <div className="flex items-center w-full md:w-1/2 mb-4 md:mb-0">
            <h3 className="text-white text-[37px]">Empresas</h3>
          </div>
          <div className="flex items-center w-full md:w-1/2">
            <p className="text-white text-[12px] md:text-[17px]">
              Si tu marca ya está posicionada pero sentís que es momento de evolucionar, estamos para acompañarte. Te ayudamos a renovar tu identidad, actualizar tu comunicación y alinearte a los desafíos actuales del mercado, sin perder lo que te hace valioso. Porque crecer también implica adaptarse, y hacerlo con estrategia marca la diferencia.            </p>
          </div>
        </div>
      ),
    },
    {
      background: isMobile ? MSlider3 : Slider3,
      content: (
        <div className="item-content flex flex-col md:flex-row justify-center items-center w-full sm:w-[500px] md:w-[620px] lg:w-[800px]">
          <div className="flex items-center w-full md:w-1/2 mb-4 md:mb-0">
            <h3 className="text-white text-[37px]">Emprendedores </h3>
          </div>
          <div className="flex items-center w-full md:w-1/2">
            <p className="text-white text-[12px] md:text-[17px]">
              Si estás empezando, tenés una idea clara pero no sabés por dónde arrancar con tu marca, somos el equipo que necesitás. Te ayudamos a construir tu identidad desde cero, con una estrategia que te diferencie desde el principio. Te acompañamos en cada paso, para que tu marca arranque bien y con fuerza.            </p>
          </div>
        </div>
      ),
    },
  ];

  // Función para avanzar al siguiente slide
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  }, [slides.length]);

  // Función para configurar el intervalo de cambio automático
  const startCarouselInterval = useCallback(() => {
    // Limpiar cualquier intervalo existente
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Crear nuevo intervalo solo si no está pausado
    if (!isPaused) {
      intervalRef.current = setInterval(goToNextSlide, 4000);
    }
  }, [goToNextSlide, isPaused]);

  // Iniciar/reiniciar el intervalo cuando cambia isPaused o slides
  useEffect(() => {
    startCarouselInterval();

    // Limpiar el intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCarouselInterval, slides.length, isPaused]);

  // Detectar si la página está visible para pausar el carrusel cuando no se ve
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // La página no está visible, pausar
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        // La página es visible nuevamente, reanudar si no está pausado manualmente
        if (!isPaused) {
          startCarouselInterval();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaused, startCarouselInterval]);

  // Animar el desplazamiento cuando cambia el índice
  useEffect(() => {
    if (carouselRef.current) {
      // En móvil, mostrar un slide completo a la vez
      if (isMobile) {
        gsap.to(carouselRef.current, {
          duration: 1.2,
          scrollLeft: carouselRef.current.offsetWidth * currentIndex,
          ease: "power3.out",
          onComplete: () => {
            const targetScroll = carouselRef.current.offsetWidth * currentIndex;
            if (Math.abs(carouselRef.current.scrollLeft - targetScroll) > 1) {
              carouselRef.current.scrollLeft = targetScroll;
            }
          }
        });
      } else {
        // En desktop, calcular el desplazamiento para centrar el slide actual
        const slideWidth = 1200; // Ancho fijo de 1200px para slides en desktop
        const slideGap = 20; // Espacio entre slides

        // Posición para centrar el slide actual y mostrar parcialmente los adyacentes
        const centerPosition = (currentIndex * (slideWidth + slideGap)) - ((carouselRef.current.offsetWidth - slideWidth) / 2);

        gsap.to(carouselRef.current, {
          duration: 1.2,
          scrollLeft: centerPosition,
          ease: "power3.out",
          onComplete: () => {
            if (Math.abs(carouselRef.current.scrollLeft - centerPosition) > 1) {
              carouselRef.current.scrollLeft = centerPosition;
            }
          }
        });
      }
    }
  }, [currentIndex, isMobile]);

  // Funciones para controlar manualmente el carrusel
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Navegación manual
  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="w-full h-[520px] md:h-[720px] lg:h-[950px] flex flex-col justify-evenly items-center">
      <div className="w-full max-w-screen px-4 mx-auto items-center flex flex-col">
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>
      </div>

      <div className="w-full overflow-hidden relative">
        <div
          ref={carouselRef}
          className="w-full h-[320px] sm:h-[400px] md:h-[420px] lg:h-[550px] overflow-x-scroll snap-x snap-mandatory scroll-smooth flex rounded-lg no-scrollbar relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ padding: isMobile ? "0" : "0 10%" }} /* Espacio extra solo en desktop */
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`px-2 ${isMobile ? "w-full flex-shrink-0" : "flex-shrink-0"}`}
              style={{
                width: isMobile ? "100%" : "1200px", // Ancho fijo de 1200px en desktop
                maxWidth: isMobile ? "100%" : "1200px" // Asegurar que no exceda 1200px
              }}
            >
              <CarouselSlide slide={slide} />
            </div>
          ))}
        </div>

        {/* Indicadores de navegación - ahora dentro del contenedor */}
        <div className="flex justify-center items-center gap-2 absolute bottom-4 left-0 right-0">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
        h-2 w-2 lg:h-3 lg:w-3 
        rounded-full 
        transition-all duration-300 
        ease-in-out transform
        ${currentIndex === index
                  ? "bg-white/60 scale-125 lg:scale-150 shadow-md"
                  : "bg-black/20 hover:bg-black/35 opacity-70 hover:opacity-100"}
      `}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default ScrollSnapCarousel;