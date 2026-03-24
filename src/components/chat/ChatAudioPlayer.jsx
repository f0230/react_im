import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const BARS = 32;

const generateWaveform = () =>
    Array.from({ length: BARS }, () => 0.15 + Math.random() * 0.85);

const formatTime = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const ChatAudioPlayer = ({ src, fileName, variant = 'outbound' }) => {
    const audioRef = useRef(null);
    const barsRef = useRef(generateWaveform());
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        setLoadError(false);

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            if (audio.duration > 0) {
                setProgress(audio.currentTime / audio.duration);
            }
        };

        const onLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const onEnded = () => {
            setPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        const onDurationChange = () => {
            if (audio.duration && Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const onError = () => {
            setPlaying(false);
            setLoadError(true);
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.pause();
        };
    }, [src]);

    const togglePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || loadError) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            try {
                await audio.play();
                setPlaying(true);
            } catch {
                setPlaying(false);
                setLoadError(true);
            }
        }
    }, [playing, loadError]);

    const handleBarClick = useCallback((event) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        audio.currentTime = ratio * audio.duration;
        setProgress(ratio);
    }, []);

    const isOut = variant === 'outbound';
    const barColor = isOut ? 'bg-emerald-700/50' : 'bg-neutral-400';
    const barActiveColor = isOut ? 'bg-emerald-800' : 'bg-neutral-700';
    const btnBg = isOut
        ? 'bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-900'
        : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700';

    if (loadError) {
        return (
            <div className="flex items-center gap-2 min-w-[200px] py-1 text-xs text-neutral-400 italic">
                <audio ref={audioRef} src={src} preload="none" />
                <span>Audio no disponible</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 min-w-[240px] py-1">
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause */}
            <button
                type="button"
                onClick={togglePlay}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${btnBg}`}
            >
                {playing
                    ? <Pause size={16} strokeWidth={2.5} />
                    : <Play size={16} strokeWidth={2.5} className="ml-0.5" />
                }
            </button>

            {/* Waveform + info */}
            <div className="flex-1 min-w-0 space-y-1">
                <div
                    className="flex items-center gap-[2px] h-7 cursor-pointer"
                    onClick={handleBarClick}
                    role="slider"
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    tabIndex={0}
                >
                    {barsRef.current.map((height, i) => {
                        const filled = i / BARS < progress;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-colors duration-150 ${filled ? barActiveColor : barColor}`}
                                style={{ height: `${Math.round(height * 100)}%`, minWidth: 2 }}
                            />
                        );
                    })}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-neutral-500 tabular-nums">
                        {playing || currentTime > 0
                            ? formatTime(currentTime)
                            : formatTime(duration)
                        }
                    </span>
                    {fileName && (
                        <span className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                            {fileName}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ChatAudioPlayer);
