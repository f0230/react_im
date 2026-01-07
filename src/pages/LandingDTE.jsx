import React from 'react';
import Navbar from "@/components/Navbar";
import bgHeroVideo from '@/assets/hero-video-loop.mp4';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, TrendingUp, Shield, Zap, Search, Clock, Users, Activity, BarChart } from 'lucide-react';

const LandingDTE = () => {
    const scrollToDiagnostico = () => {
        document.getElementById('diagnostico').scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="font-product bg-black text-white selection:bg-violet-500 selection:text-white">
            <Navbar />

            {/* 1. SECCIÓN HERO (El Gancho Irresistible) */}
            <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden">
                {/* Video de fondo con overlay */}
                <div className="absolute inset-0 z-0">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                    >
                        <source src={bgHeroVideo} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black" />
                </div>

                <div className="relative z-10 max-w-5xl px-6 pt-20">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-violet-500/20 text-violet-300 text-sm font-semibold mb-6 border border-violet-500/30 backdrop-blur-sm">
                            Intelligent Automation Systems
                        </span>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                            Deja de subir por la escalera <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                y súbete al ascensor.
                            </span>
                        </h1>
                        <p className="mt-8 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            Instalamos sistemas de <strong className="text-white">Intelligent Automation (IA)</strong> que permiten a tu empresa multiplicar sus ingresos sin aumentar sus costos operativos.
                        </p>

                        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a
                                href="https://wa.me/59899123456?text=Hola,%20quisiera%20un%20diagnóstico%20de%20escalabilidad"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative px-8 py-4 bg-white text-black font-bold rounded-full text-lg hover:bg-gray-100 transition-all flex items-center gap-2"
                            >
                                Obtener diagnóstico en WhatsApp
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                            <button
                                onClick={() => document.getElementById('metodo').scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-medium hover:bg-white/10 transition-all backdrop-blur-sm"
                            >
                                Ver cómo funciona
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 2. LA AGITACIÓN DEL PROBLEMA (El "Drama") */}
            <section className="py-24 px-6 bg-black relative">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            ¿Sientes que si no estás presente, <br />
                            <span className="text-red-500">tu negocio se detiene?</span>
                        </h2>
                        <p className="text-2xl text-gray-300 font-light">
                            Si tu empresa depende de que estés allí todos los días, <br className="hidden md:block" />
                            <strong className="text-white">no tienes un negocio, tienes un empleo.</strong>
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <div className="bg-red-950/20 border border-red-900/30 p-8 rounded-2xl">
                            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                                <Clock className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-red-200">Tiempo Perdido</h3>
                            <p className="text-gray-400">Tu equipo pierde el 40% del tiempo en problemas recurrentes y tareas manuales repetitivas.</p>
                        </div>
                        <div className="bg-red-950/20 border border-red-900/30 p-8 rounded-2xl">
                            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                                <TrendingUp className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-red-200">Falso Crecimiento</h3>
                            <p className="text-gray-400">Tus costos crecen al mismo ritmo que tus ventas. Estás creciendo en tamaño, no escalando en valor.</p>
                        </div>
                        <div className="bg-red-950/20 border border-red-900/30 p-8 rounded-2xl">
                            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-red-200">Apagando Incendios</h3>
                            <p className="text-gray-400">Vives solucionando urgencias operativas no planeadas. "Bájale dos rayitas al drama".</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. LA SOLUCIÓN (El Método DTE) */}
            <section id="metodo" className="py-24 px-6 bg-gradient-to-b from-zinc-900 to-black">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <span className="text-violet-400 font-bold tracking-widest uppercase text-sm">El Método DTE</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Ingeniería de Sistemas Locales</h2>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                            No vendemos software "enlatado". Construimos la infraestructura digital <br className="hidden md:block" />
                            para que tu empresa funcione de forma <span className="text-white font-semibold">predecible y autónoma</span>.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-20">
                        {['Talento', 'Marketing', 'Finanzas', 'Producto', 'Expansión'].map((item, index) => (
                            <div key={index} className="bg-white/5 border border-white/10 p-6 rounded-xl text-center hover:bg-white/10 transition-colors">
                                <div className="text-violet-400 font-bold mb-2">0{index + 1}</div>
                                <div className="font-semibold text-lg">{item}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h3 className="text-3xl font-bold mb-6">Diferenciador Tecnológico: <br /><span className="text-violet-400">Text2Workflow</span></h3>
                            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                                En sectores como el legal o seguros, el papeleo es abrumador. Nuestra IA utiliza <strong>Text2Workflow</strong> para traducir instrucciones en lenguaje natural directamente en flujos de trabajo ejecutables.
                            </p>
                            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 mb-8 font-mono text-sm relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                                <p className="text-gray-400 mb-2">// Tu instrucción:</p>
                                <p className="text-green-400 mb-4">"Procesar esta póliza y notificar al cliente"</p>
                                <p className="text-gray-400 mb-2">// Resultado DTE:</p>
                                <div className="space-y-1 text-blue-300 opacity-80">
                                    <p>→ Scanning document...</p>
                                    <p>→ Extracting entities...</p>
                                    <p>→ Updating CRM record...</p>
                                    <p>→ Sending WhatsApp confirmation...</p>
                                </div>
                            </div>
                            <p className="text-white font-medium">
                                No necesitas saber código, solo necesitas saber dirigir tu negocio.
                            </p>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
                            <div className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
                                <h4 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                    <Zap className="text-yellow-400" />
                                    IA como Co-piloto Estratégico
                                </h4>
                                <p className="text-gray-400 mb-6">
                                    Para 2026, la IA será el estándar. En DTE integramos capacidades cognitivas que aprenden de tu operación.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-violet-400 mt-1 shrink-0" />
                                        <span className="text-gray-300">Financieras: Automatización de análisis de riesgo.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-violet-400 mt-1 shrink-0" />
                                        <span className="text-gray-300">Transporte: Optimización de rutas basada en datos reales.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-violet-400 mt-1 shrink-0" />
                                        <span className="text-gray-300">Retail: Predicción de stock y demanda.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. INSPIRACIÓN DE TITANES (Social Proof) */}
            <section className="py-24 px-6 bg-black">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Tecnología con ADN Latino</h2>
                        <p className="text-xl text-gray-400">
                            El éxito no es suerte; es un camino metodológico que las empresas más valiosas ya han recorrido.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Caso 1 */}
                        <div className="group bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl hover:border-yellow-500/50 transition-colors">
                            <div className="h-12 flex items-center mb-6">
                                <h3 className="text-2xl font-bold text-yellow-500">Mercado Libre</h3>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-3">Confianza y Custodia</h4>
                            <p className="text-gray-400 text-sm mb-4">
                                Inyectamos sistemas de confianza en tus transacciones.
                            </p>
                            <p className="text-gray-500 text-xs italic border-t border-zinc-800 pt-4">
                                Ideal para financieras y aseguradoras que necesitan cobros impecables.
                            </p>
                        </div>
                        {/* Caso 2 */}
                        <div className="group bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl hover:border-white transition-colors">
                            <div className="h-12 flex items-center mb-6">
                                <h3 className="text-2xl font-bold text-white tracking-tighter">KAVAK</h3>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-3">Datos Masivos</h4>
                            <p className="text-gray-400 text-sm mb-4">
                                Uso de algoritmos para transparencia total y predicción de fallas.
                            </p>
                            <p className="text-gray-500 text-xs italic border-t border-zinc-800 pt-4">
                                Perfecto para flotas de transporte: mantenimiento preventivo real.
                            </p>
                        </div>
                        {/* Caso 3 */}
                        <div className="group bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl hover:border-blue-400 transition-colors">
                            <div className="h-12 flex items-center mb-6">
                                <h3 className="text-2xl font-bold text-blue-400">Betterfly</h3>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-3">Propósito y Productividad</h4>
                            <p className="text-gray-400 text-sm mb-4">
                                Convertimos procesos en experiencias, automatizando recompensas.
                            </p>
                            <p className="text-gray-500 text-xs italic border-t border-zinc-800 pt-4">
                                Eleva el rendimiento y la cultura de tu equipo.
                            </p>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-lg text-gray-300">
                            Profesionalizamos tu empresa para competir no solo en <span className="text-violet-400 font-bold">Paysandú</span>, sino en todo Uruguay y la región.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. EL PROCESO (Diagnóstico) */}
            <section id="diagnostico" className="py-24 px-6 bg-violet-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-violet-600 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8">Diagnóstico de 15 Minutos</h2>
                    <p className="text-xl text-violet-200 mb-12">
                        Si no identificamos un proceso que te ahorre al menos <strong className="text-white">10 horas semanales</strong>, el diagnóstico es gratis.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                            <div className="text-4xl mb-4">💬</div>
                            <h3 className="font-bold text-lg mb-2">1. Conexión</h3>
                            <p className="text-sm text-violet-100">Un clic en WhatsApp para iniciar sin burocracia.</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                            <div className="text-4xl mb-4">🤖</div>
                            <h3 className="font-bold text-lg mb-2">2. Triage IA</h3>
                            <p className="text-sm text-violet-100">Nuestro asistente identifica tu cuello de botella en segundos.</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
                            <div className="text-4xl mb-4">🗺️</div>
                            <h3 className="font-bold text-lg mb-2">3. Hoja de Ruta</h3>
                            <p className="text-sm text-violet-100">Plan de acción con "Números Inteligentes".</p>
                        </div>
                    </div>

                    <a
                        href="https://wa.me/59899123456?text=Quiero%20el%20diagnóstico%20gratuito%20de%2015%20minutos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-white text-violet-900 font-bold py-4 px-10 rounded-full text-lg hover:bg-gray-100 transition-transform hover:scale-105 shadow-xl"
                    >
                        Iniciar Diagnóstico Ahora
                        <ArrowRight className="w-6 h-6" />
                    </a>
                </div>
            </section>

            {/* 6. FOOTER / NÚMEROS CRÍTICOS */}
            <section className="py-20 px-6 bg-zinc-950 border-t border-zinc-900">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Activity className="text-violet-500" />
                            Domina tus "Números Críticos"
                        </h3>
                        <p className="text-gray-400 mb-8">
                            Dejamos de "sentir" para empezar a saber. Te entregamos tableros para monitorear:
                        </p>
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                                <Users className="w-5 h-5 text-gray-500" />
                                <div>
                                    <strong className="text-white block">CAC (Costo de Adquisición)</strong>
                                    <span className="text-sm text-gray-500">Cuánto te cuesta conseguir cada cliente.</span>
                                </div>
                            </li>
                            <li className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                                <BarChart className="w-5 h-5 text-gray-500" />
                                <div>
                                    <strong className="text-white block">LTV (Valor de Vida)</strong>
                                    <span className="text-sm text-gray-500">Cuánto valor genera cada cliente a largo plazo.</span>
                                </div>
                            </li>
                            <li className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-gray-500" />
                                <div>
                                    <strong className="text-white block">Eficiencia Operativa</strong>
                                    <span className="text-sm text-gray-500">Tiempo real ahorrado por automatización.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="flex flex-col justify-center items-start md:items-end text-left md:text-right">
                        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 max-w-md">
                            <h4 className="text-xl font-bold text-white mb-4">Apoyo a la Innovación</h4>
                            <p className="text-gray-400 mb-6">
                                Como empresa uruguaya, sabemos que existen instrumentos como las becas de la <strong className="text-white">ANII</strong>.
                            </p>
                            <p className="text-gray-400">
                                En DTE te ayudamos a postular y ser una empresa de vanguardia tecnológica.
                            </p>
                        </div>
                        <div className="mt-10 flex gap-6 text-gray-500 text-sm">
                            <span>© 2026 DTE. All rights reserved.</span>
                            <a href="#" className="hover:text-white">Privacidad</a>
                            <a href="#" className="hover:text-white">Términos</a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingDTE;
