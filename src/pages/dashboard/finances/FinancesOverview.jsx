import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    CalendarRange,
    Edit3,
    Landmark,
    PiggyBank,
    Plus,
    Receipt,
    Settings2,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import PeriodCard from '@/components/finances/PeriodCard';
import TransactionModal from '@/components/finances/TransactionModal';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceCategoryLabel,
} from '@/utils/finance';

const FinancesOverview = () => {
    const { profile, loading } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [config, setConfig] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [createForm, setCreateForm] = useState({ name: '', start_date: '', end_date: '' });

    const isAdmin = profile?.role === 'admin';

    const fetchOverview = useCallback(async () => {
        setFetching(true);
        setError('');

        const [
            { data: configData, error: configError },
            { data: periodsData, error: periodsError },
            { data: transactionsData, error: transactionsError },
            { data: distributionsData, error: distributionsError },
            { data: invoicesData, error: invoicesError },
            { data: projectsData, error: projectsError },
        ] = await Promise.all([
            supabase.from('finance_config').select('*').limit(1).maybeSingle(),
            supabase.from('finance_periods').select('*').order('start_date', { ascending: false }),
            supabase
                .from('finance_transactions')
                .select('id, type, amount, currency, description, category, transaction_date, period_id, source, project_id, invoice_id, project:projects(id, name)')
                .order('transaction_date', { ascending: false }),
            supabase.from('finance_distributions').select('amount_pending, currency'),
            supabase.from('invoices').select('id, invoice_number, amount, currency, status').eq('status', 'paid'),
            supabase.from('projects').select('id, name').order('created_at', { ascending: false }),
        ]);

        if (configError || periodsError || transactionsError || distributionsError || invoicesError || projectsError) {
            const message = configError?.message || periodsError?.message || transactionsError?.message || distributionsError?.message || invoicesError?.message || projectsError?.message;
            console.error('Error fetching finance overview:', { configError, periodsError, transactionsError, distributionsError, invoicesError, projectsError });
            setError(message || 'No pudimos cargar el módulo financiero.');
            setFetching(false);
            return;
        }

        setConfig(configData || null);
        setPeriods(periodsData || []);
        setTransactions(transactionsData || []);
        setDistributions(distributionsData || []);
        setInvoices(invoicesData || []);
        setProjects(projectsData || []);
        setFetching(false);
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchOverview();
    }, [fetchOverview, isAdmin]);

    // ─── KPIs: sum ALL transactions regardless of period assignment ───────────
    const summary = useMemo(() => {
        const currency = config?.default_currency || 'USD';
        const income = transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const pendingPayouts = distributions.reduce((sum, d) => sum + Number(d.amount_pending || 0), 0);
        return { income, expenses, net: income - expenses, pendingPayouts, currency };
    }, [config?.default_currency, distributions, transactions]);

    // ─── Periods: compute live totals per period ──────────────────────────────
    const periodsWithTotals = useMemo(() => {
        const byPeriod = transactions.reduce((acc, t) => {
            if (!t.period_id) return acc;
            const cur = acc[t.period_id] || { income: 0, expenses: 0, currency: t.currency || 'USD' };
            if (t.type === 'income') cur.income += Number(t.amount || 0);
            if (t.type === 'expense') cur.expenses += Number(t.amount || 0);
            acc[t.period_id] = cur;
            return acc;
        }, {});

        return periods.map((p) => {
            const live = byPeriod[p.id];
            // For open periods, use live data. For closed, use stored snapshot.
            const totalIncome = p.status === 'open' && live ? live.income : Number(p.total_income || 0);
            const totalExpenses = p.status === 'open' && live ? live.expenses : Number(p.total_expenses || 0);
            return {
                ...p,
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_profit: totalIncome - totalExpenses,
                currency: live?.currency || config?.default_currency || 'USD',
            };
        });
    }, [config?.default_currency, periods, transactions]);

    // ─── Expenses list for the inline section ────────────────────────────────
    const expenseTransactions = useMemo(
        () => transactions.filter((t) => t.type === 'expense'),
        [transactions]
    );

    // ─── Alert: paid invoices not yet in ledger ───────────────────────────────
    const unsyncedInvoiceCount = useMemo(() => {
        const importedIds = new Set(transactions.map((t) => t.invoice_id).filter(Boolean));
        return invoices.filter((inv) => !importedIds.has(inv.id)).length;
    }, [invoices, transactions]);

    // ─── Create period ────────────────────────────────────────────────────────
    const handleCreatePeriod = async (event) => {
        event.preventDefault();
        if (!createForm.name || !createForm.start_date || !createForm.end_date) return;
        setSaving(true);
        setError('');
        const { error: insertError } = await supabase
            .from('finance_periods')
            .insert([{ ...createForm, created_by: profile?.id || null }]);
        if (insertError) {
            setError(insertError.message || 'No pudimos crear el período.');
            setSaving(false);
            return;
        }
        setCreateForm({ name: '', start_date: '', end_date: '' });
        setSaving(false);
        await fetchOverview();
    };

    const openEditExpense = (tx) => {
        setEditingTransaction(tx);
        setModalOpen(true);
    };

    const openNewExpense = () => {
        setEditingTransaction(null);
        setModalOpen(true);
    };

    if (loading || (isAdmin && fetching)) return <LoadingFallback type="spinner" />;
    if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

    return (
        <div className="pb-16 font-product text-neutral-900">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Finanzas internas</p>
                    <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Caja y dividendos</h1>
                    <p className="mt-3 max-w-2xl text-lg text-neutral-500">
                        Los cobros de facturas entran solos. Acá registrás gastos, cerrás períodos y repartís ganancias.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/dashboard/finances/ledger"
                        className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300"
                    >
                        <Receipt size={16} />
                        Ver todos los movimientos
                    </Link>
                    <Link
                        to="/dashboard/finances/settings"
                        className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                        <Settings2 size={16} />
                        Configurar reparto
                    </Link>
                </div>
            </div>

            {error && (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {unsyncedInvoiceCount > 0 && (
                <div className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>
                        Hay {unsyncedInvoiceCount} factura(s) cobrada(s) que todavía no se reflejaron en finanzas automáticamente.
                        {' '}<Link to="/dashboard/finances/ledger" className="font-semibold underline">Ver movimientos</Link>
                    </span>
                </div>
            )}

            {/* ── KPIs ───────────────────────────────────────────────────────── */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceKpiCard
                    icon={TrendingUp}
                    label="Cobrado de clientes"
                    value={formatFinanceCurrency(summary.income, summary.currency)}
                    sub="Facturas pagadas sincronizadas automáticamente."
                    color="text-emerald-600"
                />
                <FinanceKpiCard
                    icon={TrendingDown}
                    label="Gastos registrados"
                    value={formatFinanceCurrency(summary.expenses, summary.currency)}
                    sub="Herramientas, publicidad, pagos a workers, etc."
                    color="text-rose-500"
                />
                <FinanceKpiCard
                    icon={PiggyBank}
                    label="Ganancia neta"
                    value={formatFinanceCurrency(summary.net, summary.currency)}
                    sub="Lo que queda después de restar todos los gastos."
                    color={summary.net >= 0 ? 'text-neutral-900' : 'text-rose-500'}
                />
                <FinanceKpiCard
                    icon={Wallet}
                    label="Dividendos pendientes"
                    value={formatFinanceCurrency(summary.pendingPayouts, summary.currency)}
                    sub="Ganancias calculadas en cierres que aún no se pagaron."
                    color={summary.pendingPayouts > 0 ? 'text-amber-600' : 'text-neutral-900'}
                />
            </div>

            {/* ── Main grid ──────────────────────────────────────────────────── */}
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr,0.6fr]">

                {/* ── Gastos ─────────────────────────────────────────────────── */}
                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Egresos</p>
                            <h2 className="mt-2 text-2xl font-black">Gastos de la empresa</h2>
                            <p className="mt-2 text-sm text-neutral-500">
                                Todo lo que salió de caja: herramientas, publicidad, pagos a workers y otros.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openNewExpense}
                            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                        >
                            <Plus size={16} />
                            Registrar gasto
                        </button>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-100">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400">
                                    <th className="pb-4 pr-4 font-medium">Fecha</th>
                                    <th className="pb-4 pr-4 font-medium">Detalle</th>
                                    <th className="pb-4 pr-4 font-medium">Categoría</th>
                                    <th className="pb-4 pr-4 font-medium text-right">Monto</th>
                                    <th className="pb-4 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {expenseTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-sm text-neutral-500">
                                            Todavía no hay gastos registrados.
                                        </td>
                                    </tr>
                                )}
                                {expenseTransactions.slice(0, 10).map((tx) => (
                                    <tr key={tx.id} className="group align-middle">
                                        <td className="py-3 pr-4 text-sm text-neutral-500 whitespace-nowrap">
                                            {formatFinanceDate(tx.transaction_date)}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <p className="font-semibold text-neutral-900">{tx.description || 'Sin descripción'}</p>
                                            {tx.project && (
                                                <p className="text-xs text-neutral-400">{tx.project.name}</p>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-neutral-500">
                                            {getFinanceCategoryLabel('expense', tx.category)}
                                        </td>
                                        <td className="py-3 pr-4 text-right font-semibold text-rose-500 whitespace-nowrap">
                                            -{formatFinanceCurrency(tx.amount, tx.currency)}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => openEditExpense(tx)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 opacity-0 transition hover:border-neutral-300 hover:text-neutral-900 group-hover:opacity-100"
                                            >
                                                <Edit3 size={12} />
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {expenseTransactions.length > 10 && (
                            <div className="mt-4 text-center">
                                <Link
                                    to="/dashboard/finances/ledger"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
                                >
                                    Ver los {expenseTransactions.length - 10} gastos restantes
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Sidebar: Períodos + Nuevo período ──────────────────────── */}
                <div className="space-y-6">
                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Reparto</p>
                        <h2 className="mt-2 text-xl font-black">Nuevo período</h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            Al cerrarlo, el sistema calcula cuánto le corresponde a cada uno.
                        </p>

                        <form onSubmit={handleCreatePeriod} className="mt-4 space-y-3">
                            <input
                                type="text"
                                value={createForm.name}
                                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Nombre (ej. Marzo 2026)"
                                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="date"
                                    value={createForm.start_date}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, start_date: e.target.value }))}
                                    className="w-full rounded-2xl border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-neutral-400"
                                />
                                <input
                                    type="date"
                                    value={createForm.end_date}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, end_date: e.target.value }))}
                                    className="w-full rounded-2xl border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-neutral-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                            >
                                <CalendarRange size={15} />
                                {saving ? 'Creando...' : 'Crear período'}
                            </button>
                        </form>

                        <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                            <span className="font-semibold text-neutral-700">Reparto actual: </span>
                            Francisco {config?.pct_francisco ?? 40}% · Federico {config?.pct_federico ?? 30}% · Workers {config?.pct_workers ?? 15}% · Empresa {config?.pct_company ?? 15}%
                        </div>
                    </section>

                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Cierres</p>
                                <h2 className="mt-1 text-xl font-black">Períodos</h2>
                            </div>
                            <Landmark size={18} className="text-neutral-300" />
                        </div>

                        <div className="space-y-3">
                            {periodsWithTotals.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                                    Creá el primer período para empezar a cerrar resultados.
                                </div>
                            )}
                            {periodsWithTotals.map((p) => (
                                <PeriodCard key={p.id} period={p} />
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <TransactionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchOverview}
                periods={periods}
                projects={projects}
                invoices={[]}
                initialValues={editingTransaction}
                defaultType="expense"
            />
        </div>
    );
};

export default FinancesOverview;
