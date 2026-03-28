import React, { lazy, Suspense, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Settings2, TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import useFinanceData from '@/hooks/useFinanceData';
import LoadingFallback from '@/components/ui/LoadingFallback';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency } from '@/utils/finance';

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
        periodsWithTotals, profileMap, refetch,
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* ─── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-product font-bold text-neutral-900">
                    Finanzas DTE
                </h1>
                <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 rounded-xl text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title="Configuración"
                >
                    <Settings2 size={20} />
                </button>
            </div>

            {/* ─── Global KPIs ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FinanceKpiCard
                    icon={TrendingUp}
                    label="INGRESOS"
                    value={formatFinanceCurrency(summaryKpis.income, currency)}
                />
                <FinanceKpiCard
                    icon={TrendingDown}
                    label="GASTOS"
                    value={formatFinanceCurrency(summaryKpis.expenses, currency)}
                    color="text-rose-600"
                />
                <FinanceKpiCard
                    icon={Wallet}
                    label="NETO"
                    value={formatFinanceCurrency(summaryKpis.net, currency)}
                    color={summaryKpis.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                />
                <FinanceKpiCard
                    icon={Clock}
                    label="PENDIENTE"
                    value={formatFinanceCurrency(summaryKpis.pendingPayouts, currency)}
                    color="text-amber-600"
                />
            </div>

            {/* ─── Tab Bar ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-neutral-200">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setTab(tab.key)}
                        className={`relative px-4 py-2.5 text-xs uppercase tracking-[0.2em] font-inter whitespace-nowrap transition-colors ${
                            activeTab === tab.key
                                ? 'text-neutral-900 font-semibold'
                                : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <motion.div
                                layoutId="finance-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-900 rounded-full"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                        )}
                    </button>
                ))}
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
