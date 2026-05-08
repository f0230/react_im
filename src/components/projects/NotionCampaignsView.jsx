import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, ExternalLink, Loader2, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { fetchCampaigns } from '@/services/notionService';

const SPRING = { type: 'spring', stiffness: 260, damping: 26, mass: 0.8 };

const STATUS_COLORS = {
    activa: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    live: 'bg-emerald-100 text-emerald-700',
    planificada: 'bg-blue-100 text-blue-700',
    planned: 'bg-blue-100 text-blue-700',
    borrador: 'bg-neutral-100 text-neutral-600',
    draft: 'bg-neutral-100 text-neutral-600',
    pausada: 'bg-amber-100 text-amber-700',
    paused: 'bg-amber-100 text-amber-700',
    finalizada: 'bg-neutral-200 text-neutral-500',
    finished: 'bg-neutral-200 text-neutral-500',
    completed: 'bg-neutral-200 text-neutral-500',
};

function statusColor(status) {
    if (!status) return 'bg-neutral-100 text-neutral-500';
    return STATUS_COLORS[status.toLowerCase()] ?? 'bg-purple-100 text-purple-700';
}

function formatDate(str) {
    if (!str) return null;
    try {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            .format(new Date(str + 'T12:00:00'));
    } catch {
        return str;
    }
}

function CampaignItem({ campaign }) {
    const [expanded, setExpanded] = useState(false);
    const hasDescription = campaign.description?.trim().length > 0;

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div
                className={`flex items-start gap-4 p-4 md:p-5 ${hasDescription ? 'cursor-pointer' : ''}`}
                onClick={hasDescription ? () => setExpanded((v) => !v) : undefined}
            >
                <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-100 px-3 py-2 text-center min-w-[56px]">
                    <Megaphone size={13} className="mb-1 text-neutral-400" />
                    {campaign.startDate && (
                        <span className="text-[11px] font-semibold leading-tight text-neutral-600">
                            {formatDate(campaign.startDate)}
                        </span>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold leading-snug text-neutral-800">
                            {campaign.title || 'Sin título'}
                        </h3>
                        {campaign.status && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusColor(campaign.status)}`}>
                                {campaign.status}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                        {campaign.platform && <span>{campaign.platform}</span>}
                        {campaign.endDate && <span>Hasta: {formatDate(campaign.endDate)}</span>}
                    </div>

                    {expanded && hasDescription && (
                        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                            {campaign.description}
                        </p>
                    )}
                </div>

                <a
                    href={campaign.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-700"
                    title="Ver en Notion"
                >
                    <ExternalLink size={13} />
                </a>
            </div>
        </div>
    );
}

const NotionCampaignsView = ({ projectId, onClose }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (cursor = null) => {
        try {
            const data = await fetchCampaigns(projectId, cursor);
            if (cursor) {
                setCampaigns((prev) => [...prev, ...data.campaigns]);
            } else {
                setCampaigns(data.campaigns);
            }
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    }, [projectId]);

    useEffect(() => {
        setLoading(true);
        load(null).finally(() => setLoading(false));
    }, [load]);

    const handleLoadMore = async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        await load(nextCursor);
        setLoadingMore(false);
    };

    const handleRefresh = async () => {
        setLoading(true);
        setCampaigns([]);
        setNextCursor(null);
        await load(null);
        setLoading(false);
    };

    return (
        <div className="rounded-[28px] border border-neutral-200 bg-[#fafafa] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900">
                        <Megaphone size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight text-neutral-900">Campañas</h3>
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
            ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Megaphone size={32} className="mb-3 text-neutral-200" />
                    <p className="text-sm text-neutral-400">No hay campañas registradas.</p>
                </div>
            ) : (
                <AnimatePresence>
                    <div className="flex flex-col gap-3">
                        {campaigns.map((campaign, i) => (
                            <motion.div
                                key={campaign.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...SPRING, delay: i * 0.03 }}
                            >
                                <CampaignItem campaign={campaign} />
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {hasMore && !loading && (
                <div className="mt-4 flex justify-center">
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

export default NotionCampaignsView;
