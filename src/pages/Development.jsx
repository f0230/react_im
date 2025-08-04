import React from 'react';
import ScrollStack, { ScrollStackItem } from '../components/ui/ScrollStack';
import ProjectCard from '../components/ProjectCard';
import DevelopmentHero from '../components/DevelopmentHero';
import MoreContent from '../components/MoreContent';
import CleoWidget from '../components/CleoChat';
import Navbar from '../components/Navbar';
import developmentProjects from '../data/developmentProjects';

const Development = () => {

  return (
    <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative">
      <Navbar />
      <div className="relative w-full">
        <DevelopmentHero />
      </div>
      <div className="relative w-full">
        <ScrollStack>
          {developmentProjects.map((project) => (
            <ScrollStackItem key={project.id}>
              <ProjectCard project={project} />
            </ScrollStackItem>
          ))}
        </ScrollStack>
      </div>
      <div className="relative w-full">
        <MoreContent />
      </div>
  
      
      {/* Sección para conocer a Cloe */}
      <section className="py-16 ">
        <div className="container mx-auto px-4 text-center max-w-[1920px]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              ¿Conocés a <span className="text-transparent bg-clip-text bg-gray-900">Cloe</span>?
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Nuestro asistente virtual está aquí para ayudarte con cualquier pregunta sobre nuestros proyectos y servicios.
            </p>
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl">
              <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg ring-4 ring-gray-300 ring-opacity-50">
                {/* Placeholder for a more sophisticated Cloe icon/logo */}
                <span className="text-white font-bold text-3xl drop-shadow-md">C</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Cloe</h3>
              <p className="text-gray-600 mb-4 text-base">Asistente Virtual Inteligente</p>
              <button
                onClick={() => {
                  const cleoButton = document.querySelector('[aria-label="Open chat with Cleo"]');
                  if (cleoButton) cleoButton.click();
                }}
                className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {/* Optional: Add an icon here, e.g., <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 0 0018 4H2a2 2 0 00-.003 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg> */}
                Iniciar conversación
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <CleoWidget />
    </div>
  );
};

export default Development;
