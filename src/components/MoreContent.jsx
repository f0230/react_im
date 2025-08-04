import React from 'react';
import ScrollVelocity from './ui/ScrollVelocity';

const MoreContent = () => {
  const technologies = [
    "Supabase • React • Next.js • Vercel •",
    " GitHub • Docker • AI • N8N • Resend •",

  ];
  return (
    <div className="w-full h-[1000px] flex flex-col justify-center items-center text-center bg-white p-4">
      <div className="mb-8 w-full">
        <ScrollVelocity texts={technologies} />
      </div>
      <h2 className="text-3xl font-bold mb-4">Más Allá de los Proyectos</h2>
      <p className="text-lg text-gray-700 max-w-3xl mx-auto">
        Esta es una nueva sección que aparece después de que la pila de proyectos se ha fijado.
        Aquí puedes añadir más información, un llamado a la acción o cualquier otro contenido
        que desees mostrar.
      </p>
    </div>
  );
};

export default MoreContent;
