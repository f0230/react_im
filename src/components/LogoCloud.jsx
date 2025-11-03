import React from 'react';
import githubLogo from '../assets/Logos/GitHub_Lockup_Dark.svg';
import supabaseLogo from '../assets/Logos/supabase-logo-wordmark--light.svg';
import vercelLogo from '../assets/Logos/vercel-logotype-light.svg';

const LogoCloud = () => {
  return (
    <div className=" to-black">
      <div className="container mx-auto text-center mt-10">
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-6 animate-fade-in">
          <img 
            src={githubLogo} 
            alt="GitHub Logo" 
            className="h-8 sm:h-8 md:h-12 lg:h-16 transition-transform duration-300 hover:scale-110"
            title="GitHub: The largest platform for open source development"
          />
          <img 
            src={supabaseLogo} 
            alt="Supabase Logo" 
            className="h-6 sm:h-8 md:h-12 lg:h-16 transition-transform duration-300 hover:scale-110"
            title="Supabase: Open source Firebase alternative"
          />
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
