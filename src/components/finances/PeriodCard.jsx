import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Unlock } from 'lucide-react';
import { formatFinanceCurrency, formatFinancePeriodRange } from '@/utils/finance';

const PeriodCard = ({ period, onSelect }) => {
    const navigate = useNavigate();
    const isClosed = period.status === 'closed';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onSelect ? onSelect(period.id) : navigate(`/dashboard/finances/periods/${period.id}`)}
            className="cursor-pointer rounded-[26px] border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-neutral-300"
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {isClosed ? <Lock size={14} className="text-neutral-500" /> : <Unlock size={14} className="text-skyblue" />}
                    <span className="text-neutral-900 font-product font-semibold text-sm">{period.name}</span>
                    {period.period_type === 'adjustment' && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                            Ajuste
                        </span>
                    )}
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-inter px-2 py-0.5 rounded-full border ${
                    isClosed
                        ? 'border-neutral-300 text-neutral-500'
                        : 'border-skyblue/30 bg-skyblue/5 text-skyblue'
                }`}>
                    {isClosed ? 'Cerrado' : 'Abierto'}
                </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-3">
                <div>
                    <p className="mb-1 text-[10px] text-neutral-500 uppercase tracking-[0.22em]">Ingresos</p>
                    <p className="text-emerald-600 font-semibold text-sm">{formatFinanceCurrency(period.total_income, period.currency)}</p>
                </div>
                <div>
                    <p className="mb-1 text-[10px] text-neutral-500 uppercase tracking-[0.22em]">Gastos</p>
                    <p className="text-rose-500 font-semibold text-sm">{formatFinanceCurrency(period.total_expenses, period.currency)}</p>
                </div>
                <div>
                    <p className="mb-1 text-[10px] text-neutral-500 uppercase tracking-[0.22em]">Ganancia</p>
                    <p className={`font-semibold text-sm ${period.net_profit >= 0 ? 'text-neutral-900' : 'text-rose-500'}`}>
                        {formatFinanceCurrency(period.net_profit, period.currency)}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
                <span className="line-clamp-1">{formatFinancePeriodRange(period.start_date, period.end_date)}</span>
                <div className="rounded-full border border-neutral-200 p-1.5 text-neutral-400">
                    <ArrowRight size={13} />
                </div>
            </div>
        </motion.div>
    );
};

export default PeriodCard;
