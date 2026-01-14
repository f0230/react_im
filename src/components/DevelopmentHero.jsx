import React from 'react';
import BlurText from './ui/TextBlur';
import LogoCloud from '../components/LogoCloud';
import { useTranslation } from "react-i18next";


const DevelopmentHero = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col justify-center items-center text-center p-4">
      <BlurText
        text={t("development.hero.title")}
        delay={100}
        animateBy="words"
        className="text-4xl md:text-5xl font-bold mb-4"
      />
      <BlurText
        text={t("development.hero.description")}
        delay={50}
        animateBy="words"
        className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto"
      />
      <LogoCloud />
    </div>
  );
};

export default DevelopmentHero;
