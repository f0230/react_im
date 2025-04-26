// src/components/About.jsx
import React from "react";

export const About = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-5xl font-bold mb-8">¿Qué es la Renta Personal del BSE?</h2>
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2">
          <p className="text-lg mb-6">
            La Renta Personal del BSE es un producto diseñado para brindarte seguridad económica a largo plazo. Te permite asegurar una renta mensual fija para tu futuro, con el respaldo del Estado uruguayo.
          </p>
          
          <p className="text-lg mb-6">
            Este producto es ideal para quienes desean complementar su jubilación o planificar su futuro financiero con tranquilidad, sabiendo que contarán con ingresos estables y seguros.
          </p>
          
          <p className="text-lg">
            Con la Renta Personal del BSE, inviertes hoy para recibir mañana, asegurando tu calidad de vida cuando más lo necesites.
          </p>
        </div>
        
        <div className="w-full md:w-1/2 bg-gray-100 rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-4">Características principales</h3>
          
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="mr-2 text-teal-dark font-bold">✓</span>
              <span>Respaldo estatal que garantiza la seguridad de tu inversión</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-teal-dark font-bold">✓</span>
              <span>Moneda en UI (Unidades Indexadas) para proteger contra la inflación</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-teal-dark font-bold">✓</span>
              <span>Diferentes modalidades que se adaptan a tus necesidades</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-teal-dark font-bold">✓</span>
              <span>Opción para proteger a tu familia en caso de fallecimiento</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-teal-dark font-bold">✓</span>
              <span>Asesoramiento personalizado sin costo adicional</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};