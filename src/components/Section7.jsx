import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Slider1 from "../assets/PYMES.webp";
import Slider2 from "../assets/EMPRESAS.webp";
import Slider3 from "../assets/EM_ESTABLAECIDAS.webp";
import MSlider1 from "../assets/PYMES_M.webp";
import MSlider2 from "../assets/EMPRESAS_M.webp";
import MSlider3 from "../assets/EM_ESTABLAECIDAS_M.webp";

const CarouselSlide = React.forwardRef(({ slide, isActive }, ref) => {
  return (
    <div
      ref={ref}
      className={`snap-center w-full h-full bg-cover bg-center rounded-xl flex items-center justify-center transition-transform duration-500 ${isActive ? "scale-100 opacity-100" : "scale-95"}`}
      style={{ backgroundImage: `url(${slide.background})` }}
    >
      <div className="flex flex-row justify-center items-center p-4 md:p-8 w-[100%] font-product font-normal">
        {slide.content}
      </div>
    </div>
  );
});

const Section6 = () => {
  const [isMobile, setIsMobile] = useState(false);

  const carouselRef = useRef(null);
  const slideRefs = useRef([]);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeft.current = carouselRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e) => {
    isDragging.current = true;
    startX.current = e.touches[0].pageX - carouselRef.current.offsetLeft;
    scrollLeft.current = carouselRef.current.scrollLeft;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

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
          className="w-full h-[320px] sm:h-[400px] md:h-[420px] lg:h-[550px] overflow-x-scroll snap-x snap-mandatory scroll-smooth flex rounded-lg no-scrollbar relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            paddingLeft: isMobile ? "0" : "10%",
            paddingRight: isMobile ? "0" : "10%",
            padding: window.innerWidth < 1024 && window.innerWidth >= 760 ? "0 20%" : "0",
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`px-2 w-full sm:w-full md:w-[750px] lg:w-[1000px] xl:w-[1200px] flex-shrink-0`}
            >
              <CarouselSlide
                ref={(el) => (slideRefs.current[index] = el)}
                slide={slide}
                onClick={() => {
                  const target = slideRefs.current[index];
                  if (!target) return;
                  gsap.to(carouselRef.current, {
                    scrollTo: { x: target.offsetLeft },
                    duration: 0.8,
                    ease: 'power2.out'
                  });
                  gsap.fromTo(target, { scale: 0.95, rotate: -1 }, {
                    scale: 1,
                    rotate: 0,
                    duration: 0.8,
                    ease: 'elastic.out(1, 0.4)'
                  });
                }}
                isActive={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Section6;
