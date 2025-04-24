import React, { useState } from "react";

export default function LandingPage() {
  const [age, setAge] = useState(30);
  const [monthly, setMonthly] = useState(100);
  const [paymentYears, setPaymentYears] = useState(10);
  const [showResults, setShowResults] = useState(false);
  
  const calculateMonthlyIncome = () => {
    const totalContribution = monthly * 12 * paymentYears;
    const interestFactor = Math.pow(1.04, paymentYears);
    const estimatedTotal = totalContribution * interestFactor;
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
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header - Negro minimalista estilo Vercel */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-sm bg-black/80 border-b border-gray-800">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <div className="text-xl font-bold tracking-tighter">Renta Personal<span className="text-blue-500">.</span></div>
          <button 
            onClick={handleWhatsApp}
            className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-md text-sm font-medium transition-all"
          >
            Contactar
          </button>
        </div>
      </header>

      {/* Hero Section - Estilo Minimalista Moderno */}
      <section className="container mx-auto pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-300">
              Planifica tu futuro financiero
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl">
              Una renta mensual garantizada o vitalicia respaldada por el Banco de Seguros del Estado. Simple, segura y eficiente.
            </p>
          </div>

        </div>
      </section>

      {/* Benefits Section - Estilo Moderno con Cards */}
      <section className="bg-gray-900 py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Beneficios de Renta Personal</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-black p-8 rounded-xl border border-gray-800 hover:border-blue-500 transition-all">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Renta Garantizada</h3>
                <p className="text-gray-400 text-sm">Recibe una renta mensual garantizada por BSE, independientemente de las fluctuaciones del mercado.</p>
              </div>
              
              <div className="bg-black p-8 rounded-xl border border-gray-800 hover:border-blue-500 transition-all">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Rentabilidad Competitiva</h3>
                <p className="text-gray-400 text-sm">Rentabilidad proyectada del 4-5% anual, superior a muchas alternativas tradicionales de ahorro.</p>
              </div>
              
              <div className="bg-black p-8 rounded-xl border border-gray-800 hover:border-blue-500 transition-all">
                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">Respaldo del Estado</h3>
                <p className="text-gray-400 text-sm">Tu inversión está respaldada por el Banco de Seguros del Estado, lo que brinda máxima seguridad.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Estilo Moderno */}
      <section className="container mx-auto py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Preguntas Frecuentes</h2>
          
          <div className="space-y-6">
            <div className="border-b border-gray-800 pb-6">
              <h3 className="text-xl font-semibold mb-3">¿Cómo funciona Renta Personal?</h3>
              <p className="text-gray-400">Realizás aportes mensuales durante un período determinado (fase de acumulación). Al finalizar, podés optar por recibir una renta mensual garantizada o vitalicia.</p>
            </div>
            
            <div className="border-b border-gray-800 pb-6">
              <h3 className="text-xl font-semibold mb-3">¿Cuál es el aporte mínimo?</h3>
              <p className="text-gray-400">Podés comenzar con aportes desde 50 USD mensuales, adaptándose a tus posibilidades financieras.</p>
            </div>
            
            <div className="border-b border-gray-800 pb-6">
              <h3 className="text-xl font-semibold mb-3">¿Puedo retirar mi dinero antes?</h3>
              <p className="text-gray-400">Sí, existe la posibilidad de rescate anticipado bajo ciertas condiciones. Te recomendamos consultar con un asesor para conocer los detalles específicos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Estilo Vercel */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 tracking-tight">¿Listo para asegurar tu futuro financiero?</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">Nuestros asesores están disponibles para responder todas tus dudas y ayudarte a comenzar.</p>
          <button 
            onClick={handleWhatsApp}
            className="bg-white text-blue-900 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg transition-all inline-flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>Contactar por WhatsApp</span>
          </button>
        </div>
      </section>

      {/* Footer - Estilo Minimalista */}
      <footer className="bg-black border-t border-gray-800 py-12 px-6">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="text-xl font-bold tracking-tighter mb-6">Renta Personal<span className="text-blue-500">.</span></div>
            <p className="mb-4 text-gray-400">© {new Date().getFullYear()} Banco de Seguros del Estado</p>
            <p className="text-xs text-gray-600 max-w-lg mx-auto">
              La información proporcionada tiene carácter ilustrativo. Las proyecciones son estimaciones basadas en el rendimiento histórico y no garantizan resultados futuros.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}