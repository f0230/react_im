import React, { useState, useEffect, useRef } from 'react';

const HERMES_URL = (import.meta.env.VITE_HERMES_URL || 'https://hermes.grupodte.com').replace(/\/$/, '');
const HERMES_SECRET = import.meta.env.VITE_HERMES_SECRET || '';

export function HermesChat({ channelId, userId, placeholder = 'Escribe tu mensaje...', className = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(`${HERMES_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HERMES_SECRET}`,
        },
        body: JSON.stringify({ channel_id: channelId, message: text, user_id: userId }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.response || 'Hermes devolvió un error');
      }

      setMessages((prev) => [...prev, { role: 'hermes', text: data.response }]);
    } catch (err) {
      setError(err.message || 'No se pudo conectar con Hermes');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full font-product ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white text-lg">✦</div>
            <p className="text-neutral-400 text-sm">¿En qué puedo ayudarte?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-neutral-100 text-neutral-900 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-neutral-500 flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
              </span>
              Hermes está pensando…
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 text-xs py-1">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 p-3 flex gap-2 items-end bg-white">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-neutral-400 transition min-h-[40px] max-h-[120px]"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-black text-white px-3 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-neutral-800 transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

export default HermesChat;
