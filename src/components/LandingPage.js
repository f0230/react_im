import React from "react";

export default function LandingPage() {
  const handleContactClick = () => {
    window.open("mailto:info@grupodto.com", "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="bg-white text-black p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-6 w-6 bg-red-500 rounded-full mr-1"></div>
            <span className="text-xl font-bold">DTE</span>
          </div>
          <div className="text-sm">
            Contáctanos ahora - 092 174 188 - o al - info@grupodto.com
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto p-4">
        <div className="bg-green-500 rounded-3xl p-6 relative overflow-hidden">
          {/* Plus icon */}
          <div className="absolute top-4 right-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          
          {/* Main text */}
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <h1 className="text-5xl md:text-7xl font-bold mt-16 mb-2">
              <span className="text-black">impulsamos tu </span>
              <span className="text-black font-black">negocio</span>
            </h1>
            
            <p className="text-sm md:text-base text-black max-w-2xl mx-auto mt-4">
              Desarrollamos soluciones creativas, estratégicas y a medida para
              personas, pymes, startups o empresas que quieren dar el siguiente paso.
            </p>
            
            {/* Contact button */}
            <div className="mt-16 mb-8">
              <button 
                onClick={handleContactClick}
                className="bg-white text-black px-8 py-3 rounded-full font-medium"
              >
                No pierdas tiempo contáctanos
              </button>
            </div>
          </div>
          
          {/* Welcome box */}
          <div className="absolute bottom-8 left-8 bg-black text-white p-6 rounded-xl max-w-xs">
            <p className="text-2xl font-bold mb-2">
              Hola!<br />
              Bienvenido
            </p>
            <p className="text-sm mt-6">
              si tiene una<br />
              consulta<br />
              contáctenos
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}