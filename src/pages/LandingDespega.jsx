// src/pages/LandingDespega.jsx
import React, { useState } from 'react';
import OptimizedImage from '@/components/OptimizedImage';

import Navbar from "@/components/Navbar";
import bgHeroVideo from '@/assets/hero-video-loop.mp4'; // usar imagen si no hay video

import Aurora from '@/components/ui/Aurora';

const LandingDespega = () => {
    const [formData, setFormData] = useState({});

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // manejar envío a CRM o API
        console.log('Form data:', formData);
    };

    return (
     
        <div className="font-product">
            <Navbar />

            {/* Hero Section */}
            <section className="relative h-[100vh] flex items-center justify-center text-center text-white overflow-hidden">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover grayscale"
                >
                    <source src={bgHeroVideo} type="video/mp4" />
                </video>
                <div className="absolute inset-0 " />
                <div className="relative z-10 max-w-3xl px-4">
                    <h1 className="text-4xl md:text-6xl font-bold">DTE lo hace. <br></br> Y ahora lo hace mejor.</h1>
                    <p className="mt-4 text-xl md:text-2xl">Somos la agencia que transforma marcas con ideas que funcionan.</p>
                    <button
                        onClick={() => document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' })}
                        className="mt-6 bg-white text-black font-bold px-6 py-3 rounded-full hover:bg-gray-200"
                    >
                        🔘 Quiero que mi marca despegue
                    </button>
                </div>
            </section>

            {/* Subargumento */}
            <section className=" bg-black text-white py-20 px-6 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">En DTE no hacemos marketing vacío.</h2>
                <p className="text-xl max-w-3xl mx-auto">Hacemos diseño, estrategia y contenido que venden.</p>
                <p className="text-white/70 mt-4 max-w-3xl mx-auto">
                    Después de años de trabajo, volvimos más profesionales, más ágiles, más creativos.<br />
                    Y lo mejor: con un equipo que ejecuta ideas reales, no solo las dibuja.
                </p>
            </section>

     

            {/* Beneficio directo */}
            <section className="bg-violet-700 text-white py-20 px-6 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">💡 ¿Querés saber qué haríamos con tu marca?</h2>
                <p className="text-lg max-w-xl mx-auto">
                    Te regalamos una sesión creativa 100% personalizada.<br />
                    Sin compromiso. Solo valor.
                </p>
            </section>

            {/* Formulario */}
            <section id="formulario" className="py-20 px-6 bg-white text-black">
                <h3 className="text-3xl font-bold text-center mb-8">🚀 Tu despegue empieza acá.</h3>
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto grid gap-4">
                    <input name="nombre" onChange={handleChange} required placeholder="Tu nombre" className="input" />
                    <input name="marca" onChange={handleChange} required placeholder="Nombre de tu marca" className="input" />
                    <input name="web" onChange={handleChange} placeholder="Web o redes sociales" className="input" />
                    <textarea name="objetivo" onChange={handleChange} placeholder="¿Qué te gustaría lograr?" rows="4" className="input" />
                    <input name="email" type="email" onChange={handleChange} required placeholder="Email" className="input" />
                    <input name="whatsapp" onChange={handleChange} placeholder="WhatsApp" className="input" />
                    <button type="submit" className="bg-black text-white py-3 px-6 rounded-full font-bold hover:bg-gray-800">
                        Quiero mi sesión creativa gratuita
                    </button>
                </form>
            </section>

            
        </div>
    );
};

export default LandingDespega;
