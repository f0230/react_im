import React from "react";
import SEO from "@/components/SEO";
import { AnimatedDots } from "@/components/ui/animated-dots";

const Colors = () => {
  return (
    <>
      <SEO
        title="Colors | Grupo DTE"
        description="Página de prueba para el componente AnimatedDots."
        url="https://www.grupodte.com/colors"
      />

      <main className="fixed inset-0 h-screen w-screen overflow-hidden">
        <AnimatedDots className="absolute inset-0 !h-full !w-full" />
      </main>
    </>
  );
};

export default Colors;
