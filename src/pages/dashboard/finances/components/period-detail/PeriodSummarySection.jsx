import React from 'react';
import { Receipt } from 'lucide-react';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency, getInvoiceDisplayLabel } from '@/utils/finance';

const statLabel = 'text-[10px] uppercase tracking-[0.2em] text-neutral-400';

const PeriodSummarySection = ({
    totals,
    displayCurrency,
    displayedCompanyFundBalance,
    workerPoolSummary,
    projectedCompanyFundBalance,
    paidInvoicesPendingImport,
    transactions,
    onOpenTransactions,
}) => (
    <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
            <FinanceKpiCard label="Ingresos" value={formatFinanceCurrency(totals.income, displayCurrency)} color="text-emerald-600" />
            <FinanceKpiCard label="Gastos" value={formatFinanceCurrency(totals.expenses, displayCurrency)} color="text-rose-500" />
            <FinanceKpiCard label="Neto" value={formatFinanceCurrency(totals.net, displayCurrency)} />
            <FinanceKpiCard label="Fondo" value={formatFinanceCurrency(displayedCompanyFundBalance, displayCurrency)} color="text-amber-600" />
            <FinanceKpiCard label="Workers pool" value={formatFinanceCurrency(workerPoolSummary.poolEarned, displayCurrency)} />
        </div>

        {paidInvoicesPendingImport.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Cobros pendientes de sincronización</p>
                <div className="mt-2 space-y-1 text-sm text-amber-700">
                    {paidInvoicesPendingImport.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between gap-3">
                            <span>{getInvoiceDisplayLabel(invoice)}</span>
                            <span className="font-mono tabular-nums">{formatFinanceCurrency(invoice.amount, invoice.currency)}</span>
                        </div>
                    ))}
                </div>
            </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Workers</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                    {workerPoolSummary.totalWeightedPoints.toFixed(2)} pts / {workerPoolSummary.targetWeightedPoints.toFixed(2)} pts
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                    {workerPoolSummary.activeWorkersCount > 0
                        ? `${workerPoolSummary.activeWorkersCount} worker(s) activo(s) en el cálculo.`
                        : 'Todavía no hay workers activos en el período.'}
                </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Fondo proyectado</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-900">
                    {formatFinanceCurrency(projectedCompanyFundBalance, displayCurrency)}
                </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
                <p className={statLabel}>Transacciones</p>
                <button type="button" onClick={onOpenTransactions} className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 hover:text-neutral-600">
                    <Receipt size={14} />
                    Ver {transactions.length} movimiento(s)
                </button>
            </div>
        </div>
    </div>
);

export default PeriodSummarySection;
