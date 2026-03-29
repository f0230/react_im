import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    Eye,
    Landmark,
    Lock,
    PiggyBank,
    Receipt,
    Unlock,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import DistributionRow from '@/components/finances/DistributionRow';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import WorkerWeightEditor from '@/components/finances/WorkerWeightEditor';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    formatFinancePeriodRange,
    getInvoiceDisplayLabel,
    getInvoicePaymentDate,
    getPersonDisplayName,
    getProjectDisplayName,
    isDateWithinPeriod,
} from '@/utils/finance';

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const PeriodDetail = ({
    periodId,
    config,
    profileMap: sharedProfileMap,
    currency,
    companyFundMovements = [],
    refetch: parentRefetch,
    onBack,
    onOpenLedger,
}) => {
    const { user } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [workerPreview, setWorkerPreview] = useState([]);
    const [localProfileMap, setLocalProfileMap] = useState({});
    const [previewOpen, setPreviewOpen] = useState(false);

    const profileMap = useMemo(
        () => ({ ...sharedProfileMap, ...localProfileMap }),
        [sharedProfileMap, localProfileMap],
    );

    const fetchPeriod = useCallback(async () => {
        if (!periodId) return;

        setFetching(true);
        setError('');
        setLocalProfileMap({});

        try {
            const [
                { data: periodData, error: periodError },
                { data: snapshotData, error: snapshotError },
                { data: transactionsData, error: transactionsError },
                { data: distributionsData, error: distributionsError },
                { data: invoicesData, error: invoicesError },
            ] = await Promise.all([
                supabase.from('finance_periods').select('*').eq('id', periodId).maybeSingle(),
                supabase.from('finance_period_snapshots').select('*').eq('period_id', periodId).maybeSingle(),
                supabase
                    .from('finance_transactions')
                    .select('*, project:projects(id, name), invoice_id')
                    .eq('period_id', periodId)
                    .order('transaction_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                supabase
                    .from('finance_distributions')
                    .select('*')
                    .eq('period_id', periodId)
                    .order('recipient_type', { ascending: true })
                    .order('created_at', { ascending: true }),
                supabase
                    .from('invoices')
                    .select('id, invoice_number, description, amount, currency, project_id, status, paid_at, updated_at, created_at')
                    .eq('status', 'paid')
                    .order('updated_at', { ascending: false }),
            ]);

            if (periodError) {
                setPeriod(null);
                setSnapshot(null);
                setTransactions([]);
                setDistributions([]);
                setInvoices([]);
                setError(periodError.message || 'No pudimos cargar el período.');
                return;
            }

            setPeriod(periodData || null);

            if (!periodData) {
                setSnapshot(null);
                setTransactions([]);
                setDistributions([]);
                setInvoices([]);
                return;
            }

            const auxiliaryErrors = [
                snapshotError,
                transactionsError,
                distributionsError,
                invoicesError,
            ].filter(Boolean);

            const safeSnapshot = snapshotError ? null : (snapshotData || null);
            const safeTransactions = transactionsError ? [] : (transactionsData || []);
            const safeDistributions = distributionsError ? [] : (distributionsData || []);
            const safeInvoices = invoicesError ? [] : (invoicesData || []);

            setSnapshot(safeSnapshot);
            setTransactions(safeTransactions);
            setDistributions(safeDistributions);
            setInvoices(safeInvoices);

            const profileIds = Array.from(new Set(safeDistributions.map((distribution) => distribution.profile_id).filter(Boolean)));
            const missingIds = profileIds.filter((id) => !sharedProfileMap[id]);

            if (missingIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', missingIds);

                if (profilesError) {
                    auxiliaryErrors.push(profilesError);
                } else if (profilesData) {
                    setLocalProfileMap(profilesData.reduce((acc, profile) => {
                        acc[profile.id] = profile;
                        return acc;
                    }, {}));
                }
            }

            if (auxiliaryErrors.length > 0) {
                const detailMessage = auxiliaryErrors[0]?.message || 'No pudimos cargar todo el detalle.';
                setError(`Abrimos el período, pero faltan datos auxiliares: ${detailMessage}`);
            }
        } catch (fetchError) {
            console.error('Error fetching finance period detail:', fetchError);
            setPeriod(null);
            setSnapshot(null);
            setTransactions([]);
            setDistributions([]);
            setInvoices([]);
            setError(fetchError.message || 'No pudimos cargar el período.');
        } finally {
            setFetching(false);
        }
    }, [periodId, sharedProfileMap]);

    useEffect(() => {
        void fetchPeriod();
    }, [fetchPeriod]);

    const totals = useMemo(() => {
        const cur = transactions[0]?.currency || config?.default_currency || currency || 'USD';
        const income = transactions
            .filter((transaction) => transaction.type === 'income')
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
        const expenses = transactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

        return {
            income,
            expenses,
            net: income - expenses,
            currency: cur,
        };
    }, [config?.default_currency, currency, transactions]);

    const periodPools = useMemo(() => {
        if (!config) {
            return {
                franciscoAmount: 0,
                federicoAmount: 0,
                workersPoolCapAmount: 0,
                companyBaseAmount: 0,
            };
        }

        if (totals.net <= 0) {
            return {
                franciscoAmount: 0,
                federicoAmount: 0,
                workersPoolCapAmount: 0,
                companyBaseAmount: 0,
            };
        }

        const franciscoAmount = roundMoney(totals.net * Number(config.pct_francisco || 0) / 100);
        const federicoAmount = roundMoney(totals.net * Number(config.pct_federico || 0) / 100);
        const workersPoolCapAmount = roundMoney(totals.net * Number(config.pct_workers || 0) / 100);
        const companyBaseAmount = roundMoney(totals.net - franciscoAmount - federicoAmount - workersPoolCapAmount);

        return {
            franciscoAmount,
            federicoAmount,
            workersPoolCapAmount,
            companyBaseAmount: Math.max(companyBaseAmount, 0),
        };
    }, [config, totals.net]);

    const workersTargetWeightedPoints = useMemo(() => (
        Math.max(Number(snapshot?.workers_target_weighted_points ?? config?.workers_target_weighted_points ?? 100), 1)
    ), [config?.workers_target_weighted_points, snapshot?.workers_target_weighted_points]);

    const fetchWorkerPreview = useCallback(async () => {
        if (!periodId || !period || period.status === 'closed') {
            setWorkerPreview([]);
            return;
        }

        const { data, error: previewError } = await supabase.rpc('get_period_worker_compensation_preview', {
            p_period_id: periodId,
            p_workers_pool: Number(periodPools.workersPoolCapAmount || 0),
        });

        if (previewError) {
            console.error('Error fetching worker compensation preview:', previewError);
            setError(previewError.message || 'No pudimos calcular el preview de workers.');
            return;
        }

        setWorkerPreview(data || []);
    }, [period, periodId, periodPools.workersPoolCapAmount]);

    useEffect(() => {
        if (!period || period.status === 'closed') return;
        void fetchWorkerPreview();
    }, [fetchWorkerPreview, period]);

    const currentCompanyFundBalance = useMemo(() => {
        return companyFundMovements.reduce((sum, movement) => {
            if ((movement.currency || currency) !== (config?.default_currency || currency)) return sum;
            return movement.movement_type === 'credit'
                ? sum + Number(movement.amount || 0)
                : sum - Number(movement.amount || 0);
        }, 0);
    }, [companyFundMovements, config?.default_currency, currency]);

    const previewWeightedPointsTotal = useMemo(() => {
        if (workerPreview.length > 0 && workerPreview[0].total_period_weighted_points != null) {
            return Number(workerPreview[0].total_period_weighted_points || 0);
        }

        return workerPreview.reduce((sum, row) => sum + Number(row.weighted_points || 0), 0);
    }, [workerPreview]);

    const previewPoolUtilizationRatio = useMemo(() => {
        if (workerPreview.length > 0 && workerPreview[0].pool_utilization_ratio != null) {
            return Number(workerPreview[0].pool_utilization_ratio || 0);
        }

        if (periodPools.workersPoolCapAmount <= 0) return 0;
        return Math.min(previewWeightedPointsTotal / workersTargetWeightedPoints, 1);
    }, [periodPools.workersPoolCapAmount, previewWeightedPointsTotal, workerPreview, workersTargetWeightedPoints]);

    const previewWorkersPoolEarned = useMemo(() => {
        if (workerPreview.length > 0 && workerPreview[0].workers_pool_earned != null) {
            return Number(workerPreview[0].workers_pool_earned || 0);
        }

        return roundMoney(periodPools.workersPoolCapAmount * previewPoolUtilizationRatio);
    }, [periodPools.workersPoolCapAmount, previewPoolUtilizationRatio, workerPreview]);

    const previewWorkersPoolUnallocated = useMemo(() => {
        if (workerPreview.length > 0 && workerPreview[0].workers_pool_unallocated != null) {
            return Number(workerPreview[0].workers_pool_unallocated || 0);
        }

        return roundMoney(Math.max(periodPools.workersPoolCapAmount - previewWorkersPoolEarned, 0));
    }, [periodPools.workersPoolCapAmount, previewWorkersPoolEarned, workerPreview]);

    const workerPoolSummary = useMemo(() => {
        if (period?.status === 'closed') {
            const poolCap = Number(snapshot?.workers_pool_cap ?? snapshot?.workers_pool ?? 0);
            const poolEarned = Number(snapshot?.workers_pool_earned ?? snapshot?.workers_pool ?? 0);
            const poolUnallocated = Number(snapshot?.workers_pool_unallocated ?? 0);
            const totalWeightedPoints = Number(snapshot?.workers_total_weighted_points ?? 0);
            const targetWeightedPoints = Math.max(Number(snapshot?.workers_target_weighted_points ?? workersTargetWeightedPoints), 1);
            const utilizationRatio = Number(
                snapshot?.workers_pool_utilization_ratio
                    ?? (poolCap > 0 ? Math.min(poolEarned / poolCap, 1) : 0),
            );

            return {
                poolCap,
                poolEarned,
                poolUnallocated,
                totalWeightedPoints,
                targetWeightedPoints,
                utilizationRatio,
            };
        }

        return {
            poolCap: Number(periodPools.workersPoolCapAmount || 0),
            poolEarned: Number(previewWorkersPoolEarned || 0),
            poolUnallocated: Number(previewWorkersPoolUnallocated || 0),
            totalWeightedPoints: Number(previewWeightedPointsTotal || 0),
            targetWeightedPoints: workersTargetWeightedPoints,
            utilizationRatio: Number(previewPoolUtilizationRatio || 0),
        };
    }, [
        period?.status,
        periodPools.workersPoolCapAmount,
        previewPoolUtilizationRatio,
        previewWeightedPointsTotal,
        previewWorkersPoolEarned,
        previewWorkersPoolUnallocated,
        snapshot?.workers_pool,
        snapshot?.workers_pool_cap,
        snapshot?.workers_pool_earned,
        snapshot?.workers_pool_unallocated,
        snapshot?.workers_pool_utilization_ratio,
        snapshot?.workers_target_weighted_points,
        snapshot?.workers_total_weighted_points,
        workersTargetWeightedPoints,
    ]);

    const companyFundCreditAmount = useMemo(() => {
        if (period?.status === 'closed') {
            return Number(snapshot?.company_pool ?? 0);
        }

        return roundMoney(Number(periodPools.companyBaseAmount || 0) + Number(workerPoolSummary.poolUnallocated || 0));
    }, [period?.status, periodPools.companyBaseAmount, snapshot?.company_pool, workerPoolSummary.poolUnallocated]);

    const companyFundReleaseSummary = useMemo(() => {
        const reserveFloor = Math.max(Number(
            snapshot?.company_fund_reserve_floor
            ?? config?.company_fund_reserve_floor
            ?? 0
        ), 0);

        if (period?.status === 'closed') {
            const releaseAmount = Number(snapshot?.company_fund_release_amount ?? 0);
            const releaseAdminPool = Number(snapshot?.company_fund_release_admin_pool ?? 0);
            const releaseWorkersPool = Number(snapshot?.company_fund_release_workers_pool ?? 0);
            const balanceAfterRelease = Number(
                snapshot?.company_fund_balance_after_release
                ?? ((snapshot?.company_fund_balance_before ?? currentCompanyFundBalance) - releaseAmount)
            );

            return {
                enabled: Boolean(
                    snapshot?.config_snapshot?.company_fund_release_enabled
                    ?? config?.company_fund_release_enabled
                    ?? false
                ),
                reserveFloor,
                releaseAmount,
                releaseAdminPool,
                releaseWorkersPool,
                balanceAfterRelease,
                projectedBalance: Number(snapshot?.company_fund_balance_after ?? 0),
                currentBalance: currentCompanyFundBalance,
            };
        }

        const releaseEnabled = Boolean(config?.company_fund_release_enabled);
        const workersReleaseEligible = Number(workerPoolSummary.totalWeightedPoints || 0) > 0;
        const releaseDistributionBase = Number(config?.pct_francisco || 0)
            + Number(config?.pct_federico || 0)
            + (workersReleaseEligible ? Number(config?.pct_workers || 0) : 0);

        const releaseAmount = releaseEnabled && releaseDistributionBase > 0
            ? roundMoney(Math.max(currentCompanyFundBalance - reserveFloor, 0))
            : 0;

        let franciscoAmount = 0;
        let federicoAmount = 0;
        let releaseWorkersPool = 0;

        if (releaseAmount > 0 && releaseDistributionBase > 0) {
            franciscoAmount = Number(config?.pct_francisco || 0) > 0
                ? roundMoney(releaseAmount * Number(config?.pct_francisco || 0) / releaseDistributionBase)
                : 0;

            if (workersReleaseEligible) {
                federicoAmount = Number(config?.pct_federico || 0) > 0
                    ? roundMoney(releaseAmount * Number(config?.pct_federico || 0) / releaseDistributionBase)
                    : 0;
                releaseWorkersPool = roundMoney(Math.max(releaseAmount - franciscoAmount - federicoAmount, 0));
            } else {
                federicoAmount = roundMoney(Math.max(releaseAmount - franciscoAmount, 0));
            }
        }

        const balanceAfterRelease = roundMoney(currentCompanyFundBalance - releaseAmount);

        return {
            enabled: releaseEnabled,
            reserveFloor,
            releaseAmount,
            releaseAdminPool: roundMoney(franciscoAmount + federicoAmount),
            releaseWorkersPool,
            franciscoAmount,
            federicoAmount,
            balanceAfterRelease,
            projectedBalance: roundMoney(balanceAfterRelease + companyFundCreditAmount),
            currentBalance: currentCompanyFundBalance,
        };
    }, [
        companyFundCreditAmount,
        config?.company_fund_release_enabled,
        config?.company_fund_reserve_floor,
        config?.pct_federico,
        config?.pct_francisco,
        config?.pct_workers,
        currentCompanyFundBalance,
        period?.status,
        snapshot?.company_fund_balance_after,
        snapshot?.company_fund_balance_after_release,
        snapshot?.company_fund_balance_before,
        snapshot?.company_fund_release_admin_pool,
        snapshot?.company_fund_release_amount,
        snapshot?.company_fund_release_workers_pool,
        snapshot?.company_fund_reserve_floor,
        snapshot?.config_snapshot,
        workerPoolSummary.totalWeightedPoints,
    ]);

    const projectedCompanyFundBalance = useMemo(() => (
        companyFundReleaseSummary.projectedBalance
    ), [companyFundReleaseSummary.projectedBalance]);

    const periodCompanyFundMovements = useMemo(() => (
        companyFundMovements.filter((movement) => movement.period_id === periodId)
    ), [companyFundMovements, periodId]);

    const displayedCompanyFundBalance = useMemo(() => (
        period?.status === 'closed'
            ? Number(snapshot?.company_fund_balance_after ?? currentCompanyFundBalance)
            : currentCompanyFundBalance
    ), [currentCompanyFundBalance, period?.status, snapshot?.company_fund_balance_after]);

    const missingFounderAssignments = useMemo(() => (
        (Number(config?.pct_francisco || 0) > 0 && !config?.francisco_profile_id) ||
        (Number(config?.pct_federico || 0) > 0 && !config?.federico_profile_id)
    ), [config?.federico_profile_id, config?.francisco_profile_id, config?.pct_federico, config?.pct_francisco]);

    const paidInvoicesPendingImport = useMemo(() => {
        const importedIds = new Set(transactions.map((transaction) => transaction.invoice_id).filter(Boolean));
        return invoices.filter((invoice) => (
            !importedIds.has(invoice.id)
            && isDateWithinPeriod(getInvoicePaymentDate(invoice), period?.start_date, period?.end_date)
        ));
    }, [invoices, period?.end_date, period?.start_date, transactions]);

    const previewDistributions = useMemo(() => {
        if (!config) return null;

        const workerBreakdown = workerPreview.map((row) => ({
            workerId: row.worker_id,
            name: getPersonDisplayName(profileMap[row.worker_id]),
            rawPoints: Number(row.raw_points || 0),
            weightedPoints: Number(row.weighted_points || 0),
            sharePercentage: Number(row.share_percentage || 0),
            amount: Number(row.estimated_amount || 0),
            seniorityTier: row.seniority_tier,
            multiplierApplied: Number(row.multiplier_applied || 1),
        }));

        return {
            netProfit: totals.net,
            francisco: { amount: periodPools.franciscoAmount, pct: config.pct_francisco ?? 40 },
            federico: { amount: periodPools.federicoAmount, pct: config.pct_federico ?? 30 },
            workersPool: {
                capAmount: workerPoolSummary.poolCap,
                earnedAmount: workerPoolSummary.poolEarned,
                unallocatedAmount: workerPoolSummary.poolUnallocated,
                pct: config.pct_workers ?? 15,
                targetWeightedPoints: workerPoolSummary.targetWeightedPoints,
                totalWeightedPoints: workerPoolSummary.totalWeightedPoints,
                utilizationRatio: workerPoolSummary.utilizationRatio,
                breakdown: workerBreakdown,
            },
            company: {
                baseAmount: periodPools.companyBaseAmount,
                fromWorkersAmount: workerPoolSummary.poolUnallocated,
                amount: companyFundCreditAmount,
                pct: config.pct_company ?? 15,
                currentBalance: currentCompanyFundBalance,
                balanceAfterRelease: companyFundReleaseSummary.balanceAfterRelease,
                projectedBalance: projectedCompanyFundBalance,
                releaseEnabled: companyFundReleaseSummary.enabled,
                releaseAmount: companyFundReleaseSummary.releaseAmount,
                releaseAdminPool: companyFundReleaseSummary.releaseAdminPool,
                releaseWorkersPool: companyFundReleaseSummary.releaseWorkersPool,
                reserveFloor: companyFundReleaseSummary.reserveFloor,
                franciscoReleaseAmount: companyFundReleaseSummary.franciscoAmount || 0,
                federicoReleaseAmount: companyFundReleaseSummary.federicoAmount || 0,
            },
            hasWorkerActivity: workerBreakdown.length > 0,
        };
    }, [
        companyFundReleaseSummary.balanceAfterRelease,
        companyFundReleaseSummary.enabled,
        companyFundReleaseSummary.federicoAmount,
        companyFundReleaseSummary.franciscoAmount,
        companyFundReleaseSummary.releaseAdminPool,
        companyFundReleaseSummary.releaseAmount,
        companyFundReleaseSummary.releaseWorkersPool,
        companyFundReleaseSummary.reserveFloor,
        config,
        companyFundCreditAmount,
        currentCompanyFundBalance,
        periodPools.companyBaseAmount,
        periodPools.federicoAmount,
        periodPools.franciscoAmount,
        profileMap,
        projectedCompanyFundBalance,
        totals.net,
        workerPoolSummary.poolCap,
        workerPoolSummary.poolEarned,
        workerPoolSummary.poolUnallocated,
        workerPoolSummary.targetWeightedPoints,
        workerPoolSummary.totalWeightedPoints,
        workerPoolSummary.utilizationRatio,
        workerPreview,
    ]);

    const canClosePeriod = useMemo(() => {
        if (missingFounderAssignments) return false;
        if (paidInvoicesPendingImport.length > 0) return false;
        return true;
    }, [missingFounderAssignments, paidInvoicesPendingImport.length]);

    const handleClosePeriod = async () => {
        if (!period?.id || submitting) return;

        if (!canClosePeriod) {
            setError('No se puede cerrar el período. Revisa las alertas de validación.');
            return;
        }

        if (!window.confirm('¿Seguro que querés cerrar este período? La foto contable y las compensaciones quedan congeladas.')) return;

        setSubmitting(true);
        setError('');
        setPreviewOpen(false);

        const { error: closeError } = await supabase.rpc('close_period', { p_period_id: period.id });

        if (closeError) {
            setError(closeError.message || 'No pudimos cerrar el período.');
            setSubmitting(false);
            return;
        }

        setSubmitting(false);
        await fetchPeriod();
        await parentRefetch?.();
    };

    const downloadClosingSummary = () => {
        if (!period) return;

        const summary = {
            periodo: period.name,
            tipoPeriodo: period.period_type || 'regular',
            fechaCierre: snapshot?.closed_at || period.closed_at || new Date().toISOString(),
            rangoFechas: formatFinancePeriodRange(period.start_date, period.end_date),
            snapshot: snapshot || {
                total_income: totals.income,
                total_expenses: totals.expenses,
                net_profit: totals.net,
                workers_pool: workerPoolSummary.poolCap,
                workers_pool_cap: workerPoolSummary.poolCap,
                workers_pool_earned: workerPoolSummary.poolEarned,
                workers_pool_unallocated: workerPoolSummary.poolUnallocated,
                workers_total_weighted_points: workerPoolSummary.totalWeightedPoints,
                workers_target_weighted_points: workerPoolSummary.targetWeightedPoints,
                workers_pool_utilization_ratio: workerPoolSummary.utilizationRatio,
                company_pool: companyFundCreditAmount,
                company_pool_base: periodPools.companyBaseAmount,
                company_pool_from_workers: workerPoolSummary.poolUnallocated,
                company_fund_release_amount: companyFundReleaseSummary.releaseAmount,
                company_fund_release_admin_pool: companyFundReleaseSummary.releaseAdminPool,
                company_fund_release_workers_pool: companyFundReleaseSummary.releaseWorkersPool,
                company_fund_reserve_floor: companyFundReleaseSummary.reserveFloor,
                company_fund_balance_after_release: companyFundReleaseSummary.balanceAfterRelease,
            },
            compensaciones: distributions.map((distribution) => ({
                tipo: distribution.recipient_type,
                perfil: distribution.profile_id ? getPersonDisplayName(profileMap[distribution.profile_id]) : 'Sin perfil',
                amount_earned: distribution.amount_earned,
                amount_paid: distribution.amount_paid,
                amount_pending: distribution.amount_pending,
                calculation_source: distribution.calculation_source,
            })),
            fondoEmpresa: {
                balanceActual: currentCompanyFundBalance,
                movimientos: periodCompanyFundMovements,
            },
        };

        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cierre-${period.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        link.click();
    };

    const handleSaveDistributionPayment = async (distribution, amountPaid) => {
        const nextAmountPaid = Number.isFinite(amountPaid) ? Math.max(amountPaid, 0) : 0;

        const { error: updateError } = await supabase
            .from('finance_distributions')
            .update({
                amount_paid: nextAmountPaid,
                paid_at: nextAmountPaid > 0 ? new Date().toISOString() : null,
                paid_by: nextAmountPaid > 0 ? user?.id || null : null,
            })
            .eq('id', distribution.id);

        if (updateError) {
            setError(updateError.message || 'No pudimos actualizar el pago.');
            return;
        }

        await fetchPeriod();
        await parentRefetch?.();
    };

    if (fetching) return <LoadingFallback type="spinner" />;

    if (error && !period) {
        return (
            <div className="rounded-[28px] border border-rose-200 bg-white p-6 text-neutral-900 shadow-sm">
                <p className="text-lg font-semibold">No pudimos abrir ese período.</p>
                <p className="mt-3 text-sm text-rose-600">{error}</p>
                <button
                    type="button"
                    onClick={onBack}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
                >
                    <ArrowLeft size={15} />
                    Volver a períodos
                </button>
            </div>
        );
    }

    if (!period) {
        return (
            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm">
                <p className="text-lg font-semibold">No encontramos ese período.</p>
                <button
                    type="button"
                    onClick={onBack}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
                >
                    <ArrowLeft size={15} />
                    Volver a períodos
                </button>
            </div>
        );
    }

    const adminDistributions = distributions.filter((distribution) => distribution.recipient_type === 'admin');
        const workerDistributions = distributions.filter((distribution) => distribution.recipient_type === 'worker');
        const legacyCompanyDistributions = distributions.filter((distribution) => distribution.recipient_type === 'company');
    const displayCurrency = config?.default_currency || totals.currency || currency || 'USD';

    return (
        <div className="pb-12 font-product text-neutral-900">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
            >
                <ArrowLeft size={15} />
                Volver a períodos
            </button>

            <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        {period.status === 'closed' ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                                <Lock size={12} />
                                Cerrado
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-skyblue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-skyblue">
                                <Unlock size={12} />
                                Abierto
                            </span>
                        )}

                        {period.period_type === 'adjustment' && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
                                <Landmark size={12} />
                                Ajuste
                            </span>
                        )}

                        <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Período financiero</p>
                    </div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{period.name}</h1>
                    <p className="mt-2 text-base text-neutral-500">
                        {formatFinancePeriodRange(period.start_date, period.end_date)}
                    </p>
                </div>

                {period.status === 'open' && (
                    <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Eye size={15} />
                        Pre-visualizar cierre
                    </button>
                )}

                {period.status === 'closed' && (
                    <button
                        type="button"
                        onClick={downloadClosingSummary}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300"
                    >
                        <Download size={15} />
                        Descargar resumen
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {period.status === 'open' && missingFounderAssignments && (
                <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        Definí quién representa a Francisco y Federico en configuración antes de cerrar el período. Ahora el cierre bloquea si falta alguna asignación administrativa.
                    </div>
                </div>
            )}

            {period.status === 'open' && paidInvoicesPendingImport.length > 0 && (
                <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        Hay {paidInvoicesPendingImport.length} factura(s) `paid` dentro de este período que todavía no entraron al ledger. El cierre queda bloqueado hasta que esa sincronización quede resuelta.
                    </div>
                </div>
            )}

            {period.status === 'open' && workerPoolSummary.poolCap > 0 && !previewDistributions?.hasWorkerActivity && (
                <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        Todavía no hay work logs aprobados. El pool workers máximo existe, pero el ganado sigue en 0 y el remanente iría al fondo empresa si cerraras hoy.
                    </div>
                </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <FinanceKpiCard
                    icon={Wallet}
                    label="Ingresos del período"
                    value={formatFinanceCurrency(totals.income, totals.currency)}
                    color="text-emerald-600"
                />
                <FinanceKpiCard
                    icon={Wallet}
                    label="Gastos del período"
                    value={formatFinanceCurrency(totals.expenses, totals.currency)}
                    color="text-rose-500"
                />
                <FinanceKpiCard
                    icon={Wallet}
                    label="Ganancia neta"
                    value={formatFinanceCurrency(totals.net, totals.currency)}
                    color={totals.net >= 0 ? 'text-neutral-900' : 'text-rose-500'}
                />
                <FinanceKpiCard
                    icon={PiggyBank}
                    label="Saldo fondo empresa"
                    value={formatFinanceCurrency(displayedCompanyFundBalance, displayCurrency)}
                    sub={period.status === 'closed'
                        ? `Saldo acumulado al cerrar este período`
                        : companyFundReleaseSummary.enabled
                            ? `Si cerrás hoy quedaría en ${formatFinanceCurrency(projectedCompanyFundBalance, displayCurrency)} después de release + crédito`
                            : `Si cerrás hoy quedaría en ${formatFinanceCurrency(projectedCompanyFundBalance, displayCurrency)}`}
                    color="text-amber-600"
                />
                <FinanceKpiCard
                    icon={Receipt}
                    label="Facturas paid pendientes"
                    value={paidInvoicesPendingImport.length}
                    sub="Cobros del período que todavía no entraron al ledger."
                    color={paidInvoicesPendingImport.length > 0 ? 'text-amber-600' : 'text-neutral-900'}
                />
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.05fr),minmax(320px,0.95fr)]">
                <div className="space-y-5">
                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Facturación del período</p>
                            <h2 className="mt-2 text-xl font-black">Sincronización de facturas cobradas</h2>
                            <p className="mt-2 text-sm text-neutral-500">
                                Si una factura cobra tarde para un período ya cerrado, ahora se va a un período de ajuste explícito en vez de contaminar un cierre congelado.
                            </p>
                        </div>

                        <div className="mt-5 space-y-3">
                            {paidInvoicesPendingImport.length === 0 && (
                                <div className="rounded-[20px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                                    Este período no tiene facturas cobradas pendientes de sincronización.
                                </div>
                            )}

                            {paidInvoicesPendingImport.map((invoice) => (
                                <div key={invoice.id} className="grid gap-3 rounded-[20px] border border-neutral-200 p-3.5 lg:grid-cols-[minmax(0,1fr),120px,180px] lg:items-center">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-neutral-900">{getInvoiceDisplayLabel(invoice)}</p>
                                        <p className="text-sm text-neutral-500">
                                            Fecha contable: {formatFinanceDate(getInvoicePaymentDate(invoice))}
                                        </p>
                                    </div>
                                    <div className="font-semibold text-emerald-600">
                                        {formatFinanceCurrency(invoice.amount, invoice.currency)}
                                    </div>
                                    <div className="text-sm text-neutral-500">Pendiente de sincronización automática</div>
                                </div>
                            ))}
                        </div>
                    </section>

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
                        profileMap={profileMap}
                        disabled={period.status === 'closed'}
                        onSaved={async () => {
                            await fetchPeriod();
                            await fetchWorkerPreview();
                        }}
                    />

                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Movimientos asociados</p>
                                <h2 className="mt-2 text-xl font-black">Ledger del período</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onOpenLedger}
                                className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
                            >
                                Abrir ledger completo
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            {transactions.length === 0 && (
                                <div className="rounded-[20px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                                    No hay movimientos vinculados a este período todavía.
                                </div>
                            )}

                            {transactions.map((transaction) => (
                                <div key={transaction.id} className="grid gap-3 rounded-[20px] border border-neutral-200 p-3.5 md:grid-cols-[110px,110px,minmax(0,1fr),160px] md:items-center">
                                    <div className="text-sm text-neutral-500">{formatFinanceDate(transaction.transaction_date)}</div>
                                    <div>
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                            transaction.type === 'income'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-rose-50 text-rose-600'
                                        }`}>
                                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-neutral-900">{transaction.description || 'Sin descripción'}</p>
                                        <p className="text-sm text-neutral-500">
                                            {transaction.project ? getProjectDisplayName(transaction.project) : 'Sin proyecto asociado'}
                                        </p>
                                        {transaction.funding_source === 'company_fund' && (
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                                                Consumido desde fondo empresa
                                            </p>
                                        )}
                                    </div>
                                    <div className={`text-right font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {transaction.type === 'income' ? '+' : '-'}
                                        {formatFinanceCurrency(transaction.amount, transaction.currency)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-5">
                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Snapshot y fondo</p>
                        <h2 className="mt-2 text-xl font-black">Foto contable del período</h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            El snapshot del cierre queda congelado. El fondo empresa viaja por un ledger acumulativo separado.
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] bg-neutral-50 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Ingresos snapshot</p>
                                <p className="mt-2 text-lg font-black text-emerald-600 md:text-xl">
                                    {formatFinanceCurrency(snapshot?.total_income ?? totals.income, displayCurrency)}
                                </p>
                            </div>
                            <div className="rounded-[20px] bg-neutral-50 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Gastos snapshot</p>
                                <p className="mt-2 text-lg font-black text-rose-500 md:text-xl">
                                    {formatFinanceCurrency(snapshot?.total_expenses ?? totals.expenses, displayCurrency)}
                                </p>
                            </div>
                            <div className="rounded-[20px] bg-neutral-50 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Ganancia neta</p>
                                <p className="mt-2 text-lg font-black text-neutral-900 md:text-xl">
                                    {formatFinanceCurrency(snapshot?.net_profit ?? totals.net, displayCurrency)}
                                </p>
                            </div>
                            <div className="rounded-[20px] bg-neutral-50 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Movimientos</p>
                                <p className="mt-2 text-lg font-black text-neutral-900 md:text-xl">
                                    {snapshot?.transaction_count ?? transactions.length}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] border border-skyblue/20 bg-skyblue/5 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-skyblue">Pool admins</p>
                                <p className="mt-2 text-base font-black text-neutral-900 md:text-lg">
                                    {formatFinanceCurrency(snapshot?.admin_pool ?? (periodPools.franciscoAmount + periodPools.federicoAmount), displayCurrency)}
                                </p>
                            </div>
                            <div className="rounded-[20px] border border-violet-200 bg-violet-50/70 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-violet-500">Workers máximo</p>
                                <p className="mt-2 break-words text-base font-black text-neutral-900 md:text-lg">
                                    {formatFinanceCurrency(snapshot?.workers_pool_cap ?? snapshot?.workers_pool ?? workerPoolSummary.poolCap, displayCurrency)}
                                </p>
                            </div>
                            <div className="rounded-[20px] border border-violet-200 bg-violet-50/40 p-3.5 sm:col-span-2">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-violet-500">Workers ganado</p>
                                <p className="mt-2 break-words text-base font-black text-neutral-900 md:text-lg">
                                    {formatFinanceCurrency(snapshot?.workers_pool_earned ?? workerPoolSummary.poolEarned, displayCurrency)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-amber-600">Crédito fondo empresa</p>
                                <p className="mt-2 text-base font-black text-neutral-900 md:text-lg">
                                    {formatFinanceCurrency(snapshot?.company_pool ?? companyFundCreditAmount, displayCurrency)}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    Base empresa {formatFinanceCurrency(snapshot?.company_pool_base ?? periodPools.companyBaseAmount, displayCurrency)}
                                    {' '}+ remanente workers {formatFinanceCurrency(snapshot?.company_pool_from_workers ?? workerPoolSummary.poolUnallocated, displayCurrency)}
                                </p>
                            </div>
                            <div className="rounded-[20px] border border-neutral-200 bg-neutral-50 p-3.5">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Target workers</p>
                                <p className="mt-2 text-base font-black text-neutral-900 md:text-lg">
                                    {Number(snapshot?.workers_target_weighted_points ?? workerPoolSummary.targetWeightedPoints ?? 0).toFixed(2)} pts
                                </p>
                                <p className="mt-1 text-xs leading-5 text-neutral-500">
                                    Logrado {Number(snapshot?.workers_total_weighted_points ?? workerPoolSummary.totalWeightedPoints ?? 0).toFixed(2)} pts · Utilización {(Number(snapshot?.workers_pool_utilization_ratio ?? workerPoolSummary.utilizationRatio ?? 0) * 100).toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {(companyFundReleaseSummary.enabled || companyFundReleaseSummary.releaseAmount > 0) && (
                            <div className="mt-3 rounded-[20px] border border-skyblue/20 bg-skyblue/5 p-3.5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-skyblue">Liberación fondo empresa</p>
                                        <p className="mt-2 text-base font-black text-neutral-900 md:text-lg">
                                            {formatFinanceCurrency(companyFundReleaseSummary.releaseAmount, displayCurrency)}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                                            Colchón protegido {formatFinanceCurrency(companyFundReleaseSummary.reserveFloor, displayCurrency)}.
                                            Se calcula sobre el saldo acumulado que entra al período.
                                        </p>
                                    </div>

                                    <div className="grid gap-2 text-sm sm:min-w-[240px]">
                                        <div className="rounded-[16px] bg-white px-3 py-2 text-neutral-600">
                                            Admins bonus: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(snapshot?.company_fund_release_admin_pool ?? companyFundReleaseSummary.releaseAdminPool, displayCurrency)}</span>
                                        </div>
                                        <div className="rounded-[16px] bg-white px-3 py-2 text-neutral-600">
                                            Workers bonus: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(snapshot?.company_fund_release_workers_pool ?? companyFundReleaseSummary.releaseWorkersPool, displayCurrency)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                            <div className="flex items-center gap-2">
                                <Landmark size={16} className="text-amber-600" />
                                <p className="font-semibold text-neutral-900">Fondo empresa acumulado</p>
                            </div>

                            <div className={`mt-4 grid gap-3 ${companyFundReleaseSummary.enabled || companyFundReleaseSummary.releaseAmount > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Saldo antes</p>
                                    <p className="mt-1 font-semibold text-neutral-900">
                                        {formatFinanceCurrency(snapshot?.company_fund_balance_before ?? currentCompanyFundBalance, displayCurrency)}
                                    </p>
                                </div>
                                {(companyFundReleaseSummary.enabled || companyFundReleaseSummary.releaseAmount > 0) && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Después de liberar</p>
                                        <p className="mt-1 font-semibold text-neutral-900">
                                            {formatFinanceCurrency(snapshot?.company_fund_balance_after_release ?? companyFundReleaseSummary.balanceAfterRelease, displayCurrency)}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Saldo después</p>
                                    <p className="mt-1 font-semibold text-neutral-900">
                                        {formatFinanceCurrency(snapshot?.company_fund_balance_after ?? projectedCompanyFundBalance, displayCurrency)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Saldo actual</p>
                                    <p className="mt-1 font-semibold text-neutral-900">
                                        {formatFinanceCurrency(currentCompanyFundBalance, displayCurrency)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {periodCompanyFundMovements.length === 0 && (
                                    <div className="rounded-[18px] border border-dashed border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-500">
                                        Todavía no hay movimientos del fondo empresa asociados a este período.
                                    </div>
                                )}

                                {periodCompanyFundMovements.map((movement) => (
                                    <div key={movement.id} className="flex flex-col gap-2 rounded-[18px] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-neutral-900">{movement.description || 'Movimiento de fondo empresa'}</p>
                                            <p className="text-sm text-neutral-500">
                                                {formatFinanceDate(movement.movement_date)} · {movement.movement_source}
                                            </p>
                                        </div>
                                        <p className={`font-semibold ${movement.movement_type === 'credit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {movement.movement_type === 'credit' ? '+' : '-'}
                                            {formatFinanceCurrency(movement.amount, movement.currency)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Compensaciones</p>
                        <h2 className="mt-2 text-xl font-black">Pagos y pendientes</h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            Las compensaciones a personas quedan separadas del fondo empresa. Los cierres nuevos ya no generan una “distribution” de empresa.
                        </p>

                        {distributions.length === 0 && (
                            <div className="mt-5 rounded-[20px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                                Todavía no hay compensaciones generadas.
                            </div>
                        )}

                        {adminDistributions.length > 0 && (
                            <div className="mt-6">
                                <div className="mb-3 flex items-center gap-2 border-b border-skyblue/20 pb-2 text-skyblue">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em]">Admins</p>
                                </div>
                                <div className="space-y-3">
                                    {adminDistributions.map((distribution) => (
                                        <DistributionRow
                                            key={distribution.id}
                                            distribution={distribution}
                                            label={getPersonDisplayName(profileMap[distribution.profile_id])}
                                            disabled={period.status !== 'closed'}
                                            onSavePayment={handleSaveDistributionPayment}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {workerDistributions.length > 0 && (
                            <div className="mt-6">
                                <div className="mb-3 flex items-center gap-2 border-b border-violet-200 pb-2 text-violet-500">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em]">Workers</p>
                                </div>
                                <div className="space-y-3">
                                    {workerDistributions.map((distribution) => (
                                        <DistributionRow
                                            key={distribution.id}
                                            distribution={distribution}
                                            label={getPersonDisplayName(profileMap[distribution.profile_id])}
                                            disabled={period.status !== 'closed'}
                                            onSavePayment={handleSaveDistributionPayment}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {legacyCompanyDistributions.length > 0 && (
                            <div className="mt-6">
                                <div className="mb-3 flex items-center gap-2 border-b border-amber-200 pb-2 text-amber-600">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em]">Legacy empresa</p>
                                </div>
                                <p className="mb-3 text-sm text-neutral-500">
                                    Estas filas vienen del modelo anterior. Los consumos nuevos del fondo se registran en el ledger del fondo empresa.
                                </p>
                                <div className="space-y-3">
                                    {legacyCompanyDistributions.map((distribution) => (
                                        <DistributionRow
                                            key={distribution.id}
                                            distribution={distribution}
                                            label="Fondo empresa (legacy)"
                                            disabled={period.status !== 'closed'}
                                            onSavePayment={handleSaveDistributionPayment}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <AnimatePresence>
                {previewOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm"
                        onClick={() => setPreviewOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            className="mx-auto w-full max-w-3xl rounded-[28px] bg-white shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Pre-visualización</p>
                                    <h2 className="mt-2 text-xl font-black text-neutral-900">Confirmar cierre de período</h2>
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Estás por congelar la foto contable de <strong>{period.name}</strong> y acreditar el fondo empresa.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                    className="rounded-full border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-900"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-5 p-5">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-[20px] bg-emerald-50 p-3.5 text-center">
                                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Ingresos</p>
                                        <p className="mt-1 text-xl font-bold text-emerald-700">{formatFinanceCurrency(totals.income, displayCurrency)}</p>
                                    </div>
                                    <div className="rounded-[20px] bg-rose-50 p-3.5 text-center">
                                        <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Gastos</p>
                                        <p className="mt-1 text-xl font-bold text-rose-700">{formatFinanceCurrency(totals.expenses, displayCurrency)}</p>
                                    </div>
                                    <div className={`rounded-[20px] p-3.5 text-center ${totals.net >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                        <p className={`text-xs uppercase tracking-[0.2em] ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Ganancia neta</p>
                                        <p className={`mt-1 text-xl font-bold ${totals.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatFinanceCurrency(totals.net, displayCurrency)}</p>
                                    </div>
                                </div>

                                {previewDistributions && (totals.net > 0 || previewDistributions.company.releaseAmount > 0) && (
                                    <div className="rounded-[24px] border border-neutral-200 p-4">
                                        <h3 className="mb-4 text-lg font-bold">Distribución propuesta</h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between rounded-xl bg-skyblue/5 p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skyblue/20">
                                                        <CheckCircle2 size={16} className="text-skyblue" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-neutral-900">Francisco</p>
                                                        <p className="text-xs text-neutral-400">{previewDistributions.francisco.pct}% del neto</p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-skyblue">{formatFinanceCurrency(previewDistributions.francisco.amount, displayCurrency)}</p>
                                            </div>

                                            <div className="flex items-center justify-between rounded-xl bg-skyblue/5 p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skyblue/20">
                                                        <CheckCircle2 size={16} className="text-skyblue" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-neutral-900">Federico</p>
                                                        <p className="text-xs text-neutral-400">{previewDistributions.federico.pct}% del neto</p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-skyblue">{formatFinanceCurrency(previewDistributions.federico.amount, displayCurrency)}</p>
                                            </div>

                                            <div className="rounded-xl border border-violet-200 bg-violet-50/50">
                                                <div className="flex items-center justify-between p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-200">
                                                            <Users size={16} className="text-violet-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-neutral-900">Workers pool máximo</p>
                                                            <p className="text-xs text-neutral-400">{previewDistributions.workersPool.pct}% del neto</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-violet-600">{formatFinanceCurrency(previewDistributions.workersPool.capAmount, displayCurrency)}</p>
                                                </div>

                                                <div className="grid gap-3 px-3 pb-3 sm:grid-cols-3">
                                                    <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Ganado:{' '}
                                                        <span className="font-semibold text-neutral-900">
                                                            {formatFinanceCurrency(previewDistributions.workersPool.earnedAmount, displayCurrency)}
                                                        </span>
                                                    </div>
                                                    <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Remanente:{' '}
                                                        <span className="font-semibold text-neutral-900">
                                                            {formatFinanceCurrency(previewDistributions.workersPool.unallocatedAmount, displayCurrency)}
                                                        </span>
                                                    </div>
                                                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Utilización:{' '}
                                                        <span className="font-semibold text-neutral-900">
                                                            {(previewDistributions.workersPool.utilizationRatio * 100).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="px-3 pb-3 text-xs text-neutral-500">
                                                    {previewDistributions.workersPool.totalWeightedPoints.toFixed(2)} pts ponderados sobre un target de {previewDistributions.workersPool.targetWeightedPoints.toFixed(2)}.
                                                </div>

                                                {previewDistributions.workersPool.breakdown.length > 0 && (
                                                    <div className="px-3 pb-3">
                                                        <div className="space-y-1 border-t border-violet-200 pt-2">
                                                            {previewDistributions.workersPool.breakdown.map((worker) => (
                                                                <div key={worker.workerId} className="flex items-center justify-between text-sm">
                                                                    <span className="text-neutral-600">
                                                                        {worker.name} · {worker.weightedPoints.toFixed(2)} pts · x{worker.multiplierApplied.toFixed(2)}
                                                                    </span>
                                                                    <span className="font-medium text-violet-600">{formatFinanceCurrency(worker.amount, displayCurrency)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {!previewDistributions.hasWorkerActivity && previewDistributions.workersPool.capAmount > 0 && (
                                                    <div className="px-3 pb-3">
                                                        <p className="flex items-center gap-1 text-xs text-amber-600">
                                                            <AlertTriangle size={12} />
                                                            No hay work logs aprobados. El pool workers ganado será 0 y el remanente irá al fondo empresa.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="rounded-xl bg-amber-50 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200">
                                                            <Landmark size={16} className="text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-neutral-900">Fondo empresa</p>
                                                            <p className="text-xs text-neutral-400">{previewDistributions.company.pct}% del neto</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-amber-600">{formatFinanceCurrency(previewDistributions.company.amount, displayCurrency)}</p>
                                                </div>

                                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Base empresa: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.baseAmount, displayCurrency)}</span>
                                                    </div>
                                                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Remanente workers: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.fromWorkersAmount, displayCurrency)}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Saldo actual: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.currentBalance, displayCurrency)}</span>
                                                    </div>
                                                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-neutral-600">
                                                        Saldo proyectado: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.projectedBalance, displayCurrency)}</span>
                                                    </div>
                                                </div>

                                                {(previewDistributions.company.releaseEnabled || previewDistributions.company.releaseAmount > 0) && (
                                                    <div className="mt-3 rounded-2xl border border-skyblue/20 bg-white px-4 py-3 text-sm text-neutral-600">
                                                        <p className="font-semibold text-neutral-900">Liberación automática del fondo</p>
                                                        <p className="mt-1">
                                                            Se protege un colchón de <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.reserveFloor, displayCurrency)}</span> y se libera{' '}
                                                            <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.releaseAmount, displayCurrency)}</span> del saldo acumulado previo.
                                                        </p>
                                                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                                                            <div className="rounded-xl bg-skyblue/5 px-3 py-2">
                                                                Admins bonus: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.releaseAdminPool, displayCurrency)}</span>
                                                            </div>
                                                            <div className="rounded-xl bg-violet-50 px-3 py-2">
                                                                Workers bonus: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.releaseWorkersPool, displayCurrency)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                                                            <div className="rounded-xl bg-white px-3 py-2">
                                                                Francisco extra: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.franciscoReleaseAmount, displayCurrency)}</span>
                                                            </div>
                                                            <div className="rounded-xl bg-white px-3 py-2">
                                                                Federico extra: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(previewDistributions.company.federicoReleaseAmount, displayCurrency)}</span>
                                                            </div>
                                                        </div>
                                                        <p className="mt-2 text-xs text-neutral-500">
                                                            El bonus workers se reparte con los weighted points del período. Si no hubo actividad worker, esa parte no se libera y el release queda solo para admins.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {totals.net <= 0 && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                        <strong>Atención:</strong> la ganancia neta es {totals.net === 0 ? 'cero' : 'negativa'}.
                                        El cierre congela el snapshot y no generará pools ordinarios positivos, aunque podría existir bonus extraordinario desde fondo empresa si la política de release está activa.
                                    </div>
                                )}

                                {!canClosePeriod && (
                                    <div className="space-y-1 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                                        <p className="font-semibold">No se puede cerrar el período:</p>
                                        {missingFounderAssignments && <p>- Falta asignar perfiles administrativos en configuración</p>}
                                        {paidInvoicesPendingImport.length > 0 && (
                                            <p>- Hay {paidInvoicesPendingImport.length} facturas pendientes de sincronización</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewOpen(false)}
                                        className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClosePeriod}
                                        disabled={!canClosePeriod || submitting}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Lock size={15} />
                                        {submitting ? 'Cerrando...' : 'Confirmar cierre'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PeriodDetail;
