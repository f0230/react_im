import React, { useEffect, useState } from 'react';
import { CheckCircle2, Landmark, Save } from 'lucide-react';
import { formatFinanceCurrency } from '@/utils/finance';

const DISTRIBUTION_SOURCE_LABELS = {
    admin_percentage: 'Pool admin',
    worker_points: 'Pool worker',
    company_fund_release: 'Bonus desde fondo',
    legacy_manual_weight: 'Legacy manual',
    legacy_company_distribution: 'Legacy empresa',
};

const DistributionRow = ({ distribution, label, onSavePayment, disabled = false }) => {
    const [amountPaid, setAmountPaid] = useState(distribution.amount_paid?.toString() || '0');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setAmountPaid(distribution.amount_paid?.toString() || '0');
    }, [distribution.amount_paid, distribution.id]);

    const handleSave = async () => {
        if (!onSavePayment) return;
        setSaving(true);
        await onSavePayment(distribution, Number(amountPaid || 0));
        setSaving(false);
    };

    const isCompany = distribution.recipient_type === 'company';
    const sourceLabel = DISTRIBUTION_SOURCE_LABELS[distribution.calculation_source] || 'Otro origen';

    return (
        <div className="grid items-center gap-3 rounded-2xl border border-neutral-200 px-3 py-2.5 md:grid-cols-[minmax(0,1.4fr),140px,140px,140px,110px]">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    {isCompany ? <Landmark size={14} className="text-amber-600" /> : <CheckCircle2 size={14} className="text-sky-600" />}
                    <p className="truncate text-sm font-semibold text-neutral-900">{label}</p>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{sourceLabel}</p>
            </div>

            <div className="text-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Ganado</p>
                <p className="mt-1 font-mono font-semibold tabular-nums text-neutral-900">
                    {formatFinanceCurrency(distribution.amount_earned, distribution.currency)}
                </p>
            </div>

            <div className="text-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Pendiente</p>
                <p className={`mt-1 font-mono font-semibold tabular-nums ${Number(distribution.amount_pending) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatFinanceCurrency(distribution.amount_pending, distribution.currency)}
                </p>
            </div>

            <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Pagado</span>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    disabled={disabled}
                    className="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100"
                />
            </label>

            <button
                type="button"
                onClick={handleSave}
                disabled={disabled || saving}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Save size={13} />
                {saving ? '...' : 'Guardar'}
            </button>
        </div>
    );
};

export default DistributionRow;
