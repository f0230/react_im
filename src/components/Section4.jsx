import React from "react";
import ContImg from "../assets/content.png";
import SpaceImg from "../assets/space.png";

const Section2 = () => {
  return (
    <section className="font-product relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10 mt-2">
      <div className="relative w-full xl:w-[1440px] lg:w-[1280px] md:w-[960px] sm:w-[600px]
                    h-auto  mt-1 sm:mt-0 overflow-hidden">

        {/* Contenedor flexible que cambia de dirección según el viewport */}
        <div className="flex flex-col md:flex-row w-full gap-2">


          {/* Primera sección - Con imagen de fondo */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative ">
            {/* Contenedor común para el contenido (alineado al fondo y centrado) */}
            <div className=" inset-0 absolute  flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <div className="">
                <h2 className="font-normal text-white text-[40px] md:text-[60px]">Espacios</h2>
                                <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                  Diseñamos espacios físicos que traducen la identidad de tu marca.
                </p>
              </div>

              {/* Contenido común del botón */}
              <button className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-400 hover:text-white transition duration-300 mb-6">
                Ver más
              </button>
            </div>

            {/* Fondo para web (oculto en sm y se muestra en md y superiores) */}
            <div
              className="absolute top-0 left-0 w-full h-full hidden sm:flex z-10"
              style={{ backgroundImage: `url(${SpaceImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            ></div>

            {/* Fondo para móvil (se muestra por defecto y se oculta en md y superiores) */}
            <div
              className="absolute top-0 left-0 w-full h-full block sm:hidden z-10"
              style={{ backgroundImage: `url(${SpaceImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            ></div>
          </div>
   

          {/* Segunda sección - Con imagen de fondo */}
          <div className="w-full md:w-1/2 h-[510px] sm:h-[600px] md:h-[625px] relative">
            {/* Contenedor común para el contenido (alineado al fondo y centrado) */}
            <div className=" inset-0 absolute flex flex-col items-center justify-center text-center p-6 md:p-10 z-20">
              <div className="">
                <h2 className="font-normal text-white text-[40px] md:text-[60px]">Contenidos</h2>
                 <p className="mb-10 w-[250px] text-[12px] md:text-[17px] text-white text-center leading-none">
                  Creativos y estratégicos que conectan con tu público
                </p>
              </div>

               {/* Contenido común del botón */}
              <button className="relative text-sm md:text-base w-28 h-8 md:w-40 md:h-10 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-400 hover:text-white transition duration-300 mb-6">
                Ver más
              </button>
              </div>

            {/* Fondo para web (oculto en sm y se muestra en md y superiores) */}
            <div
              className="absolute top-0 left-0 w-full h-full hidden sm:flex z-10"
              style={{ backgroundImage: `url(${ContImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            ></div>

            {/* Fondo para móvil (se muestra por defecto y se oculta en md y superiores) */}
            <div
              className="absolute top-0 left-0 w-full h-full block sm:hidden z-10"
              style={{ backgroundImage: `url(${ContImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            ></div>
          </div>


        </div>
      </div>
    </section>
  );
};

export default Section2;