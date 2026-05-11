import { useEffect, useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';

export function CreditIndicator() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
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
    }
  };

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 60000);
    return () => clearInterval(interval);
  }, []);

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
