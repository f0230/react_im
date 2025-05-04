import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Slider1 from "../assets/fondo-slider1.png";
import Slider2 from "../assets/fondo-slider2.png";

const InfiniteCarousel = () => {
  const slides = [
    {
      background: Slider1,
      content: (
        <div className="text-white text-center">

        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div className="text-white text-center">

        </div>
      ),
    },
    {
      background: Slider2,
      content: (
        <div className="text-white text-center">
   
        </div>
      ),
    },
  ];

  const carouselRef = useRef(null);
  const controls = useAnimation();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      setWidth(carousel.scrollWidth / 2);
    }
  }, []);

  const startAutoScroll = () => {
    controls.start({
      x: -width,
      transition: {
        duration: 30,
        ease: 'linear',
        repeat: Infinity,
      },
    });
  };

  const stopAutoScroll = () => {
    controls.stop();
  };

  useEffect(() => {
    if (width > 0) startAutoScroll();
  }, [width]);

  return (
    <div className='m-auto w-full md:w-[1440px] h-[580px] md:h-[980px] flex justify-center items-center px-4'>
      <div className="w-full h-[350px] sm:h-[550px] overflow-hidden">
        <motion.div
          ref={carouselRef}
          className="flex h-full cursor-grab active:cursor-grabbing"
          animate={controls}
          drag="x"
          dragConstraints={{ left: -width, right: 0 }}
          dragElastic={0.1}
          onHoverStart={stopAutoScroll}
          onHoverEnd={startAutoScroll}
          onDragStart={stopAutoScroll}
          onDragEnd={startAutoScroll}
        >
          {[...slides, ...slides].map((slide, i) => (
            <div
              key={i}
              className="relative flex items-center justify-center min-w-full h-full mx-4 bg-cover bg-center rounded-2xl"
              style={{
                backgroundImage: `url(${slide.background})`,
              }}
            >
              <div className="bg-black/60 p-8 rounded-xl w-3/4 max-w-lg">
                {slide.content}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default InfiniteCarousel;
