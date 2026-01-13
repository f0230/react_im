import React from "react";
import { Link } from "react-router-dom";
import CardSwap, { Card } from "@/components/CardSwap";

const SectionCardSwap = ({ onContactClick }) => {
  return (
    <section
      className="font-product relative w-full flex justify-center items-start px-2 z-10 mt-1  "
      aria-label="Seccion tarjetas dinamicas"
    >
      <div className="relative p-0 m-auto w-full xl:w-[1440px] bg-[#ff2222]  lg:w-[1280px] md:w-[960px] sm:w-[600px] md:h-[720px] h-[500px] overflow-hidden ">
      
      <div className="md:hidden flex  flex-1 p-6 md:p-10 flex flex-col justify-center items-center md:items-start text-center md:text-left">
         
            <h2 className="text-[32px] md:text-[50px] leading-none text-white font-normal">
Así piensa y trabaja DTE            </h2>
            <p className="mt-4 max-w-[320px] text-[12px] md:text-[17px] text-white leading-none">
Estrategia, diseño y tecnología potenciados por inteligencia artificial aplicada a negocio real.            </p>
            
          </div>

        <div className="relative z-10 flex flex-row h-[500px] md:h-full">
          <div className="hidden md:flex  flex-1 p-6 md:p-10 flex flex-col justify-center items-center md:items-start text-center md:text-left">
         
            <h2 className="text-[32px] md:text-[50px] leading-none text-white font-normal">
Así piensa y trabaja DTE            </h2>
            <p className="mt-4 max-w-[320px] text-[12px] md:text-[17px] text-white leading-none">
Estrategia, diseño y tecnología potenciados por inteligencia artificial aplicada a negocio real.            </p>
            
          </div>

          <div className="relative flex-1 flex items-center justify-center md:justify-end -mt-6 md:mt-0 px-4 md:px-0">
            <div className="relative w-full h-[250px]  md:h-[500px]">
                      <CardSwap
                        cardDistance={55}
                        verticalDistance={62}
                        delay={5000}
                        pauseOnHover={false}
                        skewAmount={4}
                      >                
                      <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">Estrategia </h3>
                   <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">
                  Pensamos antes de ejecutar.
Usamos IA para analizar tu negocio, mercado y datos, y definir modelos de negocio, funnels, pricing y roadmap digital con lógica real.
                  </p>
                </Card>
                <Card className="p-6 text-white">
                 <h3 className="text-[30px] md:text-[35px] font-normal">Diseño</h3>
                   <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">
                 Diseñamos con intención.
La IA nos ayuda a explorar conceptos, validar decisiones visuales y acelerar procesos creativos sin perder criterio humano.
                  </p>
                </Card>
                <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">Tecnología</h3>
                   <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">

   Construimos sistemas inteligentes.
Web apps, automatizaciones, integraciones y agentes de IA que trabajan por vos 24/7.                  </p>
                </Card>
                  <Card className="p-6 text-white">
                  <h3 className="text-[30px] md:text-[35px] font-normal">Performance </h3>
                   <p className="mt-2 text-[16px] md:text-[18px] text-white/80 leading-none">

   Medimos, aprendemos y mejoramos.
La IA analiza resultados, detecta oportunidades y optimiza campañas, procesos y conversiones en tiempo real.                  </p>
                </Card>
              </CardSwap>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionCardSwap;
