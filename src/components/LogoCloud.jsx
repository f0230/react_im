import React from 'react';
import githubLogo from '../assets/Logos/GitHub_Lockup_Dark.svg';
import supabaseLogo from '../assets/Logos/supabase-logo-wordmark--light.svg';
import vercelLogo from '../assets/Logos/vercel-logotype-light.svg';

const LogoCloud = () => {
  return (
    <div className=" py-16">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-8">Un Mundo de Posibilidades</h2>
        <div className="flex justify-center items-center space-x-8">
          <img src={githubLogo} alt="GitHub Logo" className="h-8 md:h-12 max-w-full" />
          <span className="text-2xl md:text-4xl text-white">+</span>
          <img src={supabaseLogo} alt="Supabase Logo" className="h-8 md:h-12 max-w-full" />
          <span className="text-2xl md:text-4xl text-white">+</span>
          <img src={vercelLogo} alt="Vercel Logo" className="h-8 md:h-12 max-w-full" />
        </div>
      </div>
    </div>
  );
};

export default LogoCloud;
