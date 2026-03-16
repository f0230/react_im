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
import tecnologiaImg from '../assets/TECNOLOGIA.png';

// Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';

const Section6 = () => {
  const { t, i18n } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);

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
          titlePositionClass="md:left-[110px] md:top-[54px]"
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
          titlePositionClass="md:left-[95px] md:top-[66px]"
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
          titlePositionClass="md:right-[80px] md:top-[78px] md:left-auto"
        />
      ),
    },
  ], [isMobile, t, i18n.language]);

  return (
    <div className="w-full">
      <section
        className="flex h-[480px] w-full flex-col items-center justify-start md:h-[798px] md:justify-evenly lg:h-[798px]"
        aria-label={t('carousel.aria')}
      >
        <div className="mx-auto mt-6 flex w-full max-w-screen flex-col items-center px-4 text-center md:mt-8">
          <h2 className="font-product text-[35px] font-normal leading-none text-black md:text-[37px]">
            <span className="mr-2 md:inline">{t('carousel.titlePrefix')}</span>
            <span className="mr-2 font-bold">{t('carousel.titleBold')}</span>
            <span className="md:inline">{t('carousel.titleSuffix')}</span>
          </h2>
        </div>

        <div className="relative mt-0 w-full px-2 md:mt-0">
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
            className="w-full h-[420px] pt-4 pb-0 sm:h-[400px] sm:py-4 md:h-[420px] md:py-4 lg:h-[550px]"
          >
            {slides.map((slide, index) => (
              <SwiperSlide
                key={index}
                className="w-full flex-shrink-0 md:w-[750px] lg:w-[1000px] xl:w-[1300px]"
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

      <div className="w-full px-2 pt-[5px] md:px-0 md:pt-0">
        <section
          className="relative h-[420px] w-full overflow-hidden rounded-[18px] bg-[#707070] text-black md:h-[520px] md:rounded-none lg:h-[620px]"
          aria-label="Trabajamos con tecnologia"
        >
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

          <div className="absolute right-2 top-[104px] z-10 md:right-[80px] md:top-[120px] lg:right-[140px] lg:top-[150px]">
            <img
              src={tecnologiaImg}
              alt="Tecnologia"
              className="h-[205px] w-[205px] object-contain md:h-[260px] md:w-[260px] lg:h-[340px] lg:w-[340px]"
              draggable="false"
            />
          </div>

          <div className="absolute bottom-[52px] left-5 z-20 font-google-sans-flex text-[15px] font-normal leading-[0.9] md:bottom-[92px] md:left-14 md:text-[28px] lg:bottom-[118px] lg:left-20 lg:text-[34px]">
            <p>React</p>
            <p>Supabace</p>
            <p>IA</p>
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
