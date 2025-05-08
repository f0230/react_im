import React from "react";


const Section5 = () => {
  return (
      <section className="font-product relative w-full flex h-[550px] md:h-[350px]  justify-between items-center z-10">
         
              {/* Contenedor flexible que cambia de dirección según el viewport */}
              <div className="flex flex-col md:flex-row w-full gap-10 ">

                  {/* Columna izquierda */}
                  <div className="w-full md:w-1/2  flex flex-col  items-center ">
                      <h2 className="text-[60px] text-green font-normal leading-none">y +</h2>
                      <div className="mt-12 w-[162px] h-[10px] bg-green"></div>
                  </div>

                  {/* Columna derecha */}
                  <div className="w-full md:w-1/2 flex flex-col  items-center text-center mt-10">
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
         
      </section>

  );
};

export default Section5;