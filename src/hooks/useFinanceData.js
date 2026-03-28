import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

/**
 * Centralized finance data hook.
 * Single parallel fetch replaces 7 page-level fetches.
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
    const [profiles, setProfiles] = useState([]);

    const isAdmin = profile?.role === 'admin';

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
                        invoice:invoices(id, invoice_number, project_id, description),
                        invoice_id
                    `)
                    .order('transaction_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                // 4. Invoices (all statuses — tabs filter locally)
                supabase
                    .from('invoices')
                    .select('id, invoice_number, description, amount, currency, status, due_date, paid_at, project_id, updated_at, created_at')
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
                // 7. Profiles (admins + workers)
                supabase
                    .from('profiles')
                    .select('id, full_name, email, role, avatar_url')
                    .in('role', ['admin', 'worker'])
                    .order('full_name', { ascending: true }),
            ]);

            if (configError || periodsError || transactionsError || invoicesError || projectsError || distributionsError || profilesError) {
                const message =
                    configError?.message || periodsError?.message || transactionsError?.message ||
                    invoicesError?.message || projectsError?.message || distributionsError?.message ||
                    profilesError?.message;
                console.error('useFinanceData fetch error:', {
                    configError, periodsError, transactionsError,
                    invoicesError, projectsError, distributionsError, profilesError,
                });
                setError(message || 'No pudimos cargar los datos financieros.');
                return;
            }

            setConfig(configData || null);
            setPeriods(periodsData || []);
            setTransactions(transactionsData || []);
            setInvoices(invoicesData || []);
            setProjects(projectsData || []);
            setDistributions(distributionsData || []);
            setProfiles(profilesData || []);
        } catch (err) {
            console.error('useFinanceData unexpected error:', err);
            setError(err.message || 'Error inesperado.');
        } finally {
            setLoading(false);
        }
    }, []);

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
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const pendingPayouts = distributions.reduce(
            (sum, d) => sum + Number(d.amount_pending || 0), 0,
        );
        return { income, expenses, net: income - expenses, pendingPayouts, currency };
    }, [currency, distributions, transactions]);

    // Periods with live totals (open=live data, closed=snapshot)
    const periodsWithTotals = useMemo(() => {
        const byPeriod = transactions.reduce((acc, t) => {
            if (!t.period_id) return acc;
            const cur = acc[t.period_id] || { income: 0, expenses: 0, currency: t.currency || 'USD' };
            if (t.type === 'income') cur.income += Number(t.amount || 0);
            if (t.type === 'expense') cur.expenses += Number(t.amount || 0);
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
                currency: live?.currency || currency,
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
