import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: "spring", stiffness: 300, damping: 30 };

// Individual Slide Component
const CarouselSlide = ({ slide, itemWidth, currentIndex, index, x }) => {
  const range = [
    -(index + 1) * (itemWidth + GAP),
    -index * (itemWidth + GAP),
    -(index - 1) * (itemWidth + GAP),
  ];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      className="snap-center flex-shrink-0 rounded-xl mx-2 flex items-center justify-center"
      style={{
        width: itemWidth,
        height: "100%",
        backgroundImage: `url(${slide.background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        rotateY: rotateY,
      }}
      transition={SPRING_OPTIONS}
    >
      <div className="bg-black/50 p-4 md:p-8 rounded-xl w-[85%] md:w-3/4 max-w-lg text-white text-center">
        {slide.content}
      </div>
    </motion.div>
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
            <p className="text-sm md:text-base">
              Que buscan potenciar su presencia digital
            </p>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-2">Startups</h3>
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
          <h3 className="text-xl md:text-2xl font-bold mb-2">Profesionales</h3>
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
          <h3 className="text-xl md:text-2xl font-bold mb-2">
            Proyectos innovadores
          </h3>
          <p className="text-sm md:text-base">
            Con visión de futuro y alto impacto
          </p>
        </div>
      ),
    },
  ];

  // For looping functionality
  const carouselItems = [...slides, slides[0]];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const containerRef = useRef(null);

  // Container and item dimensions
  const containerPadding = 16;
  const baseWidth = window.innerWidth >= 1536 ? 1440 :
    window.innerWidth >= 1280 ? 1200 :
      window.innerWidth >= 1024 ? 1080 :
        window.innerWidth >= 640 ? 620 :
          window.innerWidth;
  const itemWidth = baseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        setCurrentIndex((prev) => {
          if (prev === slides.length - 1) {
            return prev + 1; // Animate to clone for smooth loop
          }
          if (prev === carouselItems.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length, carouselItems.length, isHovered]);

  // Handle hover state
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, []);

  const effectiveTransition = isResetting ? { duration: 0 } : SPRING_OPTIONS;

  // Handle animation complete (loop back to start)
  const handleAnimationComplete = () => {
    if (currentIndex === carouselItems.length - 1) {
      setIsResetting(true);
      x.set(0);
      setCurrentIndex(0);
      setTimeout(() => setIsResetting(false), 50);
    }
  };

  // Handle drag end gesture
  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      if (currentIndex === slides.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex((prev) => Math.min(prev + 1, carouselItems.length - 1));
      }
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      if (currentIndex === 0) {
        setCurrentIndex(slides.length - 1);
      } else {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="m-auto w-full md:w-[780px] sm:w-[620px] lg:w-[1080px] xl:w-[1200px] 2xl:w-[1440px] h-[580px] md:h-[980px] flex flex-col justify-evenly items-center px-2 md:px-4"
    >
      <div>
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">Somos</span>
          <span className="font-bold mr-2">ideal</span>
          <span className="md:inline">para</span>
        </h2>
      </div>

      <div className="w-full h-[320px] sm:h-[400px] md:h-[550px] lg:h-[650px] overflow-hidden rounded-lg relative">
        <motion.div
          className="flex h-full"
          drag="x"
          dragConstraints={{
            left: -trackItemOffset * (carouselItems.length - 1),
            right: 0,
          }}
          style={{
            width: itemWidth,
            gap: `${GAP}px`,
            perspective: 1000,
            perspectiveOrigin: `${currentIndex * trackItemOffset + itemWidth / 2}px 50%`,
            x,
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: -(currentIndex * trackItemOffset) }}
          transition={effectiveTransition}
          onAnimationComplete={handleAnimationComplete}
        >
          {carouselItems.map((slide, index) => (
            <CarouselSlide
              key={index}
              slide={slide}
              itemWidth={itemWidth}
              currentIndex={currentIndex}
              index={index}
              x={x}
            />
          ))}
        </motion.div>

        {/* Pagination dots */}
        <div className="flex w-full justify-center absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            {slides.map((_, index) => (
              <motion.div
                key={index}
                className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-150 ${currentIndex % slides.length === index ? "bg-white" : "bg-white/40"
                  }`}
                animate={{
                  scale: currentIndex % slides.length === index ? 1.2 : 1,
                }}
                onClick={() => setCurrentIndex(index)}
                transition={{ duration: 0.15 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollSnapCarousel;