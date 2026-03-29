import React, { useEffect, useMemo, useState } from 'react';
import PeriodCard from '@/components/finances/PeriodCard';
import { buildFinanceSearchParams } from '../financeTabs';
import PeriodDetail from './PeriodDetail';

const PeriodsTab = ({
    periodsWithTotals,
    config,
    profileMap,
    currency,
    companyFundMovements,
    refetch,
    searchParams,
    setSearchParams,
}) => {
    const selectedPeriodId = searchParams.get('period');
    const [invalidPeriodNotice, setInvalidPeriodNotice] = useState('');

    const summary = useMemo(() => ({
        total: periodsWithTotals.length,
        open: periodsWithTotals.filter((period) => period.status === 'open').length,
        closed: periodsWithTotals.filter((period) => period.status === 'closed').length,
        adjustments: periodsWithTotals.filter((period) => period.period_type === 'adjustment').length,
    }), [periodsWithTotals]);

    const selectedPeriodExists = useMemo(
        () => !selectedPeriodId || periodsWithTotals.some((period) => period.id === selectedPeriodId),
        [periodsWithTotals, selectedPeriodId],
    );

    useEffect(() => {
        if (!selectedPeriodId || selectedPeriodExists) return;
        setInvalidPeriodNotice('El período pedido en la URL ya no existe. Dejamos la grilla actual abierta.');
        const next = buildFinanceSearchParams(searchParams, { period: null });
        setSearchParams(next, { replace: true });
    }, [searchParams, selectedPeriodExists, selectedPeriodId, setSearchParams]);

    const openPeriod = (periodId) => {
        setInvalidPeriodNotice('');
        const next = buildFinanceSearchParams(searchParams, { period: periodId });
        setSearchParams(next, { replace: true });
    };

    const closePeriodDrawer = () => {
        const next = buildFinanceSearchParams(searchParams, { period: null });
        setSearchParams(next, { replace: true });
    };

    const openDashboardTransactions = (periodId) => {
        const next = buildFinanceSearchParams(searchParams, {
            tab: 'dashboard',
            period: null,
            transactionPeriod: periodId,
        });
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="space-y-4 font-product text-neutral-900">
            <section className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Cierres y snapshots</p>
                <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Períodos</h2>
                <p className="mt-1 text-sm text-neutral-500">Vista compacta de aperturas, cierres y distribución por período.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {[
                        { label: 'Total', value: summary.total },
                        { label: 'Abiertos', value: summary.open },
                        { label: 'Cerrados', value: summary.closed },
                        { label: 'Ajuste', value: summary.adjustments },
                    ].map((item) => (
                        <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-600">
                            <span>{item.label}</span>
                            <span className="font-mono font-semibold tabular-nums text-neutral-950">{item.value}</span>
                        </span>
                    ))}
                </div>
            </section>

            {invalidPeriodNotice ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {invalidPeriodNotice}
                </div>
            ) : null}

            {periodsWithTotals.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
                    No hay períodos creados todavía.
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {periodsWithTotals.map((period) => (
                        <PeriodCard key={period.id} period={period} onSelect={openPeriod} />
                    ))}
                </div>
            )}

            <PeriodDetail
                open={Boolean(selectedPeriodId && selectedPeriodExists)}
                periodId={selectedPeriodExists ? selectedPeriodId : null}
                config={config}
                profileMap={profileMap}
                currency={currency}
                companyFundMovements={companyFundMovements}
                refetch={refetch}
                onOpenChange={(nextOpen) => !nextOpen && closePeriodDrawer()}
                onOpenDashboardTransactions={openDashboardTransactions}
            />
        </div>
    );
};

export default PeriodsTab;
