import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Hash, RefreshCw, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatShortDateTime, getUserColor } from '@/utils/messagingFormatters';

const highlightMatch = (text, term) => {
    if (!text || !term) return text;
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + term.length)}</mark>
            {text.slice(idx + term.length)}
        </>
    );
};

const MessageSearch = ({ onClose, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState([]);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        supabase.from('team_channels').select('id, name').then(({ data }) => {
            if (data) setChannels(data);
        });
    }, []);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const search = useCallback(async (term) => {
        if (!term || term.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('team_messages')
            .select('id, body, created_at, author_name, channel_id, author:profiles(full_name)')
            .ilike('body', `%${term.trim()}%`)
            .is('thread_root_id', null)
            .order('created_at', { ascending: false })
            .limit(30);
        if (!error) setResults(data || []);
        setLoading(false);
    }, []);

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 300);
    };

    const channelMap = React.useMemo(() => {
        const m = new Map();
        channels.forEach((c) => m.set(c.id, c.name));
        return m;
    }, [channels]);

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
            <div
                className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
                    <Search size={16} className="text-neutral-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={handleChange}
                        placeholder="Buscar en mensajes del equipo..."
                        className="flex-1 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none bg-transparent"
                    />
                    {loading && <RefreshCw size={14} className="animate-spin text-neutral-400 shrink-0" />}
                    <button onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* results */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {query.trim().length < 2 && (
                        <div className="px-4 py-8 text-center text-[12px] text-neutral-400">
                            Escribe al menos 2 caracteres para buscar
                        </div>
                    )}
                    {query.trim().length >= 2 && !loading && results.length === 0 && (
                        <div className="px-4 py-8 text-center text-[12px] text-neutral-400">
                            Sin resultados para <strong>"{query}"</strong>
                        </div>
                    )}
                    {results.map((msg) => {
                        const name = msg.author_name || msg.author?.full_name || 'Equipo';
                        const channelName = channelMap.get(msg.channel_id) || '';
                        return (
                            <button
                                key={msg.id}
                                onClick={() => onNavigate(msg.channel_id, msg.id)}
                                className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                            >
                                <div className="flex items-start gap-2.5">
                                    <div className="shrink-0 w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center mt-0.5">
                                        <Hash size={11} className="text-neutral-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`text-[11px] font-semibold ${getUserColor(name)}`}>{name}</span>
                                            {channelName && (
                                                <span className="text-[10px] text-neutral-400">en #{channelName}</span>
                                            )}
                                            <span className="text-[10px] text-neutral-400 ml-auto">{formatShortDateTime(msg.created_at)}</span>
                                        </div>
                                        <p className="text-[12px] text-neutral-700 line-clamp-2 leading-relaxed">
                                            {highlightMatch(msg.body, query.trim())}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {results.length > 0 && (
                    <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50">
                        <p className="text-[10px] text-neutral-400">{results.length} resultado{results.length !== 1 ? 's' : ''} · Enter para abrir</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageSearch;
