import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpen, CheckSquare, ChevronDown, Code2, FileText, Loader2, Quote, RefreshCw } from 'lucide-react';
import { fetchNotionPage } from '@/services/notionService';

const SUPPORTED_TEXT_BLOCKS = new Set([
    'paragraph',
    'heading_1',
    'heading_2',
    'heading_3',
    'bulleted_list_item',
    'numbered_list_item',
    'quote',
    'callout',
]);

function BlockText({ block }) {
    if (!block.text && !block.title) return null;

    if (block.type === 'heading_1') {
        return <h2 className="mt-5 text-2xl font-bold tracking-tight text-neutral-900 first:mt-0">{block.text}</h2>;
    }
    if (block.type === 'heading_2') {
        return <h3 className="mt-4 text-xl font-bold tracking-tight text-neutral-800 first:mt-0">{block.text}</h3>;
    }
    if (block.type === 'heading_3') {
        return <h4 className="mt-3 text-base font-bold tracking-tight text-neutral-800 first:mt-0">{block.text}</h4>;
    }
    if (block.type === 'bulleted_list_item') {
        return (
            <div className="flex gap-3 text-sm leading-relaxed text-neutral-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                <p>{block.text}</p>
            </div>
        );
    }
    if (block.type === 'numbered_list_item') {
        return <p className="pl-5 text-sm leading-relaxed text-neutral-600">{block.text}</p>;
    }
    if (block.type === 'quote') {
        return (
            <div className="flex gap-3 rounded-2xl border-l-4 border-neutral-300 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-600">
                <Quote size={15} className="mt-0.5 shrink-0 text-neutral-300" />
                <p>{block.text}</p>
            </div>
        );
    }
    if (block.type === 'callout') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-600">
                {block.text}
            </div>
        );
    }

    return <p className="text-sm leading-relaxed text-neutral-600">{block.text}</p>;
}

function BlockRenderer({ block }) {
    if (SUPPORTED_TEXT_BLOCKS.has(block.type)) {
        return <BlockText block={block} />;
    }

    if (block.type === 'to_do') {
        return (
            <div className="flex items-start gap-3 text-sm leading-relaxed text-neutral-600">
                <CheckSquare size={16} className={block.checked ? 'mt-0.5 shrink-0 text-emerald-500' : 'mt-0.5 shrink-0 text-neutral-300'} />
                <span className={block.checked ? 'text-neutral-400 line-through' : ''}>{block.text || 'Tarea sin texto'}</span>
            </div>
        );
    }

    if (block.type === 'child_page' || block.type === 'child_database') {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <BookOpen size={16} className="shrink-0 text-neutral-400" />
                <div>
                    <p className="text-sm font-semibold text-neutral-800">{block.title || 'Página sin título'}</p>
                    <p className="text-xs text-neutral-400">
                        {block.type === 'child_database' ? 'Base de datos de Notion' : 'Página dentro de Notion'}
                    </p>
                </div>
            </div>
        );
    }

    if (block.type === 'code') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-4 text-neutral-100">
                <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
                    <Code2 size={14} />
                    {block.language || 'code'}
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">{block.text}</pre>
            </div>
        );
    }

    if (block.type === 'image' && block.url) {
        return (
            <figure className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <img src={block.url} alt={block.caption || 'Imagen de Notion'} className="max-h-[420px] w-full object-contain" />
                {block.caption && <figcaption className="px-4 py-3 text-xs text-neutral-400">{block.caption}</figcaption>}
            </figure>
        );
    }

    if ((block.type === 'file' || block.type === 'pdf' || block.type === 'bookmark' || block.type === 'embed') && block.url) {
        return (
            <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
                <FileText size={16} className="shrink-0 text-neutral-400" />
                {block.caption || block.text || block.url}
            </a>
        );
    }

    if (block.type === 'divider') {
        return <div className="my-5 h-px bg-neutral-200" />;
    }

    return null;
}

const NotionPageView = ({ projectId, onClose }) => {
    const [page, setPage] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    const load = useCallback(async (cursor = null) => {
        const data = await fetchNotionPage(projectId, cursor);
        setPage(data.page);
        setBlocks((prev) => (cursor ? [...prev, ...data.blocks] : data.blocks));
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setError(null);
    }, [projectId]);

    useEffect(() => {
        setLoading(true);
        load(null)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [load]);

    const handleRefresh = async () => {
        setLoading(true);
        setBlocks([]);
        setNextCursor(null);
        try {
            await load(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        try {
            await load(nextCursor);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="rounded-[28px] border border-neutral-200 bg-[#fafafa] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900">
                        <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight text-neutral-900">{page?.title || 'Notion'}</h3>
                        <p className="text-xs text-neutral-400">Desde Notion</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-700 disabled:opacity-40"
                        title="Actualizar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-neutral-400" />
                </div>
            ) : error ? (
                <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            ) : blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen size={32} className="mb-3 text-neutral-200" />
                    <p className="text-sm text-neutral-400">Esta página no tiene contenido visible para la integración.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {blocks.map((block) => (
                        <BlockRenderer key={block.id} block={block} />
                    ))}
                </div>
            )}

            {hasMore && !loading && (
                <div className="mt-5 flex justify-center">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                        {loadingMore ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                        {loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotionPageView;
