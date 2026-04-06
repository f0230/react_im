import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency, getFinanceTransactionReportingAmount } from '@/utils/finance';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MonthlyReportView = ({ transactions, periods, currency = 'USD' }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const data = useMemo(() => {
        const yearPeriods = periods.filter((period) => new Date(period.start_date).getFullYear() === selectedYear);

        const monthlyData = MONTHS.map((month, monthIndex) => {
            const monthPeriods = yearPeriods.filter((period) => new Date(period.start_date).getUTCMonth() === monthIndex);
            let income = 0;
            let expenses = 0;

            if (monthPeriods.length > 0) {
                monthPeriods.forEach((period) => {
                    if (period.status === 'closed') {
                        income += Number(period.total_income || 0);
                        expenses += Number(period.total_expenses || 0);
                        return;
                    }

                    const periodTransactions = transactions.filter((transaction) => transaction.period_id === period.id);
                    income += periodTransactions
                        .filter((transaction) => transaction.type === 'income')
                        .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
                    expenses += periodTransactions
                        .filter((transaction) => transaction.type === 'expense')
                        .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
                });
            } else {
                const monthTransactions = transactions.filter((transaction) => {
                    const date = new Date(transaction.transaction_date);
                    return !transaction.period_id && date.getUTCFullYear() === selectedYear && date.getUTCMonth() === monthIndex;
                });
                income = monthTransactions
                    .filter((transaction) => transaction.type === 'income')
                    .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
                expenses = monthTransactions
                    .filter((transaction) => transaction.type === 'expense')
                    .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
            }

            const net = income - expenses;
            return { month, income, expenses, net, margin: income > 0 ? (net / income) * 100 : 0 };
        });

        const monthsWithData = monthlyData.filter((item) => item.income > 0 || item.expenses > 0);
        const bestMonth = monthsWithData.reduce((best, current) => (!best || current.net > best.net ? current : best), null);
        const worstMonth = monthsWithData.reduce((worst, current) => (!worst || current.net < worst.net ? current : worst), null);
        const totalIncome = monthlyData.reduce((sum, item) => sum + item.income, 0);
        const totalExpenses = monthlyData.reduce((sum, item) => sum + item.expenses, 0);
        const totalNet = totalIncome - totalExpenses;

        return {
            currency,
            monthlyData,
            bestMonth,
            worstMonth,
            avgMargin: totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0,
            closedPeriods: yearPeriods.filter((period) => period.status === 'closed').length,
            openPeriods: yearPeriods.filter((period) => period.status === 'open').length,
        };
    }, [currency, periods, selectedYear, transactions]);

    const chartMax = Math.max(...data.monthlyData.map((item) => Math.max(item.income, item.expenses)), 1);

    const exportToCsv = () => {
        const csv = [
            ['Mes', 'Ingresos', 'Gastos', 'Neto', 'Margen %'].join(','),
            ...data.monthlyData.map((item) => [item.month, item.income, item.expenses, item.net, item.margin.toFixed(2)].join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte-finanzas-${selectedYear}.csv`;
        link.click();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedYear((year) => year - 1)} className="rounded-xl border border-neutral-200 p-2 text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"><ChevronLeft size={16} /></button>
                    <span className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900">{selectedYear}</span>
                    <button type="button" onClick={() => setSelectedYear((year) => year + 1)} disabled={selectedYear >= new Date().getFullYear()} className="rounded-xl border border-neutral-200 p-2 text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
                <button type="button" onClick={exportToCsv} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900">
                    <Download size={15} />
                    Exportar CSV
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <FinanceKpiCard label="Margen anual" value={`${data.avgMargin.toFixed(1)}%`} color={data.avgMargin >= 0 ? 'text-sky-700' : 'text-rose-500'} />
                <FinanceKpiCard label="Mejor mes" value={data.bestMonth?.month || '—'} sub={data.bestMonth ? formatFinanceCurrency(data.bestMonth.net, data.currency) : null} color="text-emerald-600" />
                <FinanceKpiCard label="Peor mes" value={data.worstMonth?.month || '—'} sub={data.worstMonth ? formatFinanceCurrency(data.worstMonth.net, data.currency) : null} color="text-rose-500" />
                <FinanceKpiCard label="Períodos" value={`${data.closedPeriods} cerrados`} sub={`${data.openPeriods} abiertos`} />
            </div>

            <section className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Visualización</p>
                <div className="mt-3 flex h-56 items-end justify-between gap-2">
                    {data.monthlyData.map((item) => (
                        <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                            <div className="flex h-44 w-full items-end justify-center gap-1">
                                <div className="w-full max-w-[18px] rounded-t bg-emerald-500" style={{ height: `${(item.income / chartMax) * 100}%` }} />
                                <div className="w-full max-w-[18px] rounded-t bg-rose-500" style={{ height: `${(item.expenses / chartMax) * 100}%` }} />
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">{item.month.slice(0, 3)}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-[24px] border border-neutral-200 bg-white">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                                <th className="px-4 py-2 font-medium">Mes</th>
                                <th className="px-4 py-2 font-medium text-right">Ingresos</th>
                                <th className="px-4 py-2 font-medium text-right">Gastos</th>
                                <th className="px-4 py-2 font-medium text-right">Neto</th>
                                <th className="px-4 py-2 font-medium text-right">Margen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.monthlyData.map((item) => (
                                <tr key={item.month} className="border-b border-neutral-100">
                                    <td className="px-4 py-2.5 font-medium text-neutral-900">{item.month}</td>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-600">{formatFinanceCurrency(item.income, data.currency)}</td>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-rose-500">{formatFinanceCurrency(item.expenses, data.currency)}</td>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-neutral-900">{formatFinanceCurrency(item.net, data.currency)}</td>
                                    <td className="px-4 py-2.5 text-right text-neutral-600">{item.income > 0 ? `${item.margin.toFixed(1)}%` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default MonthlyReportView;
