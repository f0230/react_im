import React, { useState, useEffect, useRef } from "react";
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
      className="snap-center flex-shrink-0 w-full h-full bg-cover bg-center rounded-xl mx-2 flex items-center justify-center"
      style={{ backgroundImage: `url(${slide.background})` }}
    >
      <div className="flex flex-row justify-center items-center p-4 md:p-8 w-[100%] font-product font-normal">
        {slide.content}
      </div>
    </div>
  );
};

const ScrollSnapCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef(null);

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
      background: isMobile ? MSlider3 : Slider3,
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
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    if (carouselRef.current) {
      gsap.to(carouselRef.current, {
        duration: 1,
        scrollLeft: carouselRef.current.offsetWidth * currentIndex,
        ease: "power2.out",
      });
    }
  }, [currentIndex]);

  return (
  

  
      <div className="m-auto w-full sm:w-[650px] md:w-[720px] lg:w-[1080px] xl:w-[1200px] h-[520px] md:h-[720px] lg:h-[950px] flex flex-col justify-evenly items-center ">
      <div>
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>
      </div>

      <div
        ref={carouselRef}
        className="w-full h-[320px] sm:h-[400px] md:h-[420px] lg:h-[550px] overflow-x-scroll snap-x snap-mandatory scroll-smooth flex rounded-lg no-scrollbar p-2 md:p-0"
      >
        {slides.map((slide, index) => (
          <CarouselSlide key={index} slide={slide} />
        ))}
      </div>
    </div>
   
  );
};

export default ScrollSnapCarousel;
