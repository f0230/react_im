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

      {/* What is Renta Personal Section */}
      <section id="what-is" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">¿Qué es Renta Personal?</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <p className="text-lg mb-4">
                Es un producto de vida del BSE que asegura una renta mensual a partir de una edad determinada, brindándote seguridad económica a largo plazo.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-xl mb-2 text-blue-700">Renta Inmediata</h3>
                  <p>Comienza a recibir pagos mensuales inmediatamente después de realizar tu inversión inicial.</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-xl mb-2 text-blue-700">Renta Diferida</h3>
                  <p>Programa tus pagos para comenzar en una fecha futura determinada, ideal para planificar tu jubilación.</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-xl mb-2 text-blue-700">Renta Garantizada</h3>
                  <p>Asegura un período mínimo de pagos para tus beneficiarios, incluso en caso de fallecimiento.</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-xl mb-2 text-blue-700">Condiciones Básicas</h3>
                  <p>Edad mínima/máxima según el plan elegido, moneda en UI, sin valor de rescate.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">Beneficios</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="bg-blue-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Respaldo Estatal</h3>
              <p>Renta fija mensual garantizada por el Banco de Seguros del Estado.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="bg-blue-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Protección Familiar</h3>
              <p>Protección para herederos mediante la opción de "Renta Garantizada".</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="bg-blue-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Flexibilidad</h3>
              <p>Elección de beneficiarios y opciones como capital por fallecimiento.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="bg-blue-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Estabilidad</h3>
              <p>Pagos mensuales fijos que te permiten planificar tu futuro con certeza.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="bg-blue-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Cobertura Global</h3>
              <p>Cobertura sin límites geográficos, estés donde estés.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="bg-blue-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl mb-2">Valor UI</h3>
              <p>Contratación en Unidades Indexadas que protegen tu inversión contra la inflación.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conditions and Exclusions Section */}
      <section id="conditions" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">Condiciones y Exclusiones</h2>
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-xl mb-4 text-blue-700">Exclusiones Generales</h3>
            <p className="mb-6">El BSE es transparente sobre las situaciones en las que la cobertura no aplica:</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p>Conflictos armados, guerra civil o internacional.</p>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p>Suicidio durante el primer año de vigencia del seguro.</p>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p>Participación en actos delictivos.</p>
              </div>
            </div>

            <h3 className="font-bold text-xl mb-4 text-blue-700">Obligaciones del Asegurado</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Proporcionar información veraz en la solicitud del seguro.</p>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Mantener actualizada la información de contacto y beneficiarios.</p>
              </div>
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Cumplir con los procedimientos establecidos para reclamaciones.</p>
              </div>
            </div>
            
            <div className="mt-8 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm">
                <strong>Nota importante:</strong> Esta información es un resumen. Para conocer en detalle todas las condiciones y exclusiones, solicite las condiciones generales y particulares del producto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation Example Section */}
      <section id="simulation" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">Ejemplo Simulado</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="font-bold text-xl mb-4 text-blue-700">Caso de ejemplo</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Edad actual</p>
                    <p className="text-lg font-bold">{simulationExample.age} años</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Inversión inicial</p>
                    <p className="text-lg font-bold">UI {simulationExample.initialInvestment.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Edad de inicio de renta</p>
                    <p className="text-lg font-bold">{simulationExample.startAge} años</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Renta mensual estimada</p>
                    <p className="text-lg font-bold text-blue-700">UI {simulationExample.monthlyRent.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="mb-4">¿Querés saber cuánto podrías recibir según tu situación personal?</p>
                <button onClick={handleContactButtonClick} className="bg-blue-700 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-600 transition">
                  Solicitá una simulación personalizada
                </button>
              </div>
            </div>
            
            {/* Simple Simulation Form */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-bold text-xl mb-4 text-blue-700">Simulá tu renta</h3>
              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sim-age" className="block text-sm font-medium mb-1">Tu edad actual</label>
                    <input type="number" id="sim-age" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="sim-start-age" className="block text-sm font-medium mb-1">Edad para recibir la renta</label>
                    <input type="number" id="sim-start-age" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="sim-investment" className="block text-sm font-medium mb-1">Capital a invertir (UI)</label>
                    <input type="number" id="sim-investment" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="sim-type" className="block text-sm font-medium mb-1">Tipo de renta</label>
                    <select id="sim-type" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Renta inmediata</option>
                      <option>Renta diferida</option>
                      <option>Renta garantizada</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={handleContactButtonClick} className="w-full bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
                  Obtener simulación personalizada
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* About Your Advisor Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">Sobre tu asesor</h2>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 mb-6 md:mb-0 flex justify-center">
                  <div className="w-48 h-48 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="md:w-2/3 md:pl-8">
                  <h3 className="text-2xl font-bold mb-2 text-blue-700">Francisco Curbelo</h3>
                  <p className="text-gray-600 mb-4">Asesor especializado en Renta Personal del BSE</p>
                  <p className="mb-4">
                    Con más de 10 años de experiencia en el sector de seguros, te guiaré en la elección del mejor plan de Renta Personal adaptado a tus necesidades y objetivos financieros.
                  </p>
                  <div className="space-y-2">

                  <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Teléfono: 092 174 188</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Email: francisco@imseguros.uy</span>
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>WhatsApp: 092 174 188</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-bold text-xl mb-4 text-blue-700">Contacto</h3>
              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium mb-1">Nombre completo</label>
                    <input type="text" id="contact-name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-sm font-medium mb-1">Teléfono</label>
                    <input type="tel" id="contact-phone" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" id="contact-email" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium mb-1">Mensaje</label>
                  <textarea id="contact-message" rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required></textarea>
                </div>
                <div className="flex items-start">
                  <input type="checkbox" id="contact-consent" className="mt-1 mr-2" required />
                  <label htmlFor="contact-consent" className="text-sm">
                    Acepto recibir información sobre Renta Personal del BSE y autorizo el tratamiento de mis datos con fines comerciales.
                  </label>
                </div>
                <button type="button" className="w-full bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
                  Enviar mensaje
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>  

      {/* FAQ Section */}
      <section id="faq" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">Preguntas Frecuentes</h2>
          <div className="max-w-3xl mx-auto">
            {faqItems.map((item, index) => (
              <div key={index} className="mb-4 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-lg text-blue-700">{item.question}</h3>
                </div>
                <div className="p-4">
                  <p>{item.answer}</p>
                </div>
              </div>
            ))}
            
            <div className="mt-8 text-center">
              <p className="mb-4">¿Tenés más preguntas sobre el producto?</p>
              <button onClick={handleContactButtonClick} className="bg-blue-700 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition">
                Consultá con un asesor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center mr-2">
                  <div className="h-6 w-6 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    BSE
                  </div>
                </div>
                <span className="text-lg font-bold">Renta Personal BSE</span>
              </div>
              <p className="text-sm text-blue-200">
                Seguridad a largo plazo con respaldo estatal.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Enlaces rápidos</h4>
              <ul className="space-y-2 text-sm text-blue-200">
                <li><a href="#what-is" className="hover:text-white">¿Qué es Renta Personal?</a></li>
                <li><a href="#benefits" className="hover:text-white">Beneficios</a></li>
                <li><a href="#conditions" className="hover:text-white">Condiciones</a></li>
                <li><a href="#simulation" className="hover:text-white">Simulación</a></li>
                <li><a href="#contact" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contacto</h4>
              <div className="space-y-2 text-sm text-blue-200">
                <p>Teléfono: 092 174 188</p>
                <p>Email: francisco@imseguros.uy</p>
              </div>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-sm text-blue-300">
            <p className="mb-4">
              Este sitio web es únicamente informativo y no constituye una oferta contractual. Para obtener información detallada sobre el producto Renta Personal del BSE, consulta las condiciones generales y particulares del mismo.
            </p>
            <p>
              © {new Date().getFullYear()} - Todos los derechos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}