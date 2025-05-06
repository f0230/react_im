import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

// Componente de slide individual
const CarouselSlide = ({ slide, isActive }) => {
  return (
    <motion.div
      className={`relative flex items-center justify-center min-w-full h-full bg-cover bg-center rounded-xl 
                 mx-1 md:mx-2 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-90'}`}
      style={{
        backgroundImage: `url(${slide.background})`,
        width: 'calc(100% - 8px)'
      }}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: isActive ? 1 : 0.7 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-4 md:p-8 rounded-xl w-[85%] md:w-3/4 max-w-lg">
        {slide.content}
      </div>
    </motion.div>
  );
};

const InfiniteCarousel = () => {
  // Definir los slides dentro del componente como en la versión original
  const slides = [
    {
      background: Slider1,
      content: (
        <div className="text-white text-center grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="text-white text-center">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Profesionales</h3>
          <p className="text-sm md:text-base">Que desean destacar en el mundo digital</p>
        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div className="text-white text-center">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Proyectos innovadores</h3>
          <p className="text-sm md:text-base">Con visión de futuro y alto impacto</p>
        </div>
      ),
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [width, setWidth] = useState(0);
  const carouselRef = useRef(null);
  const autoPlayTimerRef = useRef(null);

  // Actualizar el ancho cuando cambia el tamaño de la ventana
  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        setWidth(carouselRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, []);

  // Función para el autoplay
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
      }, 7000); // 7 segundos por slide
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlaying, slides.length]);

  // Funciones para pausar y reanudar el autoplay
  const pauseAutoPlay = () => setIsAutoPlaying(false);
  const resumeAutoPlay = () => setIsAutoPlaying(true);

  // Gestos y navegación
  const handleDragEnd = (e, { offset, velocity }) => {
    const swipe = offset.x;
    const swipeThreshold = width * 0.2; // 20% del ancho para activar swipe

    if (Math.abs(swipe) > swipeThreshold) {
      if (swipe < 0) {
        // Swipe izquierda - siguiente slide
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
      } else {
        // Swipe derecha - slide anterior
        setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
      }
    }

    // Reanudar autoplay después de un breve retraso
    setTimeout(resumeAutoPlay, 500);
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

      {/* Carrusel principal */}
      <div
        ref={carouselRef}
        className="w-full h-[320px] sm:h-[400px] md:h-[550px] lg:h-[650px] overflow-hidden relative rounded-lg"
        onMouseEnter={pauseAutoPlay}
        onMouseLeave={resumeAutoPlay}
      >
        <motion.div
          className="flex h-full gap-2 md:gap-4"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragStart={pauseAutoPlay}
          onDragEnd={handleDragEnd}
          animate={{
            x: -currentIndex * width
          }}
          transition={{
            type: "spring",
            damping: 30,
            stiffness: 200
          }}
        >
          {slides.map((slide, index) => (
            <CarouselSlide
              key={index}
              slide={slide}
              isActive={index === currentIndex}
            />
          ))}
        </motion.div>

        {/* Indicadores de posición (pequeños puntos) */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {slides.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
              animate={{
                scale: index === currentIndex ? 1.2 : 1,
                opacity: index === currentIndex ? 1 : 0.5
              }}
              transition={{ duration: 0.3 }}
              onClick={() => {
                setCurrentIndex(index);
                pauseAutoPlay();
                setTimeout(resumeAutoPlay, 500);
              }}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfiniteCarousel;