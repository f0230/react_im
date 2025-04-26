// src/components/Hero.jsx
import React from "react";
import IMIdeintidad from "../assets/IM-IDEINTIDAD-1-2.png";
import { ContactForm } from "./ContactForm";

export const Hero = () => {
  return (
    <div className="relative w-full bg-cover bg-center min-h-[988px]" style={{ backgroundImage: 'url(/rectangle-3.svg)' }}>
      {/* Logo */}
      <div className="container mx-auto px-4 pt-9">
        <img 
          className="w-[281px] h-[135px] object-cover" 
          alt="BSE Logo" 
          src={IMIdeintidad} 
        />
      </div>

      {/* Hero Content */}
      <div className="container mx-auto px-4 pt-64 pb-16 flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-2/3">
          <p className="text-white mb-8">
            <span className="text-3xl">Renta Personal del </span>
            <span className="text-3xl font-bold">BSE</span>
            <br /><br />
            <span className="text-6xl font-bold leading-tight">
              Seguridad a largo <br />
              plazo con respaldo estatal
            </span>
          </p>
          
          <p className="text-white text-2xl mb-12 max-w-[609px]">
            Asegura tu futuro económico con un producto que te garantiza una
            renta fija mensual. Respaldo, seguridad y tranquilidad para tu
            jubilación.
          </p>
          
          <div className="h-px w-full max-w-[669px] bg-white mb-12"></div>
          
          <div className="flex flex-wrap gap-4">
            <button className="bg-black text-white rounded-full px-7 py-3 text-lg">
              Conocé más
            </button>
            <button className="bg-black text-white rounded-full px-7 py-3 text-lg">
              Simula tu renta
            </button>
            <button className="bg-black text-white rounded-full px-7 py-3 text-lg">
              Asesorate sin costo
            </button>
          </div>
        </div>
        
        <div className="w-full md:w-1/3 mt-8 md:mt-0">
          <ContactForm />
        </div>
      </div>
    </div>
  );
};