import React, { useCallback, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CalendarRange,
    CheckCircle2,
    Edit3,
    Landmark,
    PiggyBank,
    Plus,
    Receipt,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import PeriodCard from '@/components/finances/PeriodCard';
import TransactionModal from '@/components/finances/TransactionModal';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceCategoryLabel,
} from '@/utils/finance';

const OverviewTab = ({
    config, periods, transactions, distributions, invoices, projects,
    periodsWithTotals, summaryKpis, currency, refetch,
    // For tab navigation
    searchParams, setSearchParams,
}) => {
    const { profile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [createForm, setCreateForm] = useState({ name: '', start_date: '', end_date: '' });

    // Orphaned transactions (local sub-fetch, not in shared hook)
    const [orphanedSummary, setOrphanedSummary] = useState([]);
    const [generatingPeriods, setGeneratingPeriods] = useState(false);
    const [generationResult, setGenerationResult] = useState(null);
    const [orphanedLoaded, setOrphanedLoaded] = useState(false);

    // Fetch orphaned data once on mount
    const fetchOrphaned = useCallback(async () => {
        const { data, error: rpcError } = await supabase.rpc('get_orphaned_transactions_summary');
        if (!rpcError) setOrphanedSummary(data || []);
        setOrphanedLoaded(true);
    }, []);

    React.useEffect(() => {
        if (!orphanedLoaded) void fetchOrphaned();
    }, [fetchOrphaned, orphanedLoaded]);

    const expenseTransactions = useMemo(
        () => transactions.filter((t) => t.type === 'expense'),
        [transactions],
    );

    const unsyncedInvoiceCount = useMemo(() => {
        const importedIds = new Set(transactions.map((t) => t.invoice_id).filter(Boolean));
        return invoices.filter((inv) => inv.status === 'paid' && !importedIds.has(inv.id)).length;
    }, [invoices, transactions]);

    const hasOrphanedTransactions = useMemo(
        () => orphanedSummary.some((o) => o.transaction_count > 0),
        [orphanedSummary],
    );
    const monthsNeedingPeriods = useMemo(
        () => orphanedSummary.filter((o) => !o.has_period),
        [orphanedSummary],
    );

    const handleAutoGeneratePeriods = async () => {
        setGeneratingPeriods(true);
        setError('');
        setGenerationResult(null);
        try {
            const { data: generatedData, error: genError } = await supabase.rpc('auto_generate_periods');
            if (genError) throw genError;
            const { data: assignedData, error: assignError } = await supabase.rpc('assign_transactions_to_periods');
            if (assignError) throw assignError;
            setGenerationResult({ periods: generatedData || [], assignments: assignedData || [] });
            await refetch();
            await fetchOrphaned();
        } catch (err) {
            console.error('Error auto-generating periods:', err);
            setError(err.message || 'No pudimos generar los períodos automáticamente.');
        } finally {
            setGeneratingPeriods(false);
        }
    };

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
        await refetch();
    };

    const openEditExpense = (tx) => { setEditingTransaction(tx); setModalOpen(true); };
    const openNewExpense = () => { setEditingTransaction(null); setModalOpen(true); };

    // Navigate to tab instead of route
    const goToLedger = () => {
        const next = new URLSearchParams();
        next.set('tab', 'ledger');
        setSearchParams?.(next, { replace: true });
    };

    const goToPeriod = (periodId) => {
        const next = new URLSearchParams();
        next.set('tab', 'periodos');
        next.set('period', periodId);
        setSearchParams?.(next, { replace: true });
    };

    return (
        <div className="space-y-6 font-product text-neutral-900">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Finanzas internas</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">Caja y dividendos</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                        Los cobros de facturas entran solos. Acá registrás gastos, cerrás períodos y repartís ganancias.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={goToLedger} className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300">
                        <Receipt size={16} /> Ver todos los movimientos
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">{error}</div>
            )}

            {unsyncedInvoiceCount > 0 && (
                <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>
                        Hay {unsyncedInvoiceCount} factura(s) cobrada(s) que todavía no se reflejaron en finanzas automáticamente.
                        {' '}<button onClick={goToLedger} className="font-semibold underline">Ver movimientos</button>
                    </span>
                </div>
            )}

            {/* Orphaned transactions alert */}
            <AnimatePresence>
                {hasOrphanedTransactions && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-3xl border border-skyblue/20 bg-skyblue/5 px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                                <Sparkles size={20} className="mt-0.5 shrink-0 text-skyblue" />
                                <div>
                                    <h3 className="font-semibold text-neutral-900">Transacciones sin período detectadas</h3>
                                    <p className="mt-1 text-sm text-neutral-600">
                                        Hay {orphanedSummary.reduce((s, o) => s + Number(o.transaction_count), 0)} movimientos en {orphanedSummary.length} mes(es) sin período.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {monthsNeedingPeriods.length > 0 && (
                                            <>
                                                <span className="text-xs text-neutral-500">Períodos a crear:</span>
                                                {monthsNeedingPeriods.map((m) => (
                                                    <span key={m.month_year} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-skyblue border border-skyblue/20">
                                                        <Calendar size={12} />{m.month_name} {m.year_num}<span className="text-neutral-400">({m.transaction_count})</span>
                                                    </span>
                                                ))}
                                            </>
                                        )}
                                        {orphanedSummary.filter((o) => o.has_period).length > 0 && (
                                            <>
                                                <span className="text-xs text-neutral-500 ml-2">Ya existen:</span>
                                                {orphanedSummary.filter((o) => o.has_period).map((m) => (
                                                    <span key={m.month_year} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                                                        <CheckCircle2 size={12} />{m.month_name} {m.year_num}
                                                    </span>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={handleAutoGeneratePeriods} disabled={generatingPeriods || monthsNeedingPeriods.length === 0} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-skyblue px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                                {generatingPeriods ? <><span className="animate-spin">⏳</span>Generando...</> : <><Sparkles size={16} />Generar períodos automáticamente</>}
                            </button>
                        </div>

                        {generationResult && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 border-t border-skyblue/20 pt-4">
                                <div className="flex items-center gap-2 text-emerald-600 mb-2"><CheckCircle2 size={16} /><span className="font-semibold">Períodos generados exitosamente!</span></div>
                                <div className="grid gap-2 text-sm text-neutral-600">
                                    {generationResult.periods.filter((p) => p.created).length > 0 && (
                                        <p><span className="font-medium">Creados:</span> {generationResult.periods.filter((p) => p.created).map((p) => p.month_year).join(', ')}</p>
                                    )}
                                    <p><span className="font-medium">Transacciones asignadas:</span> {generationResult.assignments.filter((a) => a.assigned).length} de {generationResult.assignments.length}</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceKpiCard icon={TrendingUp} label="Cobrado de clientes" value={formatFinanceCurrency(summaryKpis.income, currency)} sub="Facturas pagadas sincronizadas automáticamente." color="text-emerald-600" />
                <FinanceKpiCard icon={TrendingDown} label="Gastos registrados" value={formatFinanceCurrency(summaryKpis.expenses, currency)} sub="Herramientas, publicidad, pagos a workers, etc." color="text-rose-500" />
                <FinanceKpiCard icon={PiggyBank} label="Ganancia neta" value={formatFinanceCurrency(summaryKpis.net, currency)} sub="Lo que queda después de restar todos los gastos." color={summaryKpis.net >= 0 ? 'text-neutral-900' : 'text-rose-500'} />
                <FinanceKpiCard icon={Wallet} label="Dividendos pendientes" value={formatFinanceCurrency(summaryKpis.pendingPayouts, currency)} sub="Ganancias calculadas en cierres que aún no se pagaron." color={summaryKpis.pendingPayouts > 0 ? 'text-amber-600' : 'text-neutral-900'} />
            </div>

            {/* Main grid */}
            <div className="grid gap-6 xl:grid-cols-[1.4fr,0.6fr]">
                {/* Expenses table */}
                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Egresos</p>
                            <h3 className="mt-2 text-2xl font-black">Gastos de la empresa</h3>
                        </div>
                        <button type="button" onClick={openNewExpense} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">
                            <Plus size={16} /> Registrar gasto
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
                                    <tr><td colSpan={5} className="py-10 text-center text-sm text-neutral-500">Todavía no hay gastos registrados.</td></tr>
                                )}
                                {expenseTransactions.slice(0, 10).map((tx) => (
                                    <tr key={tx.id} className="group align-middle">
                                        <td className="py-3 pr-4 text-sm text-neutral-500 whitespace-nowrap">{formatFinanceDate(tx.transaction_date)}</td>
                                        <td className="py-3 pr-4">
                                            <p className="font-semibold text-neutral-900">{tx.description || 'Sin descripción'}</p>
                                            {tx.project && <p className="text-xs text-neutral-400">{tx.project.name}</p>}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-neutral-500">{getFinanceCategoryLabel('expense', tx.category)}</td>
                                        <td className="py-3 pr-4 text-right font-semibold text-rose-500 whitespace-nowrap">-{formatFinanceCurrency(tx.amount, tx.currency)}</td>
                                        <td className="py-3 text-right">
                                            <button type="button" onClick={() => openEditExpense(tx)} className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 opacity-0 transition hover:border-neutral-300 hover:text-neutral-900 group-hover:opacity-100">
                                                <Edit3 size={12} /> Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {expenseTransactions.length > 10 && (
                            <div className="mt-4 text-center">
                                <button onClick={goToLedger} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
                                    Ver los {expenseTransactions.length - 10} gastos restantes <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Sidebar: New period + period list */}
                <div className="space-y-6">
                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Reparto</p>
                        <h3 className="mt-2 text-xl font-black">Nuevo período</h3>
                        <p className="mt-2 text-sm text-neutral-500">Al cerrarlo, el sistema calcula cuánto le corresponde a cada uno.</p>

                        <form onSubmit={handleCreatePeriod} className="mt-4 space-y-3">
                            <input type="text" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre (ej. Marzo 2026)" className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" value={createForm.start_date} onChange={(e) => setCreateForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-neutral-400" />
                                <input type="date" value={createForm.end_date} onChange={(e) => setCreateForm((p) => ({ ...p, end_date: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-neutral-400" />
                            </div>
                            <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60">
                                <CalendarRange size={15} /> {saving ? 'Creando...' : 'Crear período'}
                            </button>
                        </form>

                        {monthsNeedingPeriods.length > 0 && (
                            <div className="mt-4 border-t border-neutral-100 pt-4">
                                <p className="text-xs text-neutral-400 mb-2">O generá automáticamente:</p>
                                <button type="button" onClick={handleAutoGeneratePeriods} disabled={generatingPeriods} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-skyblue/30 bg-skyblue/5 px-4 py-3 text-sm font-semibold text-skyblue transition hover:bg-skyblue/10 disabled:opacity-60">
                                    {generatingPeriods ? <><span className="animate-spin">⏳</span>Generando...</> : <><Sparkles size={15} />Generar {monthsNeedingPeriods.length} período{monthsNeedingPeriods.length > 1 ? 's' : ''}</>}
                                </button>
                            </div>
                        )}

                        <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                            <span className="font-semibold text-neutral-700">Reparto actual: </span>
                            Francisco {config?.pct_francisco ?? 40}% · Federico {config?.pct_federico ?? 30}% · Workers {config?.pct_workers ?? 15}% · Empresa {config?.pct_company ?? 15}%
                        </div>
                    </section>

                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Cierres</p>
                                <h3 className="mt-1 text-xl font-black">Períodos</h3>
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
                                <PeriodCard key={p.id} period={p} onSelect={goToPeriod} />
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <TransactionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={refetch}
                periods={periods}
                projects={projects}
                invoices={[]}
                initialValues={editingTransaction}
                defaultType="expense"
            />
        </div>
    );
};

export default OverviewTab;
