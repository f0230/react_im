import { useState, useEffect, useRef } from 'react';
import StepperModal from '@/components/StepperModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function CleoWidget() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            const data = await res.json();
            const assistantMessage = { role: 'assistant', content: data.reply };
            setMessages([...updatedMessages, assistantMessage]);
        } catch (error) {
            console.error('Error al comunicar con Cleo:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Detectar si Cleo menciona agendar
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (
            lastMsg?.role === 'assistant' &&
            /reunión|agendar|agenda|cita|encontrémonos/i.test(lastMsg.content)
        ) {
            setShowForm(true);
        }
    }, [messages]);

    // Scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <>
            {/* BOTÓN FLOTANTE CLEO */}
            <AnimatePresence>
                {!isChatOpen && (
                    <motion.button
                        onClick={() => setIsChatOpen(true)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, delay: 1 }}
                        className="fixed bottom-4 left-4 z-50 bg-black text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
                    >
                        👋 ¡Hola! Soy Cleo
                    </motion.button>
                )}
            </AnimatePresence>

            {/* CHATBOX CLEO */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        className="fixed bottom-4 left-4 z-50 w-full max-w-sm bg-white rounded-xl shadow-xl border p-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-bold">Charlá con Cleo ✨</h2>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="text-gray-500 hover:text-black"
                                aria-label="Cerrar"
                            >
                                ✖
                            </button>
                        </div>

                        <div className="space-y-2 h-64 overflow-y-auto text-sm pr-1">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`px-2 py-1 rounded-md ${m.role === 'user'
                                        ? 'text-right bg-black text-white ml-auto w-fit'
                                        : 'text-left bg-gray-100 text-gray-800 mr-auto w-fit'
                                        }`}
                                >
                                    <p><strong>{m.role === 'user' ? 'Vos' : 'Cleo'}:</strong> {m.content}</p>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="flex mt-3 gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="¿En qué te ayudo?"
                                className="flex-1 border rounded px-3 py-2 text-sm"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className="bg-black text-white px-4 py-2 rounded text-sm"
                                disabled={isLoading}
                            >
                                {isLoading ? '...' : 'Enviar'}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FORMULARIO DE AGENDAMIENTO */}
            <StepperModal isOpen={showForm} onClose={() => setShowForm(false)} />
        </>
    );
}
