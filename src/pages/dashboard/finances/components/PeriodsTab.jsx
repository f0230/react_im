import React from 'react';
import PeriodCard from '@/components/finances/PeriodCard';
import PeriodDetail from './PeriodDetail';

const PeriodsTab = ({ periodsWithTotals, config, profileMap, currency, refetch, searchParams, setSearchParams }) => {
    const selectedPeriodId = searchParams.get('period');

    const goToPeriod = (periodId) => {
        const next = new URLSearchParams(searchParams);
        next.set('period', periodId);
        setSearchParams(next, { replace: true });
    };

    const goBack = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('period');
        setSearchParams(next, { replace: true });
    };

    if (selectedPeriodId) {
        return (
            <PeriodDetail
                periodId={selectedPeriodId}
                config={config}
                profileMap={profileMap}
                currency={currency}
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
        <div className="space-y-6 font-product text-neutral-900">
            <div>
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Administracion</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Todos los periodos</h2>
            </div>

            {periodsWithTotals.length === 0 && (
                <div className="rounded-[32px] border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                    No hay periodos creados todavia.
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {periodsWithTotals.map((period) => (
                    <PeriodCard key={period.id} period={period} onSelect={goToPeriod} />
                ))}
            </div>
        </div>
    );
};

export default PeriodsTab;
