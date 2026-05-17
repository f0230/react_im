import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Shown when a new Service Worker is waiting to activate.
// The user can apply it immediately or dismiss (it applies on next reload).
const UpdateBanner = () => {
  const [registration, setRegistration] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onUpdate = (e) => {
      setRegistration(e.detail);
      setDismissed(false);
    };
    window.addEventListener('sw:update-available', onUpdate);
    return () => window.removeEventListener('sw:update-available', onUpdate);
  }, []);

  if (!registration || dismissed) return null;

  const applyUpdate = () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 bg-zinc-900 border-t border-white/10 px-4 py-3 text-sm text-white shadow-lg">
      <span className="text-zinc-300">Nueva versión disponible.</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={applyUpdate}
          className="flex items-center gap-1.5 bg-white text-black font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-500 hover:text-white px-2 py-1.5 transition-colors"
        >
          Después
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
