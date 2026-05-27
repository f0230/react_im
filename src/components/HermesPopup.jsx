import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Minus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import HermesChat from './HermesChat';

const HermesPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const popupRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Open from Tools
  useEffect(() => {
    const handler = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('dte:open-hermes', handler);
    return () => window.removeEventListener('dte:open-hermes', handler);
  }, []);

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[55] font-product">
      {/* Chat popup */}
      <div
        ref={popupRef}
        className={`flex flex-col bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-neutral-100 overflow-hidden transition-all duration-200 origin-bottom-right ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
        }`}
        style={{ width: 340, height: isMinimized ? 0 : 480 }}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Hermes</p>
              <p className="text-[11px] text-white/50 leading-tight">Asistente personal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Minimizar"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Chat body */}
        <HermesChat
          channelId={user.id}
          userId={user.id}
          placeholder="Escribí tu mensaje…"
          className="flex-1 min-h-0"
        />
      </div>

    </div>
  );
};

export default HermesPopup;
