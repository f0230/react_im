import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Minus, Plus, MessageSquare, Trash2, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import HermesChat from './HermesChat';

// ─── Session helpers ──────────────────────────────────────────────────────────

const SESSIONS_KEY = (uid) => `hermes_sessions_${uid}`;
const ACTIVE_KEY   = (uid) => `hermes_active_${uid}`;

const loadSessions = (uid) => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default permanent session
  return [{ id: uid, label: 'Conversación principal', createdAt: new Date().toISOString() }];
};

const saveSessions = (uid, sessions) => {
  try { localStorage.setItem(SESSIONS_KEY(uid), JSON.stringify(sessions)); } catch {}
};

const loadActiveId = (uid, sessions) => {
  try {
    const saved = localStorage.getItem(ACTIVE_KEY(uid));
    if (saved && sessions.find((s) => s.id === saved)) return saved;
  } catch {}
  return sessions[0]?.id ?? uid;
};

const saveActiveId = (uid, id) => {
  try { localStorage.setItem(ACTIVE_KEY(uid), id); } catch {}
};

const formatSessionDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
};

// ─── Sessions panel ───────────────────────────────────────────────────────────

function SessionsPanel({ sessions, activeId, onSelect, onNew, onDelete, onClose }) {
  return (
    <div className="absolute right-full top-0 bottom-0 w-[220px] mr-2 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-neutral-200/60 flex flex-col overflow-hidden font-product">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
        <span className="text-[13px] font-semibold text-neutral-800">Conversaciones</span>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          aria-label="Cerrar panel"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1.5">
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          return (
            <div
              key={s.id}
              className={`group mx-1.5 mb-0.5 flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                isActive ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-700'
              }`}
              onClick={() => onSelect(s.id)}
            >
              <MessageSquare size={13} className={`shrink-0 ${isActive ? 'text-white/70' : 'text-neutral-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-medium truncate ${isActive ? 'text-white' : 'text-neutral-800'}`}>
                  {s.label}
                </p>
                <p className={`text-[10px] truncate ${isActive ? 'text-white/50' : 'text-neutral-400'}`}>
                  {formatSessionDate(s.createdAt)}
                </p>
              </div>
              {/* Delete — only non-primary sessions */}
              {s.id !== s.userId && sessions.length > 1 && !isActive && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 transition-all"
                  aria-label="Eliminar sesión"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New session */}
      <div className="border-t border-neutral-100 p-2 shrink-0">
        <button
          type="button"
          onClick={onNew}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        >
          <Plus size={13} />
          Nueva conversación
        </button>
      </div>
    </div>
  );
}

// ─── Main popup ───────────────────────────────────────────────────────────────

const HermesPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState('');
  const popupRef = useRef(null);

  // Init sessions from localStorage once user is available
  useEffect(() => {
    if (!user?.id) return;
    const s = loadSessions(user.id);
    // Stamp userId on each for delete guard
    const stamped = s.map((x) => ({ ...x, userId: user.id }));
    setSessions(stamped);
    setActiveId(loadActiveId(user.id, stamped));
  }, [user?.id]);

  // Persist sessions on change
  useEffect(() => {
    if (!user?.id || sessions.length === 0) return;
    saveSessions(user.id, sessions);
  }, [sessions, user?.id]);

  // Persist active session
  useEffect(() => {
    if (!user?.id || !activeId) return;
    saveActiveId(user.id, activeId);
  }, [activeId, user?.id]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') { if (showSessions) setShowSessions(false); else setIsOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, showSessions]);

  // Open from Tools
  useEffect(() => {
    const handler = () => { setIsOpen(true); setIsMinimized(false); };
    window.addEventListener('dte:open-hermes', handler);
    return () => window.removeEventListener('dte:open-hermes', handler);
  }, []);

  const handleNewSession = () => {
    const newId = `${user.id}_${Date.now()}`;
    const newSession = {
      id: newId,
      label: `Conversación ${new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'short' })}`,
      createdAt: new Date().toISOString(),
      userId: user.id,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveId(newId);
    setShowSessions(false);
  };

  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try { localStorage.removeItem(`hermes_msgs_${id}`); } catch {}
    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveId(remaining[0]?.id ?? user.id);
    }
  };

  const handleSelectSession = (id) => {
    setActiveId(id);
    setShowSessions(false);
  };

  if (!user) return null;

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <div className="fixed bottom-5 right-5 z-[55] font-product">
      <div className="relative">
        {/* Sessions panel */}
        <div
          className={`absolute right-full top-0 bottom-0 transition-all duration-200 ease-out origin-right ${
            showSessions && isOpen && !isMinimized
              ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-x-2 scale-95 pointer-events-none'
          }`}
          style={{ marginRight: 8 }}
        >
          <SessionsPanel
            sessions={sessions}
            activeId={activeId}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onDelete={handleDeleteSession}
            onClose={() => setShowSessions(false)}
          />
        </div>

        {/* Chat popup */}
        <div
          ref={popupRef}
          className={`flex flex-col bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.20)] border border-neutral-200/60 overflow-hidden transition-all duration-200 ease-out origin-bottom-right ${
            isOpen
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }`}
          style={{ width: 360, height: isMinimized ? 52 : 500 }}
          aria-hidden={!isOpen}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between pl-4 pr-3 bg-black shrink-0 cursor-pointer"
            style={{ height: 52 }}
            onClick={(e) => {
              // clicking the header row (not buttons) toggles minimize
              if (e.target === e.currentTarget) setIsMinimized((v) => !v);
            }}
          >
            <div
              className="flex items-center gap-2.5 flex-1 min-w-0"
              onClick={() => setIsMinimized((v) => !v)}
            >
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-[1.5px] border-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white leading-tight">Hermes</p>
                <p className="text-[10px] text-neutral-400 leading-tight truncate max-w-[160px]">
                  {activeSession?.label ?? 'Conversación'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Sessions toggle */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowSessions((v) => !v); setIsMinimized(false); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  showSessions ? 'bg-white/20 text-white' : 'text-white/40 hover:bg-white/10 hover:text-white'
                }`}
                aria-label="Sesiones"
                title="Conversaciones"
              >
                <MessageSquare size={13} />
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsMinimized((v) => !v); setShowSessions(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); setShowSessions(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Chat body — keep mounted, just hidden when minimized */}
          <div
            className="flex-1 min-h-0 flex flex-col"
            style={{ display: isMinimized ? 'none' : 'flex' }}
          >
            {activeId && (
              <HermesChat
                key={activeId}
                channelId={activeId}
                userId={user.id}
                storageKey={activeId}
                placeholder="Escribí tu mensaje…"
                className="flex-1 min-h-0"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HermesPopup;
