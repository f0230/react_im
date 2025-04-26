// src/App.jsx
import React from "react";
import AnimaComponent from "./components/AnimaComponent";

function App() {
  console.log('App component rendered');
  return (
    <div className="bg-white">
      <AnimaComponent />
    </div>
  );
}

export default App;