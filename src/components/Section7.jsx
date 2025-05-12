import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import Slider1 from "../assets/PYMES.webp";
import Slider2 from "../assets/EMPRESAS.webp";
import Slider3 from "../assets/EM_ESTABLAECIDAS.webp";
import MSlider1 from "../assets/PYMES_M.webp";
import MSlider2 from "../assets/EMPRESAS_M.webp";
import MSlider3 from "../assets/EM_ESTABLAECIDAS_M.webp";

// Slide individual con animación
const CarouselSlide = React.forwardRef(({ slide, isActive }, ref) => {
  return (
    <div
      ref={ref}
      className={`snap-center w-full h-full bg-cover bg-center rounded-xl flex items-center justify-center transition-transform duration-500 ${isActive ? "scale-100 opacity-100" : "scale-95 "}`}
      style={{ backgroundImage: `url(${slide.background})` }}
    >
      <div className="flex flex-row justify-center items-center p-4 md:p-8 w-[100%] font-product font-normal">
        {slide.content}
      </div>
    </div>
  );
});

const ScrollSnapCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState("forward");

  const carouselRef = useRef(null);
  const intervalRef = useRef(null);
  const slideRefs = useRef([]);

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
              Sabemos lo que cuesta hacer crecer una empresa. Por eso trabajamos con pymes que quieren profesionalizar su marca, ordenar su comunicación y mejorar su presencia.
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
              Si tu marca ya está posicionada pero sentís que es momento de evolucionar, estamos para acompañarte.
            </p>
          </div>
        </div>
      ),
    },
    {
      background: isMobile ? MSlider3 : Slider3,
      content: (
        <div className="item-content flex flex-col md:flex-row justify-center items-center w-full sm:w-[500px] md:w-[620px] lg:w-[800px]">
          <div className="flex items-center w-full md:w-1/2 mb-4 md:mb-0">
            <h3 className="text-white text-[37px]">Emprendedores</h3>
          </div>
          <div className="flex items-center w-full md:w-1/2">
            <p className="text-white text-[12px] md:text-[17px]">
              Si estás empezando, te ayudamos a construir tu identidad desde cero, con una estrategia que te diferencie desde el principio.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (direction === "forward") {
        if (prevIndex >= slides.length - 1) {
          setDirection("backward");
          return prevIndex - 1;
        }
        return prevIndex + 1;
      } else {
        if (prevIndex <= 0) {
          setDirection("forward");
          return prevIndex + 1;
        }
        return prevIndex - 1;
      }
    });
  }, [slides.length, direction]);

  const startCarouselInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isPaused) {
      intervalRef.current = setInterval(goToNextSlide, 8000);
    }
  }, [goToNextSlide, isPaused]);

  useEffect(() => {
    startCarouselInterval();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startCarouselInterval, slides.length, isPaused]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startCarouselInterval();
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  // Desplazamiento animado horizontal con GSAP
  useEffect(() => {
    if (carouselRef.current) {
      const timeline = gsap.timeline();

      if (isMobile) {
        timeline.to(carouselRef.current, {
          duration: 1.2,
          scrollLeft: carouselRef.current.offsetWidth * currentIndex,
          ease: "power3.out",
        });
      } else {
        const slideWidth = 1200;
        const slideGap = 20;
        const centerPosition = (currentIndex * (slideWidth + slideGap)) - ((carouselRef.current.offsetWidth - slideWidth) / 2);
        timeline.to(carouselRef.current, {
          duration: 1.2,
          scrollLeft: centerPosition,
          ease: "power3.out",
        });
      }

      slideRefs.current.forEach((ref, idx) => {
        if (!ref) return;
        if (idx === currentIndex) {
          timeline.fromTo(ref,
            { scale: 0.95 },
            { scale: 1, duration: 0.1, ease: "power3.out" }
          );
        } else {
          timeline.to(ref, { scale: 0.95, duration: 0.1, ease: "power2.out" });
        }
      });
    }
  }, [currentIndex, isMobile]);

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
          style={{
            paddingLeft: isMobile ? "0" : "10%",
            paddingRight: isMobile ? "0" : "10%",
            padding: window.innerWidth < 1024 && window.innerWidth >= 760 ? "0 20%" : "0", // Paddings responsivos para tablets
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`px-2 
      w-full           // Pantallas móviles
      sm:w-full        // Pantallas pequeñas (hasta 640px)
      md:w-[750px]       // Para tabletas (768px a 1024px)
      lg:w-[1000px]
      xl:w-[1200px]    // Pantallas grandes (mayores de 1024px, 1200px de ancho máximo)
      flex-shrink-0`}  // Evitar que los slides se encojan
            >
              <CarouselSlide
                ref={(el) => (slideRefs.current[index] = el)}
                slide={slide}
                isActive={index === currentIndex}
              />
            </div>
          ))}

        </div>
       
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-4 h-4 rounded-full ${index === currentIndex ? "bg-black" : "bg-gray-300"}`}
            onClick={() => handleDotClick(index)}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default ScrollSnapCarousel;


///