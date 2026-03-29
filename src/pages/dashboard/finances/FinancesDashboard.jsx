import React, { lazy, Suspense } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import useFinanceData from '@/hooks/useFinanceData';
import LoadingFallback from '@/components/ui/LoadingFallback';

// Lazy tab components (code-split per tab)
const OverviewTab = lazy(() => import('./components/OverviewTab'));
const PeriodsTab = lazy(() => import('./components/PeriodsTab'));
const ProjectsTab = lazy(() => import('./components/ProjectsTab'));
const CashflowTab = lazy(() => import('./components/CashflowTab'));
const LedgerTab = lazy(() => import('./components/LedgerTab'));
const ReportsTab = lazy(() => import('./components/ReportsTab'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const TABS = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'periodos', label: 'Periodos' },
    { key: 'proyectos', label: 'Proyectos' },
    { key: 'cashflow', label: 'Cash Flow' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'reportes', label: 'Reportes' },
];

const FinancesDashboard = () => {
    const { profile, loading: authLoading } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'resumen';
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const data = useFinanceData();
    const {
        config, periods, transactions, invoices, projects, distributions,
        profiles, currency, adminProfiles, workerProfiles, summaryKpis,
        companyFundMovements,
        periodsWithTotals, profileMap, loading, error, isAdmin, refetch,
    } = data;

    const setTab = (key) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', key);
        next.delete('period');
        setSearchParams(next, { replace: true });
    };

    // ─── Guards ──────────────────────────────────────────────────────────────
    if (authLoading) return <LoadingFallback type="spinner" />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    if (loading) return <LoadingFallback type="spinner" />;

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-rose-500 mb-2">{error}</p>
                    <button onClick={refetch} className="text-sm text-neutral-500 underline hover:text-neutral-700">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    // Common props passed to all tabs
    const sharedProps = {
        config, periods, transactions, invoices, projects, distributions,
        profiles, currency, adminProfiles, workerProfiles, summaryKpis,
        companyFundMovements,
        periodsWithTotals, profileMap, refetch,
    };

    return (
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-3 py-4 sm:px-4 lg:px-5">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">Administración financiera</p>
                        <h1 className="mt-1.5 text-2xl font-product font-bold tracking-tight text-neutral-900 sm:text-[30px]">
                            Finanzas DTE
                        </h1>
                        <p className="mt-1.5 max-w-3xl text-sm text-neutral-500">
                            Caja, períodos, ledger, fondo empresa y compensaciones en una vista más compacta para operar mejor desde desktop y mobile.
                        </p>
                    </div>

                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                        title="Configuración"
                    >
                        <Settings2 size={16} />
                        Configuración
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setTab(tab.key)}
                            className={`relative rounded-2xl px-3.5 py-2 text-[11px] uppercase tracking-[0.22em] font-inter whitespace-nowrap transition-colors sm:px-4 ${
                                activeTab === tab.key
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800'
                            }`}
                        >
                            {tab.label}
                            {activeTab === tab.key && (
                                <motion.div
                                    layoutId="finance-tab-pill"
                                    className="absolute inset-0 -z-10 rounded-2xl bg-neutral-900"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Tab Content ───────────────────────────────────────────── */}
            <Suspense fallback={<LoadingFallback type="spinner" />}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'resumen' && <OverviewTab {...sharedProps} />}
                        {activeTab === 'periodos' && <PeriodsTab {...sharedProps} searchParams={searchParams} setSearchParams={setSearchParams} />}
                        {activeTab === 'proyectos' && <ProjectsTab {...sharedProps} />}
                        {activeTab === 'cashflow' && <CashflowTab {...sharedProps} />}
                        {activeTab === 'ledger' && <LedgerTab {...sharedProps} />}
                        {activeTab === 'reportes' && <ReportsTab {...sharedProps} />}
                    </motion.div>
                </AnimatePresence>
            </Suspense>

            {/* ─── Settings Modal ─────────────────────────────────────────── */}
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
