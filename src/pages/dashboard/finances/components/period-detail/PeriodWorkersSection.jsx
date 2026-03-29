import React from 'react';
import { Users } from 'lucide-react';
import { WORKERS_TARGET_REFERENCE_ACTIVE_WORKERS } from '@/components/finances/workersTarget';
import { formatFinanceCurrency } from '@/utils/finance';

const statLabel = 'text-[10px] uppercase tracking-[0.2em] text-neutral-400';

const PeriodWorkersSection = ({ workerPoolSummary, displayCurrency, onOpenEditor }) => (
    <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Pool máximo</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-900">{formatFinanceCurrency(workerPoolSummary.poolCap, displayCurrency)}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Pool ganado</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-900">{formatFinanceCurrency(workerPoolSummary.poolEarned, displayCurrency)}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Target efectivo</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{workerPoolSummary.targetWeightedPoints.toFixed(2)} pts</p>
                <p className="mt-1 text-xs text-neutral-500">
                    Base {workerPoolSummary.baseTargetWeightedPoints.toFixed(2)} para {WORKERS_TARGET_REFERENCE_ACTIVE_WORKERS} activos.
                </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Utilización</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{(workerPoolSummary.utilizationRatio * 100).toFixed(2)}%</p>
                <p className="mt-1 text-xs text-neutral-500">
                    {workerPoolSummary.activeWorkersCount > 0
                        ? `${workerPoolSummary.activeWorkersCount} worker(s) con logs aprobados.`
                        : 'Sin workers activos todavía.'}
                </p>
            </div>
        </div>
        <button type="button" onClick={onOpenEditor} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900">
            <Users size={15} />
            Abrir editor de workers
        </button>
    </div>
);

export default PeriodWorkersSection;
