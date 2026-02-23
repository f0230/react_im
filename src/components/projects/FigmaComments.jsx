import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Loader2, ExternalLink, RefreshCw, User } from 'lucide-react';

const FigmaComments = ({ figmaUrl }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);

    const extractFileKey = (url) => {
        if (!url) return null;
        const match = url.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    };

    const fileKey = extractFileKey(figmaUrl);

    const fetchComments = useCallback(async () => {
        if (!fileKey) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/figma/comments?file_key=${fileKey}`);
            if (!response.ok) throw new Error('Failed to fetch Figma comments');
            const data = await response.json();
            // Figma returns { comments: [...] }
            setComments(data.comments || []);
        } catch (err) {
            console.error('Figma comments error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fileKey]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !fileKey || isSending) return;

        setIsSending(true);
        try {
            const response = await fetch(`/api/figma/comments?file_key=${fileKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newComment.trim() })
            });

            if (!response.ok) throw new Error('Failed to post comment to Figma');

            setNewComment('');
            fetchComments(); // Refresh list
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsSending(false);
        }
    };

    if (!figmaUrl) {
        return (
            <div className="p-8 text-center bg-white/50 rounded-2xl border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-400">No hay link de Figma configurado para este proyecto.</p>
            </div>
        );
    }

    if (!fileKey) {
        return (
            <div className="p-8 text-center bg-white/50 rounded-2xl border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-400">El link de Figma no parece ser un archivo válido.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-neutral-500" />
                    <h3 className="text-sm font-bold text-neutral-800">Comentarios de Figma</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchComments}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-neutral-400 hover:text-black"
                        title="Refrescar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <a
                        href={figmaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-neutral-400 hover:text-black"
                        title="Abrir en Figma"
                    >
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar">
                {loading && comments.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-neutral-200" />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center">
                        <p className="text-xs text-red-500">{error}</p>
                        <button onClick={fetchComments} className="text-xs text-neutral-400 underline mt-2">Reintentar</button>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-40">
                        <MessageSquare size={32} className="mb-2" />
                        <p className="text-xs">No hay comentarios en este archivo de Figma</p>
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 shrink-0 shadow-sm border border-white">
                                {c.user?.img_url ? (
                                    <img src={c.user.img_url} alt={c.user.handle} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500">
                                        <User size={14} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-bold text-neutral-800">{c.user?.handle || 'Usuario'}</span>
                                    <span className="text-[9px] text-neutral-400">
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="bg-neutral-50 rounded-2xl p-3 text-xs text-neutral-600 leading-relaxed border border-neutral-100">
                                    {c.message}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-neutral-50 border-t border-neutral-100">
                <div className="relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario en Figma..."
                        className="w-full bg-white border border-neutral-200 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-black transition-all shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || isSending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-xl hover:bg-neutral-800 disabled:opacity-40 transition-all shadow-md active:scale-95"
                    >
                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
                <p className="text-[9px] text-neutral-400 mt-2 px-1">Este comentario aparecerá directamente en el archivo de Figma.</p>
            </form>
        </div>
    );
};

export default FigmaComments;
