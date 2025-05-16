import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Lazy load de las páginas
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));


function App() {
  return (
    <Router>
      <div className="w-full overflow-x-hidden max-w-[1920px] mx-auto relative">
        <Navbar />

        <main className="md:pt-[45px]">
          <Suspense >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </Suspense>
        </main>
          <Footer />

      </div>
    </Router>
  );
}

export default App;
