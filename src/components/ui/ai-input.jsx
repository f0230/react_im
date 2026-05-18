import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clipboard, Loader2, Mic, Send, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SPEED_FACTOR = 1;
const FORM_WIDTH = 380;
const FORM_HEIGHT = 270;

export const ColorOrb = ({
  dimension = '192px',
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: 'oklch(95% 0.02 264.695)',
    accent1: 'oklch(75% 0.15 350)',
    accent2: 'oklch(80% 0.12 200)',
    accent3: 'oklch(78% 0.14 280)',
  };

  const palette = { ...fallbackTones, ...tones };
  const dimValue = parseInt(dimension.replace('px', ''), 10);
  const blurStrength = dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4);
  const contrastStrength = dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5);
  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1);
  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2);
  const maskRadius = dimValue < 30 ? '0%' : dimValue < 50 ? '5%' : dimValue < 100 ? '15%' : '25%';
  const adjustedContrast = dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength;

  return (
    <div
      className={cn('color-orb', className)}
      style={{
        width: dimension,
        height: dimension,
        '--base': palette.base,
        '--accent1': palette.accent1,
        '--accent2': palette.accent2,
        '--accent3': palette.accent3,
        '--spin-duration': `${spinDuration}s`,
        '--blur': `${blurStrength}px`,
        '--contrast': adjustedContrast,
        '--dot': `${pixelDot}px`,
        '--shadow': `${shadowRange}px`,
        '--mask': maskRadius,
      }}
    >
      <style>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(from calc(var(--angle) * 2) at 25% 70%, var(--accent3), transparent 20% 80%, var(--accent3)),
            conic-gradient(from calc(var(--angle) * 2) at 45% 75%, var(--accent2), transparent 30% 60%, var(--accent2)),
            conic-gradient(from calc(var(--angle) * -3) at 80% 20%, var(--accent1), transparent 40% 60%, var(--accent1)),
            conic-gradient(from calc(var(--angle) * 2) at 15% 5%, var(--accent2), transparent 10% 90%, var(--accent2)),
            conic-gradient(from calc(var(--angle) * 1) at 20% 80%, var(--accent1), transparent 10% 90%, var(--accent1)),
            conic-gradient(from calc(var(--angle) * -2) at 85% 10%, var(--accent3), transparent 20% 80%, var(--accent3));
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(circle at center, var(--base) var(--dot), transparent var(--dot));
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to { --angle: 360deg; }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before { animation: none; }
        }
      `}</style>
    </div>
  );
};

const KeyHint = ({ children, className }) => (
  <kbd className={cn('flex h-6 w-fit items-center justify-center rounded-sm border border-white/12 px-[6px] font-sans text-[11px] text-white/55', className)}>
    {children}
  </kbd>
);

const AudioVisualizer = ({ isActive }) => {
  const bars = Array.from({ length: 5 });

  return (
    <div className="flex items-center gap-1">
      {bars.map((_, idx) => (
        <motion.div
          key={idx}
          className="w-1 bg-red-400 rounded-full"
          animate={isActive ? { height: [12, 20, 12, 24, 12] } : { height: 4 }}
          transition={isActive ? { duration: 0.6, repeat: Infinity, delay: idx * 0.1 } : {}}
        />
      ))}
    </div>
  );
};

export function MorphPanel({
  isOpen,
  onOpen,
  onClose,
  value,
  onChange,
  onRecord,
  onSubmit,
  onCopy,
  isRecording = false,
  isLoading = false,
  loadingLabel = 'Procesando',
  generatedMessage = '',
  copied = false,
  statusText = '',
}) {
  const textareaRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <div className="flex items-center justify-center" style={{ width: FORM_WIDTH, height: FORM_HEIGHT }}>
      <motion.div
        data-panel
        className="relative bottom-8 z-3 flex flex-col items-center overflow-hidden border border-white/10 bg-[#202322] text-white shadow-[0_26px_80px_rgba(0,0,0,0.38)] max-sm:bottom-5"
        initial={false}
        animate={{
          width: isOpen ? FORM_WIDTH : 164,
          height: isOpen ? FORM_HEIGHT : 44,
          borderRadius: isOpen ? 16 : 22,
        }}
        transition={{
          type: 'spring',
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: isOpen ? 0 : 0.08,
        }}
      >
        <footer
          className={cn(
            'mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none transition-opacity',
            isOpen && 'pointer-events-none opacity-0'
          )}
        >
          <div className="flex items-center justify-center gap-2 px-3">
            <AnimatePresence mode="wait">
              {!isOpen ? (
                <motion.div key="orb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ColorOrb dimension="24px" tones={{ base: 'oklch(22.64% 0 0)' }} />
                </motion.div>
              ) : (
                <motion.div key="blank" className="h-5 w-5" initial={{ opacity: 0 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} />
              )}
            </AnimatePresence>
            <Button
              type="button"
              className="h-fit flex-1 rounded-full px-2 py-0.5 text-white hover:bg-white/8 hover:text-white"
              variant="ghost"
              onClick={onOpen}
            >
              <span className="truncate">Mensajes IA</span>
            </Button>
          </div>
        </footer>

        <form
          onSubmit={handleSubmit}
          className="absolute bottom-0"
          style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: isOpen ? 'all' : 'none' }}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
                className="flex h-full flex-col p-2"
              >
                <div className="flex items-center justify-between px-1 py-1">
                  <p className="z-2 ml-[38px] flex items-center gap-[6px] text-sm font-semibold text-white select-none">
                    Mensajes IA
                  </p>
                  <div className="flex items-center gap-1">
                    <KeyHint>⌘</KeyHint>
                    <KeyHint className="w-fit">Enter</KeyHint>
                    <button type="button" onClick={onClose} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-white/45 hover:bg-white/8 hover:text-white">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(event) => onChange?.(event.target.value)}
                  placeholder="Dictá o escribí la idea del mensaje..."
                  name="message"
                  className="min-h-0 flex-1 resize-none rounded-[14px] bg-[#2f3130] p-4 text-sm leading-relaxed text-white outline-0 placeholder:text-white/35"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') onClose?.();
                    if (event.key === 'Enter' && event.metaKey) {
                      event.preventDefault();
                      onSubmit?.();
                    }
                  }}
                  spellCheck={false}
                />

                {isRecording && (
                  <div className="mt-3 flex items-center justify-center">
                    <AudioVisualizer isActive={isRecording} />
                  </div>
                )}

                {generatedMessage ? (
                  <div className="mt-2 max-h-20 overflow-y-auto rounded-[14px] bg-white/6 px-3 py-2 text-xs leading-relaxed text-white/75">
                    {generatedMessage}
                  </div>
                ) : null}

                {statusText ? (
                  <div className="mt-2 flex items-center gap-2 px-1">
                    {(isLoading) && (
                      <div className="flex items-center gap-0.5">
                        <motion.div
                          className="h-1.5 w-1.5 rounded-full bg-white/60"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="h-1.5 w-1.5 rounded-full bg-white/60"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                        />
                        <motion.div
                          className="h-1.5 w-1.5 rounded-full bg-white/60"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                        />
                      </div>
                    )}
                    <p className="text-[11px] leading-snug text-white/45">{statusText}</p>
                  </div>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  <motion.button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      onRecord?.();
                    }}
                    disabled={isLoading && !isRecording}
                    animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
                    transition={isRecording ? { duration: 0.6, repeat: Infinity } : {}}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-50',
                      isRecording ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
                    )}
                  >
                    {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={17} />}
                  </motion.button>
                  {generatedMessage ? (
                    <motion.button
                      type="button"
                      onClick={onSubmit}
                      disabled={isLoading}
                      animate={isLoading ? { backgroundColor: ['rgb(109, 40, 217)', 'rgb(124, 58, 255)', 'rgb(109, 40, 217)'] } : {}}
                      transition={isLoading ? { duration: 1.5, repeat: Infinity } : {}}
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
                      title="Regenerar otro mensaje"
                    >
                      <motion.div animate={isLoading ? { rotate: 360 } : {}} transition={isLoading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
                        {isLoading ? <Loader2 size={15} /> : <Send size={15} />}
                      </motion.div>
                      {isLoading ? 'Regenerando' : 'Regenerar'}
                    </motion.button>
                  ) : null}
                  {generatedMessage ? (
                    <button
                      type="button"
                      onClick={onCopy}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
                    >
                      {copied ? <Check size={16} /> : <Clipboard size={16} />}
                    </button>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-4 top-3"
              >
                <ColorOrb dimension="24px" tones={{ base: 'oklch(22.64% 0 0)' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}

export default MorphPanel;
