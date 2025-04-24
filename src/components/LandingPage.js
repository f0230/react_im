import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function LandingPage() {
  const [age, setAge] = useState(30);
  const [monthly, setMonthly] = useState(100);

  const handleWhatsApp = () => {
    const message = `Hola, quiero una cotización para Renta Personal. Tengo ${age} años y puedo aportar ${monthly} USD mensuales.`;
    window.open(`https://wa.me/598XXXXXXXX?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6 flex flex-col items-center">
      <section className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold mt-10">Planificá tu futuro con Renta Personal</h1>
        <p className="text-lg">Asegurá una renta mensual garantizada o vitalicia haciendo aportes mensuales. Una opción simple, segura y respaldada por el BSE.</p>
        <Card className="mt-6">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="block text-left mb-1">Tu edad</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={18}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-left mb-1">Aporte mensual (USD)</label>
              <Input
                type="number"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                min={1}
                className="w-full"
              />
            </div>
            <Button className="w-full" onClick={handleWhatsApp}>
              Cotizar por WhatsApp
            </Button>
          </CardContent>
        </Card>
        <p className="text-sm text-gray-600 mt-4">
          Rentabilidad proyectada de 4-5% anual. Producto respaldado por el Banco de Seguros del Estado.
        </p>
      </section>
    </div>
  );
}
