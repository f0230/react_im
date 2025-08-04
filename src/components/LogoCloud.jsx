import React from 'react';
import githubLogo from '../assets/Logos/GitHub_Lockup_Dark.svg';
import supabaseLogo from '../assets/Logos/supabase-logo-wordmark--light.svg';
import vercelLogo from '../assets/Logos/vercel-logotype-light.svg';

const LogoCloud = () => {
  return (
    <div className="py-12 sm:py-16  to-black">
      <div className="container mx-auto text-center px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 sm:mb-8">Un Mundo de Posibilidades</h2>
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 md:gap-6 animate-fade-in">
          <img 
            src={githubLogo} 
            alt="GitHub Logo" 
            className="h-6 sm:h-8 md:h-12 lg:h-16 transition-transform duration-300 hover:scale-110"
            title="GitHub: The largest platform for open source development"
          />
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white">+</span>
          <img 
            src={supabaseLogo} 
            alt="Supabase Logo" 
            className="h-6 sm:h-8 md:h-12 lg:h-16 transition-transform duration-300 hover:scale-110"
            title="Supabase: Open source Firebase alternative"
          />
          <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white">+</span>
          <img 
            src={vercelLogo} 
            alt="Vercel Logo" 
            className="h-6 sm:h-8 md:h-12 lg:h-16 transition-transform duration-300 hover:scale-110"
            title="Vercel: The platform for frontend developers"
          />
        </div>
      </div>
    </div>
  );
};

export default LogoCloud;
