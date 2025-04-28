import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import bgMobileImg from "../assets/bg-1m.jpg"; // mobile
import bgDesktopImg from "../assets/bg-1-w.jpg"; // desktop

const HeroSection = () => {
  const [bgImage, setBgImage] = useState(bgMobileImg);

  useEffect(() => {
    const updateBackground = () => {
      if (window.innerWidth >= 768) { // md breakpoint en Tailwind
        setBgImage(bgDesktopImg);
      } else {
        setBgImage(bgMobileImg);
      }
    };

    updateBackground(); // Ejecutar al cargar

    window.addEventListener("resize", updateBackground); // Actualizar si cambia tamaño

    return () => {
      window.removeEventListener("resize", updateBackground); // limpiar eventListener
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      <motion.section
        className="relative w-full flex justify-center items-start px-2 sm:px-2 lg:px-2 z-10"
        initial={{ opacity: 0, y: 100, scale: 0.95, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{
          duration: 1.2,
          y: { type: "spring", stiffness: 100, damping: 15 },
          opacity: { duration: 0.8 },
          scale: { duration: 1, ease: [0.34, 1.56, 0.64, 1] },
          filter: { duration: 0.8 },
        }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div
          className="relative w-full max-w-[1372px] 
                      h-[500px] sm:h-[600px] md:h-[880px]
                      bg-no-repeat bg-cover
                      rounded-2xl sm:rounded-2xl md:rounded-3xl
                      bg-top sm:bg-top md:bg-center
                      overflow-hidden
                      shadow-2xl"
          style={{
            backgroundImage: `url(${bgImage})`,
            position: "relative",
            zIndex: 20,
          }}
        >
          {/* Contenido dentro del hero */}
          
        </div>
      </motion.section>
    </div>
  );
};

export default HeroSection;
