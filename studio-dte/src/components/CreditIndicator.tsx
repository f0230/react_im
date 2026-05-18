import { useCallback, useEffect, useRef, useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';

// Base poll interval. Jitter is added so concurrent users don't all hit the
// endpoint at the same instant.
const POLL_INTERVAL_MS = 120000;
const POLL_JITTER_MS = 15000;

export function CreditIndicator() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against overlapping requests if a poll fires while one is in flight.
  const inFlightRef = useRef(false);

  const fetchCredits = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/kie-credits');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setCredits(data.credits ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching credits');
      console.warn('[CreditIndicator] Failed to fetch credits:', err);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = POLL_INTERVAL_MS + Math.random() * POLL_JITTER_MS;
      timeoutId = setTimeout(tick, delay);
    };

    const tick = () => {
      // Skip polling while the tab is hidden — resumes on visibilitychange.
      if (document.visibilityState === 'visible') {
        void fetchCredits();
      }
      scheduleNext();
    };

    void fetchCredits();
    scheduleNext();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void fetchCredits();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchCredits]);

  if (error) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-orange-400/70 hover:text-orange-400 transition-colors cursor-pointer"
        onClick={fetchCredits}
        title="Click to retry"
      >
        <AlertCircle size={11} />
        <span>Credits unavailable</span>
      </div>
    );
  }

  if (loading || credits === null) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white/40">
        <Zap size={11} className="animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const isLow = credits < 100;

  return (
    <button
      onClick={fetchCredits}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors ${
        isLow
          ? 'text-orange-400/70 hover:text-orange-400'
          : 'text-white/70 hover:text-white'
      }`}
      title="Remaining KIE API credits (click to refresh)"
    >
      <Zap size={11} className={isLow ? 'text-orange-400' : 'text-white/50'} />
      <span className={isLow ? 'font-semibold' : ''}>{credits}</span>
    </button>
  );
}
