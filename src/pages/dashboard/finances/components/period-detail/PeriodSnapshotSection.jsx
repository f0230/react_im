import React from 'react';
import { formatFinanceCurrency } from '@/utils/finance';

const SnapshotCard = ({ label, value, caption }) => (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">{label}</p>
        <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-900">{value}</p>
        {caption ? <p className="mt-1 text-xs text-neutral-500">{caption}</p> : null}
    </div>
);

const PeriodSnapshotSection = ({ snapshot, totals, displayCurrency, workerPoolSummary, companyFundCreditAmount, companyFundReleaseSummary }) => (
    <div className="grid gap-3 md:grid-cols-2">
        <SnapshotCard label="Ingresos snapshot" value={formatFinanceCurrency(snapshot?.total_income ?? totals.income, displayCurrency)} />
        <SnapshotCard label="Gastos snapshot" value={formatFinanceCurrency(snapshot?.total_expenses ?? totals.expenses, displayCurrency)} />
        <SnapshotCard label="Neto snapshot" value={formatFinanceCurrency(snapshot?.net_profit ?? totals.net, displayCurrency)} />
        <SnapshotCard label="Movimientos" value={String(snapshot?.transaction_count ?? 0)} />
        <SnapshotCard label="Pool admins" value={formatFinanceCurrency(snapshot?.admin_pool ?? 0, displayCurrency)} />
        <SnapshotCard label="Workers ganado" value={formatFinanceCurrency(snapshot?.workers_pool_earned ?? workerPoolSummary.poolEarned, displayCurrency)} />
        <SnapshotCard label="Crédito empresa" value={formatFinanceCurrency(snapshot?.company_pool ?? companyFundCreditAmount, displayCurrency)} />
        <SnapshotCard label="Release aplicado" value={formatFinanceCurrency(snapshot?.company_fund_release_amount ?? companyFundReleaseSummary.releaseAmount, displayCurrency)} />
    </div>
);

export default PeriodSnapshotSection;
