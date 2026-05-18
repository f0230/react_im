import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clipboard, Loader2, Mic, Minimize2, Send, Sparkles, Square, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateClientMessage, transcribeClientAudio } from '@/services/clientMessageAiService';
import { cn } from '@/lib/utils';

const OPEN_EVENT = 'dte:open-client-message-ai';

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Mandame una nota de voz o escribime la idea y te preparo un mensaje listo para el cliente.',
  },
];

const AiClientMessageChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [transcript, setTranscript] = useState('');
  const [clientContext, setClientContext] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages, isTranscribing, isGenerating]);

  const stopStream = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const handleAudioBlob = async (blob) => {
    if (!blob?.size) return;

    setIsTranscribing(true);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: 'Audio recibido. Transcribiendo...' },
    ]);

    try {
      const text = await transcribeClientAudio(blob);
      setTranscript(text);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: text || 'No pude detectar texto en el audio.' },
      ]);
    } catch (error) {
      toast.error(error?.message || 'No se pudo transcribir el audio');
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'No pude transcribir el audio. Probá grabar de nuevo o escribí la idea.' },
      ]);
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Tu navegador no permite grabar audio desde esta vista');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stopStream();
        handleAudioBlob(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopStream();
      toast.error('No pude acceder al micrófono');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setIsRecording(false);
  };

  const handleGenerate = async () => {
    const text = transcript.trim();
    if (!text) {
      toast.error('Grabá un audio o escribí la idea primero');
      return;
    }

    setIsGenerating(true);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text },
    ]);

    try {
      const output = await generateClientMessage({
        transcript: text,
        clientContext,
        tone: 'profesional cercano',
        channel: 'WhatsApp',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: output?.message || '',
          followUp: output?.followUp || '',
          isGenerated: true,
        },
      ]);
    } catch (error) {
      toast.error(error?.message || 'No se pudo generar el mensaje');
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'No pude generar el mensaje. Revisá la idea y probamos de nuevo.' },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyMessage = async (message) => {
    await navigator.clipboard.writeText(message.text);
    setCopiedId(message.id);
    toast.success('Mensaje copiado');
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const close = () => {
    if (isRecording) stopRecording();
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
        >
          <motion.section
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-3 bottom-3 top-16 mx-auto flex max-w-[420px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#202322] font-product text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[650px] sm:w-[390px]"
          >
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 bg-[#232625] px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">Mensajes IA</h2>
                  <p className="truncate text-[11px] text-white/45">Nota de voz a mensaje para cliente</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
                  title="Minimizar"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-fuchsia-400 transition-colors hover:bg-white/8"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div key={message.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[82%]', isUser ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed',
                          isUser ? 'bg-violet-600 text-white' : 'bg-[#333534] text-white/88'
                        )}
                      >
                        {message.text}
                      </div>
                      {message.followUp ? (
                        <p className="mt-1.5 px-1 text-[11px] text-white/42">{message.followUp}</p>
                      ) : null}
                      {message.isGenerated ? (
                        <button
                          type="button"
                          onClick={() => copyMessage(message)}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/8 hover:text-white"
                        >
                          {copiedId === message.id ? <Check size={12} /> : <Clipboard size={12} />}
                          {copiedId === message.id ? 'Copiado' : 'Copiar'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {(isTranscribing || isGenerating) && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#333534] px-3 py-2 text-xs text-white/65">
                    <Loader2 size={13} className="animate-spin" />
                    {isTranscribing ? 'Transcribiendo audio' : 'Redactando mensaje'}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/8 bg-[#202322] p-3">
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Aa"
                rows={3}
                className="mb-2 max-h-28 min-h-[76px] w-full resize-none rounded-2xl border border-white/8 bg-[#2f3130] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/18"
              />
              <input
                value={clientContext}
                onChange={(event) => setClientContext(event.target.value)}
                placeholder="Contexto opcional: nombre del cliente, objetivo, canal..."
                className="mb-2 h-9 w-full rounded-full border border-white/8 bg-[#2f3130] px-3 text-xs text-white outline-none placeholder:text-white/32 focus:border-white/18"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing || isGenerating}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    isRecording ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
                  )}
                  title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                >
                  {isRecording ? <Square size={15} fill="currentColor" /> : <Mic size={18} />}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isTranscribing || isGenerating || !transcript.trim()}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Generar mensaje
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AiClientMessageChat;
