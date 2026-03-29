import React from 'react';
import { formatFinanceCurrency } from '@/utils/finance';

const DashboardSparkline = ({ data = [], currency }) => {
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map((item) => Math.abs(item.value)), 1);
    const lastWithValue = [...data].reverse().find((item) => item.value !== 0);
    const last = lastWithValue || data[data.length - 1];

    return (
        <div className="rounded-[22px] border border-neutral-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Tendencia</p>
                    <p className="mt-1 text-sm font-semibold text-neutral-900">Últimos 6 meses</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-neutral-400">Último cierre</p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-neutral-900">
                        {formatFinanceCurrency(last.value, currency)}
                    </p>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex h-32 items-end justify-between gap-2">
                    {data.map((item) => {
                        const barHeight = item.value !== 0 
                            ? Math.max((item.value / maxValue) * 120, 16) 
                            : 8;
                        
                        return (
                            <div key={item.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                                <div 
                                    className={`w-full max-w-[40px] rounded-t ${
                                        item.value !== 0 ? 'bg-emerald-500' : 'bg-neutral-200'
                                    }`}
                                    style={{ height: `${barHeight}px` }}
                                />
                                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                                    {item.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DashboardSparkline;
