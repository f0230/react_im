import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

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
            <h3 className="text-xl md:text-2xl font-bold mb-2">Empresas</h3>
            <p className="text-sm md:text-base">Que buscan potenciar su presencia digital</p>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-2">Startups</h3>
            <p className="text-sm md:text-base">Con necesidades de rápido crecimiento</p>
          </div>
        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div>
          <h3 className="text-xl md:text-2xl font-bold mb-2">Profesionales</h3>
          <p className="text-sm md:text-base">Que desean destacar en el mundo digital</p>
        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div>
          <h3 className="text-xl md:text-2xl font-bold mb-2">Proyectos innovadores</h3>
          <p className="text-sm md:text-base">Con visión de futuro y alto impacto</p>
        </div>
      ),
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);
  const slideRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      animateSlide(currentIndex, nextIndex);
      setCurrentIndex(nextIndex);
    }, 3000); // Cambia de slide cada 3 segundos

    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, [currentIndex, slides.length]);

  const animateSlide = (fromIndex, toIndex) => {
    const fromSlide = slideRefs.current[fromIndex];
    const toSlide = slideRefs.current[toIndex];

    if (fromSlide && toSlide) {
      // Animación de salida del slide actual
      gsap.to(fromSlide, {
        opacity: 0,
        scale: 0.9,
        filter: "blur(10px)",
        duration: 0.8,
        ease: "power2.inOut",
      });

      // Animación de entrada del siguiente slide
      gsap.fromTo(
        toSlide,
        { opacity: 0, scale: 0.9, filter: "blur(10px)" },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.8,
          ease: "power2.inOut",
        }
      );

      // Scroll horizontal al siguiente slide
      carouselRef.current.scrollTo({
        left: carouselRef.current.offsetWidth * toIndex,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="m-auto w-full md:w-[1440px] h-[580px] md:h-[980px] flex flex-col justify-evenly items-center px-2 md:px-4">
      <div>
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>
      </div>

      <div
        ref={carouselRef}
        className="w-full h-[320px] sm:h-[400px] md:h-[550px] lg:h-[650px] overflow-hidden flex rounded-lg"
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            ref={(el) => (slideRefs.current[index] = el)}
            className="w-full h-full flex-shrink-0"
          >
            <CarouselSlide slide={slide} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrollSnapCarousel;
