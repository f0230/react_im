// Section8.jsx optimizado con comentarios en línea
import React from "react";
import Noise from './ui/Noise'; // Componente que renderiza un efecto de ruido visual animado
import GaleriaScroll from '../components/GaleriaScroll'; // Galería horizontal tipo carrusel scrollable
import CompuFondo from '../assets/compu_fondo.webp'; // Imagen de fondo del hero

const Section8 = ({ onContactClick }) => {
    return (
        // Contenedor principal de la sección, con fuente personalizada y accesibilidad descriptiva
        <section className="w-full bg-black text-white font-product" aria-label="Planes personalizados">

            {/* HERO - bloque superior con fondo, texto y botones */}
            <header
                className="relative flex flex-col items-center justify-center h-[600px] md:h-[900px] w-full overflow-hidden"
                style={{
                    backgroundImage: `url(${CompuFondo})`, // Fondo principal hero
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Capa de overlay oscura con blur y patrón de ruido encima del fondo */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] mix-blend-soft-light" />
                    <Noise
                        patternSize={250} // Tamaño del patrón
                        patternScaleX={1} // Escala horizontal
                        patternScaleY={1} // Escala vertical
                        patternRefreshInterval={4} // Intervalo de refresco en frames
                        patternAlpha={40} // Transparencia
                    />
                </div>

                {/* Contenido textual y botones del hero */}
                <div className="relative z-10 text-center px-4 max-w-sm md:max-w-lg">
                    <h1 className="text-[30px] sm:text-5xl md:text-[60px] leading-none mb-6 md:mb-8 font-normal">
                        Planes que se adaptan
                    </h1>

                    <p className="text-base md:text-lg leading-[1.4] font-normal">
                        Nos adaptamos a tus necesidades y presupuesto. Creemos que, sin importar el alcance del proyecto, siempre podemos trabajar juntos para obtener resultados excepcionales...
                    </p>

                    {/* Botones principales: CTA de contacto y más información */}
                    <div className="mt-6 md:mt-10 flex justify-center gap-2 flex-wrap">
                        <button onClick={onContactClick} className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px] hover:bg-skyblue/95 transition">
                                Contactanos
                              </button>
                        <a href="#info" aria-label="Ver más información">
                            <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-full hover:bg-white/90 transition duration-300">
                                Más info
                            </button>
                        </a>
                    </div>
                </div>
            </header>

            {/* Galería tipo scroll horizontal que acompaña visualmente el hero */}
            <div className="relative w-full overflow-hidden bg-white">
                <GaleriaScroll />
            </div>
        </section>
    );
};

export default Section8;
