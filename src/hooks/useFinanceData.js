import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { buildUsdConversion } from '@/services/exchangeRateService';
import {
    FINANCE_REPORTING_CURRENCY,
    getFinanceTransactionReportingAmount,
} from '@/utils/finance';

/**
 * Centralized finance data hook.
 * Single parallel fetch replaces scattered page-level fetches.
 */
const useFinanceData = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [companyFundMovements, setCompanyFundMovements] = useState([]);
    const [profiles, setProfiles] = useState([]);

    const isAdmin = profile?.role === 'admin';

    const normalizeUsdFields = useCallback(async (table, rows) => {
        const items = Array.isArray(rows) ? rows : [];
        const pendingRows = items.filter((row) => {
            if (table === 'finance_transactions' && row?.period?.status === 'closed') return false;

            const amount = Number(row?.amount);
            if (!Number.isFinite(amount) || amount <= 0) return false;

            const amountUsd = Number(row?.amount_usd);
            const exchangeRate = Number(row?.exchange_rate);
            return !Number.isFinite(amountUsd) || !Number.isFinite(exchangeRate) || exchangeRate <= 0;
        });

        if (!pendingRows.length) return items;

        const updates = await Promise.all(pendingRows.map(async (row) => {
            try {
                const invoiceAmountUsd = Number(row?.invoice?.amount_usd);
                const invoiceExchangeRate = Number(row?.invoice?.exchange_rate);
                const conversion = (
                    table === 'finance_transactions'
                    && Number.isFinite(invoiceAmountUsd)
                    && Number.isFinite(invoiceExchangeRate)
                    && invoiceExchangeRate > 0
                )
                    ? { amountUsd: invoiceAmountUsd, exchangeRate: invoiceExchangeRate }
                    : await buildUsdConversion(row.amount, row.currency || FINANCE_REPORTING_CURRENCY);
                const patch = {
                    amount_usd: conversion.amountUsd,
                    exchange_rate: conversion.exchangeRate,
                };

                const { error: updateError } = await supabase
                    .from(table)
                    .update(patch)
                    .eq('id', row.id);

                if (updateError) {
                    console.error(`Error normalizing ${table} row`, row.id, updateError);
                    return row;
                }

                return { ...row, ...patch };
            } catch (normalizeError) {
                console.error(`Error computing USD normalization for ${table} row`, row.id, normalizeError);
                return row;
            }
        }));

        const updatesById = new Map(updates.map((row) => [row.id, row]));
        return items.map((row) => updatesById.get(row.id) || row);
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [
                { data: configData, error: configError },
                { data: periodsData, error: periodsError },
                { data: transactionsData, error: transactionsError },
                { data: invoicesData, error: invoicesError },
                { data: projectsData, error: projectsError },
                { data: distributionsData, error: distributionsError },
                { data: companyFundMovementsData, error: companyFundMovementsError },
                { data: profilesData, error: profilesError },
            ] = await Promise.all([
                // 1. Config
                supabase.from('finance_config').select('*').limit(1).maybeSingle(),
                // 2. Periods (all, desc by start_date)
                supabase.from('finance_periods').select('*').order('start_date', { ascending: false }),
                // 3. Transactions (full, with period + project + invoice joins — superset of all page needs)
                supabase
                    .from('finance_transactions')
                    .select(`
                        *,
                        period:finance_periods(id, name, status),
                        project:projects(id, name),
                        invoice:invoices(id, invoice_number, project_id, description, amount, amount_usd, exchange_rate, currency),
                        invoice_id
                    `)
                    .order('transaction_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                // 4. Invoices (all statuses — tabs filter locally)
                supabase
                    .from('invoices')
                    .select('id, invoice_number, description, amount, amount_usd, exchange_rate, currency, status, due_date, paid_at, project_id, updated_at, created_at')
                    .order('updated_at', { ascending: false }),
                // 5. Projects (with client name for profitability)
                supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false }),
                // 6. Distributions
                supabase
                    .from('finance_distributions')
                    .select('*')
                    .order('period_id'),
                // 7. Company fund ledger
                supabase
                    .from('finance_company_fund_movements')
                    .select('*')
                    .order('movement_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                // 7. Profiles (admins + workers)
                supabase
                    .from('profiles')
                    .select('id, full_name, email, role, avatar_url')
                    .in('role', ['admin', 'worker'])
                    .order('full_name', { ascending: true }),
            ]);

            if (configError || periodsError || transactionsError || invoicesError || projectsError || distributionsError || companyFundMovementsError || profilesError) {
                const message =
                    configError?.message || periodsError?.message || transactionsError?.message ||
                    invoicesError?.message || projectsError?.message || distributionsError?.message ||
                    companyFundMovementsError?.message ||
                    profilesError?.message;
                console.error('useFinanceData fetch error:', {
                    configError, periodsError, transactionsError,
                    invoicesError, projectsError, distributionsError, companyFundMovementsError, profilesError,
                });
                setError(message || 'No pudimos cargar los datos financieros.');
                return;
            }

            const normalizedTransactions = await normalizeUsdFields('finance_transactions', transactionsData || []);
            const normalizedInvoices = await normalizeUsdFields('invoices', invoicesData || []);

            setConfig(configData || null);
            setPeriods(periodsData || []);
            setTransactions(normalizedTransactions);
            setInvoices(normalizedInvoices);
            setProjects(projectsData || []);
            setDistributions(distributionsData || []);
            setCompanyFundMovements(companyFundMovementsData || []);
            setProfiles(profilesData || []);
        } catch (err) {
            console.error('useFinanceData unexpected error:', err);
            setError(err.message || 'Error inesperado.');
        } finally {
            setLoading(false);
        }
    }, [normalizeUsdFields]);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchAll();
    }, [fetchAll, isAdmin]);

    // ─── Derived data ────────────────────────────────────────────────────────

    const currency = useMemo(() => config?.default_currency || 'USD', [config]);

    const adminProfiles = useMemo(
        () => profiles.filter((p) => p.role === 'admin'),
        [profiles],
    );

    const workerProfiles = useMemo(
        () => profiles.filter((p) => p.role === 'worker'),
        [profiles],
    );

    // Global KPIs (all transactions regardless of period)
    const summaryKpis = useMemo(() => {
        const income = transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + getFinanceTransactionReportingAmount(t), 0);
        const expenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + getFinanceTransactionReportingAmount(t), 0);
        const pendingPayouts = distributions.reduce(
            (sum, d) => sum + (d.recipient_type === 'company' ? 0 : Number(d.amount_pending || 0)), 0,
        );
        // Total already paid out in cash to founders and workers (real outflows not in finance_transactions)
        const totalPaidDistributions = distributions.reduce(
            (sum, d) => sum + (d.recipient_type === 'company' ? 0 : Number(d.amount_paid || 0)), 0,
        );
        const companyFundBalances = companyFundMovements.reduce((acc, movement) => {
            const movementCurrency = movement.currency || currency;
            const signedAmount = movement.movement_type === 'credit'
                ? Number(movement.amount || 0)
                : -Number(movement.amount || 0);
            acc[movementCurrency] = (acc[movementCurrency] || 0) + signedAmount;
            return acc;
        }, {});

        const companyFundBalance = Number(companyFundBalances[currency] || 0);

        const net = income - expenses;

        return {
            income,
            expenses,
            net,
            pendingPayouts,
            totalPaidDistributions,
            // Best estimate of real cash today: P&L net minus distributions already paid out
            cajaEstimada: net - totalPaidDistributions,
            currency,
            companyFundBalances,
            companyFundCurrency: config?.default_currency || currency,
            companyFundBalance,
            // Free balance: what remains in the fund after honouring pending obligations
            disponible: companyFundBalance - pendingPayouts,
        };
    }, [companyFundMovements, config?.default_currency, currency, distributions, transactions]);

    // Periods with live totals (open=live data, closed=snapshot)
    const periodsWithTotals = useMemo(() => {
        const byPeriod = transactions.reduce((acc, t) => {
            if (!t.period_id) return acc;
            const cur = acc[t.period_id] || { income: 0, expenses: 0, currency: FINANCE_REPORTING_CURRENCY };
            if (t.type === 'income') cur.income += getFinanceTransactionReportingAmount(t);
            if (t.type === 'expense') cur.expenses += getFinanceTransactionReportingAmount(t);
            acc[t.period_id] = cur;
            return acc;
        }, {});

        return periods.map((p) => {
            const live = byPeriod[p.id];
            const totalIncome = p.status === 'open' && live ? live.income : Number(p.total_income || 0);
            const totalExpenses = p.status === 'open' && live ? live.expenses : Number(p.total_expenses || 0);
            return {
                ...p,
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_profit: totalIncome - totalExpenses,
                currency: live?.currency || FINANCE_REPORTING_CURRENCY,
            };
        });
    }, [currency, periods, transactions]);

    // Profile map (id → profile object) for quick lookups
    const profileMap = useMemo(
        () => profiles.reduce((map, p) => { map[p.id] = p; return map; }, {}),
        [profiles],
    );

    return {
        // Raw data
        config,
        periods,
        transactions,
        invoices,
        projects,
        distributions,
        profiles,
        companyFundMovements,
        // Derived
        currency,
        adminProfiles,
        workerProfiles,
        summaryKpis,
        periodsWithTotals,
        profileMap,
        // State
        loading,
        error,
        isAdmin,
        refetch: fetchAll,
    };
};

export default useFinanceData;
