import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceCategoryLabel,
    getProjectDisplayName,
} from '@/utils/finance';

const DetailRow = ({ label, value, className = '' }) => (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">{label}</p>
        <p className={`mt-1 text-sm font-medium text-neutral-900 ${className}`}>{value}</p>
    </div>
);

const TransactionDetailDialog = ({ transaction, open, onOpenChange }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Movimiento</p>
                <DialogTitle>{transaction?.description || 'Sin descripción'}</DialogTitle>
                <DialogDescription>Detalle completo del registro contable seleccionado.</DialogDescription>
            </DialogHeader>

            {transaction && (
                <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
                    <DetailRow label="Fecha" value={formatFinanceDate(transaction.transaction_date)} />
                    <DetailRow label="Tipo" value={transaction.type === 'income' ? 'Ingreso' : 'Gasto'} />
                    <DetailRow label="Monto" value={formatFinanceCurrency(transaction.amount, transaction.currency)} className={transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-500'} />
                    <DetailRow label="Categoría" value={getFinanceCategoryLabel(transaction.type, transaction.category)} />
                    <DetailRow label="Proyecto" value={transaction.project ? getProjectDisplayName(transaction.project) : 'Sin proyecto'} />
                    <DetailRow label="Período" value={transaction.period?.name || 'Sin período'} />
                    <DetailRow label="Factura" value={transaction.invoice?.invoice_number || 'Sin factura'} />
                    <DetailRow label="Financiación" value={transaction.funding_source === 'company_fund' ? 'Fondo empresa' : 'Caja externa'} />
                    <div className="md:col-span-2 rounded-2xl bg-neutral-50 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Notas</p>
                        <p className="mt-1 text-sm text-neutral-700">{transaction.notes || 'Sin notas cargadas.'}</p>
                    </div>
                </div>
            )}
        </DialogContent>
    </Dialog>
);

export default TransactionDetailDialog;
