// src/components/ContactForm.jsx
import React from "react";

export const ContactForm = () => {
  return (
    <div className="bg-black rounded-lg p-6 w-full max-w-[350px] mx-auto">
      <h3 className="text-white text-xl text-center mb-4">Contacto Rápido</h3>
      
      <img 
        className="w-full max-w-[299px] h-[3px] mx-auto mb-4" 
        alt="Divider" 
        src={vector4} 
      />
      
      <div className="space-y-6">
        <div className="text-center">
          <label className="text-white text-xl mb-2 block">Nombre</label>
          <input 
            type="text" 
            className="w-full bg-[#121212] rounded-[20px] h-12 text-white px-4" 
          />
        </div>
        
        <div className="text-center">
          <label className="text-white text-xl mb-2 block">Cel</label>
          <input 
            type="tel" 
            className="w-full bg-[#121212] rounded-[20px] h-12 text-white px-4" 
          />
        </div>
        
        <div className="text-center">
          <label className="text-white text-xl mb-2 block">Email</label>
          <input 
            type="email" 
            className="w-full bg-[#121212] rounded-[20px] h-12 text-white px-4" 
          />
        </div>
        
        <div className="text-center mt-8">
          <button className="bg-[#3a7c7c] text-white rounded-lg px-6 py-2 text-xl">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};