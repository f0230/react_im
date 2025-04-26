// src/components/Benefits.jsx
import React from "react";

export const Benefits = () => {
  const benefitItems = [
    {
      id: 1,
      title: "Respaldo Estatal",
      description: "Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate."
    },
    {
      id: 2,
      title: "Protección Familiar",
      description: "Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate."
    },
    {
      id: 3,
      title: "Flexibilidad",
      description: "Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate."
    },
    {
      id: 4,
      title: "Estabilidad",
      description: "Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate."
    },
    {
      id: 5,
      title: "Cobertura Global",
      description: "Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate."
    },
    {
      id: 6,
      title: "Valor UI",
      description: "Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-6xl font-bold mb-16">Beneficios</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {benefitItems.map((benefit) => (
          <div key={benefit.id} className="flex flex-col items-center text-center">
            <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
            <h3 className="text-2xl font-bold mb-4">{benefit.title}</h3>
            <p className="text-sm max-w-[174px]">{benefit.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};