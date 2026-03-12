// CarouselSlide.jsx optimizado y corregido
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CarouselSlide = ({ slide, isActive, isPrev, isNext }) => {
  const innerRef = useRef(null);

  const slideStateClass = isActive
    ? 'scale-100 opacity-100 blur-0'
    : isPrev
      ? 'scale-[0.97] opacity-80 blur-[2px] -translate-x-2'
      : isNext
        ? 'scale-[0.97] opacity-80 blur-[2px] translate-x-2'
        : 'scale-95 opacity-65 blur-[4px]';

  const backgroundStateClass = isActive
    ? 'scale-100 blur-0'
    : isPrev || isNext
      ? 'scale-[1.03] blur-[2px]'
      : 'scale-[1.05] blur-[4px]';

  useEffect(() => {
    if (!innerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        innerRef.current,
        { y: 50, },
        {
          y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: innerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );

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
      className={`relative snap-center w-full h-full overflow-hidden rounded-xl flex items-center justify-center transform transition-all duration-700 ease-out ${slideStateClass}`}
      aria-hidden={!isActive}
    >
      {/* Fondo */}
      <div
        className={`absolute inset-0 bg-cover bg-center z-0 transition-all duration-700 ease-out ${backgroundStateClass}`}
        style={{ backgroundImage: `url(${slide.background})` }}
      />

      {/* Contenido */}
      <div
        ref={innerRef}
        className="relative z-10 flex justify-center items-center px-3 py-4 md:p-8 w-full h-full font-product transition-all duration-700 ease-out"
      >
        {slide.content}
      </div>
    </div>
  );
};

export default CarouselSlide;
