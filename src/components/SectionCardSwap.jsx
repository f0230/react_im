import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardSwap, { Card } from "@/components/CardSwap";
import OptimizedImage from "@/components/OptimizedImage";
import xclose from "../assets/x-close.svg";
import { useTranslation } from "react-i18next";

const SectionCardSwap = ({ onContactClick }) => {
  const { t } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const sectionRef = useRef(null);
  const popupTimerRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (popupDismissed) {
      return undefined;
    }

    const target = sectionRef.current;
    if (!target) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!hasTriggeredRef.current && entry.isIntersecting) {
          hasTriggeredRef.current = true;
          popupTimerRef.current = setTimeout(() => setShowPopup(true), 600);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    };
  }, [popupDismissed]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupDismissed(true);
  };

  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10 mt-1"
      aria-label={t("sectionCardSwap.aria")}
      ref={sectionRef}
    >
      <div className="relative p-0 m-auto w-full xl:w-[1440px] bg-[#ff2222] lg:w-[1280px] md:w-[960px] sm:w-[600px] md:h-[720px] h-[500px] overflow-hidden">

        <div className="md:hidden flex flex-1 p-6 md:p-10 flex-col justify-center items-center md:items-start text-center md:text-left">
          <h2 className="text-[32px] md:text-[50px] leading-none text-white font-normal">
            {t("sectionCardSwap.title")}
          </h2>
          <p className="mt-4 max-w-[320px] text-[12px] md:text-[17px] text-white leading-none">
            {t("sectionCardSwap.description")}
          </p>
        </div>

        <div className="relative z-10 flex flex-row h-[500px] md:h-full">
          <div className="hidden md:flex flex-1 p-6 md:p-10 flex-col justify-center items-center md:items-start text-center md:text-left">
            <h2 className="text-[32px] md:text-[50px] leading-none text-white font-normal">
              {t("sectionCardSwap.title")}
            </h2>
            <p className="mt-4 max-w-[320px] text-[12px] md:text-[17px] text-white leading-none">
              {t("sectionCardSwap.description")}
            </p>
          </div>

          <div className="relative flex-1 flex items-center justify-center md:justify-end -mt-6 md:mt-0 px-4 md:px-0">
            <div className="relative w-full h-[250px] md:h-[500px]">
              <CardSwap
                cardDistance={55}
                verticalDistance={62}
                delay={5000}
                pauseOnHover={false}
                skewAmount={4}
              >
                <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">{t("sectionCardSwap.cards.strategy.title")}</h3>
                  <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">
                    {t("sectionCardSwap.cards.strategy.content")}
                  </p>
                </Card>
                <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">{t("sectionCardSwap.cards.design.title")}</h3>
                  <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">
                    {t("sectionCardSwap.cards.design.content")}
                  </p>
                </Card>
                <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">{t("sectionCardSwap.cards.technology.title")}</h3>
                  <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">
                    {t("sectionCardSwap.cards.technology.content")}
                  </p>
                </Card>
                <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">{t("sectionCardSwap.cards.performance.title")}</h3>
                  <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">
                    {t("sectionCardSwap.cards.performance.content")}
                  </p>
                </Card>
              </CardSwap>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showPopup && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 20 }}
              animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-3 left-1/2 w-[250px] min-h-[120px] -translate-x-1/2 bg-black shadow-lg p-4 flex flex-col justify-between z-30 md:bottom-6 md:left-auto md:right-6 md:w-[389px]"
              role="dialog"
              aria-label={t("sectionCardSwap.popup.aria")}
            >
              <div className="text-white text-[12px] md:text-[17px]">
                <h2 className="font-normal text-[18px] md:text-[34px] leading-[1] lg:leading-[1.1]">
                  {t("sectionCardSwap.popup.title")} <br />
                  <span className="inline-block -mt-2">{t("sectionCardSwap.popup.subtitle")}</span>
                </h2>
                <p className="mt-1">{t("sectionCardSwap.popup.description")}</p>
                <button
                  type="button"
                  onClick={() => onContactClick?.()}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#FFD400] py-1.5 text-[11px] font-semibold text-black transition hover:bg-[#f3c800] md:py-2 md:text-[15px]"
                >
                  {t("sectionCardSwap.popup.cta")}
                </button>
              </div>

              <button
                className="absolute top-1 right-1 text-white p-1 rounded-full hover:bg-white/20 transition"
                onClick={handleClosePopup}
                aria-label={t("sectionCardSwap.popup.closeAria")}
              >
                <OptimizedImage
                  src={xclose}
                  alt={t("sectionCardSwap.popup.closeAlt")}
                  width={16}
                  height={16}
                  className="w-4 h-4"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default SectionCardSwap;
