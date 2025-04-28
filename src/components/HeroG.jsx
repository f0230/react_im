import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import bgMobileImg from "../assets/bg-1m.jpg"; // mobile
import bgDesktopImg from "../assets/bg-1-w.jpg"; // desktop

const HeroSection = () => {
  const [showPopup, setShowPopup] = useState(false);

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
    <div className="relative w-full overflow-hidden">
      <motion.section
        className="relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10"
        initial={{ y: 50, scale: 0.95, filter: "blur(8px)" }}
        whileInView={{y: 0, scale: 0.99, filter: "blur(0px)" }}
        transition={{
          duration: 1.2,
          y: { type: "spring", stiffness: 100, damping: 15 },
          scale: { duration: 1, ease: [0.34, 1.56, 0.64, 1] },
          filter: { duration: 0.8 },
        }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div
          className="relative w-full max-w-[1372px] 
                      h-[500px] sm:h-[600px] md:h-[880px]
                      rounded-2xl sm:rounded-2xl md:rounded-3xl
                      overflow-hidden
                      shadow-2xl"
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
          <div className="relative z-10 w-full max-w-[1375px] mx-auto h-full flex items-center justify-center">
            {/* Aquí podrías poner el contenido principal del hero */}

          {/* Popup animado */}
          {showPopup && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 30 }}
              animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
              transition={{ 
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1] // Curva personalizada tipo cubica
              }}
              className="absolute bottom-2 transform -translate-x-1/2 w-[300px] h-[125px] bg-black rounded-2xl shadow-lg p-4 flex flex-col justify-between z-30
                        md:left-4 md:bottom-4 md:w-[389px] md:h-[307px]"
            >
              {/* Contenido del popup y botón de cerrar */}
              <button 
                className="absolute top-1 right-1 text-white p-1 rounded-full hover:bg-white/20 transition"
                onClick={() => setShowPopup(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
          {/* Fin del popup animado */}


          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default HeroSection;
