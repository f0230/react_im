import React, { useState } from "react";

export default function LandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleQuickContactSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log("Quick contact form submitted:", formData);
    alert("Gracias por contactarnos. Te responderemos a la brevedad.");
    setFormData({ name: "", phone: "", email: "" });
  };

  const handleSimulationButtonClick = () => {
    // Scroll to simulation section
    document.getElementById("simulation").scrollIntoView({ behavior: "smooth" });
  };

  const handleContactButtonClick = () => {
    // Scroll to contact section
    document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
  };

  // Example simulation data
  const simulationExample = {
    age: 45,
    initialInvestment: 1000000,
    startAge: 65,
    monthlyRent: 15000
  };

  // FAQ data
  const faqItems = [
    {
      question: "¿Qué es exactamente Renta Personal del BSE?",
      answer: "Es un producto de vida del Banco de Seguros del Estado que te garantiza una renta mensual a partir de una edad determinada, brindándote seguridad económica a largo plazo con respaldo estatal."
    },
    {
      question: "¿Desde qué edad puedo contratar este producto?",
      answer: "El producto puede contratarse a partir de los 18 años y hasta la edad máxima establecida en las condiciones particulares."
    },
    {
      question: "¿En qué moneda se contrata la Renta Personal?",
      answer: "La Renta Personal se contrata en Unidades Indexadas (UI), lo que protege tu inversión contra la inflación."
    },
    {
      question: "¿Qué sucede si fallezco durante el período de cobertura?",
      answer: "Dependiendo de la modalidad contratada, tus beneficiarios podrían recibir un capital por fallecimiento o continuar recibiendo la renta por un período garantizado."
    },
    {
      question: "¿Tiene valor de rescate este producto?",
      answer: "No, la Renta Personal del BSE no cuenta con valor de rescate."
    }
  ];

  // Add the JSX from your Anima index.jsx here
  // This will replace the existing component's return statement
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-blue-700 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
              <div className="h-8 w-8 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                BSE
              </div>
            </div>
            <span className="text-xl font-bold">Renta Personal</span>
          </div>
          <div className="hidden md:flex space-x-6">
            <a href="#what-is" className="hover:text-blue-200">¿Qué es?</a>
            <a href="#benefits" className="hover:text-blue-200">Beneficios</a>
            <a href="#conditions" className="hover:text-blue-200">Condiciones</a>
            <a href="#simulation" className="hover:text-blue-200">Simulación</a>
            <a href="#contact" className="hover:text-blue-200">Contacto</a>
          </div>
          <div className="md:hidden">
            {/* Mobile menu button */}
            <button className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Renta Personal del BSE: Seguridad a largo plazo con respaldo estatal
            </h1>
            <p className="text-lg mb-8">
              Asegura tu futuro económico con un producto que te garantiza una renta fija mensual. Respaldo, seguridad y tranquilidad para tu jubilación.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => document.getElementById("what-is").scrollIntoView({ behavior: "smooth" })} className="bg-white text-blue-700 px-6 py-2 rounded-full font-medium hover:bg-blue-100 transition">
                Conocé más
              </button>
              <button onClick={handleSimulationButtonClick} className="bg-white text-blue-700 px-6 py-2 rounded-full font-medium hover:bg-blue-100 transition">
                Simulá tu renta
              </button>
              <button onClick={handleContactButtonClick} className="bg-blue-900 text-white px-6 py-2 rounded-full font-medium border border-white hover:bg-blue-800 transition">
                Asesorate sin costo
              </button>
            </div>
          </div>
          
          {/* Quick Contact Form */}
          <div className="md:w-1/2 md:pl-8">
            <div className="bg-white text-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-blue-700">Contacto Rápido</h3>
              <form onSubmit={handleQuickContactSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Nombre</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required 
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">Celular</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required 
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium mb-1">E-mail</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required 
                  />
                </div>
                <button type="submit" className="w-full bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Rest of your component sections */}
      {/* What is Renta Personal Section */}
      <section id="what-is" className="py-16 bg-gray-50">
        {/* Content from your Anima export */}
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16">
        {/* Content from your Anima export */}
      </section>

      {/* Additional sections... */}

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-10">
        {/* Footer content from your Anima export */}
      </footer>
    </div>
  );
}