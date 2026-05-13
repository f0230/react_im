import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, ChevronDown, ChevronRight, Code2, FileText, Loader2, Quote, RefreshCw } from 'lucide-react';
import { fetchNotionPage, fetchNotionSubPage } from '@/services/notionService';

const SUPPORTED_TEXT_BLOCKS = new Set([
    'paragraph',
    'heading_1',
    'heading_2',
    'heading_3',
    'bulleted_list_item',
    'numbered_list_item',
    'quote',
    'callout',
    'toggle',
    'table_of_contents',
    'synced_block',
    'column',
    'video',
    'audio',
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
    if (block.type === 'toggle') {
        return (
            <details className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <summary className="cursor-pointer font-semibold text-neutral-800 hover:text-neutral-900">
                    {block.title || 'Expandir'}
                </summary>
                {block.text && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{block.text}</p>}
            </details>
        );
    }
    if (block.type === 'table_of_contents') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tabla de contenidos</p>
                <p className="mt-2 text-sm text-neutral-600">Generada automáticamente por Notion</p>
            </div>
        );
    }

    return <p className="text-sm leading-relaxed text-neutral-600">{block.text}</p>;
}

function BlockRenderer({ block, onChildPageClick }) {
    if (SUPPORTED_TEXT_BLOCKS.has(block.type)) {
        return <BlockText block={block} />;
    }

    if (block.type === 'to_do') {
        return (
            <div className="flex items-start gap-3 text-sm leading-relaxed text-neutral-600">
                <input
                    type="checkbox"
                    checked={block.checked}
                    disabled
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-emerald-500"
                />
                <span className={block.checked ? 'text-neutral-400 line-through' : ''}>{block.text || 'Tarea sin texto'}</span>
            </div>
        );
    }

    if (block.type === 'child_page' || block.type === 'child_database') {
        return (
            <button
                type="button"
                onClick={() => onChildPageClick(block)}
                className="w-full text-left flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:bg-neutral-50 hover:border-neutral-300"
            >
                <BookOpen size={16} className="shrink-0 text-neutral-400" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800">{block.title || 'Página sin título'}</p>
                    <p className="text-xs text-neutral-400">
                        {block.type === 'child_database' ? 'Base de datos de Notion' : 'Haz clic para explorar'}
                    </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-neutral-400" />
            </button>
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

    if (block.type === 'database_info') {
        return (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <BookOpen size={20} className="mt-0.5 shrink-0 text-blue-600" />
                    <div className="flex-1">
                        <p className="font-semibold text-blue-900">{block.title || 'Base de datos de Notion'}</p>
                        <p className="mt-2 text-sm leading-relaxed text-blue-800">{block.text}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (block.type === 'database_row') {
        const properties = block.properties || {};
        const propEntries = Object.entries(properties).slice(0, 4);

        const colorMap = {
            red: 'bg-red-100 text-red-700',
            orange: 'bg-orange-100 text-orange-700',
            yellow: 'bg-yellow-100 text-yellow-700',
            green: 'bg-green-100 text-green-700',
            blue: 'bg-blue-100 text-blue-700',
            purple: 'bg-purple-100 text-purple-700',
            pink: 'bg-pink-100 text-pink-700',
            gray: 'bg-neutral-100 text-neutral-600',
        };

        return (
            <button
                type="button"
                onClick={() => onChildPageClick(block)}
                className="w-full text-left rounded-2xl border border-neutral-200 bg-white p-4 transition hover:bg-neutral-50 hover:border-neutral-300"
            >
                <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-neutral-900">{block.title || 'Fila sin título'}</p>
                    <ChevronRight size={16} className="shrink-0 text-neutral-400" />
                </div>
                {propEntries.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {propEntries.map(([propName, prop]) => {
                            if (!prop || !prop.value) return null;

                            if (prop.type === 'badge' && prop.value) {
                                const colorClass = colorMap[prop.color] || colorMap.gray;
                                return (
                                    <span
                                        key={propName}
                                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
                                    >
                                        {prop.value}
                                    </span>
                                );
                            }

                            if (prop.type === 'badges' && Array.isArray(prop.value)) {
                                return (
                                    <div key={propName} className="flex flex-wrap gap-1.5">
                                        {prop.value.map((badge, idx) => {
                                            const colorClass = colorMap[badge.color] || colorMap.gray;
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
                                                >
                                                    {badge.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            if (prop.type === 'date' && prop.value) {
                                return (
                                    <span key={propName} className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
                                        {new Date(prop.value).toLocaleDateString('es-ES', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                );
                            }

                            if (prop.type === 'people' && Array.isArray(prop.value)) {
                                return (
                                    <span key={propName} className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">
                                        {prop.value.join(', ')}
                                    </span>
                                );
                            }

                            if (prop.type === 'checkbox') {
                                return (
                                    <span key={propName} className="text-xs">
                                        {prop.value ? '✓' : '○'}
                                    </span>
                                );
                            }

                            return null;
                        })}
                    </div>
                )}
            </button>
        );
    }

    if (block.type === 'video' && block.url) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <video controls className="w-full max-h-[400px]">
                    <source src={block.url} />
                    Tu navegador no soporta videos.
                </video>
                {block.caption && <p className="px-4 py-3 text-xs text-neutral-400">{block.caption}</p>}
            </div>
        );
    }

    if (block.type === 'audio' && block.url) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <audio controls className="w-full">
                    <source src={block.url} />
                    Tu navegador no soporta audio.
                </audio>
                {block.caption && <p className="mt-2 text-xs text-neutral-400">{block.caption}</p>}
            </div>
        );
    }

    if (block.type === 'table') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-x-auto p-4">
                <p className="text-sm text-neutral-600">Tabla de Notion (contenido no renderizado)</p>
            </div>
        );
    }

    if (block.type === 'column_list') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-600">Columnas de Notion (contenido no renderizado)</p>
            </div>
        );
    }

    if (block.type === 'synced_block') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-600">Bloque sincronizado de Notion</p>
                {block.text && <p className="mt-2 text-sm text-neutral-700">{block.text}</p>}
            </div>
        );
    }

    if (block.type === 'column') {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                {block.text && <p className="text-sm text-neutral-700">{block.text}</p>}
            </div>
        );
    }

    if (block.type === 'unsupported') {
        return null;
    }

    if (block.text || block.title) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                <p className="text-xs font-mono text-neutral-400 mb-1">Tipo: {block.type}</p>
                {block.title && <p className="font-semibold text-neutral-800">{block.title}</p>}
                {block.text && <p className="text-neutral-700">{block.text}</p>}
            </div>
        );
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
    const [navStack, setNavStack] = useState([]);

    const load = useCallback(async (cursor = null) => {
        if (navStack.length === 0) {
            const data = await fetchNotionPage(projectId, cursor);
            setPage(data.page);
            setBlocks((prev) => (cursor ? [...prev, ...data.blocks] : data.blocks));
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
        } else {
            const currentPageId = navStack.at(-1).id;
            const data = await fetchNotionSubPage(projectId, currentPageId, cursor);
            setPage(data.page);
            setBlocks((prev) => (cursor ? [...prev, ...data.blocks] : data.blocks));
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
        }
        setError(null);
    }, [projectId, navStack]);

    useEffect(() => {
        setLoading(true);
        setBlocks([]);
        setNextCursor(null);
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

    const handleChildPageClick = useCallback((block) => {
        setBlocks([]);
        setError(null);
        setNavStack((prev) => [...prev, { id: block.id, title: block.title }]);
    }, []);

    const handleGoBack = useCallback(() => {
        setNavStack((prev) => prev.slice(0, -1));
    }, []);

    const breadcrumbItems = useMemo(() => {
        return [
            { title: 'Servicios', id: null },
            ...navStack,
        ];
    }, [navStack]);

    return (
        <div className="rounded-[28px] border border-neutral-200 bg-[#fafafa] p-6 md:p-8">
            {/* Header con título y controles */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

            {/* Breadcrumb de navegación */}
            {navStack.length > 0 && (
                <div className="mb-6 flex items-center gap-2 text-sm">
                    {breadcrumbItems.map((item, idx) => (
                        <React.Fragment key={item.id || 'root'}>
                            {idx > 0 && <ChevronRight size={14} className="text-neutral-300" />}
                            {item.id ? (
                                <button
                                    type="button"
                                    onClick={() => setNavStack((prev) => prev.slice(0, idx))}
                                    className="text-neutral-600 transition hover:text-neutral-900"
                                >
                                    {item.title}
                                </button>
                            ) : (
                                <span className="text-neutral-900 font-medium">{item.title}</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Contenido principal */}
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
                        <BlockRenderer
                            key={block.id}
                            block={block}
                            onChildPageClick={handleChildPageClick}
                        />
                    ))}
                </div>
            )}

            {/* Botón para cargar más */}
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
