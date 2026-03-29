import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Edit3,
    Landmark,
    PiggyBank,
    Plus,
    Receipt,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
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
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const expenseTransactions = useMemo(
        () => transactions.filter((t) => t.type === 'expense'),
        [transactions],
    );

    const unsyncedInvoiceCount = useMemo(() => {
        const importedIds = new Set(transactions.map((t) => t.invoice_id).filter(Boolean));
        return invoices.filter((inv) => inv.status === 'paid' && !importedIds.has(inv.id)).length;
    }, [invoices, transactions]);

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

                {/* Sidebar: period list */}
                <div className="space-y-6">
                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                            <span className="font-semibold text-neutral-700">Reparto actual: </span>
                            Francisco {config?.pct_francisco ?? 40}% · Federico {config?.pct_federico ?? 30}% · Workers {config?.pct_workers ?? 15}% · Empresa {config?.pct_company ?? 15}%
                        </div>
                    </section>

                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Cierres</p>
                                <h3 className="mt-1 text-xl font-black">Periodos</h3>
                            </div>
                            <Landmark size={18} className="text-neutral-300" />
                        </div>
                        <p className="mb-4 text-sm text-neutral-500">Los periodos se crean automaticamente al registrar movimientos.</p>
                        <div className="space-y-3">
                            {periodsWithTotals.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                                    Todavia no hay periodos. Se crearan solos con el primer movimiento.
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
