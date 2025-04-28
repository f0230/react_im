// src/components/Hero.jsx
import React, { useState, useEffect } from 'react';

export const Hero = () => {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setAtTop(window.pageYOffset <= 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative">
      {/* Navbar flotante */}
      <div
        className={`fixed z-50 w-full max-w-2xl inset-x-0 mx-auto px-8 py-4 mt-4 rounded-full transform transition-all duration-1000 ease-in-out
          ${atTop ? 'max-w-2xl' : 'bg-black bg-opacity-90 backdrop-blur-xl max-w-4xl'}
        `}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between p-2 w-full mx-auto">
          <div className="flex flex-row items-center justify-between w-full">
            <span
              className={`font-bold tracking-tighter uppercase text-2xl transition-colors ${
                atTop ? 'text-black' : 'text-white'
              }`}
            >
              ✺ IM Seguros
            </span>

            {/* Aquí podrías agregar un botón hamburguesa si querés para móviles */}
          </div>

          {/* Navegación (visible en desktop) */}
          <nav className="hidden md:flex flex-grow justify-end gap-8 mt-4 md:mt-0">
            <a
              href="#"
              className={`transition-colors ${atTop ? 'text-black' : 'text-white'}`}
            >
              Inicio
            </a>
            <a
              href="#"
              className={`transition-colors ${atTop ? 'text-black' : 'text-white'}`}
            >
              Servicios
            </a>
            <a
              href="#"
              className={`transition-colors ${atTop ? 'text-black' : 'text-white'}`}
            >
              Contacto
            </a>
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white pt-40">
        <div className="px-8 py-24 text-center md:px-12 lg:px-24 lg:pt-64 text-zinc-500">
          <p className="max-w-xl mx-auto text-4xl font-medium text-black uppercase">
            Scroll to see effect
          </p>

          {/* Galería de imágenes */}
          <div className="grid grid-cols-1 gap-8 gap-y-28 mt-24 sm:grid-cols-1 max-w-2xl mx-auto">
            {[
              "https://i.pinimg.com/564x/eb/b3/bd/ebb3bd6c322463cee8b7b17659792830.jpg",
              "https://i.pinimg.com/564x/9b/0e/e1/9b0ee1146eba537b5b1e207928350e0f.jpg",
              "https://i.pinimg.com/564x/b6/91/52/b691526e863a332d1708eb1d9da0d403.jpg"
            ].map((src, idx) => (
              <a key={idx} href="#">
                <img
                  src={src}
                  className="duration-500 w-full rounded-3xl shadow hover:shadow-3xl hover:-translate-y-12"
                  alt={`Imagen ${idx + 1}`}
                />
              </a>
            ))}
          </div>
        </div>
      </div>


    </section>
  );
};

export default Hero;
