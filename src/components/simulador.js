import React, { useState, useEffect } from 'react';

export default function Simulador({ initialAge, initialMonthly, initialYears, onContactClick }) {
  const [age, setAge] = useState(initialAge || 30);
  const [monthly, setMonthly] = useState(initialMonthly || 100);
  const [paymentYears, setPaymentYears] = useState(initialYears || 10);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  // Cálculo de la renta estimada
  useEffect(() => {
    // Esta es una fórmula simplificada para demostración
    // En producción, esto debería usar tus tablas actuariales precisas
    const totalContribution = monthly * 12 * paymentYears;
    const interestRate = 0.04; // 4% anual como mencionaste
    
    // Calculamos el monto acumulado con interés compuesto
    const accumulatedAmount = totalContribution * Math.pow((1 + interestRate), paymentYears);
    
    // Estimamos pago mensual (asumiendo 20 años de retiro)
    // En producción, usa los cálculos actuariales exactos
    const estimatedMonthly = accumulatedAmount / (12 * 20);
    
    setMonthlyIncome(estimatedMonthly.toFixed(2));
  }, [age, monthly, paymentYears]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">Simulador de Renta</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Tu edad</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 30)}
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
            onChange={(e) => setMonthly(parseInt(e.target.value) || 100)}
            min={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Años de aporte</label>
          <input
            type="number"
            value={paymentYears}
            onChange={(e) => setPaymentYears(parseInt(e.target.value) || 10)}
            min={5}
            max={40}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 my-6">
        <div className="text-center">
          <p className="text-lg text-gray-700">Renta mensual estimada:</p>
          <p className="text-4xl font-bold text-blue-900 my-3">${monthlyIncome} USD</p>
          <p className="text-sm text-gray-600">
            Esta es una estimación basada en una tasa de retorno anual del 4-5%. 
            Los resultados pueden variar según condiciones específicas.
          </p>
        </div>
      </div>
      
      <button
        onClick={() => onContactClick(age, monthly, paymentYears)}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        Consultar por WhatsApp
      </button>
    </div>
  );
}