import React from 'react';
import ScrollVelocity from './ui/ScrollVelocity';

const MoreContent = () => {
  const technologies = [
    "Supabase • React • Next.js • Vercel •",
    " GitHub • Docker • AI • N8N • Resend •",

  ];
  return (
    <div className="w-full md:h-[500px] flex flex-col justify-center items-center text-center bg-white p-6">
      <div className="mb-40 w-full">
        <ScrollVelocity texts={technologies} />
      </div>
    
    </div>
  );
};

export default MoreContent;
