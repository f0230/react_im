import React from 'react';
import { MoreHorizontal, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MultiUseSelect from '@/components/MultiUseSelect';
import { formatFinanceCurrency, formatFinanceDate } from '@/utils/finance';

const selectButtonClass = 'h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-none hover:border-neutral-300';
const selectListClass = 'border border-neutral-200 bg-white text-neutral-900 text-sm';

const TransactionTable = ({
    transactions,
    searchTerm,
    onSearchTermChange,
    typeFilter,
    onTypeFilterChange,
    periodFilter,
    onPeriodFilterChange,
    periodOptions,
    onEditTransaction,
    onViewTransaction,
}) => {
    const typeOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'income', label: 'Ingresos' },
        { value: 'expense', label: 'Gastos' },
    ];

    return (
        <section className="rounded-[24px] border border-neutral-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Movimientos</p>
                    <h3 className="mt-1 text-lg font-semibold text-neutral-950">Transacciones</h3>
                </div>

                <div className="flex flex-col gap-2 lg:flex-row">
                    <label className="relative block min-w-[260px]">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => onSearchTermChange(event.target.value)}
                            placeholder="Buscar detalle o factura..."
                            className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                        />
                    </label>

                    <MultiUseSelect theme="light" options={typeOptions} value={typeFilter} onChange={onTypeFilterChange} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                    <MultiUseSelect theme="light" options={periodOptions} value={periodFilter} onChange={onPeriodFilterChange} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                </div>
            </div>

            <div className="max-h-[560px] overflow-auto">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                        <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                            <th className="px-4 py-2 font-medium">Fecha</th>
                            <th className="px-4 py-2 font-medium">Detalle</th>
                            <th className="px-4 py-2 font-medium text-right">Monto</th>
                            <th className="px-4 py-2 font-medium">Tipo</th>
                            <th className="px-4 py-2 text-right font-medium" />
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                                    No hay transacciones para los filtros actuales.
                                </td>
                            </tr>
                        )}

                        {transactions.map((transaction) => (
                            <tr key={transaction.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                <td className="px-4 py-2.5 whitespace-nowrap text-neutral-500">{formatFinanceDate(transaction.transaction_date)}</td>
                                <td className="px-4 py-2.5">
                                    <p className="font-medium text-neutral-900">{transaction.description || 'Sin descripción'}</p>
                                    <p className="text-xs text-neutral-500">
                                        {transaction.period?.name || 'Sin período'}
                                        {transaction.invoice?.invoice_number ? ` · ${transaction.invoice.invoice_number}` : ''}
                                    </p>
                                </td>
                                <td className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {transaction.type === 'income' ? '+' : '-'}
                                    {formatFinanceCurrency(transaction.amount, transaction.currency)}
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                                        {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-neutral-500 transition hover:border-neutral-200 hover:text-neutral-900">
                                                <MoreHorizontal size={15} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onViewTransaction(transaction)}>Ver detalle</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEditTransaction(transaction)} disabled={transaction.period?.status === 'closed'}>
                                                {transaction.period?.status === 'closed' ? 'Período cerrado' : 'Editar'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default TransactionTable;
