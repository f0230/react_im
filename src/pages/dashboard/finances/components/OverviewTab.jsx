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
    Users,
    Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import PeriodCard from '@/components/finances/PeriodCard';
import TransactionModal from '@/components/finances/TransactionModal';
import { MarketingDashboard } from '@/components/ui/dashboard-1';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceCategoryLabel,
} from '@/utils/finance';

const OverviewTab = ({
    config, periods, transactions, distributions, invoices, projects,
    periodsWithTotals, summaryKpis, currency, companyFundMovements = [], refetch,
    adminProfiles = [], workerProfiles = [],
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

    const recentCompanyFundMovements = useMemo(
        () => companyFundMovements.slice(0, 4),
        [companyFundMovements],
    );

    const recentPeriods = useMemo(
        () => periodsWithTotals.slice(0, 4),
        [periodsWithTotals],
    );

    const financeCompositionStats = useMemo(() => {
        const segments = [
            { label: 'Ingresos', raw: Math.max(Number(summaryKpis.income || 0), 0), color: 'bg-emerald-400' },
            { label: 'Gastos', raw: Math.max(Number(summaryKpis.expenses || 0), 0), color: 'bg-rose-400' },
            { label: 'Pendientes', raw: Math.max(Number(summaryKpis.pendingPayouts || 0), 0), color: 'bg-amber-300' },
            { label: 'Fondo', raw: Math.max(Number(summaryKpis.companyFundBalance || 0), 0), color: 'bg-sky-400' },
        ];
        const total = segments.reduce((sum, segment) => sum + segment.raw, 0);

        if (total <= 0) {
            return segments.map((segment) => ({
                ...segment,
                value: segment.label === 'Ingresos' ? 100 : 0,
            }));
        }

        return segments.map((segment) => ({
            ...segment,
            value: Number(((segment.raw / total) * 100).toFixed(2)),
        }));
    }, [summaryKpis.companyFundBalance, summaryKpis.expenses, summaryKpis.income, summaryKpis.pendingPayouts]);

    const financeTeamMembers = useMemo(() => (
        [...adminProfiles, ...workerProfiles]
            .slice(0, 5)
            .map((member) => ({
                id: member.id,
                name: member.full_name || member.email || 'Equipo',
                avatarUrl: member.avatar_url || '',
            }))
    ), [adminProfiles, workerProfiles]);

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

    const goToPeriods = () => {
        const next = new URLSearchParams();
        next.set('tab', 'periodos');
        setSearchParams?.(next, { replace: true });
    };

    return (
        <div className="space-y-5 font-product text-neutral-900">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Finanzas internas</p>
                    <h2 className="mt-1.5 text-2xl font-black tracking-tight">Caja y compensaciones</h2>
                    <p className="mt-1 max-w-3xl text-sm text-neutral-500">
                        Los cobros de facturas entran solos. Acá registrás gastos, ves el fondo empresa acumulado, cerrás períodos y generás compensaciones.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={goToLedger} className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300">
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

            <MarketingDashboard
                title="Pulso financiero"
                teamActivities={{
                    label: 'Resultado financiero acumulado',
                    value: Number(summaryKpis.net || 0),
                    valueFormatter: (latest) => formatFinanceCurrency(latest, currency),
                    stats: financeCompositionStats,
                    footnote: 'Distribución relativa entre ingresos, gastos, pendientes y fondo empresa.',
                    icon: Wallet,
                }}
                team={{
                    label: 'Equipo cargado en finanzas',
                    memberCount: adminProfiles.length + workerProfiles.length,
                    memberLabel: 'personas',
                    members: financeTeamMembers,
                    caption: `${workerProfiles.length} workers · ${adminProfiles.length} admins`,
                    icon: Users,
                }}
                cta={{
                    text: 'Revisá períodos abiertos, cierres y snapshots desde una vista más compacta.',
                    buttonText: 'Ir a períodos',
                    onButtonClick: goToPeriods,
                    icon: Landmark,
                }}
            />

            {/* KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceKpiCard icon={TrendingUp} label="Cobrado de clientes" value={formatFinanceCurrency(summaryKpis.income, currency)} sub="Facturas pagadas sincronizadas automáticamente." color="text-emerald-600" />
                <FinanceKpiCard icon={TrendingDown} label="Gastos registrados" value={formatFinanceCurrency(summaryKpis.expenses, currency)} sub="Herramientas, publicidad, pagos a workers, etc." color="text-rose-500" />
                <FinanceKpiCard icon={Wallet} label="Dividendos pendientes" value={formatFinanceCurrency(summaryKpis.pendingPayouts, currency)} sub="Ganancias calculadas en cierres que aún no se pagaron." color={summaryKpis.pendingPayouts > 0 ? 'text-amber-600' : 'text-neutral-900'} />
                <FinanceKpiCard icon={Landmark} label="Fondo empresa" value={formatFinanceCurrency(summaryKpis.companyFundBalance, currency)} sub="Saldo operativo acumulado disponible." color="text-amber-600" />
            </div>

            {/* Main grid */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr),380px]">
                {/* Expenses table */}
                <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Egresos</p>
                            <h3 className="mt-1.5 text-xl font-black">Gastos de la empresa</h3>
                        </div>
                        <button type="button" onClick={openNewExpense} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800">
                            <Plus size={16} /> Registrar gasto
                        </button>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-100">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400">
                                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                                    <th className="pb-3 pr-4 font-medium">Detalle</th>
                                    <th className="pb-3 pr-4 font-medium">Categoría</th>
                                    <th className="pb-3 pr-4 font-medium text-right">Monto</th>
                                    <th className="pb-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {expenseTransactions.length === 0 && (
                                    <tr><td colSpan={5} className="py-10 text-center text-sm text-neutral-500">Todavía no hay gastos registrados.</td></tr>
                                )}
                                {expenseTransactions.slice(0, 8).map((tx) => (
                                    <tr key={tx.id} className="group align-middle">
                                        <td className="py-2.5 pr-4 text-sm text-neutral-500 whitespace-nowrap">{formatFinanceDate(tx.transaction_date)}</td>
                                        <td className="py-2.5 pr-4">
                                            <p className="font-semibold text-neutral-900">{tx.description || 'Sin descripción'}</p>
                                            {tx.project && <p className="text-xs text-neutral-400">{tx.project.name}</p>}
                                            {tx.funding_source === 'company_fund' && (
                                                <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600">Fondo empresa</p>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-4 text-sm text-neutral-500">{getFinanceCategoryLabel('expense', tx.category)}</td>
                                        <td className="py-2.5 pr-4 text-right font-semibold text-rose-500 whitespace-nowrap">-{formatFinanceCurrency(tx.amount, tx.currency)}</td>
                                        <td className="py-2.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => openEditExpense(tx)}
                                                disabled={tx.period?.status === 'closed'}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 opacity-0 transition hover:border-neutral-300 hover:text-neutral-900 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Edit3 size={12} /> Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {expenseTransactions.length > 8 && (
                            <div className="mt-4 text-center">
                                <button onClick={goToLedger} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
                                    Ver los {expenseTransactions.length - 8} gastos restantes <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Sidebar: period list */}
                <div className="space-y-5">
                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                            <span className="font-semibold text-neutral-700">Reparto actual: </span>
                            Francisco {config?.pct_francisco ?? 40}% · Federico {config?.pct_federico ?? 30}% · Workers {config?.pct_workers ?? 15}% máximo · Empresa {config?.pct_company ?? 15}% ·
                            {' '}Target workers {Number(config?.workers_target_weighted_points ?? 100).toFixed(0)} pts
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Fondo empresa</p>
                                <h3 className="mt-1 text-lg font-black">Ledger operativo</h3>
                            </div>
                            <Landmark size={18} className="text-neutral-300" />
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700">Saldo disponible</p>
                            <p className="mt-2 text-2xl font-black text-neutral-900">
                                {formatFinanceCurrency(summaryKpis.companyFundBalance, currency)}
                            </p>
                        </div>
                        <div className="mt-4 space-y-3">
                            {recentCompanyFundMovements.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                                    Todavía no hay movimientos del fondo empresa.
                                </div>
                            )}
                            {recentCompanyFundMovements.map((movement) => (
                                <div key={movement.id} className="rounded-2xl border border-neutral-200 px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-neutral-900">{movement.description || 'Movimiento de fondo empresa'}</p>
                                            <p className="text-sm text-neutral-500">
                                                {formatFinanceDate(movement.movement_date)} · {movement.movement_source}
                                            </p>
                                        </div>
                                        <p className={`font-semibold ${movement.movement_type === 'credit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {movement.movement_type === 'credit' ? '+' : '-'}
                                            {formatFinanceCurrency(movement.amount, movement.currency)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Cierres</p>
                                <h3 className="mt-1 text-lg font-black">Períodos recientes</h3>
                            </div>
                            <Landmark size={18} className="text-neutral-300" />
                        </div>
                        <p className="mb-4 text-sm text-neutral-500">Los periodos se crean automaticamente al registrar movimientos.</p>
                        <div className="space-y-3">
                            {recentPeriods.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                                    Todavia no hay periodos. Se crearan solos con el primer movimiento.
                                </div>
                            )}
                            {recentPeriods.map((p) => (
                                <PeriodCard key={p.id} period={p} onSelect={goToPeriod} />
                            ))}
                        </div>
                        {periodsWithTotals.length > recentPeriods.length && (
                            <button
                                type="button"
                                onClick={goToPeriods}
                                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
                            >
                                Ver todos los períodos <ArrowRight size={14} />
                            </button>
                        )}
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
