import React, { useState, useEffect, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCoverflow, Keyboard, Mousewheel } from 'swiper/modules';
import { useTranslation } from 'react-i18next';
import CarouselSlide from './CarouselSlide';
import SlideContent from './SlideContent';

// Assets
import Slider1 from '../assets/PYMES.webp';
import Slider2 from '../assets/EMPRESAS.webp';
import Slider3 from '../assets/EM_ESTABLAECIDAS.webp';
import MSlider1 from '../assets/PYMES_M.webp';
import MSlider2 from '../assets/EMPRESAS_M.webp';
import MSlider3 from '../assets/EM_ESTABLAECIDAS_M.webp';

// Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';

const Section6 = () => {
  const { t, i18n } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);

  // Detección responsiva más precisa
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

      <div className="w-full relative px-2 ">
        <Swiper
          modules={[Autoplay, EffectCoverflow, Keyboard, Mousewheel]}
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          loop={true}
          slidesPerView={'auto'}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 2.5,
            slideShadows: false,
          }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          keyboard={{ enabled: true }}
          mousewheel={{ forceToAxis: true }}
          className="w-full h-[320px] sm:h-[400px] md:h-[420px] lg:h-[550px] py-4"
        >
          {slides.map((slide, index) => (
            <SwiperSlide
              key={index}
              className="w-full md:w-[750px] lg:w-[1000px] xl:w-[1300px] flex-shrink-0"
            >
              {({ isActive }) => (
                <CarouselSlide
                  slide={slide}
                  isActive={isActive}
                />
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default Section6;
