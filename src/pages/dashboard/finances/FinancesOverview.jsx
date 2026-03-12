import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, CalendarRange, Landmark, PiggyBank, Plus, Receipt, Settings2, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import PeriodCard from '@/components/finances/PeriodCard';
import { formatFinanceCurrency, getInvoiceDisplayLabel } from '@/utils/finance';

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
    const [createForm, setCreateForm] = useState({
        name: '',
        start_date: '',
        end_date: '',
    });

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
        ] = await Promise.all([
            supabase.from('finance_config').select('*').limit(1).maybeSingle(),
            supabase.from('finance_periods').select('*').order('start_date', { ascending: false }),
            supabase.from('finance_transactions').select('period_id, type, amount, currency, invoice_id'),
            supabase.from('finance_distributions').select('amount_earned, amount_paid, amount_pending, currency'),
            supabase.from('invoices').select('id, invoice_number, description, amount, currency, status, paid_at, updated_at, created_at').order('updated_at', { ascending: false }),
        ]);

        if (configError || periodsError || transactionsError || distributionsError || invoicesError) {
            const message = configError?.message || periodsError?.message || transactionsError?.message || distributionsError?.message || invoicesError?.message;
            console.error('Error fetching finance overview:', { configError, periodsError, transactionsError, distributionsError, invoicesError });
            setError(message || 'No pudimos cargar el módulo financiero.');
            setFetching(false);
            return;
        }

        setConfig(configData || null);
        setPeriods(periodsData || []);
        setTransactions(transactionsData || []);
        setDistributions(distributionsData || []);
        setInvoices(invoicesData || []);
        setFetching(false);
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchOverview();
    }, [fetchOverview, isAdmin]);

    const periodsWithTotals = useMemo(() => {
        const totalsByPeriod = transactions.reduce((acc, transaction) => {
            if (!transaction.period_id) return acc;
            const current = acc[transaction.period_id] || { income: 0, expenses: 0, currency: transaction.currency || 'USD' };
            if (transaction.type === 'income') current.income += Number(transaction.amount || 0);
            if (transaction.type === 'expense') current.expenses += Number(transaction.amount || 0);
            acc[transaction.period_id] = current;
            return acc;
        }, {});

        return periods.map((period) => {
            const liveTotals = totalsByPeriod[period.id];
            const totalIncome = liveTotals?.income ?? Number(period.total_income || 0);
            const totalExpenses = liveTotals?.expenses ?? Number(period.total_expenses || 0);
            return {
                ...period,
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_profit: totalIncome - totalExpenses,
                currency: liveTotals?.currency || config?.default_currency || 'USD',
            };
        });
    }, [config?.default_currency, periods, transactions]);

    const summary = useMemo(() => {
        const currency = config?.default_currency || periodsWithTotals[0]?.currency || 'USD';
        const totals = periodsWithTotals.reduce((acc, period) => ({
            income: acc.income + Number(period.total_income || 0),
            expenses: acc.expenses + Number(period.total_expenses || 0),
            profit: acc.profit + Number(period.net_profit || 0),
        }), { income: 0, expenses: 0, profit: 0 });

        const pendingPayouts = distributions.reduce((sum, distribution) => sum + Number(distribution.amount_pending || 0), 0);
        const openPeriods = periodsWithTotals.filter((period) => period.status === 'open').length;

        return { ...totals, pendingPayouts, openPeriods, currency };
    }, [config?.default_currency, distributions, periodsWithTotals]);

    const paidInvoicesPendingImport = useMemo(() => {
        const importedIds = new Set(transactions.map((transaction) => transaction.invoice_id).filter(Boolean));
        return invoices.filter((invoice) => invoice.status === 'paid' && !importedIds.has(invoice.id));
    }, [invoices, transactions]);

    const handleCreatePeriod = async (event) => {
        event.preventDefault();
        if (!createForm.name || !createForm.start_date || !createForm.end_date) return;

        setSaving(true);
        setError('');

        const { error: insertError } = await supabase
            .from('finance_periods')
            .insert([{
                ...createForm,
                created_by: profile?.id || null,
            }]);

        if (insertError) {
            console.error('Error creating finance period:', insertError);
            setError(insertError.message || 'No pudimos crear el período.');
            setSaving(false);
            return;
        }

        setCreateForm({ name: '', start_date: '', end_date: '' });
        setSaving(false);
        await fetchOverview();
    };

    if (loading || (isAdmin && fetching)) {
        return <LoadingFallback type="spinner" />;
    }

    if (!loading && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="pb-16 font-product text-neutral-900">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Finanzas internas</p>
                    <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Caja, períodos y dividendos</h1>
                    <p className="mt-3 max-w-3xl text-lg text-neutral-500">
                        Centralizá ingresos, gastos y distribución de ganancias en un flujo simple: las facturas cobradas entran solas a finanzas, y vos completás gastos, weights y cierres.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/dashboard/finances/ledger"
                        className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900"
                    >
                        <Wallet size={16} />
                        Ver ledger
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

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FinanceKpiCard
                    icon={Wallet}
                    label="Ingresos acumulados"
                    value={formatFinanceCurrency(summary.income, summary.currency)}
                    sub="Suma de ingresos registrados en todos los períodos."
                    color="text-emerald-600"
                />
                <FinanceKpiCard
                    icon={Landmark}
                    label="Gastos acumulados"
                    value={formatFinanceCurrency(summary.expenses, summary.currency)}
                    sub="Egresos manuales cargados en el libro contable."
                    color="text-rose-500"
                />
                <FinanceKpiCard
                    icon={PiggyBank}
                    label="Ganancia neta"
                    value={formatFinanceCurrency(summary.profit, summary.currency)}
                    sub="Resultado operativo calculado sobre ingresos menos gastos."
                    color="text-neutral-900"
                />
                <FinanceKpiCard
                    icon={CalendarRange}
                    label="Pagos pendientes"
                    value={formatFinanceCurrency(summary.pendingPayouts, summary.currency)}
                    sub={`${summary.openPeriods} período(s) abierto(s) actualmente.`}
                    color="text-amber-600"
                />
                <FinanceKpiCard
                    icon={Receipt}
                    label="Facturas cobradas sin pasar"
                    value={paidInvoicesPendingImport.length}
                    sub="Si este número es mayor a cero, hay cobranzas que no se sincronizaron automáticamente."
                    color={paidInvoicesPendingImport.length > 0 ? 'text-amber-600' : 'text-neutral-900'}
                />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Períodos</p>
                            <h2 className="mt-2 text-2xl font-black">Historial financiero</h2>
                        </div>
                        <Link
                            to="/dashboard/finances/ledger"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-900"
                        >
                            Ir al ledger
                            <ArrowRight size={15} />
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4">
                        {periodsWithTotals.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-10 text-center text-neutral-500">
                                Todavía no hay períodos. Creá el primero para empezar a cerrar resultados.
                            </div>
                        )}

                        {periodsWithTotals.map((period) => (
                            <PeriodCard key={period.id} period={period} />
                        ))}
                    </div>
                </section>

                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Nuevo período</p>
                            <h2 className="mt-2 text-2xl font-black">Crear corte contable</h2>
                        </div>
                        <div className="rounded-2xl bg-neutral-100 px-4 py-2 text-sm text-neutral-500">
                            Reparto actual: {config?.pct_francisco ?? 40}% / {config?.pct_federico ?? 30}% / {config?.pct_workers ?? 15}% / {config?.pct_company ?? 15}%
                        </div>
                    </div>

                    <form onSubmit={handleCreatePeriod} className="mt-6 space-y-4">
                        <label className="block space-y-2 text-sm font-medium text-neutral-700">
                            Nombre del período
                            <input
                                type="text"
                                value={createForm.name}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                                placeholder="Ej. Marzo 2026"
                            />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block space-y-2 text-sm font-medium text-neutral-700">
                                Inicio
                                <input
                                    type="date"
                                    value={createForm.start_date}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, start_date: event.target.value }))}
                                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                                />
                            </label>

                            <label className="block space-y-2 text-sm font-medium text-neutral-700">
                                Fin
                                <input
                                    type="date"
                                    value={createForm.end_date}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, end_date: event.target.value }))}
                                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                                />
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={16} />
                            {saving ? 'Creando...' : 'Crear período'}
                        </button>
                    </form>

                    <div className="mt-6 rounded-3xl bg-neutral-50 p-5">
                        <p className="text-sm font-semibold text-neutral-900">Flujo recomendado</p>
                        <ol className="mt-3 space-y-2 text-sm text-neutral-600">
                            <li>1. Registrás ingresos y gastos en el ledger.</li>
                            <li>2. Asignás weights a los workers en el período.</li>
                            <li>3. Cerrás el período y el sistema calcula dividendos.</li>
                            <li>4. Marcás pagos a medida que realmente se realizan.</li>
                        </ol>
                    </div>
                </section>
            </div>

            <section className="mt-6 rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Integración con facturación</p>
                        <h2 className="mt-2 text-2xl font-black">Estado de sincronización de facturas</h2>
                    </div>
                    <Link
                        to="/dashboard/finances/ledger"
                        className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                    >
                        Ver ledger
                        <ArrowRight size={15} />
                    </Link>
                </div>

                <div className="mt-6 space-y-3">
                    {paidInvoicesPendingImport.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                            Todas las facturas `paid` ya quedaron reflejadas en finanzas automáticamente.
                        </div>
                    )}

                    {paidInvoicesPendingImport.slice(0, 5).map((invoice) => (
                        <div key={invoice.id} className="grid gap-3 rounded-2xl border border-neutral-200 p-4 md:grid-cols-[1.4fr,140px,160px] md:items-center">
                            <div>
                                <p className="font-semibold text-neutral-900">{getInvoiceDisplayLabel(invoice)}</p>
                                <p className="text-sm text-neutral-500">{invoice.description || 'Sin descripción adicional'}</p>
                            </div>
                            <div className="font-semibold text-emerald-600">
                                {formatFinanceCurrency(invoice.amount, invoice.currency)}
                            </div>
                            <div className="text-sm text-neutral-500">Estado: paid</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default FinancesOverview;
