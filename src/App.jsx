import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useInView } from "react-intersection-observer";

import Navbar from "@/components/Navbar";

// Lazy load de Footer y páginas
const LazyFooter = lazy(() => import("@/components/Footer"));
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Services = lazy(() => import("@/pages/Services"));

function App() {
  const { ref, inView } = useInView({ triggerOnce: true });
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      setFooterVisible(true);
    }
  }, [inView]);

  return (
    <Router>
      <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative">
        <Navbar />

        <main className="md:pt-[45px]">
          <Suspense>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/servicios" element={<Services />} />
            </Routes>
          </Suspense>
        </main>

        {/* 🔻 Trigger visual para activar footer */}
        <div ref={ref} className="w-full h-10" />

        {footerVisible && (
          <Suspense fallback={null}>
            <LazyFooter />
          </Suspense>
        )}
      </div>
    </Router>
  );
}

export default App;
