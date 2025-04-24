import React, { useState } from "react";

export default function LandingPage() {
  const [age, setAge] = useState(30);
  const [monthly, setMonthly] = useState(100);
  const [paymentYears, setPaymentYears] = useState(10);
  const [showResults, setShowResults] = useState(false);
  
  // Cálculo simplificado de la renta estimada
  const calculateMonthlyIncome = () => {
    // Simulamos un cálculo básico, deberías reemplazar esto
    // con tus propios cálculos actuariales más precisos
    const totalContribution = monthly * 12 * paymentYears;
    const interestFactor = Math.pow(1.04, paymentYears); // Tasa de 4% anual
    const estimatedTotal = totalContribution * interestFactor;
    
    // Calculamos una renta mensual aproximada asumiendo 20 años de retiro
    const monthlyIncome = estimatedTotal / (12 * 20);
    return monthlyIncome.toFixed(2);
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const handleWhatsApp = () => {
    const message = `Hola, quiero una cotización para Renta Personal. Tengo ${age} años y puedo aportar ${monthly} USD mensuales durante ${paymentYears} años.`;
    window.open(`https://wa.me/598XXXXXXXX?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-blue-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">Renta Personal BSE</div>
          <button 
            onClick={handleWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full flex items-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Contactar
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">Planificá tu futuro con Renta Personal</h1>
          <p className="text-xl text-gray-700 mb-8">
            Asegurá una renta mensual garantizada o vitalicia haciendo aportes mensuales. 
            Una opción simple, segura y respaldada por el Banco de Seguros del Estado.
          </p>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-blue-800 mb-4">Simulador de Renta</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Tu edad</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  min={18}
                  max={80}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Aporte mensual (USD)</label>
                <input
                  type="number"
                  value={monthly}
                  onChange={(e) => setMonthly(parseInt(e.target.value))}
                  min={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Años de aporte</label>
                <input
                  type="number"
                  value={paymentYears}
                  onChange={(e) => setPaymentYears(parseInt(e.target.value))}
                  min={5}
                  max={40}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={handleCalculate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-300"
            >
              Calcular mi Renta
            </button>
            
            {showResults && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-xl font-bold text-blue-800 mb-2">Resultado de la simulación</h3>
                <p className="text-gray-700">Con un aporte mensual de <span className="font-bold">${monthly} USD</span> durante <span className="font-bold">{paymentYears} años</span>, podrías recibir una renta mensual estimada de:</p>
                <p className="text-3xl font-bold text-blue-900 my-4">${calculateMonthlyIncome()} USD</p>
                <p className="text-sm text-gray-600">Esta es una estimación basada en una tasa de retorno anual del 4-5%.</p>
                <button
                  onClick={handleWhatsApp}
                  className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full flex items-center justify-center mx-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  Hablar con un asesor
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Beneficios de Renta Personal BSE</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Renta Garantizada</h3>
              <p className="text-gray-600">Obtené una renta mensual garantizada por BSE, independientemente de las fluctuaciones del mercado.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Rentabilidad Competitiva</h3>
              <p className="text-gray-600">Rentabilidad proyectada del 4-5% anual, superior a muchas alternativas tradicionales de ahorro.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Respaldo del Estado</h3>
              <p className="text-gray-600">Tu inversión está respaldada por el Banco de Seguros del Estado, lo que brinda máxima seguridad.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Preguntas Frecuentes</h2>
          
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-blue-800 mb-2">¿Cómo funciona Renta Personal?</h3>
              <p className="text-gray-700">Realizás aportes mensuales durante un período determinado (fase de acumulación). Al finalizar, podés optar por recibir una renta mensual garantizada o vitalicia.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-blue-800 mb-2">¿Cuál es el aporte mínimo?</h3>
              <p className="text-gray-700">Podés comenzar con aportes desde 50 USD mensuales, adaptándose a tus posibilidades financieras.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-blue-800 mb-2">¿Puedo retirar mi dinero antes?</h3>
              <p className="text-gray-700">Sí, existe la posibilidad de rescate anticipado bajo ciertas condiciones. Te recomendamos consultar con un asesor para conocer los detalles específicos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-800 text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">¿Listo para asegurar tu futuro financiero?</h2>
          <p className="text-xl mb-8">Nuestros asesores están disponibles para responder todas tus dudas y ayudarte a comenzar.</p>
          <button 
            onClick={handleWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg flex items-center mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Contactar por WhatsApp
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto">
          <div className="text-center">
            <p className="mb-4">© {new Date().getFullYear()} Renta Personal - Banco de Seguros del Estado</p>
            <p className="text-sm text-gray-400">
              La información proporcionada tiene carácter ilustrativo. Las proyecciones son estimaciones basadas en el rendimiento histórico y no garantizan resultados futuros.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}