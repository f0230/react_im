import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import RotatingText from "./ui/RotatingText";
import AnimatedContent from './ui/AnimatedContent';
import FadeContent from './ui/FadeContent';

import bgMobileImg from "../assets/PORTADA_1_MOVIL.webp"; // mobile
import bgDesktopImg from "../assets/PORTADA_1.webp"; // desktop
import grupodte from "../assets/LOGODTE.svg"; // logo 
import xclose from "../assets/x-close.svg"; // logo 

const HeroSection = () => {
  const [showPopup, setShowPopup] = useState(false);

  // Palabras que rotarán en lugar de "negocio"
  const rotatingWords = ["negocio", "empresa", "marca", "proyecto", "futuro"];

  useEffect(() => {
    // Mostrar el popup después de 3 segundos
    const popupTimer = setTimeout(() => {
      setShowPopup(true);
    }, 3000);

    return () => {
      clearTimeout(popupTimer); // limpiar timer si desmonta
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10">
      <AnimatedContent
        distance={150}
        direction="vertical"
        reverse={false}
        config={{ tension: 80, friction: 20 }}
        initialOpacity={0.2}
        animateOpacity
        scale={1}
        className="w-full flex justify-center"
      >
        <div
          className="relative xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] w-full
                    h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] 
                    overflow-hidden
                    mt-[45px] sm:mt-[0px]
                    mx-auto"
          style={{
            position: "relative",
            zIndex: 20,
          }}
        >
          {/* Fondo Mobile */}
          <div
            className="absolute inset-0 bg-no-repeat bg-cover bg-top sm:bg-top md:bg-center block md:hidden"
            style={{ backgroundImage: `url(${bgMobileImg})` }}
          />

          {/* Fondo Desktop */}
          <div
            className="absolute inset-0 bg-no-repeat bg-cover bg-center hidden md:block"
            style={{ backgroundImage: `url(${bgDesktopImg})` }}
          />

          {/* Contenido encima del fondo */}
          <div className="relative z-10 w-full mx-auto h-full flex items-center justify-center">
            {/* Contenido dentro del hero principal*/}
            <div className="m-auto text-center text-black">
              {/* Logo con FadeContent */}
              <FadeContent blur={true} duration={800} easing="ease-out" initialOpacity={0} delay={200}>
                <img src={grupodte} alt="Logo" className="mx-auto w-[150px] sm:w-[175px] md:w-[200px]" />
              </FadeContent>

              {/* Título con AnimatedContent */}
              <AnimatedContent
                distance={40}
                direction="vertical"
                reverse={true}
                config={{ tension: 120, friction: 14 }}
                initialOpacity={0}
                animateOpacity
                delay={400}
              >
                <h1 className="mx-auto font-product font-normal text-[30px] sm:text-5xl md:text-45px lg:text-60px leading-none">
                  impulsamos tu<br />
                  <span className="font-bold inline-block">
                    <RotatingText
                      texts={rotatingWords}
                      rotationInterval={2500}
                      splitBy="words"
                      staggerDuration={0.03}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 300
                      }}
                      mainClassName="font-bold"
                    />
                  </span>
                </h1>
              </AnimatedContent>

              {/* Subtítulo con FadeContent */}
              <FadeContent
                duration={1000}
                easing="ease-in-out"
                initialOpacity={0}
                delay={700}
              >
                <p className="text-[12px] md:text-[17px] mt-16">
                  Desarrollamos soluciones estratégicas
                </p>
              </FadeContent>

              {/* Botones con animación del contenedor completo */}
              <AnimatedContent
                distance={50}
                direction="vertical"
                reverse={true}
                config={{ tension: 90, friction: 16 }}
                initialOpacity={0}
                animateOpacity
                delay={900}
              >
                <div className="mt-4 md:mt-8 inline-block space-x-1 md:space-x-2 lg:space-x-3">
                  <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px] hover:bg-skyblue/95 hover:text-white transition duration-300">
                    Contactanos
                  </button>
                  <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px] hover:bg-white/95 hover:text-skyblue transition duration-300">
                    Servicios
                  </button>
                </div>
              </AnimatedContent>
            </div>

            {/* Popup animado */}
            {showPopup && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 30 }}
                animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
                transition={{
                  duration: 1.65,
                  ease: [0.16, 1, 0.3, 1] // Curva personalizada tipo cúbica
                }}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[250px] h-[100px] bg-black shadow-lg p-4 flex flex-col justify-between z-30
                        md:bottom-auto md:left-auto md:transform-none md:right-4 md:top-4 md:w-[389px] md:h-[150px]"
              >
                {/* Contenido del popup con animación interna */}
                <FadeContent
                  blur={true}
                  duration={600}
                  easing="ease-out"
                  initialOpacity={0}
                  delay={300}
                >
                  <div className="text-white font-product text-[12px] md:text-[17px]">
                    <h2 className="font-normal text-[20px] lg:text-[40px] leading-[1] lg:leading-[1.1]">
                      Hola! <br />
                      <span className="inline-block -mt-2">Bienvenido</span>
                    </h2>
                    <p className="mt-1">si tiene alguna consulta contáctenos</p>
                  </div>
                </FadeContent>

                <button
                  className="absolute top-1 right-1 text-white p-1 rounded-full hover:bg-white/20 transition"
                  onClick={() => setShowPopup(false)}
                >
                  <img src={xclose} alt="Cerrar" className="w-4 h-4" />
                </button>
              </motion.div>
            )}
            {/* Fin del popup animado */}
          </div>
        </div>
      </AnimatedContent>
    </div>
  );
};

export default HeroSection;