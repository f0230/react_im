import React from 'react';
import BlurText from './ui/TextBlur';
import LogoCloud from '../components/LogoCloud';


const DevelopmentHero = () => {
  return (
    <div className="w-full flex flex-col justify-center items-center text-center p-4">
      <BlurText
        text="Nuestro Portafolio de Desarrollo"
        delay={100}
        animateBy="words"
        className="text-4xl md:text-5xl font-bold mb-4"
      />
      <BlurText
        text="Aquí puedes ver algunos de los proyectos en los que hemos trabajado, combinando tecnologías de vanguardia como React, Supabase, Vercel y AI  para crear soluciones innovadoras."
        delay={50}
        animateBy="words"
        className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto"    
      />
      <LogoCloud />
    </div>
  );
};

export default DevelopmentHero;
