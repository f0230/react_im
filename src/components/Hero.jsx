import React from "react";
import { motion } from "framer-motion";
import circleImg from "../assets/circulo.png";
import bgCardImg from "../assets/bg-card.png";
import MbgCardImg from "../assets/bg-card-m.png";
import MbgVentasImg from "../assets/bg-ventas-m.png";
import bgVentasImg from "../assets/bg-ventas-w.png";



const revealUp = {
  hidden: { opacity: 0, y: 100, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

const Hero = () => {
  return (

      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        viewport={{ once: false }}
        className="relative w-full min-h-[3000px] 
                  -mt-[300px] md:-mt-[450px] 
                  pt-[300px] md:pt-[450px] 
                  bg-black 
                  z-0" >
          <div className="relative flex flex-col items-center w-full h-full bg-white  ">   
              {/* Sección negra */}
              <section className="relative w-full min-h-[3000px] 
                          -mt-[300px] md:-mt-[450px] 
                          pt-[300px] md:pt-[450px] 
                          bg-black 
                          z-0">
                            {/* Seccion 1 dentro de fondo negro */}
                                <div className="relative w-full px-2 sm:px-2 lg:px-2  mx-auto mt-8 ">
                                  <div className="flex flex-col md:flex-row items-center justify-between  md:min-h-[500px]  mt-2 md:mt-0 gap-6 md:gap-6">
                                    {/* Circle animado */}
                                                          <motion.div 
                                                            className="relative hidden md:block w-[40%] md:max-w-[408px] aspect-square"
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
                                    {/* + profesional */}
                                                          <motion.div 
                                                                          className="relative w-full md:w-[100%] h-auto 
                                                                                    min-h-[235px] md:min-h-[478px] 
                                                                                    rounded-10px flex flex-col justify-between 
                                                                                    p-6 sm:p-8 md:p-10 overflow-hidden"
                                                                          initial={{ opacity: 0, y: 25}}
                                                                          whileInView={{ opacity: 1, y: 0 }}
                                                                          transition={{ duration: 1 }}
                                                                          viewport={{ once: true, amount: 0.01 }}
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
                                                                            {/* Tu contenido */}
                                                                          </div>
                                                          </motion.div>
                                  </div>
                                </div>
                                    {/* Fin de seccion 1 */}
                            {/* Seccion 2 dentro de fondo negro */}
                            <div className="relative w-full px-2 sm:px-2 lg:px-2 mx-auto">
                                  <div className="flex flex-col md:flex-row items-center justify-between md:min-h-[500px] mt-2 md:mt-0 gap-2 md:gap-6">
                                    
                                    {/* + equipo */}
                                                      <motion.div 
                                                        className="relative w-full md:w-[100%] max-w-[940px] h-auto 
                                                                  min-h-[235px] md:min-h-[478px] 
                                                                  rounded-10px flex flex-col justify-between 
                                                                  p-6 sm:p-8 md:p-10 overflow-hidden bg-white"
                                                        initial={{ opacity: 0, y: 50}}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 1 }}
                                                        viewport={{ once: true, amount: 0.01 }}
                                                      >
                                                      
                                                        {/* Contenido encima del fondo */}
                                                        <div className="relative z-10 text-white">
                                                          {/* Tu contenido */}
                                                        </div>
                                                      </motion.div>
                                    {/* + ventas */}
                                                      <motion.div 
                                                        className="relative w-full md:w-[100%]  h-auto 
                                                            min-h-[235px] md:min-h-[478px] 
                                                            rounded-10px flex flex-col justify-between 
                                                            p-6 sm:p-8 md:p-10 overflow-hidden"
                                                        initial={{ opacity: 0, y: 25}}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 1 }}
                                                        viewport={{ once: true, amount: 0.01 }}
                                                      >
                                                        {/* Fondo Mobile */}
                                                        <div
                                                        className="absolute inset-0 bg-no-repeat bg-cover block md:hidden"
                                                        style={{ backgroundImage: `url(${MbgVentasImg})` }}
                                                        />

                                                        {/* Fondo Desktop */}
                                                        <div
                                                        className="absolute inset-0 bg-no-repeat bg-cover hidden md:block"
                                                        style={{ backgroundImage: `url(${bgVentasImg})` }}
                                                        />

                                                        {/* Contenido encima del fondo */}
                                                        <div className="relative z-10 text-white">
                                                        {/* Tu contenido */}
                                                        </div>
                                                      </motion.div>
                                                      </div>
                                                    </div>
                  </section> 
                          {/* Fin de la sección negra */}
          </div>
    </motion.section> 
  );
};

export default Hero;
