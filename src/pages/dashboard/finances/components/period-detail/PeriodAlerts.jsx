import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AlertItem = ({ children, tone = 'amber' }) => {
    const styles = {
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        rose: 'border-rose-200 bg-rose-50 text-rose-600',
        violet: 'border-violet-200 bg-violet-50/60 text-violet-700',
    };

    return (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${styles[tone]}`}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>{children}</div>
        </div>
    );
};

const PeriodAlerts = ({
    period,
    missingFounderAssignments,
    duplicateFounderAssignments,
    paidInvoicesPendingImport,
    previewDistributions,
    workerPoolSummary,
    error,
}) => (
    <div className="space-y-3">
        {error ? <AlertItem tone="rose">{error}</AlertItem> : null}
        {period?.status === 'open' && missingFounderAssignments ? (
            <AlertItem>
                Definí quién representa a Francisco y Federico en configuración antes de cerrar el período.
            </AlertItem>
        ) : null}
        {period?.status === 'open' && duplicateFounderAssignments ? (
            <AlertItem tone="rose">
                Francisco y Federico no pueden usar el mismo perfil. Ajustalo en configuración antes de cerrar el período.
            </AlertItem>
        ) : null}
        {period?.status === 'open' && paidInvoicesPendingImport.length > 0 ? (
            <AlertItem>
                Hay {paidInvoicesPendingImport.length} factura(s) cobradas dentro de este período que todavía no entraron al ledger.
            </AlertItem>
        ) : null}
        {period?.status === 'open' && workerPoolSummary.poolCap > 0 && !previewDistributions?.hasWorkerActivity ? (
            <AlertItem tone="violet">
                Todavía no hay work logs aprobados. Si cerraras hoy, el pool workers ganado seguiría en 0.
            </AlertItem>
        ) : null}
    </div>
);

export default PeriodAlerts;
