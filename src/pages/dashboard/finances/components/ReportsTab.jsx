import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Award,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Download,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency } from '@/utils/finance';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ReportsTab = ({ transactions, periods, config }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const yearlyData = useMemo(() => {
        const currency = config?.default_currency || 'USD';

        const yearPeriods = periods.filter((p) => new Date(p.start_date).getFullYear() === selectedYear);

        const monthlyData = Array(12).fill(null).map((_, monthIndex) => {
            const monthPeriods = yearPeriods.filter((p) => new Date(p.start_date).getMonth() === monthIndex);

            let income = 0;
            let expenses = 0;
            let isClosed = false;

            if (monthPeriods.length > 0) {
                monthPeriods.forEach((p) => {
                    if (p.status === 'closed') {
                        income += Number(p.total_income || 0);
                        expenses += Number(p.total_expenses || 0);
                        isClosed = true;
                    } else {
                        const periodTx = transactions.filter((t) => t.period_id === p.id);
                        income += periodTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                        expenses += periodTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                    }
                });
            } else {
                const monthTx = transactions.filter((t) => {
                    if (t.period_id) return false;
                    const d = new Date(t.transaction_date);
                    return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
                });
                income = monthTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
                expenses = monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
            }

            const net = income - expenses;
            return { month: MONTHS[monthIndex], monthIndex, income, expenses, net, margin: income > 0 ? (net / income) * 100 : 0, isClosed, periods: monthPeriods };
        });

        const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
        const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
        const totalNet = totalIncome - totalExpenses;
        const avgMargin = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;

        const monthsWithData = monthlyData.filter((m) => m.income > 0 || m.expenses > 0);
        const bestMonth = monthsWithData.length > 0 ? monthsWithData.reduce((b, c) => (c.net > b.net ? c : b)) : null;
        const worstMonth = monthsWithData.length > 0 ? monthsWithData.reduce((w, c) => (c.net < w.net ? c : w)) : null;

        const prevYear = selectedYear - 1;
        const prevYearPeriods = periods.filter((p) => new Date(p.start_date).getFullYear() === prevYear);
        const prevYearIncome = prevYearPeriods.reduce((s, p) => s + Number(p.total_income || 0), 0);
        const prevYearExpenses = prevYearPeriods.reduce((s, p) => s + Number(p.total_expenses || 0), 0);
        const prevYearNet = prevYearIncome - prevYearExpenses;

        const incomeGrowth = prevYearIncome > 0 ? ((totalIncome - prevYearIncome) / prevYearIncome) * 100 : null;
        const netGrowth = prevYearNet !== 0 ? ((totalNet - prevYearNet) / Math.abs(prevYearNet)) * 100 : null;

        return {
            currency, monthlyData, totalIncome, totalExpenses, totalNet, avgMargin,
            bestMonth, worstMonth, prevYearIncome, prevYearExpenses, prevYearNet,
            incomeGrowth, netGrowth,
            closedPeriods: yearPeriods.filter((p) => p.status === 'closed').length,
            openPeriods: yearPeriods.filter((p) => p.status === 'open').length,
        };
    }, [periods, transactions, config, selectedYear]);

    const chartMax = useMemo(() => {
        const maxI = Math.max(...yearlyData.monthlyData.map((m) => m.income));
        const maxE = Math.max(...yearlyData.monthlyData.map((m) => m.expenses));
        return Math.max(maxI, maxE) * 1.1;
    }, [yearlyData.monthlyData]);

    const exportToCSV = () => {
        const headers = ['Mes', 'Ingresos', 'Gastos', 'Ganancia Neta', 'Margen %', 'Estado'];
        const rows = yearlyData.monthlyData.map((m) => [
            m.month, m.income, m.expenses, m.net,
            m.income > 0 ? ((m.net / m.income) * 100).toFixed(2) : 0,
            m.isClosed ? 'Cerrado' : 'Abierto',
        ]);
        const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte-financiero-${selectedYear}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 font-product text-neutral-900">
            {/* Header + year nav */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Análisis anual</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">Reportes anuales</h2>
                    <p className="mt-1 text-sm text-neutral-500">Análisis completo con comparativas, tendencias y métricas clave.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedYear((y) => y - 1)} className="rounded-2xl border border-neutral-200 p-3 hover:border-neutral-300 transition"><ChevronLeft size={18} /></button>
                    <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-3 font-semibold text-lg min-w-[120px] text-center">{selectedYear}</div>
                    <button onClick={() => setSelectedYear((y) => y + 1)} disabled={selectedYear >= new Date().getFullYear()} className="rounded-2xl border border-neutral-200 p-3 hover:border-neutral-300 transition disabled:opacity-50"><ChevronRight size={18} /></button>
                    <button onClick={exportToCSV} className="ml-4 inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">
                        <Download size={16} /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard icon={DollarSign} label="Total facturado" value={formatFinanceCurrency(yearlyData.totalIncome)}
                        sub={yearlyData.incomeGrowth !== null
                            ? <span className={yearlyData.incomeGrowth >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{yearlyData.incomeGrowth >= 0 ? '+' : ''}{yearlyData.incomeGrowth.toFixed(1)}% vs año anterior</span>
                            : 'Sin datos del año anterior'}
                        color="text-emerald-600" />
                </motion.div>
                <motion.div variants={itemVariants}><FinanceKpiCard icon={TrendingDown} label="Total gastado" value={formatFinanceCurrency(yearlyData.totalExpenses)} color="text-rose-500" /></motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard icon={TrendingUp} label="Ganancia neta" value={formatFinanceCurrency(yearlyData.totalNet)}
                        sub={yearlyData.netGrowth !== null
                            ? <span className={yearlyData.netGrowth >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{yearlyData.netGrowth >= 0 ? '+' : ''}{yearlyData.netGrowth.toFixed(1)}% vs año anterior</span>
                            : 'Sin datos del año anterior'}
                        color={yearlyData.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
                </motion.div>
                <motion.div variants={itemVariants}><FinanceKpiCard icon={BarChart3} label="Margen anual" value={`${yearlyData.avgMargin.toFixed(1)}%`} color={yearlyData.avgMargin >= 0 ? 'text-skyblue' : 'text-rose-500'} /></motion.div>
            </motion.div>

            {/* Best/worst month */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2">
                {yearlyData.bestMonth && (
                    <motion.div variants={itemVariants} className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2"><Award size={18} /><span className="text-xs uppercase tracking-[0.25em] font-semibold">Mejor mes</span></div>
                        <p className="text-2xl font-bold text-neutral-900">{yearlyData.bestMonth.month}</p>
                        <p className="text-emerald-600 font-semibold">{formatFinanceCurrency(yearlyData.bestMonth.net)} de ganancia</p>
                    </motion.div>
                )}
                {yearlyData.worstMonth && yearlyData.worstMonth.net < 0 && (
                    <motion.div variants={itemVariants} className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5">
                        <div className="flex items-center gap-2 text-rose-600 mb-2"><AlertTriangle size={18} /><span className="text-xs uppercase tracking-[0.25em] font-semibold">Peor mes</span></div>
                        <p className="text-2xl font-bold text-neutral-900">{yearlyData.worstMonth.month}</p>
                        <p className="text-rose-600 font-semibold">{formatFinanceCurrency(yearlyData.worstMonth.net)} de pérdida</p>
                    </motion.div>
                )}
            </motion.div>

            {/* Bar chart */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Visualización</p>
                        <h3 className="mt-2 text-2xl font-black">Ingresos vs Gastos por mes</h3>
                    </div>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500"></span><span className="text-neutral-500">Ingresos</span></div>
                        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-rose-500"></span><span className="text-neutral-500">Gastos</span></div>
                    </div>
                </div>
                <div className="h-64 flex items-end justify-between gap-2">
                    {yearlyData.monthlyData.map((month) => {
                        const iH = chartMax > 0 ? (month.income / chartMax) * 100 : 0;
                        const eH = chartMax > 0 ? (month.expenses / chartMax) * 100 : 0;
                        return (
                            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full flex gap-0.5 justify-center h-48 items-end">
                                    <div className="w-full max-w-[20px] rounded-t bg-emerald-500 transition-all" style={{ height: `${iH}%` }} title={`Ingresos: ${formatFinanceCurrency(month.income)}`} />
                                    <div className="w-full max-w-[20px] rounded-t bg-rose-500 transition-all" style={{ height: `${eH}%` }} title={`Gastos: ${formatFinanceCurrency(month.expenses)}`} />
                                </div>
                                <span className="text-[10px] text-neutral-400 uppercase">{month.month.slice(0, 3)}</span>
                            </div>
                        );
                    })}
                </div>
            </motion.section>

            {/* Period summary table */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Detalle</p>
                        <h3 className="mt-2 text-2xl font-black">Resumen por período</h3>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">{yearlyData.closedPeriods} cerrados</span>
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">{yearlyData.openPeriods} abiertos</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400 border-b border-neutral-200">
                                <th className="pb-4 pr-4 font-medium">Período</th>
                                <th className="pb-4 pr-4 font-medium text-right">Ingresos</th>
                                <th className="pb-4 pr-4 font-medium text-right">Gastos</th>
                                <th className="pb-4 pr-4 font-medium text-right">Ganancia</th>
                                <th className="pb-4 pr-4 font-medium text-right">Margen</th>
                                <th className="pb-4 font-medium text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {yearlyData.monthlyData.filter((m) => m.income > 0 || m.expenses > 0).map((month) => (
                                <tr key={month.month} className="hover:bg-neutral-50">
                                    <td className="py-4 pr-4 font-medium text-neutral-900">{month.month} {selectedYear}</td>
                                    <td className="py-4 pr-4 text-right text-emerald-600 font-semibold">{formatFinanceCurrency(month.income)}</td>
                                    <td className="py-4 pr-4 text-right text-rose-500 font-semibold">{formatFinanceCurrency(month.expenses)}</td>
                                    <td className="py-4 pr-4 text-right"><span className={`font-bold ${month.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatFinanceCurrency(month.net)}</span></td>
                                    <td className="py-4 pr-4 text-right"><span className={`text-sm ${month.margin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{month.income > 0 ? `${month.margin.toFixed(1)}%` : '—'}</span></td>
                                    <td className="py-4 text-center"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${month.isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{month.isClosed ? 'Cerrado' : 'Abierto'}</span></td>
                                </tr>
                            ))}
                            <tr className="bg-neutral-50 font-semibold">
                                <td className="py-4 pr-4 text-neutral-900">TOTAL AÑO</td>
                                <td className="py-4 pr-4 text-right text-emerald-600">{formatFinanceCurrency(yearlyData.totalIncome)}</td>
                                <td className="py-4 pr-4 text-right text-rose-500">{formatFinanceCurrency(yearlyData.totalExpenses)}</td>
                                <td className="py-4 pr-4 text-right"><span className={yearlyData.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{formatFinanceCurrency(yearlyData.totalNet)}</span></td>
                                <td className="py-4 pr-4 text-right text-neutral-900">{yearlyData.totalIncome > 0 ? `${yearlyData.avgMargin.toFixed(1)}%` : '—'}</td>
                                <td className="py-4"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </motion.section>

            {/* YoY comparison */}
            {yearlyData.prevYearIncome > 0 && (
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <h3 className="text-2xl font-black mb-4">Comparativa con {selectedYear - 1}</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="rounded-2xl bg-neutral-50 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Ingresos {selectedYear - 1}</p>
                            <p className="mt-1 text-xl font-bold">{formatFinanceCurrency(yearlyData.prevYearIncome)}</p>
                        </div>
                        <div className="rounded-2xl bg-neutral-50 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Gastos {selectedYear - 1}</p>
                            <p className="mt-1 text-xl font-bold">{formatFinanceCurrency(yearlyData.prevYearExpenses)}</p>
                        </div>
                        <div className="rounded-2xl bg-neutral-50 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Ganancia {selectedYear - 1}</p>
                            <p className={`mt-1 text-xl font-bold ${yearlyData.prevYearNet >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatFinanceCurrency(yearlyData.prevYearNet)}</p>
                        </div>
                    </div>
                </motion.section>
            )}
        </div>
    );
};

export default ReportsTab;
