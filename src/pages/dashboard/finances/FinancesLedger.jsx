import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Plus, Receipt, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
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

const FinancesLedger = () => {
    const { profile, loading } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [projects, setProjects] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('income');
    const [editingTransaction, setEditingTransaction] = useState(null);

    const isAdmin = profile?.role === 'admin';

    const fetchLedger = useCallback(async () => {
        setFetching(true);
        setError('');

        const [
            { data: transactionsData, error: transactionsError },
            { data: periodsData, error: periodsError },
            { data: projectsData, error: projectsError },
            { data: invoicesData, error: invoicesError },
        ] = await Promise.all([
            supabase
                .from('finance_transactions')
                .select(`
                    *,
                    period:finance_periods(id, name, status),
                    project:projects(id, name),
                    invoice:invoices(id, invoice_number, project_id, description),
                    invoice_id
                `)
                .order('transaction_date', { ascending: false })
                .order('created_at', { ascending: false }),
            supabase.from('finance_periods').select('id, name, status').order('start_date', { ascending: false }),
            supabase.from('projects').select('id, name').order('created_at', { ascending: false }),
            supabase.from('invoices').select('id, invoice_number, description, amount, currency, project_id, status, paid_at, updated_at, created_at').order('updated_at', { ascending: false }),
        ]);

        if (transactionsError || periodsError || projectsError || invoicesError) {
            const message = transactionsError?.message || periodsError?.message || projectsError?.message || invoicesError?.message;
            console.error('Error fetching finance ledger:', { transactionsError, periodsError, projectsError, invoicesError });
            setError(message || 'No pudimos cargar el ledger.');
            setFetching(false);
            return;
        }

        setTransactions(transactionsData || []);
        setPeriods(periodsData || []);
        setProjects(projectsData || []);
        setInvoices(invoicesData || []);
        setFetching(false);
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchLedger();
    }, [fetchLedger, isAdmin]);

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
        const currency = filteredTransactions[0]?.currency || 'USD';
        const income = filteredTransactions
            .filter((transaction) => transaction.type === 'income')
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
        const expenses = filteredTransactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

        return {
            currency,
            income,
            expenses,
            net: income - expenses,
        };
    }, [filteredTransactions]);

    const paidInvoicesPendingImport = useMemo(() => {
        const importedIds = new Set(transactions.map((transaction) => transaction.invoice_id).filter(Boolean));
        return invoices.filter((invoice) => invoice.status === 'paid' && !importedIds.has(invoice.id));
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

    if (loading || (isAdmin && fetching)) {
        return <LoadingFallback type="spinner" />;
    }

    if (!loading && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="pb-16 font-product text-neutral-900">
            <Link
                to="/dashboard/finances"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
            >
                <ArrowLeft size={15} />
                Volver a finanzas
            </Link>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Historial completo</p>
                    <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Todos los movimientos</h1>
                    <p className="mt-3 max-w-3xl text-lg text-neutral-500">
                        Vista completa de ingresos y gastos. Los cobros de facturas entran solos — los gastos se registran manualmente.
                    </p>
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

            {error && (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
                    {error}
                </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FinanceKpiCard
                    icon={TrendingUp}
                    label="Ingresos filtrados"
                    value={formatFinanceCurrency(stats.income, stats.currency)}
                    color="text-emerald-600"
                />
                <FinanceKpiCard
                    icon={TrendingDown}
                    label="Gastos filtrados"
                    value={formatFinanceCurrency(stats.expenses, stats.currency)}
                    color="text-rose-500"
                />
                <FinanceKpiCard
                    icon={Wallet}
                    label="Resultado neto"
                    value={formatFinanceCurrency(stats.net, stats.currency)}
                    color={stats.net >= 0 ? 'text-neutral-900' : 'text-rose-500'}
                />
                <FinanceKpiCard
                    icon={Wallet}
                    label="Movimientos"
                    value={filteredTransactions.length}
                    sub="Cantidad de registros visibles con los filtros actuales."
                />
                <FinanceKpiCard
                    icon={Receipt}
                    label="Facturas paid sin registrar"
                    value={paidInvoicesPendingImport.length}
                    sub="Si aparece algo acá, hay una cobranza que no se sincronizó automáticamente."
                    color={paidInvoicesPendingImport.length > 0 ? 'text-amber-600' : 'text-neutral-900'}
                />
            </div>

            <section className="mt-8 rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Facturación conectada</p>
                        <h2 className="mt-2 text-2xl font-black">Cobros detectados desde facturas</h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            Cuando una factura está en `paid`, debería aparecer sola en el ledger. Si ves algo acá, es una alerta de sincronización pendiente.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    {paidInvoicesPendingImport.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                            No hay facturas cobradas pendientes de sincronización.
                        </div>
                    )}

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

            <section className="mt-8 rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1fr,220px,220px]">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar por descripción, proyecto, categoría o factura..."
                            className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-neutral-400"
                        />
                    </label>

                    <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="income">Solo ingresos</option>
                        <option value="expense">Solo gastos</option>
                    </select>

                    <select
                        value={periodFilter}
                        onChange={(event) => setPeriodFilter(event.target.value)}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                    >
                        <option value="all">Todos los períodos</option>
                        {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                                {period.name}
                            </option>
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
                onSaved={fetchLedger}
                periods={periods}
                projects={projects}
                invoices={invoices}
                initialValues={editingTransaction}
                defaultType={modalType}
            />
        </div>
    );
};

export default FinancesLedger;
