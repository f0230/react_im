/ src/components/About.jsx
import React from "react";

export const About = () => {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="flex flex-col md:flex-row gap-12">
        <div className="w-full md:w-1/2">
          <h2 className="text-6xl mb-12">
            <span>¿Qué es </span>
            <span className="font-bold">Renta<br />Personal</span>
            <span>?</span>
          </h2>
          
          <div className="bg-[#6ea0a0] border border-black p-8 text-white">
            <h3 className="text-3xl font-bold mb-12">Renta Inmediata</h3>
            <p className="text-2xl">
              Comienza a recibir pagos mensuales inmediatamente después de
              realizar tu inversión inicial.
            </p>
          </div>
        </div>
        
        <div className="w-full md:w-1/2">
          <p className="text-2xl mb-12">
            <span>Es un producto de vida del </span>
            <span className="font-bold">BSE</span>
            <span> que asegura una renta mensual a partir de una edad determinada,
            brindándote seguridad económica a largo plazo.</span>
          </p>
          
          <div className="bg-[#e6fffd] border border-black p-8 mt-12">
            <h3 className="text-3xl font-bold mb-12">Renta Diferida</h3>
            <p className="text-2xl">
              Programa tus pagos para comenzar en una fecha futura determinada,
              ideal para planificar tu jubilación.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-12 mt-12">
        <div className="w-full md:w-1/2">
          <div className="bg-[#dbfdff] border border-black p-8">
            <h3 className="text-3xl font-bold mb-12">Renta Garantizada</h3>
            <p className="text-2xl">
              Asegura un período mínimo de pagos para tus beneficiarios, incluso
              en caso de fallecimiento.
            </p>
          </div>
        </div>
        
        <div className="w-full md:w-1/2">
          <div className="bg-white border border-black p-8">
            <h3 className="text-3xl font-bold mb-12">Condiciones Básicas</h3>
            <p className="text-2xl">
              Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de
              rescate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
