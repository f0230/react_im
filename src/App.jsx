import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useInView } from "react-intersection-observer";

import Navbar from "@/components/Navbar";
import StepperModal from "@/components/StepperModal"; // ✅ Modal global

// Lazy loaded components
const LazyFooter = lazy(() => import('./components/Footer'));
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Services = lazy(() => import("@/pages/Services"));

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      setFooterVisible(true);
    }
  }, [inView]);

  return (
    <Router>
      <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-grow md:pt-[45px]">
          <Suspense>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/servicios" element={<Services />} />
            </Routes>
          </Suspense>
        </main>

        {/* 🔻 Trigger invisible para activar el Footer */}
        <div
          ref={ref}
          className="absolute bottom-0 w-full h-10 pointer-events-none"
        />

        {/* ✅ Footer lazy cargado al estar en viewport */}
        {footerVisible && (
          <Suspense fallback={null}>
            <LazyFooter setIsModalOpen={setIsModalOpen} />
          </Suspense>
        )}

        {/* ✅ Modal montado globalmente */}
        <StepperModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </Router>
  );
};

export default App;
