import React, { useState, useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { useTranslation } from 'react-i18next';
import CarouselSlide from './CarouselSlide';
import SlideContent from './SlideContent';
import Noise from './ui/Noise';

// Assets
import Slider1 from '../assets/PYMES.webp';
import Slider2 from '../assets/EMPRESAS.webp';
import Slider3 from '../assets/EM_ESTABLAECIDAS.webp';
import MSlider1 from '../assets/PYMES_M.webp';
import MSlider2 from '../assets/EMPRESAS_M.webp';
import MSlider3 from '../assets/EM_ESTABLAECIDAS_M.webp';
import tecnologiaImg from '../assets/TECNOLOGIA.png';

// Seconds for one full loop of the duplicated track (adjust for speed)
const TICKER_DURATION = 28;

const Section6 = () => {
  const { t, i18n } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [isCarouselPaused] = useState(false);
  const trackRef = useRef(null);
  const tweenRef = useRef(null);
  const isPressedRef = useRef(false);
  const stackItems = ['React', 'Supabase', 'Vercel', 'IA', 'APIs'];

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handleResize = () => setIsMobile(mq.matches);
    handleResize();
    mq.addEventListener('change', handleResize);
    return () => mq.removeEventListener('change', handleResize);
  }, []);

  const slides = useMemo(() => [
    {
      background: isMobile ? MSlider1 : Slider1,
      content: (
        <SlideContent
          title={t('carousel.slides.pymes.title')}
          textColor="white"
          text={t('carousel.slides.pymes.text')}
          titlePositionClass="md:left-[72px] md:top-[42px] lg:left-[86px] lg:top-[52px]"
        />
      ),
    },
    {
      background: isMobile ? MSlider2 : Slider2,
      content: (
        <SlideContent
          title={t('carousel.slides.empresas.title')}
          textColor="white"
          text={t('carousel.slides.empresas.text')}
          titlePositionClass="md:left-[72px] md:top-[42px] lg:left-[86px] lg:top-[52px]"
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
          titlePositionClass="md:left-[72px] md:top-[42px] lg:left-[86px] lg:top-[52px]"
        />
      ),
    },
  ], [isMobile, t, i18n.language]);

  // Duplicated track: [A, B, C, A, B, C]
  // GSAP animates x from 0 to -50% (= width of one set), then repeats seamlessly
  const allSlides = useMemo(() => [...slides, ...slides], [slides]);

  useEffect(() => {
    if (!trackRef.current) return;

    if (tweenRef.current) {
      tweenRef.current.kill();
    }

    gsap.set(trackRef.current, { x: 0 });

    tweenRef.current = gsap.to(trackRef.current, {
      x: '-50%',
      duration: TICKER_DURATION,
      ease: 'none',
      repeat: -1,
    });

    if (isCarouselPaused) {
      tweenRef.current.pause();
    }

    return () => {
      tweenRef.current?.kill();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlides]);

const handlePressStart = () => {
    if (isCarouselPaused) return;
    isPressedRef.current = true;
    tweenRef.current?.pause();
  };

  const handlePressEnd = () => {
    if (!isPressedRef.current) return;
    isPressedRef.current = false;
    if (!isCarouselPaused) {
      tweenRef.current?.resume();
    }
  };

  return (
    <div className="flex w-full flex-col gap-[10px] px-2">
      <section
        className="flex w-full flex-col items-center justify-start gap-[10px] pt-6 md:pt-8"
        aria-label={t('carousel.aria')}
      >
        <div className="mx-auto flex w-full max-w-screen items-center justify-between gap-4 px-4">
          <h2 className="font-product text-[22px] font-normal leading-none text-black">
            <span className="mr-2">{t('carousel.titlePrefix')}</span>
            <span className="mr-2 font-bold">{t('carousel.titleBold')}</span>
            <span>{t('carousel.titleSuffix')}</span>
          </h2>

        </div>

        {/* GSAP ticker — overflow hidden clips the track */}
        <div
          className="relative w-full overflow-hidden h-[420px] sm:h-[400px] md:h-[420px] lg:h-[550px]"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          style={{ cursor: 'grab' }}
        >
          {/* Track: flex row, 2x slides side by side */}
          <div
            ref={trackRef}
            className="flex h-full gap-[10px] will-change-transform"
            style={{ width: 'max-content' }}
          >
            {allSlides.map((slide, index) => (
              <div
                key={`${slide.background}-${index}`}
                className="flex-shrink-0 w-[calc(100vw-20px)] md:w-[750px] lg:w-[1000px] xl:w-[1300px] h-full"
              >
                <CarouselSlide
                  slide={slide}
                  isActive={true}
                  isPrev={false}
                  isNext={false}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="w-full">
        <section
          className="relative h-[420px] w-full overflow-hidden bg-[#707070] text-black md:h-[520px] lg:h-[620px]"
          aria-label="Trabajamos con tecnologia"
        >
          <div className="pointer-events-none absolute inset-0 z-0 opacity-60 mix-blend-multiply">
            <Noise patternSize={110} patternRefreshInterval={1} patternAlpha={56} />
          </div>

          <div className="absolute left-5 top-6 z-20 max-w-[260px] md:left-14 md:top-10 md:max-w-[520px] lg:left-20 lg:top-14">
            <header>
              <h2 className="font-google-sans-flex text-[28px] font-normal leading-[0.95] md:text-[52px] lg:text-[68px]">
                Trabajamos con
              </h2>
              <h3 className="font-google-sans-flex text-[28px] font-bold leading-[0.95] md:text-[52px] lg:text-[68px]">
                tecnologia
              </h3>
            </header>
          </div>

          <div className="absolute right-0 top-[98px] z-10 md:right-[44px] md:top-[96px] lg:right-[92px] lg:top-[108px] xl:right-[138px] xl:top-[88px]">
            <img
              src={tecnologiaImg}
              alt="Tecnologia"
              className="h-[244px] w-[244px] object-contain animate-tech-orbit md:h-[340px] md:w-[340px] md:max-w-none lg:h-[450px] lg:w-[450px] xl:h-[520px] xl:w-[520px]"
              draggable="false"
            />
          </div>

          <div className="absolute bottom-[50px] left-5 z-20 grid grid-cols-1 gap-y-0 font-google-sans-flex text-[15px] font-normal leading-[0.88] md:bottom-[92px] md:left-14 md:gap-y-1 md:text-[28px] lg:bottom-[118px] lg:left-20 lg:text-[34px]">
            {stackItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>

          <p className="absolute bottom-4 left-1/2 z-20 w-[84%] -translate-x-1/2 text-center font-google-sans-flex text-[11px] font-normal leading-[1.05] md:bottom-8 md:left-14 md:w-auto md:translate-x-0 md:text-left md:text-[18px] lg:bottom-10 lg:left-20 lg:text-[22px]">
            Creamos aplicaciones para empresas y proyectos.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Section6;
