import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CarouselSlide from './CarouselSlide';
import SlideContent from './SlideContent';
import Slider1 from '../assets/PYMES.webp';
import Slider2 from '../assets/EMPRESAS.webp';
import Slider3 from '../assets/EM_ESTABLAECIDAS.webp';
import MSlider1 from '../assets/PYMES_M.webp';
import MSlider2 from '../assets/EMPRESAS_M.webp';
import MSlider3 from '../assets/EM_ESTABLAECIDAS_M.webp';
import { useTranslation } from 'react-i18next';

const Section6 = () => {
  const { t, i18n } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);
  const slideRefs = useRef([]);

  // Detección responsiva más precisa
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handleResize = () => setIsMobile(mq.matches);
    handleResize();
    mq.addEventListener('change', handleResize);
    return () => mq.removeEventListener('change', handleResize);
  }, []);

  // Scroll tracking
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollX = el.scrollLeft;
      const slideWidth = slideRefs.current[0]?.offsetWidth || 1;
      const index = Math.round(scrollX / slideWidth);
      setActiveIndex(index);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Drag horizontal
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (e) => {
      isDown = true;
      el.classList.add('active');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseUp = () => {
      isDown = false;
      el.classList.remove('active');
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseUp);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseUp);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const slides = useMemo(() => [
    {
      background: isMobile ? MSlider1 : Slider1,
      content: (
        <SlideContent
          title={t('carousel.slides.pymes.title')}
          textColor="white"
          text={t('carousel.slides.pymes.text')}
        />
      ),
    },
    {
      background: isMobile ? MSlider2 : Slider2,
      content: (
        <SlideContent
          title={t('carousel.slides.empresas.title')}
          textColor="black"
          text={t('carousel.slides.empresas.text')}
        />
      ),
    },
    {
      background: isMobile ? MSlider3 : Slider3,
      content: (
        <SlideContent
          title={t('carousel.slides.emprendedores.title')}
          textColor="white"
          text={t('carousel.slides.emprendedores.text')}
        />
      ),
    },
  ], [isMobile, t, i18n.language]);

  return (
    <section
      className="w-full h-[520px] md:h-[720px] lg:h-[950px] flex flex-col justify-evenly items-center"
      aria-label={t('carousel.aria')}
    >
      <div className="w-full max-w-screen px-4 mx-auto items-center flex flex-col text-center">
        <h2 className="text-[35px] md:text-[37px] text-black font-product font-normal leading-none">
          <span className="md:inline mr-2">{t('carousel.titlePrefix')}</span>
          <span className="font-bold mr-2">{t('carousel.titleBold')}</span>
          <span className="md:inline">{t('carousel.titleSuffix')}</span>
        </h2>
      </div>

      <div className="w-full overflow-hidden relative px-2">
        <div
          ref={carouselRef}
          className="w-full h-[320px] sm:h-[400px] md:h-[420px] lg:h-[550px] overflow-x-scroll snap-x snap-mandatory scroll-smooth flex rounded-lg no-scrollbar cursor-grab active:cursor-grabbing"
          role="region"
          aria-label={t('carousel.ariaRegion')}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              ref={(el) => (slideRefs.current[index] = el)}
              className="w-full md:w-[750px] lg:w-[1000px] xl:w-[1300px] flex-shrink-0 snap-center"
            >
              <CarouselSlide
                slide={slide}
                isActive={index === activeIndex}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section6;
