// App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingFallback from "@/components/ui/LoadingFallback";




const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Services = lazy(() => import("@/pages/Services"));
const LandingDespega = lazy(() => import("@/pages/LandingDespega"));
const Terminos = lazy(() => import("@/pages/TerminosCondiciones"));
const PoliticaPrivacidad = lazy(() => import("@/pages/PoliticaPrivacidad"));
const Development = lazy(() => import("@/pages/Development"));
const LandingDTE = lazy(() => import("@/pages/LandingDTE"));


const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback type="spinner" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Nosotros" element={<About />} />
          <Route path="/Contacto" element={<Contact />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/despega" element={<LandingDespega />} />
          <Route path="/tyc" element={<Terminos />} /> {/* ✅ este era el problema */}
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/desarrollo" element={<Development />} />
          <Route path="/dte" element={<LandingDTE />} />
        </Routes>
      </Suspense>
    </Router>

  );
};

export default App;