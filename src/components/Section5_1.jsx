import React from "react";


const Section5 = () => {
  return (
      <section className="font-product relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10 mt-2">
          <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px] h-auto rounded-lg mt-1 sm:mt-0 overflow-hidden">

              {/* Contenedor flexible que cambia de dirección según el viewport */}
              <div className="flex flex-col md:flex-row w-full gap-0 my-20">

                  {/* Columna izquierda */}
                  <div className="w-full md:w-1/2 h-[150px] md:h-[325px] flex flex-col justify-center items-center ">
                      <h2 className="text-[60px] text-green font-normal leading-none">y +</h2>
                      <div className="mt-12 w-[162px] h-[10px] bg-green"></div>
                  </div>

                  {/* Columna derecha */}
                  <div className="w-full md:w-1/2 h-[150x] md:h-[325px] flex flex-col justify-center items-center text-center">
                      <p className="md:text-[37px]  max-w-[500px] hidden md:block font-normal leading-none">
                          Arquitectura, económica, asesoramiento legal, logística...
                      </p>
                      <p className="text-[35px]   max-w-[179px] font-normal leading-none md:hidden">
                          ECO. ARQ. DES. MKT. LEG.
                      </p>
                      <button className="text-[13px] md:text-[17px] mt-6 w-[176px] h-[36px] bg-greyburger font-normal rounded-full shadow hover:bg-blue-400 transition duration-300">
                          más informacion
                      </button>
                  </div>

              </div>
          </div>
      </section>

  );
};

export default Section5;