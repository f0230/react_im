import React from "react";
import Noise from './ui/Noise';



const Section7 = () => {
    return (
        
        <div className="bg-black text-white flex flex-col justify-center items-center w-full h-screen mx-auto"
        
            style={{
                backgroundImage: "url('/src/assets/compu_fondo.webp')",
            }}>

            <Noise
                patternSize={250}
                patternScaleX={1}
                patternScaleY={1}
                patternRefreshInterval={4}
                patternAlpha={40}
            /> 
            
            <div className="relative z-10 w-full mx-auto h-full flex items-center justify-center">

               
                <div className="m-auto text-center w-[320px] md:w-[600px]">
                    
                <h1 className="x-auto font-product font-normal text-[30px] sm:text-5xl md:text-60px leading-none mb-8">Planes que se adaptan</h1>
                
                <p className="font-product font-normal leading-[1.2]">  Nos adaptamos a tus necesidades y presupuesto. Creemos que, sin importar el alcance del proyecto, siempre podemos trabajar juntos para obtener resultados excepcionales. Nuestro enfoque flexible y comprometido garantiza que cada detalle se ajuste a tus expectativas, asegurando que logremos el mejor resultado, sin comprometer la calidad ni la innovación</p>
                    <div className="mt-4 md:mt-8 inline-block space-x-1 md:space-x-2 lg:space-x-3">
                        <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-skyblue text-white rounded-[37px]  hover:bg-skyblue/95 hover:text-white transition duration-300">
                            Contactanos
                        </button>
                        <button className="text-[12px] md:text-[17px] w-[114px] h-[34px] md:w-[165px] md:h-[42px] bg-white text-skyblue rounded-[37px]  hover:bg-white/95 hover:text-skyblue transition duration-300">
                            Más info
                        </button>
                    </div>         
           </div>
            </div>
           
            </div>
        
    );
};

export default Section7;