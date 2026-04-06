import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import TransactionModal from '@/components/finances/TransactionModal';
import { getFinanceTransactionReportingAmount, getInvoiceReportingAmount } from '@/utils/finance';
import { buildFinanceSearchParams } from '../financeTabs';
import DashboardKpiStrip from './dashboard/DashboardKpiStrip';
import DashboardSparkline from './dashboard/DashboardSparkline';
import TransactionDetailDialog from './dashboard/TransactionDetailDialog';
import TransactionTable from './dashboard/TransactionTable';

const monthLabel = (value) => new Intl.DateTimeFormat('es-UY', { month: 'short', timeZone: 'UTC' }).format(value);

const DashboardTab = ({ periodsWithTotals, transactions, invoices, summaryKpis, currency, companyFundMovements, projects, periods, searchParams, setSearchParams, refetch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [detailTransaction, setDetailTransaction] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const periodFilter = searchParams.get('transactionPeriod') || 'all';

    const currentPeriod = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return periodsWithTotals.find((period) => period.status === 'open' && today >= period.start_date && today <= period.end_date) || periodsWithTotals[0] || null;
    }, [periodsWithTotals]);

    const currentPeriodIncome = Number(currentPeriod?.total_income || 0);
    const currentPeriodExpenses = Number(currentPeriod?.total_expenses || 0);

    const pendingInvoices = useMemo(
        () => invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue'),
        [invoices],
    );

    const pendingReceivables = useMemo(
        () => pendingInvoices.reduce((sum, invoice) => sum + getInvoiceReportingAmount(invoice), 0),
        [pendingInvoices],
    );

    const unsyncedInvoiceCount = useMemo(() => {
        const importedIds = new Set(transactions.map((transaction) => transaction.invoice_id).filter(Boolean));
        return invoices.filter((invoice) => invoice.status === 'paid' && !importedIds.has(invoice.id)).length;
    }, [invoices, transactions]);

    const filteredTransactions = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        return transactions.filter((transaction) => {
            if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;
            if (periodFilter !== 'all' && transaction.period_id !== periodFilter) return false;
            if (!search) return true;
            return [
                transaction.description,
                transaction.notes,
                transaction.invoice?.invoice_number,
                transaction.period?.name,
            ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));
        }).slice(0, 15);
    }, [periodFilter, searchTerm, transactions, typeFilter]);

    const periodOptions = useMemo(() => ([
        { value: 'all', label: 'Todos los períodos' },
        ...periods.map((period) => ({ value: period.id, label: period.name })),
    ]), [periods]);

    const sparklineData = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 6 }).map((_, index) => {
            const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - (5 - index), 1));
            const month = date.getUTCMonth();
            const year = date.getUTCFullYear();
            const monthTransactions = transactions.filter((transaction) => {
                const transactionDate = new Date(transaction.transaction_date);
                return transactionDate.getUTCMonth() === month && transactionDate.getUTCFullYear() === year;
            });
            const income = monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
            const expenses = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
            return { label: monthLabel(date), value: income - expenses };
        });
    }, [transactions]);

    const updatePeriodFilter = (value) => {
        const next = buildFinanceSearchParams(searchParams, { transactionPeriod: value === 'all' ? null : value });
        setSearchParams(next, { replace: true });
    };

    const openCreateModal = () => {
        setEditingTransaction(null);
        setModalOpen(true);
    };

    const openEditModal = (transaction) => {
        setEditingTransaction(transaction);
        setModalOpen(true);
    };

    return (
        <div className="space-y-4 font-product text-neutral-900">
            <section className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Estado actual</p>
                        <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Dashboard financiero</h2>
                        <p className="mt-1 text-sm text-neutral-500">
                            {currentPeriod ? `Período activo: ${currentPeriod.name}` : 'Sin período abierto detectado.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {unsyncedInvoiceCount > 0 && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                                <AlertTriangle size={14} />
                                {unsyncedInvoiceCount} cobro(s) para sincronizar
                            </span>
                        )}
                        <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800">
                            <Plus size={15} />
                            Registrar
                        </button>
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    <DashboardKpiStrip
                        currentPeriod={currentPeriod}
                        currentPeriodIncome={currentPeriodIncome}
                        currentPeriodExpenses={currentPeriodExpenses}
                        pendingReceivables={pendingReceivables}
                        pendingReceivableCount={pendingInvoices.length}
                        summaryKpis={summaryKpis}
                        currency={currency}
                        companyFundMovements={companyFundMovements}
                    />
                    <DashboardSparkline data={sparklineData} currency={currency} />
                </div>
            </section>

            <TransactionTable
                transactions={filteredTransactions}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                periodFilter={periodFilter}
                onPeriodFilterChange={updatePeriodFilter}
                periodOptions={periodOptions}
                onEditTransaction={openEditModal}
                onViewTransaction={setDetailTransaction}
            />

            <TransactionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={refetch}
                periods={periods}
                projects={projects}
                invoices={invoices}
                initialValues={editingTransaction}
                defaultType={editingTransaction?.type || 'expense'}
            />

            <TransactionDetailDialog
                transaction={detailTransaction}
                open={Boolean(detailTransaction)}
                onOpenChange={(open) => !open && setDetailTransaction(null)}
            />
        </div>
    );
};

export default DashboardTab;
