import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

const InfiniteCarousel = () => {
  const slides = [
    {
      background: Slider1,
      content: (
        <div className="text-white text-center grid grid-cols-2 gap-4">
          <div>
            {/* Contenido de la columna 1 */}
          </div>
          <div>
            {/* Contenido de la columna 2 */}
          </div>
        </div>

      ),
    },
    {
      background: Slider2,
      content: (
        <div className="text-white text-center">
          {/* Contenido del slide 2 */}
        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div className="text-white text-center">
          {/* Contenido del slide 3 */}
        </div>
      ),
    },
  ];

  // Constante para el espacio entre slides (gap)
  const SLIDE_GAP = 16; // 16px = equivalente a gap-4 en Tailwind

  const carouselRef = useRef(null);
  const sliderTrackRef = useRef(null);
  const animation = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isTouching, setIsTouching] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = derecha, -1 = izquierda

  useEffect(() => {
    // Calcular el ancho del carousel
    const updateDimensions = () => {
      if (carouselRef.current) {
        const width = carouselRef.current.clientWidth;
        setCarouselWidth(width);

        // Si hay una animación en curso, ajustarla para la nueva dimensión
        if (animation.current) {
          // Obtener la posición actual y recrear la animación
          const currentPosition = gsap.getProperty(sliderTrackRef.current, "x");
          const currentIndex = Math.round(Math.abs(currentPosition) / (width || 1));

          // Detener la animación actual
          animation.current.kill();

          // Posicionar correctamente según el nuevo ancho
          gsap.set(sliderTrackRef.current, { x: -(width * currentIndex) });

          // Reiniciar la animación
          startAutoSlide();
        }
      }
    };

    // Inicializar dimensiones
    updateDimensions();

    // Actualizar dimensiones en resize
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (animation.current) {
        animation.current.kill();
      }
    };
  }, []);

  // Inicializar o actualizar el slider cuando cambia el ancho
  useEffect(() => {
    if (carouselWidth > 0) {
      startAutoSlide();
    }
  }, [carouselWidth, direction]);

  const startAutoSlide = () => {
    if (!sliderTrackRef.current) return;

    // Detener cualquier animación previa
    if (animation.current) {
      animation.current.kill();
    }

    // Duración por slide
    const slideDuration = 4; // 4 segundos por slide

    // Crear la nueva animación
    const targetIndex = direction > 0 ? slides.length - 1 : 0;
    const targetPosition = -(targetIndex * carouselWidth);

    animation.current = gsap.to(sliderTrackRef.current, {
      x: targetPosition,
      duration: Math.abs(activeIndex - targetIndex) * slideDuration,
      ease: "linear",
      onComplete: () => {
        // Cambiar dirección al llegar al final
        setDirection(prev => prev * -1);
        setActiveIndex(targetIndex);
      }
    });
  };

  const pauseAutoSlide = () => {
    if (animation.current) {
      animation.current.pause();
    }
  };

  const resumeAutoSlide = () => {
    if (animation.current) {
      animation.current.play();
    }
  };

  const goToSlide = (index) => {
    if (!sliderTrackRef.current) return;

    // Pausar la animación actual
    pauseAutoSlide();

    // Actualizar el índice activo
    setActiveIndex(index);

    // Animar al slide seleccionado
    gsap.to(sliderTrackRef.current, {
      x: -(carouselWidth * index),
      duration: 0.8,
      ease: "power2.out",
      onComplete: function () {
        // Si cambiamos al último o primer slide, cambiar la dirección
        if (index === 0) {
          setDirection(1); // hacia la derecha
        } else if (index === slides.length - 1) {
          setDirection(-1); // hacia la izquierda
        }

        // Reanudar la animación automática después de un breve retraso
        setTimeout(() => {
          startAutoSlide();
        }, 2000);
      }
    });
  };

  // Manejadores para eventos de ratón
  const handleMouseEnter = () => {
    pauseAutoSlide();
  };

  const handleMouseLeave = () => {
    resumeAutoSlide();
  };

  const handleSlideClick = (index) => {
    goToSlide(index);
  };

  // Manejadores para eventos táctiles (móvil)
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsTouching(true);
    pauseAutoSlide();
  };

  const handleTouchMove = (e) => {
    if (!isTouching) return;
    setTouchEndX(e.touches[0].clientX);

    // Calcular el desplazamiento
    const diff = touchStartX - e.touches[0].clientX;
    const currentX = gsap.getProperty(sliderTrackRef.current, "x");

    // Limitaciones para no permitir deslizar más allá del primer/último slide
    const minX = -(carouselWidth * (slides.length - 1));
    const newX = currentX - diff * 0.5;

    // Aplicar resistencia para no exceder los límites
    if (newX <= 0 && newX >= minX) {
      gsap.set(sliderTrackRef.current, { x: newX });
    }

    // Actualizar el punto de inicio para el próximo movimiento
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsTouching(false);

    if (touchStartX === 0 || touchEndX === 0) {
      resumeAutoSlide();
      return;
    }

    // Determinar dirección del swipe
    const diff = touchStartX - touchEndX;

    // Si el swipe es significativo
    if (Math.abs(diff) > 50) {
      const currentIndex = Math.round(Math.abs(gsap.getProperty(sliderTrackRef.current, "x")) / carouselWidth);

      if (diff > 0 && currentIndex < slides.length - 1) {
        // Swipe izquierda - siguiente slide
        goToSlide(currentIndex + 1);
        if (currentIndex + 1 === slides.length - 1) {
          setDirection(-1); // Cambiar dirección si llegamos al final
        }
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe derecha - slide anterior
        goToSlide(currentIndex - 1);
        if (currentIndex - 1 === 0) {
          setDirection(1); // Cambiar dirección si volvemos al principio
        }
      } else {
        // No podemos movernos más allá del primer o último slide
        goToSlide(currentIndex);
      }
    } else {
      // No hubo suficiente movimiento, volver al slide actual
      goToSlide(activeIndex);
    }

    // Resetear valores
    setTouchStartX(0);
    setTouchEndX(0);
  };

  return (
    <div className="m-auto w-full md:w-[1440px] h-[580px] md:h-[980px] flex flex-col  justify-evenly items-center px-2 md:px-4">
      <div>
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>

      </div>
      <div
        ref={carouselRef}
        className="w-full h-[320px]  sm:h-[400px] md:h-[550px] lg:h-[650px] overflow-hidden relative rounded-lg "
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
            <div
              key={i}
              className="relative flex items-center justify-center min-w-full h-full bg-cover bg-center rounded-xl mx-1 md:mx-2 cursor-pointer"
              style={{
                backgroundImage: `url(${slide.background})`,
                width: 'calc(100% - 8px)'  // Menor en móvil, se ajusta con breakpoints
              }}
              onClick={() => handleSlideClick(i)}
            >
              <div className=" p-4 md:p-8 rounded-xl w-[85%] md:w-3/4 max-w-lg">
                {slide.content}
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default InfiniteCarousel;