import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Minus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import HermesChat from './HermesChat';

const HermesPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    const handler = () => { setIsOpen(true); setIsMinimized(false); };
    window.addEventListener('dte:open-hermes', handler);
    return () => window.removeEventListener('dte:open-hermes', handler);
  }, []);

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[55] font-product">
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
        <div className="flex items-center justify-between pl-4 pr-3 py-3 bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              {/* Online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight tracking-tight">Hermes</p>
              <p className="text-[11px] text-emerald-400 leading-tight">activo</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Chat body — hidden when minimized via overflow:hidden on parent */}
        {!isMinimized && (
          <HermesChat
            channelId={user.id}
            userId={user.id}
            placeholder="Escribí tu mensaje…"
            className="flex-1 min-h-0"
          />
        )}
      </div>
    </div>
  );
};

export default HermesPopup;
