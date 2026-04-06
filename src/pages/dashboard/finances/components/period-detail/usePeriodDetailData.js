import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { getDynamicWorkersTarget } from '@/components/finances/workersTarget';
import {
    DUPLICATE_FOUNDER_PROFILES_ERROR,
    FINANCE_REPORTING_CURRENCY,
    formatFinancePeriodRange,
    getFinanceTransactionReportingAmount,
    getInvoicePaymentDate,
    getPersonDisplayName,
    hasDuplicateFounderProfiles,
    isDateWithinPeriod,
} from '@/utils/finance';

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const usePeriodDetailData = ({
    periodId,
    config,
    sharedProfileMap,
    currency,
    companyFundMovements = [],
    parentRefetch,
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

    const profileMap = useMemo(
        () => ({ ...sharedProfileMap, ...localProfileMap }),
        [localProfileMap, sharedProfileMap],
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
                    .select('id, invoice_number, description, amount, amount_usd, exchange_rate, currency, project_id, status, paid_at, updated_at, created_at')
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

            const auxiliaryErrors = [snapshotError, transactionsError, distributionsError, invoicesError].filter(Boolean);
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

                if (profilesError) auxiliaryErrors.push(profilesError);
                else if (profilesData) {
                    setLocalProfileMap(profilesData.reduce((acc, profile) => {
                        acc[profile.id] = profile;
                        return acc;
                    }, {}));
                }
            }

            if (auxiliaryErrors.length > 0) {
                setError(`Abrimos el período, pero faltan datos auxiliares: ${auxiliaryErrors[0]?.message || 'detalle incompleto.'}`);
            }
        } catch (fetchError) {
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
        const displayCurrency = FINANCE_REPORTING_CURRENCY;
        const income = transactions
            .filter((transaction) => transaction.type === 'income')
            .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
        const expenses = transactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
        return { income, expenses, net: income - expenses, currency: displayCurrency };
    }, [transactions]);

    const periodPools = useMemo(() => {
        if (!config || totals.net <= 0) {
            return { franciscoAmount: 0, federicoAmount: 0, workersPoolCapAmount: 0, companyBaseAmount: 0 };
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

    const baseWorkersTargetWeightedPoints = useMemo(
        () => Math.max(
            Number(snapshot?.config_snapshot?.workers_target_weighted_points ?? config?.workers_target_weighted_points ?? 100),
            1,
        ),
        [config?.workers_target_weighted_points, snapshot?.config_snapshot],
    );

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
            setError(previewError.message || 'No pudimos calcular el preview de workers.');
            return;
        }

        setWorkerPreview(data || []);
    }, [period, periodId, periodPools.workersPoolCapAmount]);

    useEffect(() => {
        if (!period || period.status === 'closed') return;
        void fetchWorkerPreview();
    }, [fetchWorkerPreview, period]);

    const closedWorkerDistributionCount = useMemo(() => (
        distributions.filter((distribution) => (
            distribution.recipient_type === 'worker'
            && distribution.calculation_source === 'worker_points'
        )).length
    ), [distributions]);

    const activeWorkersCount = useMemo(() => (
        period?.status === 'closed'
            ? closedWorkerDistributionCount
            : workerPreview.length
    ), [closedWorkerDistributionCount, period?.status, workerPreview.length]);

    const workersTargetWeightedPoints = useMemo(() => {
        if (period?.status === 'closed') {
            return Math.max(Number(snapshot?.workers_target_weighted_points ?? baseWorkersTargetWeightedPoints), 1);
        }

        return getDynamicWorkersTarget({
            baseTargetWeightedPoints: baseWorkersTargetWeightedPoints,
            activeWorkersCount,
        });
    }, [
        activeWorkersCount,
        baseWorkersTargetWeightedPoints,
        period?.status,
        snapshot?.workers_target_weighted_points,
    ]);

    const currentCompanyFundBalance = useMemo(() => companyFundMovements.reduce((sum, movement) => {
        if ((movement.currency || currency) !== (config?.default_currency || currency)) return sum;
        return movement.movement_type === 'credit'
            ? sum + Number(movement.amount || 0)
            : sum - Number(movement.amount || 0);
    }, 0), [companyFundMovements, config?.default_currency, currency]);

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
            const utilizationRatio = Number(snapshot?.workers_pool_utilization_ratio ?? (poolCap > 0 ? Math.min(poolEarned / poolCap, 1) : 0));
            return {
                poolCap,
                poolEarned,
                poolUnallocated,
                totalWeightedPoints,
                targetWeightedPoints,
                utilizationRatio,
                activeWorkersCount,
                baseTargetWeightedPoints: baseWorkersTargetWeightedPoints,
            };
        }

        return {
            poolCap: Number(periodPools.workersPoolCapAmount || 0),
            poolEarned: Number(previewWorkersPoolEarned || 0),
            poolUnallocated: Number(previewWorkersPoolUnallocated || 0),
            totalWeightedPoints: Number(previewWeightedPointsTotal || 0),
            targetWeightedPoints: workersTargetWeightedPoints,
            utilizationRatio: Number(previewPoolUtilizationRatio || 0),
            activeWorkersCount,
            baseTargetWeightedPoints: baseWorkersTargetWeightedPoints,
        };
    }, [
        activeWorkersCount,
        baseWorkersTargetWeightedPoints,
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
        if (period?.status === 'closed') return Number(snapshot?.company_pool ?? 0);
        return roundMoney(Number(periodPools.companyBaseAmount || 0) + Number(workerPoolSummary.poolUnallocated || 0));
    }, [period?.status, periodPools.companyBaseAmount, snapshot?.company_pool, workerPoolSummary.poolUnallocated]);

    const companyFundReleaseSummary = useMemo(() => {
        const reserveFloor = Math.max(Number(snapshot?.company_fund_reserve_floor ?? config?.company_fund_reserve_floor ?? 0), 0);

        if (period?.status === 'closed') {
            const releaseAmount = Number(snapshot?.company_fund_release_amount ?? 0);
            const releaseAdminPool = Number(snapshot?.company_fund_release_admin_pool ?? 0);
            const releaseWorkersPool = Number(snapshot?.company_fund_release_workers_pool ?? 0);
            const balanceAfterRelease = Number(snapshot?.company_fund_balance_after_release ?? ((snapshot?.company_fund_balance_before ?? currentCompanyFundBalance) - releaseAmount));

            return {
                enabled: Boolean(snapshot?.config_snapshot?.company_fund_release_enabled ?? config?.company_fund_release_enabled ?? false),
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

    const projectedCompanyFundBalance = companyFundReleaseSummary.projectedBalance;
    const periodCompanyFundMovements = useMemo(() => companyFundMovements.filter((movement) => movement.period_id === periodId), [companyFundMovements, periodId]);
    const displayedCompanyFundBalance = useMemo(() => (
        period?.status === 'closed'
            ? Number(snapshot?.company_fund_balance_after ?? currentCompanyFundBalance)
            : currentCompanyFundBalance
    ), [currentCompanyFundBalance, period?.status, snapshot?.company_fund_balance_after]);

    const duplicateFounderAssignments = useMemo(
        () => hasDuplicateFounderProfiles(config),
        [config],
    );

    const missingFounderAssignments = useMemo(() => (
        (Number(config?.pct_francisco || 0) > 0 && !config?.francisco_profile_id)
        || (Number(config?.pct_federico || 0) > 0 && !config?.federico_profile_id)
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
                currentBalance: currentCompanyFundBalance,
                balanceAfterRelease: companyFundReleaseSummary.balanceAfterRelease,
                projectedBalance: projectedCompanyFundBalance,
                releaseEnabled: companyFundReleaseSummary.enabled,
                releaseAmount: companyFundReleaseSummary.releaseAmount,
                releaseAdminPool: companyFundReleaseSummary.releaseAdminPool,
                releaseWorkersPool: companyFundReleaseSummary.releaseWorkersPool,
                reserveFloor: companyFundReleaseSummary.reserveFloor,
            },
            hasWorkerActivity: workerBreakdown.length > 0,
        };
    }, [
        companyFundCreditAmount,
        companyFundReleaseSummary.balanceAfterRelease,
        companyFundReleaseSummary.enabled,
        companyFundReleaseSummary.releaseAdminPool,
        companyFundReleaseSummary.releaseAmount,
        companyFundReleaseSummary.releaseWorkersPool,
        companyFundReleaseSummary.reserveFloor,
        config,
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

    const canClosePeriod = useMemo(
        () => !missingFounderAssignments && !duplicateFounderAssignments && paidInvoicesPendingImport.length === 0,
        [duplicateFounderAssignments, missingFounderAssignments, paidInvoicesPendingImport.length],
    );

    const displayCurrency = period?.status === 'closed'
        ? (config?.default_currency || currency || totals.currency || FINANCE_REPORTING_CURRENCY)
        : totals.currency;
    const adminDistributions = distributions.filter((distribution) => distribution.recipient_type === 'admin');
    const workerDistributions = distributions.filter((distribution) => distribution.recipient_type === 'worker');
    const legacyCompanyDistributions = distributions.filter((distribution) => distribution.recipient_type === 'company');

    const handleClosePeriod = useCallback(async () => {
        if (!period?.id || submitting) return;
        if (duplicateFounderAssignments) {
            setError(DUPLICATE_FOUNDER_PROFILES_ERROR);
            return false;
        }
        if (!canClosePeriod) {
            setError('No se puede cerrar el período. Revisa las alertas de validación.');
            return false;
        }

        const confirmed = window.confirm('¿Seguro que querés cerrar este período? La foto contable y las compensaciones quedan congeladas.');
        if (!confirmed) return false;

        setSubmitting(true);
        setError('');
        const { error: closeError } = await supabase.rpc('close_period', { p_period_id: period.id });
        if (closeError) {
            setSubmitting(false);
            const isDuplicateFounderConstraint = (
                closeError.message?.includes('idx_fd_unique_profile_recipient_source')
                || closeError.message?.includes('finance_config_distinct_founder_profiles_check')
            );
            setError(
                isDuplicateFounderConstraint
                    ? DUPLICATE_FOUNDER_PROFILES_ERROR
                    : (closeError.message || 'No pudimos cerrar el período.'),
            );
            return false;
        }

        setSubmitting(false);
        await fetchPeriod();
        await parentRefetch?.();
        return true;
    }, [canClosePeriod, fetchPeriod, parentRefetch, period?.id, submitting]);

    const handleSaveDistributionPayment = useCallback(async (distribution, amountPaid) => {
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
    }, [fetchPeriod, parentRefetch, user?.id]);

    const downloadClosingSummary = useCallback(() => {
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
    }, [
        companyFundCreditAmount,
        companyFundReleaseSummary.balanceAfterRelease,
        companyFundReleaseSummary.releaseAdminPool,
        companyFundReleaseSummary.releaseAmount,
        companyFundReleaseSummary.releaseWorkersPool,
        companyFundReleaseSummary.reserveFloor,
        currentCompanyFundBalance,
        distributions,
        period,
        periodCompanyFundMovements,
        periodPools.companyBaseAmount,
        profileMap,
        snapshot,
        totals.expenses,
        totals.income,
        totals.net,
        workerPoolSummary.poolCap,
        workerPoolSummary.poolEarned,
        workerPoolSummary.poolUnallocated,
        workerPoolSummary.targetWeightedPoints,
        workerPoolSummary.totalWeightedPoints,
        workerPoolSummary.utilizationRatio,
    ]);

    const refreshAll = useCallback(async () => {
        await fetchPeriod();
        await fetchWorkerPreview();
    }, [fetchPeriod, fetchWorkerPreview]);

    return {
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
        currentCompanyFundBalance,
        projectedCompanyFundBalance,
        companyFundCreditAmount,
        periodCompanyFundMovements,
        previewDistributions,
        duplicateFounderAssignments,
        missingFounderAssignments,
        canClosePeriod,
        profileMap,
        displayCurrency,
        periodPools,
        handleClosePeriod,
        handleSaveDistributionPayment,
        downloadClosingSummary,
        refreshAll,
    };
};
