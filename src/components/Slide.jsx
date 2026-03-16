import React, { useState, useEffect, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Keyboard, Mousewheel } from 'swiper/modules';
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

// Swiper styles
import 'swiper/css';

const Section6 = () => {
  const { t, i18n } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
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

  const carouselSlides = useMemo(() => [...slides, ...slides], [slides]);

  const toggleCarouselPlayback = () => {
    if (!swiperInstance?.autoplay) return;

    if (isCarouselPaused) {
      swiperInstance.autoplay.start();
    } else {
      swiperInstance.autoplay.stop();
    }

    setIsCarouselPaused((current) => !current);
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

          <button
            type="button"
            onClick={toggleCarouselPlayback}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/20 bg-white text-black transition-colors hover:bg-black hover:text-white"
            aria-label={isCarouselPaused ? 'Reproducir carrusel' : 'Pausar carrusel'}
            aria-pressed={isCarouselPaused}
          >
            {isCarouselPaused ? (
              <span className="ml-[2px] text-[15px] leading-none">▶</span>
            ) : (
              <span className="text-[13px] leading-none">❚❚</span>
            )}
          </button>
        </div>

        <div className="relative w-full">
          <Swiper
            onSwiper={setSwiperInstance}
            modules={[Autoplay, Keyboard, Mousewheel]}
            dir="ltr"
            grabCursor={true}
            centeredSlides={false}
            loop={true}
            loopedSlides={carouselSlides.length}
            speed={8000}
            slidesPerView={'auto'}
            spaceBetween={10}
            loopAdditionalSlides={carouselSlides.length}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
              reverseDirection: false,
              stopOnLastSlide: false,
            }}
            keyboard={{ enabled: true }}
            mousewheel={{ forceToAxis: true }}
            className="carousel-ticker-swiper w-full h-[420px] pt-4 pb-0 sm:h-[400px] sm:py-4 md:h-[420px] md:py-4 lg:h-[550px]"
          >
            {carouselSlides.map((slide, index) => (
              <SwiperSlide
                key={`${slide.background}-${index}`}
                className="w-[calc(100%-20px)] flex-shrink-0 md:w-[750px] lg:w-[1000px] xl:w-[1300px]"
              >
                {({ isActive, isPrev, isNext }) => (
                  <CarouselSlide
                    slide={slide}
                    isActive={isActive}
                    isPrev={isPrev}
                    isNext={isNext}
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
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
