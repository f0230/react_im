import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { generateClientMessage, transcribeClientAudio } from '@/services/clientMessageAiService';
import { MorphPanel } from '@/components/ui/ai-input';

const OPEN_EVENT = 'dte:open-client-message-ai';

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  return [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
  ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const getMicrophoneErrorMessage = (error) => {
  if (!window.isSecureContext) {
    return 'El micrófono necesita HTTPS o localhost. Abrí la app desde localhost o producción HTTPS.';
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Este navegador no expone acceso al micrófono. Probá en Chrome o Safari fuera del navegador embebido.';
  }

  if (typeof MediaRecorder === 'undefined') {
    return 'Este navegador permite micrófono, pero no permite grabar audio con MediaRecorder.';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'El permiso del micrófono fue bloqueado. Revisá los permisos del sitio y volvé a intentar.';
  }

  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No encontré un micrófono disponible en este dispositivo.';
  }

  if (error?.name === 'NotReadableError') {
    return 'El micrófono está siendo usado por otra app o el sistema lo bloqueó.';
  }

  return 'No pude acceder al micrófono. Probá permitir el acceso o abrir la app en Chrome.';
};

const AiClientMessageChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [clientContext, setClientContext] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const handleAudioBlob = async (blob) => {
    if (!blob?.size) return;

    setIsTranscribing(true);

    try {
      const text = await transcribeClientAudio(blob);
      setTranscript(text);
      if (!text) toast.error('No pude detectar texto en el audio');
    } catch (error) {
      toast.error(error?.message || 'No se pudo transcribir el audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    const unsupportedMessage = getMicrophoneErrorMessage();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(unsupportedMessage);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
      const message = getMicrophoneErrorMessage(error);
      toast.error(message);
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
    setGeneratedMessage('');

    try {
      const output = await generateClientMessage({
        transcript: text,
        clientContext,
        tone: 'profesional cercano',
        channel: 'WhatsApp',
      });

      setGeneratedMessage(output?.message || '');
    } catch (error) {
      toast.error(error?.message || 'No se pudo generar el mensaje');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyMessage = async () => {
    if (!generatedMessage) return;
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    toast.success('Mensaje copiado');
    window.setTimeout(() => setCopied(false), 1600);
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
          className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-3 sm:bottom-5 sm:justify-end sm:pr-5"
        >
          <MorphPanel
            isOpen={isOpen}
            onOpen={() => setIsOpen(true)}
            onClose={close}
            value={transcript}
            onChange={setTranscript}
            contextValue={clientContext}
            onContextChange={setClientContext}
            onRecord={isRecording ? stopRecording : startRecording}
            onSubmit={handleGenerate}
            onCopy={copyMessage}
            isRecording={isRecording}
            isLoading={isTranscribing || isGenerating}
            loadingLabel={isTranscribing ? 'Transcribiendo' : 'Redactando'}
            generatedMessage={generatedMessage}
            copied={copied}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AiClientMessageChat;
