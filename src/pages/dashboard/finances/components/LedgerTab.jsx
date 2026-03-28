import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Receipt, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import TransactionModal from '@/components/finances/TransactionModal';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceCategoryLabel,
    getInvoiceDisplayLabel,
    getInvoicePaymentDate,
    getProjectDisplayName,
} from '@/utils/finance';

const LedgerTab = ({ transactions, periods, projects, invoices, currency, refetch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('income');
    const [editingTransaction, setEditingTransaction] = useState(null);

    const filteredTransactions = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return transactions.filter((transaction) => {
            if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;
            if (periodFilter !== 'all' && transaction.period_id !== periodFilter) return false;
            if (!search) return true;

            return [
                transaction.description,
                transaction.notes,
                transaction.category,
                transaction.paid_to,
                transaction.period?.name,
                getProjectDisplayName(transaction.project),
                transaction.invoice?.invoice_number,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search));
        });
    }, [periodFilter, searchTerm, transactions, typeFilter]);

    const stats = useMemo(() => {
        const cur = filteredTransactions[0]?.currency || currency;
        const income = filteredTransactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expenses = filteredTransactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        return { currency: cur, income, expenses, net: income - expenses };
    }, [currency, filteredTransactions]);

    const paidInvoicesPendingImport = useMemo(() => {
        const importedIds = new Set(transactions.map((t) => t.invoice_id).filter(Boolean));
        return invoices.filter((inv) => inv.status === 'paid' && !importedIds.has(inv.id));
    }, [invoices, transactions]);

    const openNewTransaction = (type) => {
        setEditingTransaction(null);
        setModalType(type);
        setModalOpen(true);
    };

    const openEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setModalType(transaction.type);
        setModalOpen(true);
    };

    return (
        <div className="space-y-6 font-product text-neutral-900">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Historial completo</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">Todos los movimientos</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => openNewTransaction('income')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                        <Plus size={16} />
                        Nuevo ingreso
                    </button>
                    <button
                        type="button"
                        onClick={() => openNewTransaction('expense')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                        <Plus size={16} />
                        Nuevo gasto
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FinanceKpiCard icon={TrendingUp} label="Ingresos filtrados" value={formatFinanceCurrency(stats.income, stats.currency)} color="text-emerald-600" />
                <FinanceKpiCard icon={TrendingDown} label="Gastos filtrados" value={formatFinanceCurrency(stats.expenses, stats.currency)} color="text-rose-500" />
                <FinanceKpiCard icon={Wallet} label="Resultado neto" value={formatFinanceCurrency(stats.net, stats.currency)} color={stats.net >= 0 ? 'text-neutral-900' : 'text-rose-500'} />
                <FinanceKpiCard icon={Wallet} label="Movimientos" value={filteredTransactions.length} sub="Registros visibles con los filtros actuales." />
            </div>

            {/* Paid invoices pending sync */}
            {paidInvoicesPendingImport.length > 0 && (
                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Facturación conectada</p>
                        <h3 className="mt-2 text-xl font-black">Cobros detectados desde facturas</h3>
                        <p className="mt-2 text-sm text-neutral-500">
                            Facturas cobradas pendientes de sincronización.
                        </p>
                    </div>

                    <div className="mt-4 space-y-3">
                        {paidInvoicesPendingImport.map((invoice) => (
                            <div key={invoice.id} className="grid gap-3 rounded-2xl border border-neutral-200 p-4 md:grid-cols-[1.4fr,140px,180px] md:items-center">
                                <div>
                                    <p className="font-semibold text-neutral-900">{getInvoiceDisplayLabel(invoice)}</p>
                                    <p className="text-sm text-neutral-500">
                                        Fecha contable sugerida: {formatFinanceDate(getInvoicePaymentDate(invoice))}
                                    </p>
                                </div>
                                <div className="font-semibold text-emerald-600">
                                    {formatFinanceCurrency(invoice.amount, invoice.currency)}
                                </div>
                                <div className="text-sm text-neutral-500">
                                    Pendiente de sincronización automática
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Transaction table with filters */}
            <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1fr,220px,220px]">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por descripción, proyecto, categoría o factura..."
                            className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-neutral-400"
                        />
                    </label>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="income">Solo ingresos</option>
                        <option value="expense">Solo gastos</option>
                    </select>

                    <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                    >
                        <option value="all">Todos los períodos</option>
                        {periods.map((period) => (
                            <option key={period.id} value={period.id}>{period.name}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400">
                                <th className="pb-4 pr-4 font-medium">Fecha</th>
                                <th className="pb-4 pr-4 font-medium">Tipo</th>
                                <th className="pb-4 pr-4 font-medium">Detalle</th>
                                <th className="pb-4 pr-4 font-medium">Período</th>
                                <th className="pb-4 pr-4 font-medium">Monto</th>
                                <th className="pb-4 font-medium text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-sm text-neutral-500">
                                        No hay movimientos para mostrar con los filtros actuales.
                                    </td>
                                </tr>
                            )}

                            {filteredTransactions.map((transaction) => (
                                <tr key={transaction.id} className="align-top">
                                    <td className="py-4 pr-4 text-sm text-neutral-500">
                                        {formatFinanceDate(transaction.transaction_date)}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                            transaction.type === 'income'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-rose-50 text-rose-600'
                                        }`}>
                                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <p className="font-semibold text-neutral-900">{transaction.description || 'Sin descripción'}</p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            {getFinanceCategoryLabel(transaction.type, transaction.category)}
                                            {transaction.project ? ` · ${getProjectDisplayName(transaction.project)}` : ''}
                                        </p>
                                        {transaction.invoice?.invoice_number && (
                                            <p className="mt-1 text-sm text-neutral-500">
                                                Factura: {transaction.invoice.invoice_number}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-4 pr-4 text-sm text-neutral-500">
                                        {transaction.period?.name || 'Sin período'}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {transaction.type === 'income' ? '+' : '-'}
                                            {formatFinanceCurrency(transaction.amount, transaction.currency)}
                                        </p>
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => openEditTransaction(transaction)}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                                        >
                                            <Edit3 size={14} />
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <TransactionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={refetch}
                periods={periods}
                projects={projects}
                invoices={invoices}
                initialValues={editingTransaction}
                defaultType={modalType}
            />
        </div>
    );
};

export default LedgerTab;
