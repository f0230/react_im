import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import bgMobileImg from "../assets/banner-movil.png"; // mobile
import bgDesktopImg from "../assets/banner-web.jpg"; // desktop
import grupodte  from "../assets/LOGODTE.svg"; // logo 
import xclose  from "../assets/x-close.svg"; // logo 



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
            initial={{ y: 30, scale: 0.95, filter: "blur(4px)" }}
            whileInView={{ y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{
              y: { type: "spring", stiffness: 80, damping: 16 },
              scale: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
              filter: { duration: 0.5, ease: "easeOut" },
              delay: 0.2,
            }}
            viewport={{ once: true, amount: 0.3 }}
          >
        <div
          className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px]
                      h-[500px] sm:h-[600px] md:h-[700px] lg:h-[700px] 
                      overflow-hidden
                      "
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
            {/* Aquí podrías poner el contenido principal del hero */}
            {/* Contenido dentro del hero principal*/}
            <div className=" m-auto text-center text-black">
              <img src={grupodte} alt="Logo" className="mx-auto w-[150px] sm:w-[175px] md:w-[200px]" />
              <h1 className="mx-auto font-product font-normal text-[30px] sm:text-5xl md:text-6xl lg:text-7xl leading-none lg:leading-[1.2]">
                impulsamos tu<br />
                <span className="font-bold inline-block">negocio</span>
              </h1>
              <p className="text-[12px] md:text-[17px] mt-4 ">
              Desarrollamos soluciones estratégicas
              </p>
              <div className="mt-4 md:mt-8 inline-block space-x-1 md:space-x-2 lg:space-x-3">
              <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px] shadow-lg hover:bg-skyblue/95 hover:text-white transition duration-300">
                Contactanos
              </button>
              <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px] shadow-lg hover:bg-white/95 hover:text-skyblue transition duration-300">
                Servicios
              </button>
              </div>
             
            </div>
          

          {/* Popup animado */}
          {showPopup && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)", rotate: -2, y: 30 }}
              animate={{ opacity: 1, backdropFilter: "blur(5px)", rotate: 0, y: 0 }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)", rotate: 2, y: 10 }}
              transition={{ 
                duration: 1.65,
                ease: [0.16, 1, 0.3, 1] // Curva personalizada tipo cubica
              }}
              className="absolute bottom-2 lg:top-2 transform -translate-x-1/2 w-[250px] h-[100px] bg-black shadow-lg p-4 flex flex-col justify-between z-30
                        md:right-4 md:top-4 md:w-[389px] md:h-[150px]"
            >
              {/* Contenido del popup y botón de cerrar */}
              <div className="text-white font-product text-[12px] md:text-[17px]">
              <h2 className="font-normal text-[20px] lg:text-[40px] leading-[1] lg:leading-[1.-1]">
                  Hola! <br />
                  <span className="inline-block -mt-2">Bienvenido</span>
                </h2>

                <p className="mt-1">si tiene alguna cunsulta contactenos</p>
              
              </div>
              

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
      </motion.section>
    </div>
  );
};

export default HeroSection;
