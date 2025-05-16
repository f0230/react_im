import React, { useState, useEffect, useRef, useMemo } from 'react';
import CarouselSlide from './CarouselSlide';
import SlideContent from './SlideContent';
import Slider1 from '../assets/PYMES.webp';
import Slider2 from '../assets/EMPRESAS.webp';
import Slider3 from '../assets/EM_ESTABLAECIDAS.webp';
import MSlider1 from '../assets/PYMES_M.webp';
import MSlider2 from '../assets/EMPRESAS_M.webp';
import MSlider3 from '../assets/EM_ESTABLAECIDAS_M.webp';

const Section6 = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);
  const slideRefs = useRef([]);

  // Detectar dispositivo
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detectar slide activo por scroll horizontal
  useEffect(() => {
    const handleScroll = () => {
      const scrollX = carouselRef.current.scrollLeft;
      const slideWidth = slideRefs.current[0]?.offsetWidth || 1;
      const index = Math.round(scrollX / slideWidth);
      setActiveIndex(index);
    };

    const ref = carouselRef.current;
    ref?.addEventListener('scroll', handleScroll);
    return () => ref?.removeEventListener('scroll', handleScroll);
  }, []);

  // Slides con imágenes y contenido adaptado
  const slides = useMemo(() => [
    {
      background: isMobile ? MSlider1 : Slider1,
      content: (
        <SlideContent
          title="Pymes"
          textColor="white"
          text="Sabemos lo que cuesta hacer crecer una empresa. Por eso trabajamos con pymes que quieren profesionalizar su marca, ordenar su comunicación y mejorar su presencia. Te ayudamos a dar ese salto que hace falta para destacarte en tu rubro y competir con solidez, sin perder tu esencia."
        />
      ),
    },
    {
      background: isMobile ? MSlider2 : Slider2,
      content: (
        <SlideContent
          title="Empresas"
          textColor="black"
          text="Si tu marca ya está posicionada pero sentís que es momento de evolucionar, estamos para acompañarte. Te ayudamos a renovar tu identidad, actualizar tu comunicación y alinearte a los desafíos actuales del mercado, sin perder lo que te hace valioso. Porque crecer también implica adaptarse, y hacerlo con estrategia marca la diferencia."
        />
      ),
    },
    {
      background: isMobile ? MSlider3 : Slider3,
      content: (
        <SlideContent
          title="Emprendedores"
          textColor="white"
          text="Si estás empezando, tenés una idea clara pero no sabés por dónde arrancar con tu marca, somos el equipo que necesitás. Te ayudamos a construir tu identidad desde cero, con una estrategia que te diferencie desde el principio. Te acompañamos en cada paso, para que tu marca arranque bien y con fuerza."
        />
      ),
    },
  ], [isMobile]);

  return (
    <div className="w-full h-[520px] md:h-[720px] lg:h-[950px] flex flex-col justify-evenly items-center">
      {/* Título */}
      <div className="w-full max-w-screen px-4 mx-auto items-center flex flex-col">
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>
      </div>

      {/* Carrusel */}
      <div className="w-full overflow-hidden relative px-2">
        <div
          ref={carouselRef}
          className="w-full h-[320px] sm:h-[400px] md:h-[420px] lg:h-[550px] overflow-x-scroll snap-x snap-mandatory scroll-smooth flex rounded-lg no-scrollbar relative cursor-grab active:cursor-grabbing"
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              ref={(el) => (slideRefs.current[index] = el)}
              className="w-full md:w-[750px] lg:w-[1000px] xl:w-[1200px] flex-shrink-0"
            >
              <CarouselSlide
                slide={slide}
                isActive={index === activeIndex}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Section6;
