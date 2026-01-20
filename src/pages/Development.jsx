```
import React from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import DevelopmentHero from '../components/DevelopmentHero';
import ProjectCard from '../components/ProjectCard';
import developmentProjects from '../data/developmentProjects';
import MoreContent from '../components/MoreContent';
import { useTranslation } from "react-i18next";

const Development = () => {
  const { t } = useTranslation();
  return (
    <div className="font-product">
      <DevelopmentHero />
      <PageWrapper>
        <div className="md:grid-cols-2 grid gap-4 p-4 lg:p-0">
          {developmentProjects.map((project, index) => (
            <ProjectCard
              key={index}
              title={t(project.titleKey)}
              description={t(project.descriptionKey)}
              id={project.id}
            />
          ))}
          <MoreContent text={t("development.moreContent")} />
        </div>
      </PageWrapper>
    </div>
  );
};

export default Development;
```
