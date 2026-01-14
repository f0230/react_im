import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepperModal from '@/components/StepperModal';

const CleoWidget = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '¡Hola! 👋 Soy Cloe, tu asistente virtual de Grupo DTE. Estoy aquí para ayudarte con información sobre nuestros servicios, proyectos y responder cualquier consulta que tengas. ¿En qué puedo ayudarte hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, trigger: null });
    const [conversationId, setConversationId] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const openModal = useCallback((trigger) => {
        if (!modalState.isOpen) {
            setModalState({ isOpen: true, trigger });
        }
    }, [modalState.isOpen]);

    const closeModal = useCallback(() => {
        setModalState({ isOpen: false, trigger: null });
    }, []);

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;

        const userMessage = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const userRequestedForm = /\b(formulario|agendar|coordinar reunión|quiero hablar con alguien|necesito contacto)\b/i.test(text);

            if (userRequestedForm) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: '¡Claro! 😊 Abrí el formulario para coordinar.' }
                ]);
                openModal('user');
                return;
            }

            // Generar ID de conversación si no existe
            let currentConversationId = conversationId;
            if (!currentConversationId) {
                currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                setConversationId(currentConversationId);
            }

            // Intentar enviar a n8n primero, fallback a OpenAI
            let response;
            const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/cloe-chat';

            try {
                // Enviar a n8n
                const n8nResponse = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: currentConversationId,
                        message: text,
                        context: {
                            page: window.location.pathname,
                            timestamp: new Date().toISOString(),
                            previousMessages: messages.slice(-5) // Últimos 5 mensajes para contexto
                        }
                    }),
                });

                if (n8nResponse.ok) {
                    const n8nData = await n8nResponse.json();
                    response = n8nData.reply || n8nData.message || n8nData.response;
                } else {
                    throw new Error('N8N webhook failed');
                }
            } catch (n8nError) {
                console.log('N8N no disponible, usando OpenAI como fallback:', n8nError.message);

                // Fallback a OpenAI
                const openAIResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [...messages, userMessage],
                        conversationId: currentConversationId
                    }),
                });

                if (!openAIResponse.ok) throw new Error(`OpenAI HTTP error: ${openAIResponse.status}`);

                const openAIData = await openAIResponse.json();
                response = openAIData.reply;
            }

            if (response) {
                setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
            } else {
                throw new Error('No response received');
            }

        } catch (err) {
            console.error('Error en sendMessage:', err);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Lo siento, hubo un problema. ¿Podés intentarlo de nuevo?' },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, openModal, conversationId]);

    const handleSend = useCallback((e) => {
        e.preventDefault();
        sendMessage(input);
    }, [input, sendMessage]);

    const openChat = useCallback(() => setIsChatOpen(true), []);
    const closeChat = useCallback(() => {
        setIsChatOpen(false);
        closeModal();
    }, [closeModal]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const buttonVariants = useMemo(() => ({
        initial: { opacity: 0, scale: 0.8, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.2 } },
    }), []);

    const chatVariants = useMemo(() => ({
        initial: { opacity: 0, y: 50, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 50, scale: 0.95, transition: { duration: 0.2 } },
    }), []);

    return (
        <>
            <AnimatePresence>
                {!isChatOpen && (
                    <motion.button
                        key="cleo-button"
                        onClick={openChat}
                        variants={buttonVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="backdrop-blur-lg fixed bottom-4 left-4 z-50  text-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-2 text-[11px] hover:bg-gray-800 transition-all duration-300 transform hover:scale-105"
                        aria-label="Open chat with Cleo"
                    >
                        ¡Hola! Soy Cloe
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        key="cleo-chat"
                        variants={chatVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="fixed bottom-4 left-4 z-50 w-full max-w-[250px] rounded-xl shadow-2xl border border-gray-200 flex flex-col h-[450px] backdrop-blur-lg"
                        role="dialog"
                        aria-labelledby="chat-title"
                        style={{ background: 'none', backdropFilter: 'blur(12px)' }}
                    >
                        <div className="flex justify-between items-center p-4 bg-black/75 text-white rounded-t-xl shadow-md">
                            <h2 id="chat-title" className="text-xl font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                Charlá con Cloe
                            </h2>
                            <button
                                onClick={closeChat}
                                className="text-white backdrop-blur-lg  transition-colors duration-200 p-1 rounded-full "
                                aria-label="Close chat"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={`${m.role}-${i}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.05 }}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] px-4 py-2 rounded-lg shadow-md text-sm ${m.role === 'user'
                                        ? 'bg-gray-900 text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                        }`}
                                    >
                                        {m.content}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="flex p-4 bg-black/10 gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe tu mensaje..."
                                className="max-w-[155px] flex-1 border border-gray-300 rounded-full px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                                disabled={isLoading}
                                aria-label="Message input"
                            />
                            <button
                                type="submit"
                                className="bg-gray-900 text-white px-5 py-2 rounded-full text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalState.isOpen && (
                    <StepperModal
                        isOpen={modalState.isOpen}
                        onClose={closeModal}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default CleoWidget;
