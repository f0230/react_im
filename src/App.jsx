// App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingFallback from "@/components/ui/LoadingFallback";




const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Services = lazy(() => import("@/pages/Services"));
const LandingDespega = lazy(() => import("@/pages/LandingDespega"));
const Terminos = lazy(() => import("@/pages/TerminosCondiciones"));
const PoliticaPrivacidad = lazy(() => import("@/pages/PoliticaPrivacidad"));


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
            <Route path="tyc" element={<Terminos />} />
            <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          </Routes>



    </Suspense>

    </Router>
  );
};

export default App;