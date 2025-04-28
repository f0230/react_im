import React from "react";
import { motion } from "framer-motion";
import logo from "../assets/logo-dte.svg";
import wp from "../assets/whatsapp-icon.svg";
import circleImg from "../assets/circulo.png";
import bgCardImg from "../assets/bg-card.png";
import bgMobileImg from "../assets/bg-1m.jpg";
import bgDesktopImg from "../assets/bg-1-w.jpg";

const slideUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 }
};

const revealUp = {
  hidden: { opacity: 0, y: 100, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

export const Hero = () => {
  return (
    <div className="relative flex flex-col items-center w-full bg-white overflow-hidden">
      

        {/* Contenedor principal */}
        <div className="relative w-full overflow-hidden">

          {/* Hero Section (verde) */}
          <motion.section
            className="relative w-full flex justify-center items-start overflow-x-hidden px-2 sm:px-4 md:px-6 z-10"
            initial={{ 
              opacity: 0, 
              y: 100, 
              scale: 0.95,
              filter: "blur(8px)"
            }}
            whileInView={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              filter: "blur(0px)"
            }}
            transition={{ 
              duration: 1.2,
              y: { type: "spring", stiffness: 100, damping: 15 },
              opacity: { duration: 0.8 },
              scale: { duration: 1, ease: [0.34, 1.56, 0.64, 1] },
              filter: { duration: 0.8 }
            }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <div
              className="relative w-full max-w-[1372px] 
                        h-[500px] sm:h-[600px] md:h-[880px]
                        bg-no-repeat bg-cover
                        rounded-2xl sm:rounded-2xl md:rounded-3xl
                        bg-top sm:bg-top md:bg-center
                        overflow-hidden
                        shadow-2xl" // Added shadow for better depth
              style={{
                backgroundImage: `url(${bgMobileImg})`,
                position: "relative",
                zIndex: 20 // Explicit z-index to ensure it stays on top
              }}
            >
              {/* Contenido dentro del hero */}
            </div>
          </motion.section>

        </div>

        {/* Sección negra */}
        <section className="relative w-full max-h-[3000px] 
                          mt-[-300px] md:mt-[-450px] 
                          bg-black py-[300px] md:py-[500px]
                          z-0"> {/* Explicit z-index of 0 */}
          {/* Contenido de la sección negra */}

        {/* Inner container */}
        <motion.section 
          className="relative max-w-[1372px] w-full justify-center items-start 
                    mx-auto px-2 sm:px-4 md:px-6 z-10"
          variants={revealUp}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between 
                          min-h-[500px] mt-6 md:mt-0">

            {/* Circle animado */}
            <motion.div 
              className="relative hidden md:block w-[40%] max-w-[408px] aspect-square"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              animate={{ rotate: 360 }}
              transition={{
                scale: { duration: 1 },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
              viewport={{ once: true }}
            >
              <img 
                src={circleImg}
                alt="Círculo decorativo" 
                className="absolute w-full h-full object-contain"
                loading="lazy"
              />
            </motion.div>

            {/* Card */}
            <motion.div 
              className="relative w-full md:w-[65%] max-w-[950px] h-auto min-h-[478px] 
                        rounded-2xl flex flex-col justify-between 
                        p-6 sm:p-8 md:p-10"
              style={{ backgroundImage: `url(${bgCardImg})` }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-white">
                {/* Acá va tu contenido de la Card */}
              </div>
            </motion.div>

          </div>
        </motion.section>
      </section>
    </div>
  );
};

export default Hero;
