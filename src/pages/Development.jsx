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
      <div className="relative w-full justify-center items-center flex h-[500px]">
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
 
        <MoreContent />

      
      <CleoWidget />
    </div>
  );
};

export default Development;
