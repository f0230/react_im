import React, { useEffect, useMemo, useState } from 'react';
import PeriodCard from '@/components/finances/PeriodCard';
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
    const periodSummary = useMemo(() => ({
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

        setInvalidPeriodNotice('El período pedido en la URL ya no existe o quedó viejo. Te mostramos la lista actual.');

        const next = new URLSearchParams(searchParams);
        next.delete('period');
        setSearchParams(next, { replace: true });
    }, [searchParams, selectedPeriodExists, selectedPeriodId, setSearchParams]);

    const goToPeriod = (periodId) => {
        setInvalidPeriodNotice('');
        const next = new URLSearchParams(searchParams);
        next.set('period', periodId);
        setSearchParams(next, { replace: true });
    };

    const goBack = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('period');
        setSearchParams(next, { replace: true });
    };

    if (selectedPeriodId && selectedPeriodExists) {
        return (
            <PeriodDetail
                periodId={selectedPeriodId}
                config={config}
                profileMap={profileMap}
                currency={currency}
                companyFundMovements={companyFundMovements}
                refetch={refetch}
                onBack={goBack}
                onOpenLedger={() => {
                    const next = new URLSearchParams();
                    next.set('tab', 'ledger');
                    setSearchParams(next, { replace: true });
                }}
            />
        );
    }

    return (
        <div className="space-y-5 font-product text-neutral-900">
            <div>
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Administracion</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Todos los periodos</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Total', value: periodSummary.total },
                    { label: 'Abiertos', value: periodSummary.open },
                    { label: 'Cerrados', value: periodSummary.closed },
                    { label: 'Ajuste', value: periodSummary.adjustments },
                ].map((item) => (
                    <div key={item.label} className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">{item.label}</p>
                        <p className="mt-2 text-2xl font-black text-neutral-900">{item.value}</p>
                    </div>
                ))}
            </div>

            {invalidPeriodNotice && (
                <div className="rounded-[32px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                    {invalidPeriodNotice}
                </div>
            )}

            {periodsWithTotals.length === 0 && (
                <div className="rounded-[32px] border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                    No hay periodos creados todavia.
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {periodsWithTotals.map((period) => (
                    <PeriodCard key={period.id} period={period} onSelect={goToPeriod} />
                ))}
            </div>
        </div>
    );
};

export default PeriodsTab;
