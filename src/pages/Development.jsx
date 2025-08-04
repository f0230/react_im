import React from 'react';
import ScrollStack, { ScrollStackItem } from '../components/ui/ScrollStack';
import ProjectCard from '../components/ProjectCard';
import DevelopmentHero from '../components/DevelopmentHero';
import MoreContent from '../components/MoreContent';
import LogoCloud from '../components/LogoCloud';
import ContactSection from '../components/ContactSection';
import developmentProjects from '../data/developmentProjects';

const Development = () => {
  return (
    <div className="max-w-[1440px] mx-auto">
      <DevelopmentHero />
      <ScrollStack>
        {developmentProjects.map((project) => (
          <ScrollStackItem key={project.id}>
            <ProjectCard project={project} />
          </ScrollStackItem>
        ))}
      </ScrollStack>
      <MoreContent />
      <LogoCloud />
      <ContactSection />
    </div>
  );
};

export default Development;