import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import useFinanceData from '@/hooks/useFinanceData';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { FINANCE_REPORTING_CURRENCY } from '@/utils/finance';
import { buildFinanceSearchParams, FINANCE_TAB_OPTIONS, normalizeFinanceSearchParams } from './financeTabs';

const DashboardTab = lazy(() => import('./components/DashboardTab'));
const PeriodsTab = lazy(() => import('./components/PeriodsTab'));
const ReportsTab = lazy(() => import('./components/ReportsTab'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const FinancesDashboard = () => {
    const { loading: authLoading } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const data = useFinanceData();
    const {
        config,
        periods,
        transactions,
        invoices,
        projects,
        distributions,
        profiles,
        currency,
        adminProfiles,
        workerProfiles,
        summaryKpis,
        companyFundMovements,
        periodsWithTotals,
        profileMap,
        loading,
        error,
        isAdmin,
        refetch,
    } = data;

    const normalizedSearch = useMemo(
        () => normalizeFinanceSearchParams(searchParams),
        [searchParams],
    );

    useEffect(() => {
        if (!normalizedSearch.changed) return;
        setSearchParams(normalizedSearch.params, { replace: true });
    }, [normalizedSearch.changed, normalizedSearch.params, setSearchParams]);

    const activeTab = normalizedSearch.tab;
    const reportView = normalizedSearch.reportView;

    const setTab = (tab, nextView = null) => {
        const next = buildFinanceSearchParams(searchParams, { tab });

        if (tab !== 'periodos') next.delete('period');
        if (tab !== 'dashboard') next.delete('transactionPeriod');

        if (tab === 'reportes') next.set('view', nextView || reportView || 'mensual');
        else next.delete('view');

        setSearchParams(next, { replace: true });
    };

    if (authLoading) return <LoadingFallback type="spinner" />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    if (loading) return <LoadingFallback type="spinner" />;

    if (error) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <p className="mb-2 text-rose-500">{error}</p>
                    <button onClick={refetch} className="text-sm text-neutral-500 underline hover:text-neutral-700">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const sharedProps = {
        config,
        periods,
        transactions,
        invoices,
        projects,
        distributions,
        profiles,
        currency,
        adminProfiles,
        workerProfiles,
        summaryKpis,
        companyFundMovements,
        periodsWithTotals,
        profileMap,
        refetch,
        searchParams,
        setSearchParams,
    };

    return (
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 py-4 lg:px-5">
            <section className="rounded-[28px] border border-neutral-200 bg-white px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">Administración financiera</p>
                        <h1 className="mt-1 text-2xl font-product font-bold tracking-tight text-neutral-950 sm:text-[30px]">
                            Finanzas DTE
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm text-neutral-500">
                            Estado actual, períodos y reportes en una estructura más compacta y sin duplicar información.
                        </p>
                    </div>

                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center gap-2 self-start rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900"
                    >
                        <Settings2 size={16} />
                        Configuración
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {FINANCE_TAB_OPTIONS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setTab(tab.key)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                activeTab === tab.key
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            <Suspense fallback={<LoadingFallback type="spinner" />}>
                {activeTab === 'dashboard' && <DashboardTab {...sharedProps} currency={FINANCE_REPORTING_CURRENCY} />}
                {activeTab === 'periodos' && <PeriodsTab {...sharedProps} />}
                {activeTab === 'reportes' && <ReportsTab {...sharedProps} currency={FINANCE_REPORTING_CURRENCY} reportView={reportView} onChangeView={(view) => setTab('reportes', view)} />}
            </Suspense>

            {settingsOpen && (
                <Suspense fallback={null}>
                    <SettingsModal
                        open={settingsOpen}
                        onClose={() => setSettingsOpen(false)}
                        config={config}
                        adminProfiles={adminProfiles}
                        onSaved={refetch}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default FinancesDashboard;
