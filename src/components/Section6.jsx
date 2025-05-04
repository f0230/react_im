import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { gsap } from 'gsap';
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

// Optimizado con memo para evitar renderizados innecesarios
const CarouselSlide = memo(({ slide, index, activeIndex, onClick, carouselWidth }) => {
  const isActive = index === activeIndex;

  return (
    <div
      className={`relative flex items-center justify-center min-w-full h-full bg-cover bg-center rounded-xl 
                 mx-1 md:mx-2 cursor-pointer transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-90'}`}
      style={{
        backgroundImage: `url(${slide.background})`,
        width: 'calc(100% - 8px)'
      }}
      onClick={() => onClick(index)}
    >
      <div className="p-4 md:p-8 rounded-xl w-[85%] md:w-3/4 max-w-lg">
        {slide.content}
      </div>
    </div>
  );
});

const InfiniteCarousel = () => {
  const slides = [
    {
      background: Slider1,
      content: (
        <div className="text-white text-center grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {/* Contenido de la columna 1 */}
            <h3 className="text-xl md:text-2xl font-bold mb-2">Empresas</h3>
            <p className="text-sm md:text-base">Que buscan potenciar su presencia digital</p>
          </div>
          <div>
            {/* Contenido de la columna 2 */}
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

  // Refs y state
  const carouselRef = useRef(null);
  const sliderTrackRef = useRef(null);
  const animationRef = useRef(null);
  const pausedPositionRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // Función para calcular la posición de un slide específico
  const calculateSlidePosition = useCallback((index) => {
    return -(index * carouselWidth);
  }, [carouselWidth]);

  // Optimizada para memoizar la función de actualización de dimensiones
  const updateDimensions = useCallback(() => {
    if (carouselRef.current) {
      const width = carouselRef.current.clientWidth;
      setCarouselWidth(width);

      // Ajustar la posición del track basado en el índice activo
      if (sliderTrackRef.current && width > 0) {
        gsap.set(sliderTrackRef.current, {
          x: calculateSlidePosition(activeIndex)
        });
      }
    }
  }, [activeIndex, calculateSlidePosition]);

  // Inicializar dimensiones y configurar listener de resize
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, [updateDimensions]);

  // Función para iniciar la animación automática
  const startAutoSlide = useCallback(() => {
    if (!sliderTrackRef.current || !autoPlayEnabled || carouselWidth <= 0) return;

    // Detener cualquier animación previa
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Duración completa del ciclo (todo el carrusel)
    const totalDuration = slides.length * 4; // 4 segundos por slide

    // Crear secuencia infinita que se repite
    const timeline = gsap.timeline({ repeat: -1 });

    // Animar a través de todos los slides
    slides.forEach((_, index) => {
      if (index !== 0) { // Saltamos el primer slide ya que comenzamos desde ahí
        timeline.to(sliderTrackRef.current, {
          x: calculateSlidePosition(index),
          duration: 4, // duración por slide
          ease: "none",
          onUpdate: () => {
            // Actualizar el índice activo basado en la posición actual
            const currentPos = gsap.getProperty(sliderTrackRef.current, "x");
            const closestIndex = Math.round(Math.abs(currentPos) / carouselWidth);
            if (closestIndex !== activeIndex && closestIndex < slides.length) {
              setActiveIndex(closestIndex);
            }
          }
        });
      }
    });

    // Volver al primer slide para completar el ciclo
    timeline.to(sliderTrackRef.current, {
      x: calculateSlidePosition(0),
      duration: 4,
      ease: "none",
      onUpdate: () => {
        const currentPos = gsap.getProperty(sliderTrackRef.current, "x");
        const closestIndex = Math.round(Math.abs(currentPos) / carouselWidth);
        if (closestIndex !== activeIndex && closestIndex < slides.length) {
          setActiveIndex(closestIndex);
        }
      }
    });

    animationRef.current = timeline;
  }, [autoPlayEnabled, carouselWidth, calculateSlidePosition, activeIndex, slides.length]);

  // Iniciar animación cuando cambia el ancho o el autoplay
  useEffect(() => {
    if (carouselWidth > 0 && autoPlayEnabled) {
      startAutoSlide();
    }
  }, [carouselWidth, autoPlayEnabled, startAutoSlide]);

  // Pausar la animación
  const pauseAutoSlide = useCallback(() => {
    if (animationRef.current) {
      pausedPositionRef.current = animationRef.current.time();
      animationRef.current.pause();
    }
  }, []);

  // Reanudar la animación
  const resumeAutoSlide = useCallback(() => {
    if (animationRef.current && autoPlayEnabled) {
      animationRef.current.play();
    }
  }, [autoPlayEnabled]);

  // Ir a un slide específico
  const goToSlide = useCallback((index) => {
    if (!sliderTrackRef.current || index < 0 || index >= slides.length) return;

    // Pausar animación actual
    pauseAutoSlide();

    // Animar al slide seleccionado
    gsap.to(sliderTrackRef.current, {
      x: calculateSlidePosition(index),
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => {
        setActiveIndex(index);

        // Reanudar la animación automática después de un breve retraso
        if (autoPlayEnabled) {
          // Creamos una nueva animación partiendo desde este slide
          setTimeout(() => {
            if (animationRef.current) {
              animationRef.current.kill();
            }
            startAutoSlide();
          }, 2000);
        }
      }
    });
  }, [calculateSlidePosition, pauseAutoSlide, slides.length, autoPlayEnabled, startAutoSlide]);

  // Manejadores de eventos del mouse
  const handleMouseEnter = useCallback(() => {
    pauseAutoSlide();
  }, [pauseAutoSlide]);

  const handleMouseLeave = useCallback(() => {
    resumeAutoSlide();
  }, [resumeAutoSlide]);

  // Optimización de manejadores de eventos táctiles
  const handleTouchStart = useCallback((e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
    pauseAutoSlide();
  }, [pauseAutoSlide]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !sliderTrackRef.current) return;

    const touchCurrentX = e.touches[0].clientX;
    const diffX = touchStartX - touchCurrentX;

    // Calcular nueva posición con resistencia en los extremos
    const currentPosition = gsap.getProperty(sliderTrackRef.current, "x");
    const minPosition = calculateSlidePosition(slides.length - 1);

    let newPosition = currentPosition - diffX * 0.8;

    // Aplicar resistencia en los extremos
    if (newPosition > 0) {
      newPosition = newPosition * 0.3; // Resistencia al principio
    } else if (newPosition < minPosition) {
      const overscroll = minPosition - newPosition;
      newPosition = minPosition - (overscroll * 0.3); // Resistencia al final
    }

    gsap.set(sliderTrackRef.current, { x: newPosition });
    setTouchStartX(touchCurrentX);
  }, [isDragging, touchStartX, calculateSlidePosition, slides.length]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !sliderTrackRef.current) {
      setIsDragging(false);
      resumeAutoSlide();
      return;
    }

    // Calcular el slide más cercano basado en la posición actual
    const currentPosition = gsap.getProperty(sliderTrackRef.current, "x");
    const slideIndex = Math.min(
      slides.length - 1,
      Math.max(0, Math.round(Math.abs(currentPosition) / carouselWidth))
    );

    // Ir al slide calculado
    goToSlide(slideIndex);
    setIsDragging(false);
  }, [isDragging, carouselWidth, goToSlide, resumeAutoSlide, slides.length]);

  // Función para manejar los indicadores de navegación
  const handleIndicatorClick = useCallback((index) => {
    goToSlide(index);
  }, [goToSlide]);

  // Creamos un array de indicadores basado en el número de slides
  const indicators = Array.from({ length: slides.length });

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={sliderTrackRef}
          className="flex h-full gap-2 md:gap-4"
          style={{ touchAction: "none" }}
        >
          {slides.map((slide, i) => (
            <CarouselSlide
              key={i}
              slide={slide}
              index={i}
              activeIndex={activeIndex}
              onClick={handleSlideClick => goToSlide(i)}
              carouselWidth={carouselWidth}
            />
          ))}
        </div>

        {/* Overlay para mostrar el progreso de swipe en móvil */}
        {isDragging && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{
                width: `${(activeIndex / (slides.length - 1)) * 100}%`
              }}
            />
          </div>
        )}
      </div>




    </div>
  );
};

export default InfiniteCarousel;