import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

// Slide individual
const CarouselSlide = ({ slide }) => {
  return (
    <div
      className="snap-center flex-shrink-0 w-full h-full bg-cover bg-center rounded-xl mx-2 flex items-center justify-center"
      style={{ backgroundImage: `url(${slide.background})` }}
    >
      <div className="bg-black/50 p-4 md:p-8 rounded-xl w-[85%] md:w-3/4 max-w-lg text-white text-center">
        {slide.content}
      </div>
    </div>
  );
};

const ScrollSnapCarousel = () => {
  const slides = [
    {
      background: Slider1,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-product font-bold mb-2">Empresas</h3>
            <p className="text-sm md:text-base">
              Que buscan potenciar su presencia digital
            </p>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-product font-bold  mb-2">Startups</h3>
            <p className="text-sm md:text-base">
              Con necesidades de rápido crecimiento
            </p>
          </div>
        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div>
          <h3 className="text-xl md:text-2xl font-product font-bold mb-2">Profesionales</h3>
          <p className="text-sm md:text-base">
            Que desean destacar en el mundo digital
          </p>
        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div>
          <h3 className="text-xl md:text-2xlfont-product font-bold mb-2">
            Proyectos innovadores
          </h3>
          <p className="text-sm md:text-base">
            Con visión de futuro y alto impacto
          </p>
        </div>
      ),
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 4000); // Se cambia la slide cada 4 segundos
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (carouselRef.current) {
      // Se anima el scroll horizontal del contenedor a la posición del slide correspondiente
      gsap.to(carouselRef.current, {
        duration: 1,
        scrollLeft: carouselRef.current.offsetWidth * currentIndex,
        ease: "power2.out",
      });
    }
  }, [currentIndex]);

  return (
    <div className="m-auto w-full md:w-[780px] sm:w-[620px] lg:w-[1080px] xl:w-[1200px] 2xl:w-[1440px] h-[580px] md:h-[980px] flex flex-col justify-evenly items-center px-2 md:px-4">
      <div>
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>
      </div>

      <div
        ref={carouselRef}
        className="w-full h-[320px] sm:h-[400px] md:h-[550px] lg:h-[650px] overflow-x-scroll snap-x snap-mandatory scroll-smooth flex rounded-lg no-scrollbar"
      >
        {slides.map((slide, index) => (
          <CarouselSlide key={index} slide={slide} />
        ))}
      </div>
    </div>
  );
};

export default ScrollSnapCarousel;