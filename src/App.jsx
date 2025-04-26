src/App.jsx
import React from "react";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Benefits } from "./components/Benefits";

function App() {
  return (
    <div className="bg-white">
      <Hero />
      <About />
      <Benefits />
    </div>
  );
}

export default App;