import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    ArrowRight, 
    Calendar, 
    DollarSign, 
    TrendingDown, 
    TrendingUp, 
    Wallet,
    AlertCircle,
    Clock,
    ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency, formatFinanceDate } from '@/utils/finance';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const FinancesCashflow = () => {
    const { profile, loading } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [config, setConfig] = useState(null);
    const [currentPeriod, setCurrentPeriod] = useState(null);

    const isAdmin = profile?.role === 'admin';

    const fetchCashflowData = useCallback(async () => {
        setFetching(true);
        setError('');

        const today = new Date().toISOString().split('T')[0];

        try {
            const [
                { data: configData, error: configError },
                { data: transactionsData, error: transactionsError },
                { data: invoicesData, error: invoicesError },
                { data: periodData, error: periodError },
            ] = await Promise.all([
                supabase.from('finance_config').select('*').limit(1).maybeSingle(),
                supabase
                    .from('finance_transactions')
                    .select('id, type, amount, currency, description, category, transaction_date, paid_at, project_id, project:projects(id, name)')
                    .order('transaction_date', { ascending: false }),
                supabase
                    .from('invoices')
                    .select('id, invoice_number, amount, currency, status, due_date, paid_at, project_id, project:projects(id, name), description')
                    .in('status', ['pending', 'overdue'])
                    .order('due_date', { ascending: true }),
                supabase
                    .from('finance_periods')
                    .select('*')
                    .lte('start_date', today)
                    .gte('end_date', today)
                    .eq('status', 'open')
                    .maybeSingle(),
            ]);

            if (configError || transactionsError || invoicesError) {
                throw new Error(configError?.message || transactionsError?.message || invoicesError?.message);
            }

            setConfig(configData || null);
            setTransactions(transactionsData || []);
            setInvoices(invoicesData || []);
            setCurrentPeriod(periodData);
        } catch (err) {
            console.error('Error fetching cashflow data:', err);
            setError(err.message || 'No pudimos cargar los datos de cash flow.');
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchCashflowData();
    }, [fetchCashflowData, isAdmin]);

    // ─── Cálculos de Cash Flow ───────────────────────────────────────────────
    const cashflowData = useMemo(() => {
        const currency = config?.default_currency || 'USD';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Caja actual: transacciones realizadas (ingresos - gastos)
        const completedTransactions = transactions.filter(t => {
            const txDate = new Date(t.transaction_date);
            return txDate <= today;
        });

        const currentIncome = completedTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        
        const currentExpenses = completedTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const currentBalance = currentIncome - currentExpenses;

        // Por cobrar: facturas pending/overdue
        const receivables = invoices
            .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
            .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

        // Por pagar: gastos registrados pero no pagados (paid_at es null)
        const unpaidExpenses = transactions
            .filter(t => t.type === 'expense' && !t.paid_at)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // Timeline de los próximos 90 días
        const timeline = [];
        for (let i = 0; i <= 90; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Ingresos esperados para este día (facturas con due_date)
            const dayInvoices = invoices.filter(inv => {
                if (!inv.due_date) return false;
                const dueDate = new Date(inv.due_date).toISOString().split('T')[0];
                return dueDate === dateStr;
            });
            const dayIncome = dayInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

            // Gastos programados para este día
            const dayExpenses = transactions.filter(t => {
                if (t.type !== 'expense') return false;
                const txDate = new Date(t.transaction_date).toISOString().split('T')[0];
                return txDate === dateStr && !t.paid_at;
            });
            const dayExpense = dayExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

            // Saldo proyectado acumulado
            const projectedBalance = i === 0 
                ? currentBalance + dayIncome - dayExpense
                : (timeline[i-1]?.projectedBalance || currentBalance) + dayIncome - dayExpense;

            timeline.push({
                date: dateStr,
                dateObj: new Date(date),
                dayIncome,
                dayExpense,
                projectedBalance,
                invoices: dayInvoices,
                expenses: dayExpenses,
            });
        }

        // Proyecciones a 30, 60, 90 días
        const projection30 = timeline[29]?.projectedBalance || currentBalance;
        const projection60 = timeline[59]?.projectedBalance || currentBalance;
        const projection90 = timeline[89]?.projectedBalance || currentBalance;

        return {
            currency,
            currentBalance,
            receivables,
            unpaidExpenses,
            projection30,
            projection60,
            projection90,
            timeline,
            currentIncome,
            currentExpenses,
        };
    }, [transactions, invoices, config]);

    // Datos para el gráfico de área simple
    const chartData = useMemo(() => {
        // Tomar puntos clave: hoy, y luego cada 7 días
        const points = [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 90]
            .map(day => cashflowData.timeline[day])
            .filter(Boolean);
        
        const maxValue = Math.max(...points.map(p => Math.max(p.projectedBalance, 0)));
        const minValue = Math.min(...points.map(p => p.projectedBalance));
        const range = maxValue - minValue || 1;

        return points.map(p => ({
            ...p,
            yPercent: ((p.projectedBalance - minValue) / range) * 80 + 10, // 10% a 90% del SVG
        }));
    }, [cashflowData.timeline]);

    if (loading || (isAdmin && fetching)) return <LoadingFallback type="spinner" />;
    if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

    return (
        <div className="pb-16 font-product text-neutral-900">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        to="/dashboard/finances"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
                    >
                        <ArrowLeft size={15} />
                        Volver a finanzas
                    </Link>
                    <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Cash Flow</h1>
                    <p className="mt-3 max-w-2xl text-lg text-neutral-500">
                        Proyección de ingresos y gastos. Visualiza la salud financiera de los próximos 90 días.
                    </p>
                </div>
                {currentPeriod && (
                    <div className="rounded-2xl border border-skyblue/20 bg-skyblue/5 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.25em] text-skyblue">Período actual</p>
                        <p className="font-semibold text-neutral-900">{currentPeriod.name}</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-6 flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* ── KPIs principales ───────────────────────────────────────────── */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={Wallet}
                        label="Caja actual"
                        value={formatFinanceCurrency(cashflowData.currentBalance, cashflowData.currency)}
                        sub="Ingresos realizados - Gastos realizados"
                        color={cashflowData.currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={TrendingUp}
                        label="Por cobrar"
                        value={formatFinanceCurrency(cashflowData.receivables, cashflowData.currency)}
                        sub={`${invoices.length} facturas pendientes`}
                        color="text-skyblue"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={TrendingDown}
                        label="Por pagar"
                        value={formatFinanceCurrency(cashflowData.unpaidExpenses, cashflowData.currency)}
                        sub="Gastos registrados sin pagar"
                        color="text-amber-600"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={Calendar}
                        label="Proyección 90 días"
                        value={formatFinanceCurrency(cashflowData.projection90, cashflowData.currency)}
                        sub={`${cashflowData.projection90 >= cashflowData.currentBalance ? '+' : ''}${formatFinanceCurrency(cashflowData.projection90 - cashflowData.currentBalance, cashflowData.currency)} vs. hoy`}
                        color={cashflowData.projection90 >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                    />
                </motion.div>
            </motion.div>

            {/* ── Gráfico de proyección y tabla ──────────────────────────────── */}
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                {/* Gráfico de área */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Proyección</p>
                            <h2 className="mt-2 text-2xl font-black">Evolución de caja</h2>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span className="text-neutral-500">Positivo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                <span className="text-neutral-500">Negativo</span>
                            </div>
                        </div>
                    </div>

                    {/* SVG Chart */}
                    <div className="mt-6 relative h-64 w-full">
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e5e5" strokeWidth="0.5" />
                            ))}
                            
                            {/* Area under the curve */}
                            {chartData.length > 1 && (
                                <>
                                    <defs>
                                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d={`M 0,100 ${chartData.map((p, i) => `${i === 0 ? 'L' : ''} ${(i / (chartData.length - 1)) * 100},${100 - p.yPercent}`).join(' ')} L 100,100 Z`}
                                        fill="url(#areaGradient)"
                                    />
                                    <path
                                        d={`M 0,${100 - chartData[0].yPercent} ${chartData.map((p, i) => `L ${(i / (chartData.length - 1)) * 100},${100 - p.yPercent}`).join(' ')}`}
                                        fill="none"
                                        stroke="#0ea5e9"
                                        strokeWidth="1.5"
                                    />
                                    {/* Zero line */}
                                    <line 
                                        x1="0" 
                                        y1={chartData.find(p => p.projectedBalance === 0)?.yPercent ? 100 - chartData.find(p => p.projectedBalance === 0).yPercent : 50}
                                        x2="100" 
                                        y2={chartData.find(p => p.projectedBalance === 0)?.yPercent ? 100 - chartData.find(p => p.projectedBalance === 0).yPercent : 50}
                                        stroke="#a3a3a3" 
                                        strokeWidth="0.5" 
                                        strokeDasharray="2,2"
                                    />
                                </>
                            )}
                        </svg>
                        
                        {/* X-axis labels */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-neutral-400">
                            <span>Hoy</span>
                            <span>30 días</span>
                            <span>60 días</span>
                            <span>90 días</span>
                        </div>
                    </div>

                    {/* Proyecciones resumen */}
                    <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-neutral-50 p-4">
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">30 días</p>
                            <p className={`mt-1 text-lg font-bold ${cashflowData.projection30 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {formatFinanceCurrency(cashflowData.projection30, cashflowData.currency)}
                            </p>
                        </div>
                        <div className="text-center border-x border-neutral-200">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">60 días</p>
                            <p className={`mt-1 text-lg font-bold ${cashflowData.projection60 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {formatFinanceCurrency(cashflowData.projection60, cashflowData.currency)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">90 días</p>
                            <p className={`mt-1 text-lg font-bold ${cashflowData.projection90 >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {formatFinanceCurrency(cashflowData.projection90, cashflowData.currency)}
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Facturas pendientes */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Ingresos esperados</p>
                            <h2 className="mt-2 text-xl font-black">Facturas por cobrar</h2>
                        </div>
                        <DollarSign size={20} className="text-skyblue" />
                    </div>

                    <div className="mt-4 max-h-80 overflow-y-auto space-y-3">
                        {invoices.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                                No hay facturas pendientes
                            </div>
                        ) : (
                            invoices.slice(0, 10).map((invoice) => {
                                const isOverdue = invoice.status === 'overdue';
                                const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
                                const daysUntil = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

                                return (
                                    <div key={invoice.id} className="rounded-2xl border border-neutral-200 p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-neutral-900 text-sm">
                                                    {invoice.invoice_number || 'Factura sin número'}
                                                </p>
                                                {invoice.project && (
                                                    <p className="text-xs text-neutral-400">{invoice.project.name}</p>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {isOverdue ? 'Vencida' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <p className="font-bold text-neutral-900">
                                                {formatFinanceCurrency(invoice.amount, invoice.currency)}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-neutral-500">
                                                <Clock size={12} />
                                                {daysUntil !== null ? (
                                                    daysUntil < 0 
                                                        ? `Venció hace ${Math.abs(daysUntil)} días`
                                                        : daysUntil === 0 
                                                            ? 'Vence hoy'
                                                            : `Vence en ${daysUntil} días`
                                                ) : 'Sin fecha'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {invoices.length > 10 && (
                        <Link 
                            to="/dashboard/invoices" 
                            className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
                        >
                            Ver todas las facturas
                            <ChevronRight size={14} />
                        </Link>
                    )}
                </motion.section>
            </div>

            {/* ── Timeline detallado ─────────────────────────────────────────── */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Detalle</p>
                        <h2 className="mt-2 text-2xl font-black">Timeline de caja (próximos 30 días)</h2>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400 border-b border-neutral-200">
                                <th className="pb-3 pr-4 font-medium">Fecha</th>
                                <th className="pb-3 pr-4 font-medium">Ingresos esperados</th>
                                <th className="pb-3 pr-4 font-medium">Gastos programados</th>
                                <th className="pb-3 pr-4 font-medium text-right">Saldo proyectado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {cashflowData.timeline.slice(0, 30).filter(day => day.dayIncome > 0 || day.dayExpense > 0 || day.date === new Date().toISOString().split('T')[0]).map((day, index) => (
                                <tr key={day.date} className={day.date === new Date().toISOString().split('T')[0] ? 'bg-skyblue/5' : ''}>
                                    <td className="py-3 pr-4 text-sm">
                                        <span className="font-medium text-neutral-900">
                                            {formatFinanceDate(day.date)}
                                        </span>
                                        {day.date === new Date().toISOString().split('T')[0] && (
                                            <span className="ml-2 text-[10px] px-2 py-0.5 bg-skyblue text-white rounded-full">Hoy</span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 text-sm">
                                        {day.dayIncome > 0 ? (
                                            <span className="text-emerald-600 font-semibold">
                                                +{formatFinanceCurrency(day.dayIncome, cashflowData.currency)}
                                            </span>
                                        ) : (
                                            <span className="text-neutral-300">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 text-sm">
                                        {day.dayExpense > 0 ? (
                                            <span className="text-rose-500 font-semibold">
                                                -{formatFinanceCurrency(day.dayExpense, cashflowData.currency)}
                                            </span>
                                        ) : (
                                            <span className="text-neutral-300">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 pr-4 text-right">
                                        <span className={`font-bold ${day.projectedBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {formatFinanceCurrency(day.projectedBalance, cashflowData.currency)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.section>
        </div>
    );
};

export default FinancesCashflow;
