import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Lock, Unlock } from 'lucide-react';
import { formatFinanceCurrency, formatFinancePeriodRange } from '@/utils/finance';
import { cn } from '@/lib/utils';

const PeriodCard = ({ period, onSelect }) => {
    const navigate = useNavigate();
    const isClosed = period.status === 'closed';

    const handleClick = () => {
        if (onSelect) onSelect(period.id);
        else navigate(`/dashboard/finances/periods/${period.id}`);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="flex min-h-[150px] w-full flex-col gap-3 rounded-[22px] border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {isClosed ? <Lock size={14} className="text-neutral-400" /> : <Unlock size={14} className="text-sky-600" />}
                        <span className="truncate text-sm font-semibold text-neutral-900">{period.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{formatFinancePeriodRange(period.start_date, period.end_date)}</p>
                </div>
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]',
                        isClosed ? 'bg-neutral-100 text-neutral-500' : 'bg-sky-50 text-sky-700',
                    )}
                >
                    {isClosed ? 'Cerrado' : 'Abierto'}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Ingresos</p>
                    <p className="mt-1 font-mono font-semibold text-emerald-600 tabular-nums">
                        {formatFinanceCurrency(period.total_income, period.currency)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Gastos</p>
                    <p className="mt-1 font-mono font-semibold text-rose-500 tabular-nums">
                        {formatFinanceCurrency(period.total_expenses, period.currency)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Neto</p>
                    <p className={cn('mt-1 font-mono font-semibold tabular-nums', period.net_profit >= 0 ? 'text-neutral-900' : 'text-rose-500')}>
                        {formatFinanceCurrency(period.net_profit, period.currency)}
                    </p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between text-xs text-neutral-500">
                <span>{period.period_type === 'adjustment' ? 'Período de ajuste' : 'Período regular'}</span>
                <ArrowUpRight size={14} />
            </div>
        </button>
    );
};

export default PeriodCard;
