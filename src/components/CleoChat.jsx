import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepperModal from '@/components/StepperModal';

const CleoWidget = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, trigger: null });
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

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] }),
            });

            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

            const { reply } = await res.json();
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err) {
            console.error('Error en sendMessage:', err);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Lo siento, hubo un problema. ¿Podés intentarlo de nuevo?' },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, openModal]);

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
                        className="fixed bottom-4 left-4 z-50 bg-black text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
                        aria-label="Open chat with Cleo"
                    >
                        👋 ¡Hola! Soy Cleo
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
                        className="fixed bottom-4 left-4 z-50 w-full max-w-sm bg-white rounded-xl shadow-xl border p-4"
                        role="dialog"
                        aria-labelledby="chat-title"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h2 id="chat-title" className="text-lg font-bold">Charlá con Cleo ✨</h2>
                            <button
                                onClick={closeChat}
                                className="text-gray-500 hover:text-black"
                                aria-label="Close chat"
                            >
                                ✖
                            </button>
                        </div>

                        <div className="space-y-2 h-64 overflow-y-auto text-sm pr-1">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={`${m.role}-${i}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`px-2 py-1 rounded-md ${m.role === 'user'
                                        ? 'text-right bg-black text-white ml-auto w-fit'
                                        : 'text-left bg-gray-100 text-gray-800 mr-auto w-fit'
                                        }`}
                                >
                                    <p>
                                        <strong>{m.role === 'user' ? 'Vos' : 'Cleo'}:</strong> {m.content}
                                    </p>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="flex mt-3 gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="¿En qué te ayudo?"
                                className="flex-1 border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-black"
                                disabled={isLoading}
                                aria-label="Message input"
                            />
                            <button
                                type="submit"
                                className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {isLoading ? '...' : 'Enviar'}
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
