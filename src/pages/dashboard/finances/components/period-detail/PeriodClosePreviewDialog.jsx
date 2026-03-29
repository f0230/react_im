import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatFinanceCurrency } from '@/utils/finance';

const PreviewStat = ({ label, value, className = '' }) => (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">{label}</p>
        <p className={`mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-900 ${className}`}>{value}</p>
    </div>
);

const PeriodClosePreviewDialog = ({
    open,
    onOpenChange,
    period,
    totals,
    displayCurrency,
    previewDistributions,
    workerPoolSummary,
    onConfirm,
    submitting,
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Previsualización</p>
                <DialogTitle>Confirmar cierre de {period?.name}</DialogTitle>
                <DialogDescription>Se congelará la foto contable y se generarán las compensaciones correspondientes.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-5 pb-5">
                <div className="grid gap-3 md:grid-cols-3">
                    <PreviewStat label="Ingresos" value={formatFinanceCurrency(totals.income, displayCurrency)} className="text-emerald-600" />
                    <PreviewStat label="Gastos" value={formatFinanceCurrency(totals.expenses, displayCurrency)} className="text-rose-500" />
                    <PreviewStat label="Neto" value={formatFinanceCurrency(totals.net, displayCurrency)} />
                </div>

                {previewDistributions && (
                    <div className="grid gap-3 md:grid-cols-2">
                        <PreviewStat label="Admins" value={formatFinanceCurrency(previewDistributions.francisco.amount + previewDistributions.federico.amount, displayCurrency)} />
                        <PreviewStat label="Workers ganado" value={formatFinanceCurrency(previewDistributions.workersPool.earnedAmount, displayCurrency)} />
                        <PreviewStat label="Fondo empresa" value={formatFinanceCurrency(previewDistributions.company.amount, displayCurrency)} />
                        <PreviewStat label="Release" value={formatFinanceCurrency(previewDistributions.company.releaseAmount, displayCurrency)} />
                        <PreviewStat label="Target workers" value={`${workerPoolSummary?.targetWeightedPoints?.toFixed(2) || '0.00'} pts`} />
                        <PreviewStat
                            label="Workers activos"
                            value={String(workerPoolSummary?.activeWorkersCount ?? 0)}
                        />
                    </div>
                )}
            </div>

            <DialogFooter>
                <button type="button" onClick={() => onOpenChange(false)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900">
                    Cancelar
                </button>
                <button type="button" onClick={onConfirm} disabled={submitting} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {submitting ? 'Cerrando...' : 'Cerrar período'}
                </button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default PeriodClosePreviewDialog;
