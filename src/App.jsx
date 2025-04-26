// src/App.jsx
import React from "react";
import { Hero } from "./components/Hero.jsx"; // Añadir .jsx explícitamente
import { About } from "./components/About.jsx";
import { Benefits } from "./components/Benefits.jsx";

function App() {
  console.log('App component rendered');
  return (
    <div className="bg-white">
      <Hero />
      <About />
      <Benefits />
    </div>
  );
}

export default App;