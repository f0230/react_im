import React from "react";
import Noise from './ui/Noise';
import GaleriaScroll from '../components/GaleriaScroll';

const Section7 = () => {
    return (
        <section className="w-full bg-black text-white font-product">
            {/* HERO */}
            <div
                className="relative flex flex-col items-center justify-center h-[600px] md:h-[900px] w-full overflow-hidden"
                style={{
                    backgroundImage: "url('/src/assets/compu_fondo.webp')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                {/* Efecto de ruido + blur */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] mix-blend-soft-light" />
                    <Noise
                        patternSize={250}
                        patternScaleX={1}
                        patternScaleY={1}
                        patternRefreshInterval={4}
                        patternAlpha={40}
                    />
                </div>

                {/* Contenido */}
                <div className="relative z-10 text-center px-4 w-[320px] md:w-[600px]">
                    <h1 className="text-[30px] sm:text-5xl md:text-[60px] leading-none mb-6 md:mb-8 font-normal">
                        Planes que se adaptan
                    </h1>
                    <p className="text-base md:text-lg leading-[1.4] font-normal">
                        Nos adaptamos a tus necesidades y presupuesto. Creemos que, sin importar el alcance del proyecto, siempre podemos trabajar juntos para obtener resultados excepcionales...
                    </p>

                    {/* Botones */}
                    <div className="mt-6 md:mt-10 flex justify-center gap-2 flex-wrap">
                        <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-full hover:bg-skyblue/90 transition duration-300">
                            Contactanos
                        </button>
                        <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-full hover:bg-white/90 transition duration-300">
                            Más info
                        </button>
                    </div>
                </div>
            </div>

            {/* Galería Scroll */}
            <div className="relative w-full overflow-hidden bg-white">
                <GaleriaScroll />
            </div>
        </section>
    );
};

export default Section7;
