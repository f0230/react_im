import React, { useEffect, useState } from 'react';
import { CheckCircle2, Landmark, Save } from 'lucide-react';
import { formatFinanceCurrency } from '@/utils/finance';

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

    return (
        <div className="grid gap-4 rounded-3xl border border-neutral-200 bg-white p-4 md:grid-cols-[1.4fr,1fr,1fr,1fr,auto] md:items-center">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    {isCompany ? <Landmark size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-skyblue" />}
                    <p className="truncate font-semibold text-neutral-900">{label}</p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-neutral-400">
                    {distribution.recipient_type}
                </p>
            </div>

            <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Ganado</p>
                <p className="mt-1 font-semibold text-neutral-900">
                    {formatFinanceCurrency(distribution.amount_earned, distribution.currency)}
                </p>
            </div>

            <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Pendiente</p>
                <p className={`mt-1 font-semibold ${Number(distribution.amount_pending) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatFinanceCurrency(distribution.amount_pending, distribution.currency)}
                </p>
            </div>

            <label className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Pagado</span>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    disabled={disabled}
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100"
                />
            </label>

            <button
                type="button"
                onClick={handleSave}
                disabled={disabled || saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Save size={14} />
                {saving ? 'Guardando' : 'Guardar'}
            </button>
        </div>
    );
};

export default DistributionRow;
