import React, { useState } from "react";
import ScrollVelocity from './ScrollVelocity'; // Asegúrate de que la ruta sea correcta

const Section7 = () => {


    const [velocity, setVelocity] = useState(80); // Define la velocidad para el componente ScrollVelocity

    return (
        <div className="w-full h-[300px] md:h-[500px] bg-white flex justify-center items-center">
            <div className="w-full md:w-[1080px] h-auto mt-1 sm:mt-0 overflow-hidden bg-white flex flex-col justify-center">
                <ScrollVelocity
                    texts={['Crecimiento', 'Desarrollo', 'Creatividad', 'Tecnologia', 'Estrategia']}
                    velocity={velocity}
          
                    numCopies={5} // Puedes ajustar el número de copias
                    damping={50}
                    stiffness={300} //
                    velocityMapping={{ input: [-300, 300], output: [-1, 1] }} // Ajusta el mapeo de velocidad si lo deseas
                />
    
               
            </div>
        </div>
    );
};

export default Section7;