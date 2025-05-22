// Footer.jsx
import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import logoDTE from '../assets/dte_lohace.webp';
import { contactInfo } from '@/config/branding';

const Footer = ({ setIsModalOpen }) => {
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
      <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row justify-between items-center h-[300px] md:h-[500px] px-8">
        <div className="hidden md:flex flex-col justify-between w-full md:w-1/2 h-full py-8">
          <div>
            <p className="text-[34px] text-neutral-500">Contáctanos</p>
            <h2 className="text-[45px] md:text-[60px] leading-none">Trabajemos juntos</h2>
            <p className="md:text-[30px] text-normal">y llegá más lejos</p>
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
        <div className="flex flex-col md:justify-center justify-between items-center w-[350px] h-full py-8 gap-8">
          <div className="flex items-center w-[300px] px-2">
            <img src={logoDTE} alt="Logo Grupo DTE" />
          </div>
          <div className="flex flex-col px-4 gap-3 w-[350px]">
            <a
              onClick={(e) => {
                e.preventDefault();
                setIsModalOpen(true);
              }}
              href="#"
              className="bg-black text-white text-[22px] h-[42px] rounded-full text-center font-product px-6 flex items-center justify-center hover:opacity-80 transition cursor-pointer"
            >
              Agenda una reunión
            </a>
            <a
              href="https://wa.me/59896219905"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white text-[22px] h-[42px] rounded-full text-center font-product px-6 flex items-center justify-center hover:opacity-80 transition"
            >
              Hablemos por Whatsapp
            </a>
          </div>
        </div>
      </div>

      {/* Pie de página con metainformación */}
      <div className="grid grid-cols-3 items-center w-full max-w-[1080px] mx-auto px-4">
        <div className="block  text-left">
          <p className="text-[10px] text-neutral-500">© 2025</p>
          <Link to="/tyc" className=" hover:text-black transition">
            <p className="text-[10px] text-neutral-500">   Términos y Condiciones</p>
          </Link>

        </div>
        <div className="text-center text-[10px] text-neutral-500 flex flex-wrap justify-center gap-x-2 gap-y-1">
          <span>Desarrollado por DTE</span>
          
        
        
        </div>
        <div className="block  text-right">
          <p className="text-[10px] text-neutral-500">{contactInfo.country}</p>
          <Link to="/politica-privacidad" className=" hover:text-black transition">
            <p className="text-[10px] text-neutral-500">     Política de Privacidad</p>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
