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

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusText, setStatusText] = useState('');
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
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
    setStatusText('Transcribiendo audio...');

    try {
      const text = await transcribeClientAudio(blob);
      setTranscript(text);
      if (!text) toast.error('No pude detectar texto en el audio');
      setStatusText(text ? 'Transcripción lista. Podés ajustar el texto antes de generar.' : '');
    } catch (error) {
      toast.error(error?.message || 'No se pudo transcribir el audio');
      setStatusText('No pude transcribir el audio. Probá dictar de nuevo o escribí la idea.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startSpeechDictation = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-UY';
    recognition.interimResults = true;
    recognition.continuous = true;
    speechRecognitionRef.current = recognition;

    let finalText = transcript.trim();

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusText('Escuchando dictado...');
    };

    recognition.onresult = (event) => {
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalText = `${finalText} ${result[0].transcript}`.trim();
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript([finalText, interimText].filter(Boolean).join(' ').trim());
    };

    recognition.onerror = (event) => {
      const message = event?.error === 'not-allowed'
        ? 'El permiso del micrófono fue bloqueado. Permitilo desde los permisos del sitio.'
        : 'No pude iniciar el dictado. Probá escribir la idea manualmente.';
      toast.error(message);
      setStatusText(message);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setStatusText(finalText ? 'Dictado listo. Podés ajustar el texto antes de generar.' : '');
      speechRecognitionRef.current = null;
    };

    recognition.start();
    return true;
  };

  const startRecording = async () => {
    const unsupportedMessage = getMicrophoneErrorMessage();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      if (startSpeechDictation()) return;
      setStatusText(unsupportedMessage);
      toast.error(unsupportedMessage);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
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

      recorder.start(250);
      setIsRecording(true);
      setStatusText('Grabando audio...');
    } catch (error) {
      stopStream();
      if (startSpeechDictation()) return;
      const message = getMicrophoneErrorMessage(error);
      setStatusText(message);
      toast.error(message);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

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
        tone: 'profesional cercano',
        channel: 'WhatsApp',
      });

      setGeneratedMessage(output?.message || '');
      setStatusText(output?.message ? 'Mensaje listo para copiar.' : '');
    } catch (error) {
      toast.error(error?.message || 'No se pudo generar el mensaje');
      setStatusText('No pude generar el mensaje. Revisá la idea y probamos de nuevo.');
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
    stopStream();
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
            onRecord={isRecording ? stopRecording : startRecording}
            onSubmit={handleGenerate}
            onCopy={copyMessage}
            isRecording={isRecording}
            isLoading={isTranscribing || isGenerating}
            loadingLabel={isTranscribing ? 'Transcribiendo' : 'Redactando'}
            generatedMessage={generatedMessage}
            copied={copied}
            statusText={statusText}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AiClientMessageChat;
