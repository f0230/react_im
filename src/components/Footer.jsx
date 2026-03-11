// Footer.jsx
import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import logoDTE from '../assets/dte_lohace.webp';
import { contactInfo } from '@/config/branding';
import { useTranslation } from 'react-i18next';

const SCHEDULE_CALL_URL = 'https://www.grupodte.com/schedule-call';
const WHATSAPP_URL = 'https://wa.me/59896280674';

const Footer = () => {
  const { t } = useTranslation();
  const footerRef = useRef();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        footerRef.current,
        { opacity: 0, filter: 'blur(10px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 1, delay: 0.3, ease: 'power3.out' }
      );
    }, footerRef);
    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      role="contentinfo"
      className="bg-white text-black px-6 md:px-12 py-2 font-product border-t border-neutral-200"
    >
      <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row items-center md:items-start h-auto md:h-[500px] px-8 pt-0">
        <div className="hidden md:flex flex-col justify-between w-full md:w-1/2 h-full py-8 text-left">
          <div>
            <p className="text-[34px] text-neutral-500">{t("footer.contactTitle")}</p>
            <h2 className="text-[45px] md:text-[60px] leading-none">{t("footer.headline")}</h2>
            <p className="md:text-[30px] text-normal">{t("footer.subheadline")}</p>
          </div>
          <div className="text-[30px]">
            <p className="text-black">{contactInfo.email}</p>
            <p className="text-black">{contactInfo.phone}</p>
          </div>
          <div className="text-[17px]">
            <p>{contactInfo.country}</p>
            <p>{contactInfo.years}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center md:items-end w-full md:w-[350px] h-auto md:h-full pt-2 pb-6 md:py-8 gap-4 md:gap-8 text-center md:text-left md:ml-auto">
          <div className="mt-0 mb-0 flex items-center justify-center md:justify-end w-[300px] px-2">
            <img src={logoDTE} alt="Logo Grupo DTE" />
          </div>
          <div className="flex flex-col px-2 gap-[10px] md:gap-3 w-full md:w-[350px]">
            <a
              href={SCHEDULE_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white text-[18px] md:text-[22px] h-[40px] md:h-[42px] rounded-full text-center font-product px-6 flex items-center justify-center hover:opacity-80 transition cursor-pointer"
            >
              {t("footer.ctaMeeting")}
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white text-[18px] md:text-[22px] h-[40px] md:h-[42px] rounded-full text-center font-product px-6 flex items-center justify-center hover:opacity-80 transition"
            >
              {t("footer.ctaWhatsapp")}
            </a>
          </div>
        </div>
      </div>

      {/* Pie de página con metainformación */}
      <div className="grid grid-cols-3 items-center w-full max-w-[1080px] mx-auto px-4 pt-3 md:pt-0">
        {/* Columna izquierda */}
        <div className="text-left">
          <p className="text-[10px] text-neutral-500">
            {t("footer.copyright")}
          </p>
          <Link to="/tyc" className="text-[10px] text-neutral-500 hover:text-black transition">
            {t("footer.terms")}
          </Link>
        </div>

        {/* Columna central */}
        <div className="text-center text-[10px] text-neutral-500 flex flex-wrap justify-center gap-x-2 gap-y-1">
          <span>{t("footer.builtBy")}</span>
        </div>

        {/* Columna derecha */}
        <div className="text-right">
          <p className="text-[10px] text-neutral-500">{contactInfo.country}</p>
          <Link to="/politica-privacidad" className="text-[10px] text-neutral-500 hover:text-black transition">
            {t("footer.privacy")}
          </Link>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
