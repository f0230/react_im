import React from "react";
import { motion } from "framer-motion";
import circleImg from "../assets/circulo.png";
import bgCardImg from "../assets/bg-card.png";
import MbgCardImg from "../assets/bg-card-m.png";

const revealUp = {
  hidden: { opacity: 0, y: 100, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

const Hero = () => {
  return (
    <div className="relative flex flex-col items-center w-full h-full bg-white  ">   
      {/* Sección negra */}
      <motion.section
 initial={{ opacity: 0, y: 50 }}
 whileInView={{ opacity: 1, y: 0 }}
 transition={{ duration: 1, ease: "easeOut" }}
  viewport={{ once: true }}
  className="relative w-full min-h-[3000px] 
            -mt-[300px] md:-mt-[450px] 
            pt-[300px] md:pt-[450px] 
            bg-black 
            z-0"
>
      <section 
  className="relative w-full min-h-[3000px] 
            -mt-[300px] md:-mt-[450px] 
            pt-[300px] md:pt-[450px] 
            bg-black 
            z-0"
>

        {/* Contenedor de contenido separado */}
        <div className="relative w-full 
                        px-2 sm:px-2 lg:px-2 
                        max-w-[1372px] mx-auto">
          
          {/* Inner Container animado */}
          <motion.section 
            className="flex flex-col md:flex-row items-center justify-between min-h-[500px] mt-6 md:mt-0 gap-6 md:gap-6 "
            variants={revealUp}
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
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
              className="relative w-full md:w-[100%] max-w-[950px] h-auto 
                        min-h-[235px] md:min-h-[478px] 
                        rounded-2xl flex flex-col justify-between 
                        p-6 sm:p-8 md:p-10 overflow-hidden"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true, amount: 0 }}
              >
              {/* Fondo Mobile */}
              <div
                className="absolute inset-0 bg-no-repeat bg-cover block md:hidden"
                style={{ backgroundImage: `url(${MbgCardImg})` }}
              />

              {/* Fondo Desktop */}
              <div
                className="absolute inset-0 bg-no-repeat bg-cover hidden md:block"
                style={{ backgroundImage: `url(${bgCardImg})` }}
              />

              {/* Contenido encima del fondo */}
              <div className="relative z-10 text-white">
                {/* Tu contenido de la Card */}
              </div>
            </motion.div>


          </motion.section>
        </div>

      </section>
      </motion.section>
    </div>
    
  );
};

export default Hero;
