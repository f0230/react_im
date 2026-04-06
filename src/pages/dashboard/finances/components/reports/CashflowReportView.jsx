import React, { useMemo } from 'react';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceTransactionReportingAmount,
    getInvoiceReportingAmount,
} from '@/utils/finance';

const CashflowReportView = ({ transactions, invoices, currency = 'USD' }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingInvoices = useMemo(
        () => invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue'),
        [invoices],
    );

    const data = useMemo(() => {
        const receivables = pendingInvoices.reduce((sum, invoice) => sum + getInvoiceReportingAmount(invoice), 0);
        const futureExpenses = transactions
            .filter((transaction) => transaction.type === 'expense' && new Date(transaction.transaction_date) > today)
            .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
        const completedIncome = transactions
            .filter((transaction) => transaction.type === 'income' && new Date(transaction.transaction_date) <= today)
            .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
        const completedExpenses = transactions
            .filter((transaction) => transaction.type === 'expense' && new Date(transaction.transaction_date) <= today)
            .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
        const baseBalance = completedIncome - completedExpenses;
        const projection90 = baseBalance + receivables - futureExpenses;
        const nextInvoice = [...pendingInvoices]
            .filter((invoice) => invoice.due_date)
            .sort((left, right) => new Date(left.due_date) - new Date(right.due_date))[0] || null;
        const todayString = today.toISOString().slice(0, 10);
        // Build cumulative balance at each weekly checkpoint.
        // Each point reflects everything received/spent up to and including that date.
        const timeline = Array.from({ length: 13 }).map((_, index) => {
            const offsetDays = index * 7;
            const checkpoint = new Date(today);
            checkpoint.setDate(checkpoint.getDate() + offsetDays);
            const checkpointString = checkpoint.toISOString().slice(0, 10);

            const cumulativeInvoices = pendingInvoices
                .filter((invoice) => invoice.due_date && invoice.due_date <= checkpointString)
                .reduce((sum, invoice) => sum + getInvoiceReportingAmount(invoice), 0);

            const cumulativeFutureExpenses = transactions
                .filter((t) => t.type === 'expense' && t.transaction_date > todayString && t.transaction_date <= checkpointString)
                .reduce((sum, t) => sum + getFinanceTransactionReportingAmount(t), 0);

            return {
                label: `${offsetDays}d`,
                balance: baseBalance + cumulativeInvoices - cumulativeFutureExpenses,
            };
        });
        return { currency, receivables, futureExpenses, projection90, nextInvoice, timeline };
    }, [currency, pendingInvoices, transactions]);

    const max = Math.max(...data.timeline.map((point) => point.balance), 1);
    const min = Math.min(...data.timeline.map((point) => point.balance), 0);
    const range = max - min || 1;
    const points = data.timeline.map((point, index) => {
        const x = (index / Math.max(data.timeline.length - 1, 1)) * 100;
        const y = 100 - (((point.balance - min) / range) * 70 + 15);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <FinanceKpiCard label="Proyección 90d" value={formatFinanceCurrency(data.projection90, data.currency)} color={data.projection90 >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
                <FinanceKpiCard label="Por cobrar" value={formatFinanceCurrency(data.receivables, data.currency)} sub={`${pendingInvoices.length} facturas`} color="text-amber-600" />
                <FinanceKpiCard label="Gastos futuros" value={formatFinanceCurrency(data.futureExpenses, data.currency)} color="text-rose-500" />
                <FinanceKpiCard
                    label="Próximo vencimiento"
                    value={data.nextInvoice ? formatFinanceDate(data.nextInvoice.due_date) : '—'}
                    sub={data.nextInvoice ? formatFinanceCurrency(getInvoiceReportingAmount(data.nextInvoice), data.currency) : null}
                />
            </div>

            <section className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Proyección</p>
                <div className="mt-3">
                    <svg viewBox="0 0 100 30" className="h-28 w-full">
                        <polyline fill="none" stroke="#171717" strokeWidth="2" points={points} />
                    </svg>
                    <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                        {data.timeline.map((point) => <span key={point.label}>{point.label}</span>)}
                    </div>
                </div>
            </section>

            <section className="rounded-[24px] border border-neutral-200 bg-white">
                <div className="border-b border-neutral-200 px-4 py-3">
                    <p className="text-sm font-semibold text-neutral-900">Pendientes por cobrar</p>
                </div>
                <div className="space-y-2 p-3">
                    {pendingInvoices.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">No hay facturas pendientes.</div>
                    ) : (
                        pendingInvoices.slice(0, 8).map((invoice) => (
                            <div key={invoice.id} className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-3 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900">{invoice.invoice_number || 'Factura sin número'}</p>
                                    <p className="text-xs text-neutral-500">{invoice.due_date ? formatFinanceDate(invoice.due_date) : 'Sin fecha de vencimiento'}</p>
                                </div>
                                <p className="font-mono text-sm font-semibold tabular-nums text-neutral-900">{formatFinanceCurrency(invoice.amount, invoice.currency || data.currency)}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
};

export default CashflowReportView;
