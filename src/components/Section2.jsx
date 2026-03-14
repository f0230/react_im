// Section2.jsx optimizado
import React, { useCallback, useRef } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import dteKeyImg from "../assets/DTE.png";
import grupoKeyImg from "../assets/GRUPO.png";
import haceKeyImg from "../assets/HACE.png";
import loKeyImg from "../assets/LO.png";
import keySoundSrc from "../assets/SONIDO TECLA.mp3";

const Section2 = ({ onContactClick }) => {
  const { t } = useTranslation();
  const keySoundRef = useRef(null);

  const playKeySound = useCallback(() => {
    if (!keySoundRef.current) {
      keySoundRef.current = new Audio(keySoundSrc);
      keySoundRef.current.volume = 0.55;
      keySoundRef.current.preload = "auto";
    }

    const sound = keySoundRef.current;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }, []);

  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10"
      aria-label={t("section2.aria")}
    >
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] xl:h-[700px] mt-[5px] sm:mt-[0px] overflow-hidden bg-black">

        <div className="relative z-10 w-full mx-auto h-full flex flex-col items-center justify-center px-4 text-center">
          <h1 className="mb-6 text-white text-[30px] sm:text-[40px] md:text-[50px] lg:text-[60px] font-normal leading-none">
            <span className="block md:inline text-white">{t("section2.titleLine1")}</span>
            <span className="block md:inline md:ml-2 text-white">{t("section2.titleLine2")}</span>
          </h1>

          <div className="flex w-full max-w-[1160px] flex-wrap items-center justify-center gap-3 sm:gap-4 md:flex-nowrap md:gap-5 [perspective:1600px]">
            {[
              { src: dteKeyImg, alt: "DTE" },
              { src: grupoKeyImg, alt: "grupo" },
              { src: haceKeyImg, alt: "hace" },
              { src: loKeyImg, alt: "lo" },
            ].map((key) => (
              <div
                key={key.alt}
                className="group relative w-[120px] sm:w-[150px] md:w-[180px] lg:w-[210px]"
                onMouseEnter={playKeySound}
                onFocus={playKeySound}
                tabIndex={0}
              >
                <div className="absolute inset-x-[10%] bottom-[-10px] h-6 rounded-full bg-black/70 blur-xl transition-all duration-200 group-hover:bottom-[-4px] group-hover:h-4 group-hover:opacity-70" />
                <img
                  src={key.src}
                  alt={key.alt}
                  className="relative z-10 w-full select-none transition-transform duration-200 ease-out group-hover:translate-y-[10px] group-hover:scale-[0.985] group-active:translate-y-[14px] group-active:scale-[0.97]"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 md:mt-12 flex flex-col items-center">
            <p className="text-white w-[260px] md:w-[460px] font-normal text-[12px] md:text-[17px] leading-none">
              {t("section2.description")}
            </p>

            <div className="mt-4 md:mt-8 inline-block space-x-1 md:space-x-2 lg:space-x-3">
              <button onClick={onContactClick} className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px] hover:bg-skyblue/95 transition">
                {t("section2.ctaContact")}
              </button>
              <Link to="/servicios">
                <button className="z-100 text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px] hover:bg-white/95 hover:text-skyblue transition duration-300">
                  {t("section2.ctaServices")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;
