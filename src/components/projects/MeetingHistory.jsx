import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Loader2,
    RefreshCw,
    CheckSquare,
    AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchMeetings } from '@/services/notionService';

const ITEM_SPRING = {
    type: 'spring',
    stiffness: 260,
    damping: 26,
    mass: 0.8,
};

function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(dateStr + 'T12:00:00'));
    } catch {
        return dateStr;
    }
}

function StatusBadge({ status }) {
    const { t } = useTranslation();
    if (!status) return null;
    const isDone = status.toLowerCase() === 'done';
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
            }`}
        >
            {t(`dashboard.projects.meetings.status.${status.toLowerCase()}`, { defaultValue: status })}
        </span>
    );
}

function MeetingItem({ meeting }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const hasSummary = meeting.summary?.trim().length > 0;
    const hasActionItems = meeting.actionItems?.trim().length > 0;
    const hasDetails = hasSummary || hasActionItems;

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            {/* Header row */}
            <div
                className={`flex items-start gap-4 p-4 md:p-5 ${hasDetails ? 'cursor-pointer select-none' : ''}`}
                onClick={hasDetails ? () => setExpanded((v) => !v) : undefined}
                role={hasDetails ? 'button' : undefined}
                aria-expanded={hasDetails ? expanded : undefined}
            >
                {/* Date pill */}
                <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-100 px-3 py-2 text-center">
                    <CalendarDays size={13} className="mb-1 text-neutral-400" />
                    <span className="text-[11px] font-semibold leading-tight text-neutral-600">
                        {formatDate(meeting.date) ?? '—'}
                    </span>
                </div>

                {/* Title + status */}
                <div className="flex flex-1 flex-col gap-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold leading-snug text-neutral-800">
                            {meeting.title || t('dashboard.projects.meetings.untitled')}
                        </h3>
                        <StatusBadge status={meeting.status} />
                    </div>
                    {!expanded && hasSummary && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-neutral-400">
                            {meeting.summary}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                    <a
                        href={meeting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-700"
                        title={t('dashboard.projects.meetings.viewInNotion')}
                    >
                        <ExternalLink size={13} />
                    </a>
                    {hasDetails && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    )}
                </div>
            </div>

            {/* Expandable body */}
            <AnimatePresence initial={false}>
                {expanded && hasDetails && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-4 border-t border-neutral-100 px-4 py-4 md:px-5 md:py-5">
                            {hasSummary && (
                                <div>
                                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.projects.meetings.summary')}
                                    </p>
                                    <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                                        {meeting.summary}
                                    </p>
                                </div>
                            )}
                            {hasActionItems && (
                                <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.projects.meetings.actionItems')}
                                    </p>
                                    <ul className="flex flex-col gap-1.5">
                                        {meeting.actionItems
                                            .split('\n')
                                            .filter((line) => line.trim())
                                            .map((line, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-start gap-2 text-sm leading-relaxed text-neutral-700"
                                                >
                                                    <CheckSquare
                                                        size={14}
                                                        className="mt-0.5 shrink-0 text-neutral-400"
                                                    />
                                                    <span>{line.replace(/^[-•*]\s*/, '')}</span>
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * MeetingHistory
 * Renders the chronological list of Notion meeting notes for a project.
 *
 * Props:
 *   projectId {string}  — project slug (must match an entry in src/config/notion.js)
 *   onClose   {()=>void} — callback to close/collapse the panel
 */
const MeetingHistory = ({ projectId, onClose }) => {
    const { t } = useTranslation();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const loadMeetings = useCallback(
        async (cursor = null) => {
            if (!projectId) return;
            const isFirst = cursor === null;
            if (isFirst) {
                setLoading(true);
                setError(null);
            } else {
                setLoadingMore(true);
            }

            try {
                const data = await fetchMeetings(projectId, cursor);
                setMeetings((prev) => (isFirst ? data.meetings : [...prev, ...data.meetings]));
                setNextCursor(data.nextCursor);
                setHasMore(data.hasMore);
            } catch (err) {
                setError(err.message);
            } finally {
                if (isFirst) setLoading(false);
                else setLoadingMore(false);
            }
        },
        [projectId]
    );

    useEffect(() => {
        void loadMeetings(null);
    }, [loadMeetings]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={ITEM_SPRING}
            className="col-span-full rounded-[24px] border border-white/70 bg-[#f7f7f7] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] md:p-8"
        >
            {/* Panel header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-800">
                        {t('dashboard.projects.meetings.history')}
                    </h2>
                    <p className="mt-0.5 text-sm text-neutral-400">
                        {t('dashboard.projects.meetings.historySubtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => loadMeetings(null)}
                        disabled={loading}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition hover:text-neutral-700 disabled:opacity-40"
                        title={t('dashboard.projects.meetings.refresh')}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-500 transition hover:text-neutral-800"
                        >
                            {t('dashboard.projects.meetings.close')}
                        </button>
                    )}
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={22} className="animate-spin text-neutral-400" />
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <AlertCircle size={22} className="text-red-400" />
                    <p className="text-sm font-medium text-neutral-600">
                        {t('dashboard.projects.meetings.error')}
                    </p>
                    <p className="max-w-xs text-xs text-neutral-400">{error}</p>
                    <button
                        type="button"
                        onClick={() => loadMeetings(null)}
                        className="mt-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 transition hover:text-neutral-900"
                    >
                        {t('dashboard.projects.meetings.retry')}
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && meetings.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <CalendarDays size={28} className="text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-500">
                        {t('dashboard.projects.meetings.empty')}
                    </p>
                    <p className="max-w-xs text-xs leading-relaxed text-neutral-400">
                        {t('dashboard.projects.meetings.emptyDescription')}
                    </p>
                </div>
            )}

            {/* Meeting list */}
            {!loading && !error && meetings.length > 0 && (
                <div className="flex flex-col gap-3">
                    {meetings.map((meeting, i) => (
                        <motion.div
                            key={meeting.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...ITEM_SPRING, delay: i * 0.03 }}
                        >
                            <MeetingItem meeting={meeting} />
                        </motion.div>
                    ))}

                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => loadMeetings(nextCursor)}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                            >
                                {loadingMore && <Loader2 size={12} className="animate-spin" />}
                                {t('dashboard.projects.meetings.loadMore')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default MeetingHistory;
