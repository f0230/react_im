import React from "react";

export const AnimaComponent = () => {
  // Creamos URLs para las imágenes como placeholders
  const logoPlaceholder = "/api/placeholder/281/135";
  const vectorPlaceholder = "/api/placeholder/299/3";

  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full max-w-[1512px] relative">
        {/* Hero Section / Top Blue Banner */}
        <div className="relative w-full h-[988px] bg-blue-700">
          {/* Logo */}
          <div className="absolute w-[281px] h-[135px] top-9 left-[74px] bg-white flex items-center justify-center">
            <div className="font-bold text-2xl">BSE Logo</div>
          </div>

          {/* Hero Content */}
          <div className="absolute w-full max-w-[1235px] top-[316px] left-[138px] px-4">
            <div className="max-w-[1174px]">
              <p className="text-white">
                <span className="text-3xl">Renta Personal del </span>
                <span className="text-3xl font-bold">BSE</span>
              </p>
              
              <div className="mt-8">
                <p className="text-white text-6xl font-bold leading-tight">
                  Seguridad a largo <br />
                  plazo con respaldo estatal
                </p>
              </div>

              <p className="mt-12 text-white text-2xl max-w-[609px]">
                Asegura tu futuro económico con un producto que te garantiza una
                renta fija mensual. Respaldo, seguridad y tranquilidad para tu
                jubilación.
              </p>

              <div className="mt-12 h-px w-full max-w-[669px] bg-white"></div>

              <div className="mt-12 flex flex-wrap gap-4">
                <button className="bg-black text-white rounded-full px-7 py-3 text-lg">
                  Conocé más
                </button>
                <button className="bg-black text-white rounded-full px-7 py-3 text-lg">
                  Simula tu renta
                </button>
                <button className="bg-black text-white rounded-full px-7 py-3 text-lg">
                  Asesorate sin costo
                </button>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="absolute w-[350px] h-[400px] top-[316px] right-[138px]">
            <div className="bg-black rounded-[19px] p-6 w-full h-full">
              <div className="text-center">
                <h3 className="text-white text-xl mb-4">Contacto Rápido</h3>
                <div className="border-t border-white w-full mb-6"></div>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <label className="text-white text-xl mb-2 block">Nombre</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#121212] rounded-[20px] h-12 text-white px-4" 
                  />
                </div>
                
                <div className="text-center">
                  <label className="text-white text-xl mb-2 block">Cel</label>
                  <input 
                    type="tel" 
                    className="w-full bg-[#121212] rounded-[20px] h-12 text-white px-4" 
                  />
                </div>
                
                <div className="text-center">
                  <label className="text-white text-xl mb-2 block">Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-[#121212] rounded-[20px] h-12 text-white px-4" 
                  />
                </div>
                
                <div className="text-center mt-8">
                  <button className="bg-[#3a7c7c] text-white rounded-lg px-6 py-2 text-xl">
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="relative w-full py-16 px-8">
          <h2 className="text-5xl font-bold mb-16">¿Qué es <span className="font-bold">Renta Personal</span>?</h2>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2">
              <div className="bg-[#6ea0a0] border border-black p-8 h-full">
                <h3 className="text-white text-3xl font-bold mb-8">Renta Inmediata</h3>
                <p className="text-white text-2xl">
                  Comienza a recibir pagos mensuales inmediatamente después de
                  realizar tu inversión inicial.
                </p>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <p className="text-black text-2xl mb-8">
                Es un producto de vida del <span className="font-bold">BSE</span> que asegura una renta mensual a partir de una edad determinada,
                brindándote seguridad económica a largo plazo.
              </p>
              
              <div className="bg-[#e6fffd] border border-black p-8 h-full">
                <h3 className="text-black text-3xl font-bold mb-8">Renta Diferida</h3>
                <p className="text-black text-2xl">
                  Programa tus pagos para comenzar en una fecha futura determinada,
                  ideal para planificar tu jubilación.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 mt-8">
            <div className="w-full md:w-1/2">
              <div className="bg-[#dbfdff] border border-black p-8 h-full">
                <h3 className="text-black text-3xl font-bold mb-8">Renta Garantizada</h3>
                <p className="text-black text-2xl">
                  Asegura un período mínimo de pagos para tus beneficiarios, incluso
                  en caso de fallecimiento.
                </p>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <div className="bg-white border border-black p-8 h-full">
                <h3 className="text-black text-3xl font-bold mb-8">Condiciones Básicas</h3>
                <p className="text-black text-2xl">
                  Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de
                  rescate.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="relative w-full py-16 px-8">
          <h2 className="text-6xl font-bold mb-16">Beneficios</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Respaldo Estatal</h3>
              <p className="text-sm max-w-[174px]">
                Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Protección Familiar</h3>
              <p className="text-sm max-w-[174px]">
                Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Flexibilidad</h3>
              <p className="text-sm max-w-[174px]">
                Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Estabilidad</h3>
              <p className="text-sm max-w-[174px]">
                Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Cobertura Global</h3>
              <p className="text-sm max-w-[174px]">
                Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-48 h-48 rounded-full bg-[#d9d9d9] mb-6"></div>
              <h3 className="text-2xl font-bold mb-4">Valor UI</h3>
              <p className="text-sm max-w-[174px]">
                Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimaComponent;