import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CarouselSlide = ({ slide, isActive }) => {
  const innerRef = useRef(null);

  useEffect(() => {
    if (!innerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(innerRef.current, {
        scrollTrigger: {
          trigger: innerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        scale: 0.95,
        y: 50,
        duration: 1,
        ease: 'power2.out',
      });

      gsap.to(innerRef.current, {
        backgroundPosition: 'center 40%',
        scrollTrigger: {
          trigger: innerRef.current,
          scrub: true,
        },
      });
    }, innerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      className={`relative snap-center w-full h-full overflow-hidden rounded-xl flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-60'}`}
    >
      {/* Fondo */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${slide.background})`, position: 'absolute' }}
      />

      {/* Contenido */}
      <div
        ref={innerRef}
        className="relative z-10 flex justify-center items-center p-4 md:p-8 w-full h-full font-product"
      >
        {slide.content}
      </div>
    </div>
  );
};

export default CarouselSlide;
