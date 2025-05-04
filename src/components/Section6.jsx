import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { gsap } from 'gsap';
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

// Componente de slide optimizado con memo
const CarouselSlide = memo(({ slide, index, activeIndex, onClick }) => {
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

  // Refs y state más limpios
  const carouselRef = useRef(null);
  const sliderTrackRef = useRef(null);
  const animationRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchMoveX, setTouchMoveX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Función para calcular posición del slide
  const calculateSlidePosition = useCallback((index) => {
    return -(index * carouselWidth);
  }, [carouselWidth]);

  // Función para actualizar dimensiones
  const updateDimensions = useCallback(() => {
    if (carouselRef.current) {
      const width = carouselRef.current.clientWidth;
      setCarouselWidth(width);

      // Ajustar la posición del track según el índice actual
      if (sliderTrackRef.current && width > 0) {
        gsap.set(sliderTrackRef.current, {
          x: calculateSlidePosition(activeIndex)
        });
      }
    }
  }, [activeIndex, calculateSlidePosition]);

  // Efecto para manejar dimensiones iniciales y resize
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [updateDimensions]);

  // Iniciar el auto-slide
  const startAutoSlide = useCallback(() => {
    if (!sliderTrackRef.current || carouselWidth <= 0) return;

    // Detener cualquier animación previa
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Obtener la posición actual exacta
    const currentPosition = gsap.getProperty(sliderTrackRef.current, "x");

    // Determinar el índice actual basado en la posición
    const currentIndex = Math.round(Math.abs(currentPosition) / carouselWidth);
    setActiveIndex(currentIndex);

    // Primero, asegurarse de que estamos exactamente en un slide
    gsap.set(sliderTrackRef.current, { x: calculateSlidePosition(currentIndex) });

    // Crear una timeline simple para avanzar un slide a la vez
    const timeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.2, // Pequeña pausa entre ciclos completos
    });

    // Duración total que queremos que cada slide sea visible
    const totalSlideDuration = 10; // 5 segundos por slide

    // Construimos un ciclo completo a través de todos los slides
    for (let i = 0; i < slides.length; i++) {
      // Calculamos el índice del siguiente slide, desde donde estamos actualmente
      const nextSlideIndex = (currentIndex + i + 1) % slides.length;

      if (i === 0) {
        // Para el primer movimiento, empezamos inmediatamente (desde el slide actual al siguiente)
        timeline.to(sliderTrackRef.current, {
          x: calculateSlidePosition(nextSlideIndex),
          duration: totalSlideDuration,
          ease: "none", // Movimiento constante
          onStart: () => setActiveIndex(currentIndex),
          onComplete: () => setActiveIndex(nextSlideIndex)
        });
      } else {
        // Para los siguientes movimientos
        const thisSlideIndex = (currentIndex + i) % slides.length;

        timeline.to(sliderTrackRef.current, {
          x: calculateSlidePosition(nextSlideIndex),
          duration: totalSlideDuration,
          ease: "none", // Movimiento constante
          onStart: () => setActiveIndex(thisSlideIndex),
          onComplete: () => setActiveIndex(nextSlideIndex)
        });
      }
    }

    animationRef.current = timeline;
  }, [carouselWidth, calculateSlidePosition, activeIndex, slides.length]);

  // Iniciar animación cuando cambia el ancho
  useEffect(() => {
    if (carouselWidth > 0) {
      startAutoSlide();
    }
  }, [carouselWidth, startAutoSlide]);

  // Pausar la animación
  const pauseAutoSlide = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.pause();
    }
  }, []);

  // Reanudar la animación
  const resumeAutoSlide = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  // Ir a un slide específico
  const goToSlide = useCallback((index) => {
    if (!sliderTrackRef.current || index < 0 || index >= slides.length) return;

    // Pausar animación actual
    pauseAutoSlide();

    // Animar al slide seleccionado con una transición suave y constante
    gsap.to(sliderTrackRef.current, {
      x: calculateSlidePosition(index),
      duration: 0.8,
      ease: "power1.inOut", // Una curva de easing suave
      onComplete: () => {
        setActiveIndex(index);

        // Reanudar la animación automática después de un breve retraso
        // para que el usuario pueda ver completamente el slide seleccionado
        setTimeout(() => {
          startAutoSlide();
        }, 1000); // Esperar 1 segundo antes de reanudar
      }
    });
  }, [calculateSlidePosition, pauseAutoSlide, slides.length, startAutoSlide]);

  // Manejadores para mouse
  const handleMouseEnter = useCallback(() => {
    pauseAutoSlide();
  }, [pauseAutoSlide]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      resumeAutoSlide();
    }
  }, [resumeAutoSlide, isDragging]);

  // Manejadores para touch
  const handleTouchStart = useCallback((e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchMoveX(e.touches[0].clientX);
    setIsDragging(true);
    pauseAutoSlide();
  }, [pauseAutoSlide]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !sliderTrackRef.current) return;

    const touchCurrentX = e.touches[0].clientX;
    setTouchMoveX(touchCurrentX);

    const diffX = touchStartX - touchCurrentX;

    // Obtener posición actual y calcular nueva posición
    const currentPosition = gsap.getProperty(sliderTrackRef.current, "x");
    let newPosition = currentPosition - diffX * 0.8; // Respuesta más directa al movimiento

    // Aplicar resistencia en los extremos para un efecto más suave
    const minPosition = -((slides.length - 1) * carouselWidth);

    if (newPosition > 0) {
      // Resistencia al inicio (primer slide)
      newPosition = newPosition * 0.3;
    } else if (newPosition < minPosition) {
      // Resistencia al final (último slide)
      const overscroll = minPosition - newPosition;
      newPosition = minPosition - (overscroll * 0.3);
    }

    gsap.to(sliderTrackRef.current, {
      x: newPosition,
      duration: 0.1, // Transición muy corta para seguir el dedo pero suavizada
      ease: "power1.out",
      overwrite: true
    });

    setTouchStartX(touchCurrentX);
  }, [isDragging, touchStartX, carouselWidth, slides.length]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !sliderTrackRef.current) {
      setIsDragging(false);
      resumeAutoSlide();
      return;
    }

    // Calcular dirección y velocidad del swipe
    const swipeDistance = touchStartX - touchMoveX;
    const swipeThreshold = carouselWidth * 0.1; // 10% del ancho para activar swipe

    // Obtener posición actual
    const currentPosition = gsap.getProperty(sliderTrackRef.current, "x");

    // Calcular el índice más cercano basado en la posición actual
    // Usamos floor o ceil según la dirección del swipe para una mejor experiencia
    const rawIndex = Math.abs(currentPosition) / carouselWidth;
    let targetIndex;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      // Si hay suficiente movimiento para considerar un swipe
      if (swipeDistance > 0) {
        // Swipe izquierda - siguiente slide
        targetIndex = Math.ceil(rawIndex);
        if (targetIndex > slides.length - 1) targetIndex = slides.length - 1;
      } else {
        // Swipe derecha - slide anterior
        targetIndex = Math.floor(rawIndex);
        if (targetIndex < 0) targetIndex = 0;
      }
    } else {
      // No hubo suficiente movimiento, ir al slide más cercano
      targetIndex = Math.round(rawIndex);
    }

    // Asegurar que el índice está dentro de los límites
    targetIndex = Math.max(0, Math.min(slides.length - 1, targetIndex));

    // Animar al slide calculado con una transición suave
    gsap.to(sliderTrackRef.current, {
      x: calculateSlidePosition(targetIndex),
      duration: 0.5,
      ease: "power1.out",
      onComplete: () => {
        setActiveIndex(targetIndex);
        setTimeout(() => {
          startAutoSlide();
        }, 500);
      }
    });

    // Resetear estado
    setIsDragging(false);
    setTouchStartX(0);
    setTouchMoveX(0);
  }, [isDragging, touchStartX, touchMoveX, carouselWidth, calculateSlidePosition, startAutoSlide, slides.length, resumeAutoSlide]);

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
              onClick={(index) => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfiniteCarousel;