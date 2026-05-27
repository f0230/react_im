import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';

const HERMES_URL = (import.meta.env.VITE_HERMES_URL || 'https://hermes.grupodte.com').replace(/\/$/, '');
const HERMES_SECRET = import.meta.env.VITE_HERMES_SECRET || '';

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderInline(text, key = 0) {
  const parts = [];
  let remaining = text;
  let k = key * 1000;

  while (remaining.length > 0) {
    const bold = remaining.match(/\*\*([\s\S]*?)\*\*/);
    const italic = remaining.match(/(?<!\*)\*(?!\*)([\s\S]*?)(?<!\*)\*(?!\*)/);
    const code = remaining.match(/`([^`]+)`/);

    const candidates = [bold, italic, code].filter(Boolean);
    if (candidates.length === 0) {
      parts.push(<span key={k++}>{remaining}</span>);
      break;
    }

    const first = candidates.reduce((a, b) => (a.index <= b.index ? a : b));
    const before = remaining.slice(0, first.index);
    if (before) parts.push(<span key={k++}>{before}</span>);

    if (first === bold) {
      parts.push(<strong key={k++} className="font-semibold text-neutral-900">{first[1]}</strong>);
    } else if (first === italic) {
      parts.push(<em key={k++} className="italic">{first[1]}</em>);
    } else {
      parts.push(
        <code key={k++} className="rounded-md bg-neutral-200 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800">
          {first[1]}
        </code>
      );
    }
    remaining = remaining.slice(first.index + first[0].length);
  }
  return parts;
}

function MarkdownMessage({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // blank line → small gap token (collapse multiple)
    if (line === '') {
      if (elements.length > 0 && elements[elements.length - 1]?.type !== 'gap') {
        elements.push({ type: 'gap', key: `gap-${i}` });
      }
      i++;
      continue;
    }

    // Horizontal rule —— / --- / ***
    if (/^([-—_*]{3,})$/.test(line)) {
      elements.push({ type: 'hr', key: `hr-${i}` });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      elements.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2], key: `h-${i}` });
      i++;
      continue;
    }

    // Collect list items (supports leading spaces)
    if (/^[-*+]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s/, ''));
        i++;
      }
      elements.push({ type: 'ul', items, key: `ul-${i}` });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ''));
        i++;
      }
      elements.push({ type: 'ol', items, key: `ol-${i}` });
      continue;
    }

    // Regular line — group consecutive into a paragraph
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s/.test(lines[i].trim()) &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !/^([-—_*]{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    elements.push({ type: 'p', content: paraLines.join(' '), key: `p-${i}` });
  }

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-neutral-800">
      {elements.map((el) => {
        if (el.type === 'gap') return <div key={el.key} className="h-1" />;
        if (el.type === 'hr') return <hr key={el.key} className="border-neutral-300 my-1" />;

        if (el.type === 'heading') {
          const cls = el.level === 1
            ? 'text-[15px] font-bold text-neutral-900 mt-1'
            : el.level === 2
            ? 'text-sm font-bold text-neutral-900 mt-0.5'
            : 'text-sm font-semibold text-neutral-800';
          return <p key={el.key} className={cls}>{renderInline(el.content, el.key)}</p>;
        }

        if (el.type === 'ul') {
          return (
            <ul key={el.key} className="space-y-1 pl-1">
              {el.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
                  <span>{renderInline(item, j)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (el.type === 'ol') {
          return (
            <ol key={el.key} className="space-y-1 pl-1">
              {el.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="text-[11px] font-semibold text-neutral-400 shrink-0 mt-0.5 min-w-[14px]">{j + 1}.</span>
                  <span>{renderInline(item, j)}</span>
                </li>
              ))}
            </ol>
          );
        }

        if (el.type === 'p') {
          return <p key={el.key}>{renderInline(el.content, el.key)}</p>;
        }

        return null;
      })}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HermesChat({ channelId, userId, storageKey, placeholder = 'Escribí tu mensaje…', className = '' }) {
  const [messages, setMessages] = useState(() => {
    if (!storageKey) return [];
    try {
      const saved = localStorage.getItem(`hermes_msgs_${storageKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Persist messages to localStorage
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(`hermes_msgs_${storageKey}`, JSON.stringify(messages)); } catch {}
  }, [messages, storageKey]);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.response || 'Hermes devolvió un error');
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
    <div className={`flex flex-col h-full font-product bg-white ${className}`}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-4">

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center select-none">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <Sparkles size={18} className="text-neutral-400" />
            </div>
            <p className="text-neutral-400 text-[13px] max-w-[200px] leading-relaxed">
              Preguntame lo que necesites
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {/* Hermes avatar */}
            {msg.role === 'hermes' && (
              <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0 mb-0.5">
                <Sparkles size={11} className="text-white" />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-black text-white rounded-br-sm text-sm leading-relaxed'
                  : 'bg-neutral-100 rounded-bl-sm'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
              ) : (
                <MarkdownMessage text={msg.text} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0 mb-0.5">
              <Sparkles size={11} className="text-white" />
            </div>
            <div className="bg-neutral-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 text-xs py-1">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-100 p-3 flex items-end gap-2 bg-white">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-neutral-300 transition min-h-[40px] max-h-[120px] leading-relaxed"
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
          className="shrink-0 w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center disabled:opacity-35 hover:bg-neutral-800 transition-colors"
          aria-label="Enviar"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

export default HermesChat;
