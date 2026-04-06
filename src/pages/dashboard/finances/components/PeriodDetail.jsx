import React, { useState } from 'react';
import { Download, Eye, Landmark, Lock, Unlock } from 'lucide-react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import WorkerWeightEditor from '@/components/finances/WorkerWeightEditor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { formatFinancePeriodRange } from '@/utils/finance';
import PeriodAlerts from './period-detail/PeriodAlerts';
import PeriodClosePreviewDialog from './period-detail/PeriodClosePreviewDialog';
import PeriodCompanyFundSection from './period-detail/PeriodCompanyFundSection';
import PeriodDistributionsSection from './period-detail/PeriodDistributionsSection';
import PeriodSnapshotSection from './period-detail/PeriodSnapshotSection';
import PeriodSummarySection from './period-detail/PeriodSummarySection';
import PeriodWorkersSection from './period-detail/PeriodWorkersSection';
import { usePeriodDetailData } from './period-detail/usePeriodDetailData';

const PeriodDetail = ({
    open,
    periodId,
    config,
    profileMap,
    currency,
    companyFundMovements,
    refetch,
    onOpenChange,
    onOpenDashboardTransactions,
}) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [workerEditorOpen, setWorkerEditorOpen] = useState(false);
    const detail = usePeriodDetailData({
        periodId,
        config,
        sharedProfileMap: profileMap,
        currency,
        companyFundMovements,
        parentRefetch: refetch,
    });

    const {
        fetching,
        submitting,
        error,
        setError,
        period,
        snapshot,
        totals,
        transactions,
        adminDistributions,
        workerDistributions,
        legacyCompanyDistributions,
        paidInvoicesPendingImport,
        workerPoolSummary,
        companyFundReleaseSummary,
        displayedCompanyFundBalance,
        projectedCompanyFundBalance,
        companyFundCreditAmount,
        periodCompanyFundMovements,
        previewDistributions,
        duplicateFounderAssignments,
        missingFounderAssignments,
        canClosePeriod,
        profileMap: resolvedProfileMap,
        displayCurrency,
        handleClosePeriod,
        handleSaveDistributionPayment,
        downloadClosingSummary,
        refreshAll,
    } = detail;

    const handleOpenTransactions = () => {
        onOpenDashboardTransactions?.(periodId);
        onOpenChange?.(false);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-[min(100%,54rem)]">
                    <SheetHeader>
                        {fetching ? null : period ? (
                            <div className="space-y-3 pr-12">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${period.status === 'closed' ? 'bg-neutral-900 text-white' : 'bg-sky-50 text-sky-700'}`}>
                                        {period.status === 'closed' ? <Lock size={12} /> : <Unlock size={12} />}
                                        {period.status === 'closed' ? 'Cerrado' : 'Abierto'}
                                    </span>
                                    {period.period_type === 'adjustment' ? (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                                            <Landmark size={12} />
                                            Ajuste
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold text-neutral-950">{period.name}</h2>
                                        <p className="mt-1 text-sm text-neutral-500">{formatFinancePeriodRange(period.start_date, period.end_date)}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {period.status === 'open' ? (
                                            <button type="button" onClick={() => setPreviewOpen(true)} disabled={!canClosePeriod} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">
                                                <Eye size={15} />
                                                Previsualizar cierre
                                            </button>
                                        ) : (
                                            <button type="button" onClick={downloadClosingSummary} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900">
                                                <Download size={15} />
                                                Descargar resumen
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="pr-12">
                                <h2 className="text-xl font-semibold text-neutral-950">Período no disponible</h2>
                                <p className="mt-1 text-sm text-neutral-500">No pudimos abrir el detalle solicitado.</p>
                            </div>
                        )}
                    </SheetHeader>

                    <SheetBody className="space-y-4">
                        {fetching ? <LoadingFallback type="spinner" /> : null}
                        {!fetching && !period ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600">{error || 'No encontramos ese período.'}</div>
                        ) : null}
                        {!fetching && period ? (
                            <>
                                <PeriodAlerts
                                    period={period}
                                    missingFounderAssignments={missingFounderAssignments}
                                    duplicateFounderAssignments={duplicateFounderAssignments}
                                    paidInvoicesPendingImport={paidInvoicesPendingImport}
                                    previewDistributions={previewDistributions}
                                    workerPoolSummary={workerPoolSummary}
                                    error={error}
                                />

                                <Accordion type="multiple" defaultValue={['summary']} className="rounded-[24px] border border-neutral-200 bg-white px-4">
                                    <AccordionItem value="summary">
                                        <AccordionTrigger>Resumen</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4">
                                                <PeriodSummarySection
                                                    totals={totals}
                                                    displayCurrency={displayCurrency}
                                                    displayedCompanyFundBalance={displayedCompanyFundBalance}
                                                    workerPoolSummary={workerPoolSummary}
                                                    projectedCompanyFundBalance={projectedCompanyFundBalance}
                                                    paidInvoicesPendingImport={paidInvoicesPendingImport}
                                                    transactions={transactions}
                                                    onOpenTransactions={handleOpenTransactions}
                                                />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="distributions">
                                        <AccordionTrigger>Distribuciones</AccordionTrigger>
                                        <AccordionContent>
                                            <PeriodDistributionsSection
                                                adminDistributions={adminDistributions}
                                                workerDistributions={workerDistributions}
                                                legacyCompanyDistributions={legacyCompanyDistributions}
                                                profileMap={resolvedProfileMap}
                                                periodStatus={period.status}
                                                onSavePayment={handleSaveDistributionPayment}
                                                previewDistributions={previewDistributions}
                                                currency={displayCurrency}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="workers">
                                        <AccordionTrigger>Workers</AccordionTrigger>
                                        <AccordionContent>
                                            <PeriodWorkersSection
                                                workerPoolSummary={workerPoolSummary}
                                                displayCurrency={displayCurrency}
                                                onOpenEditor={() => setWorkerEditorOpen(true)}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="fund">
                                        <AccordionTrigger>Fondo empresa</AccordionTrigger>
                                        <AccordionContent>
                                            <PeriodCompanyFundSection
                                                displayCurrency={displayCurrency}
                                                displayedCompanyFundBalance={displayedCompanyFundBalance}
                                                companyFundReleaseSummary={companyFundReleaseSummary}
                                                projectedCompanyFundBalance={projectedCompanyFundBalance}
                                                companyFundCreditAmount={companyFundCreditAmount}
                                                periodCompanyFundMovements={periodCompanyFundMovements}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="transactions">
                                        <AccordionTrigger>Transacciones del período</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                                                La tabla completa vive en Dashboard para evitar duplicación. Este período tiene {transactions.length} movimiento(s).
                                                <button type="button" onClick={handleOpenTransactions} className="ml-2 font-semibold text-neutral-900 underline">
                                                    Ver transacciones
                                                </button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {(period.status === 'closed' || snapshot) ? (
                                        <AccordionItem value="snapshot">
                                            <AccordionTrigger>Snapshot</AccordionTrigger>
                                            <AccordionContent>
                                                <PeriodSnapshotSection
                                                    snapshot={snapshot}
                                                    totals={totals}
                                                    displayCurrency={displayCurrency}
                                                    workerPoolSummary={workerPoolSummary}
                                                    companyFundCreditAmount={companyFundCreditAmount}
                                                    companyFundReleaseSummary={companyFundReleaseSummary}
                                                />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ) : null}
                                </Accordion>
                            </>
                        ) : null}
                    </SheetBody>
                </SheetContent>
            </Sheet>

            <Dialog open={workerEditorOpen} onOpenChange={setWorkerEditorOpen}>
                <DialogContent className="max-w-[72rem]">
                    <DialogHeader>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Workers</p>
                        <DialogTitle>Editor de compensación y work logs</DialogTitle>
                    </DialogHeader>
                    {period ? (
                        <div className="max-h-[78vh] overflow-y-auto px-5 pb-5">
                            <WorkerWeightEditor
                                periodId={periodId}
                                periodStatus={period.status}
                                workersPoolAmount={workerPoolSummary.poolCap}
                                workersPoolEarnedAmount={workerPoolSummary.poolEarned}
                                workersPoolUnallocatedAmount={workerPoolSummary.poolUnallocated}
                                workersTargetWeightedPoints={workerPoolSummary.targetWeightedPoints}
                                totalWeightedPoints={workerPoolSummary.totalWeightedPoints}
                                poolUtilizationRatio={workerPoolSummary.utilizationRatio}
                                currency={displayCurrency}
                                profileMap={resolvedProfileMap}
                                disabled={period.status === 'closed'}
                                onSaved={async () => {
                                    setError('');
                                    await refreshAll();
                                }}
                            />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            {period ? (
                <PeriodClosePreviewDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    period={period}
                    totals={totals}
                    displayCurrency={displayCurrency}
                    previewDistributions={previewDistributions}
                    workerPoolSummary={workerPoolSummary}
                    onConfirm={async () => {
                        const closed = await handleClosePeriod();
                        if (closed) setPreviewOpen(false);
                    }}
                    submitting={submitting}
                />
            ) : null}
        </>
    );
};

export default PeriodDetail;
