import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StepperModal from '@/components/StepperModal';

const chatConfig = {
    appointmentTriggers: /\b(reunión|agendar|cita|coordinar una reunión|agendamos una cita|charlemos sobre tu proyecto)\b/i,
    confirmTriggers: /\b(sí|si|dale|ok|agendemos|quiero agendar|hagámoslo|perfecto|genial|vamos a agendar)\b/i,
    suggestionTriggers: /\b(agendar cita|quiero agendar|coordinemos una reunión|charlar sobre pymes|cita|reunión)\b/i,
};

const useModalLogic = (messages, setMessages) => {
    const [modalState, setModalState] = useState({ isOpen: false, trigger: null });
    const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
    const [modalCooldown, setModalCooldown] = useState(false);
    const [isConversationPaused, setIsConversationPaused] = useState(false);
    const [hasSuggestedAppointment, setHasSuggestedAppointment] = useState(false);

    const openModal = useCallback((trigger) => {
        if (modalState.isOpen || modalCooldown) return;

        setIsConversationPaused(true);
        setModalCooldown(true);

        setTimeout(() => {
            setModalState({ isOpen: true, trigger });
        }, 3000);

        setTimeout(() => setModalCooldown(false), 8000);
    }, [modalState.isOpen, modalCooldown]);

    const closeModal = useCallback((wasSubmitted = false) => {
        setModalState({ isOpen: false, trigger: null });
        setWaitingForConfirmation(false);
        setIsConversationPaused(false);

        const message = wasSubmitted
            ? '¡Gracias por completar el formulario! ¿En qué más te puedo ayudar?'
            : 'Entendido, no coordinamos por ahora. Si cambiás de idea, decime 😊';

        setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
    }, [setMessages]);

    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        const secondLastMsg = messages[messages.length - 2];

        if (!lastMsg || modalState.isOpen) return;

        const isLastMessageConfirmationRequest =
            lastMsg.role === 'assistant' &&
            lastMsg.content === '¿Querés coordinar una reunión ahora? Decí "sí" o "agendemos".';

        if (isLastMessageConfirmationRequest || waitingForConfirmation || hasSuggestedAppointment) return;

        const isSecondLastMessageConfirmationRequest =
            secondLastMsg?.role === 'assistant' &&
            secondLastMsg?.content === '¿Querés coordinar una reunión ahora? Decí "sí" o "agendemos".';

        if (
            lastMsg.role === 'assistant' &&
            chatConfig.appointmentTriggers.test(lastMsg.content) &&
            !isSecondLastMessageConfirmationRequest
        ) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '¿Querés coordinar una reunión ahora? Decí "sí" o "agendemos".' },
            ]);
            setWaitingForConfirmation(true);
            setHasSuggestedAppointment(true);
        } else if (lastMsg.role === 'user' && chatConfig.confirmTriggers.test(lastMsg.content) && waitingForConfirmation) {
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: '¡Genial! Dame un segundo que estoy abriendo el formulario...'
            }]);

            setTimeout(() => {
                openModal('user');
            }, 3000);
            setWaitingForConfirmation(false);
        }
    }, [messages, modalState.isOpen, waitingForConfirmation, hasSuggestedAppointment, setMessages, openModal]);

    return { modalState, openModal, closeModal, isConversationPaused };
};

export default function CleoWidget() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { modalState, openModal, closeModal, isConversationPaused } = useModalLogic(messages, setMessages);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;

        const userMessage = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (isConversationPaused) {
                setMessages((prev) => [...prev, {
                    role: 'assistant',
                    content: 'Por favor, completá el formulario para agendar la reunión. Estoy esperando para continuar. 😊',
                }]);
                return;
            }

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] }),
            });

            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

            const { reply } = await res.json();
            if (typeof reply !== 'string' || !reply.trim()) throw new Error('Respuesta de API inválida');
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (error) {
            console.error('Error en sendMessage:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Lo siento, hubo un problema. ¿Podés intentarlo de nuevo?' },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, isConversationPaused]);

    const handleSend = useCallback(
        (e) => {
            e.preventDefault();
            sendMessage(input);
        },
        [input, sendMessage],
    );

    const handleSuggestion = useCallback(
        async (text) => {
            if (chatConfig.suggestionTriggers.test(text)) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'user', content: text },
                    { role: 'assistant', content: '¡Perfecto! 😊 Abrí el formulario para coordinar.' },
                ]);
                openModal('suggestion');
                return;
            }
            await sendMessage(text);
        },
        [openModal, sendMessage],
    );

    const openChat = useCallback(() => {
        setIsChatOpen(true);
    }, []);

    const closeChat = useCallback(() => {
        setIsChatOpen(false);
        closeModal(false); // cerrado manualmente
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
                                className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
}
