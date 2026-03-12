import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Lock, Receipt, Unlock, Wallet } from 'lucide-react';
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
    getProjectDisplayName,
    isDateWithinPeriod,
} from '@/utils/finance';

const FinancesPeriod = () => {
    const { periodId } = useParams();
    const { profile, user, loading } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [config, setConfig] = useState(null);
    const [profileMap, setProfileMap] = useState({});
    const [invoices, setInvoices] = useState([]);

    const isAdmin = profile?.role === 'admin';

    const fetchPeriod = useCallback(async () => {
        if (!periodId) return;

        setFetching(true);
        setError('');

        const [
            { data: periodData, error: periodError },
            { data: transactionsData, error: transactionsError },
            { data: distributionsData, error: distributionsError },
            { data: configData, error: configError },
            { data: invoicesData, error: invoicesError },
        ] = await Promise.all([
            supabase.from('finance_periods').select('*').eq('id', periodId).maybeSingle(),
            supabase
                .from('finance_transactions')
                .select('*, project:projects(id, name), invoice_id')
                .eq('period_id', periodId)
                .order('transaction_date', { ascending: false }),
            supabase
                .from('finance_distributions')
                .select('*')
                .eq('period_id', periodId)
                .order('recipient_type', { ascending: true })
                .order('created_at', { ascending: true }),
            supabase.from('finance_config').select('*').limit(1).maybeSingle(),
            supabase.from('invoices').select('id, invoice_number, description, amount, currency, project_id, status, paid_at, updated_at, created_at').eq('status', 'paid').order('updated_at', { ascending: false }),
        ]);

        if (periodError || transactionsError || distributionsError || configError || invoicesError) {
            const message = periodError?.message || transactionsError?.message || distributionsError?.message || configError?.message || invoicesError?.message;
            console.error('Error fetching finance period:', { periodError, transactionsError, distributionsError, configError, invoicesError });
            setError(message || 'No pudimos cargar el período.');
            setFetching(false);
            return;
        }

        const profileIds = Array.from(new Set((distributionsData || []).map((distribution) => distribution.profile_id).filter(Boolean)));
        let nextProfileMap = {};

        if (profileIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', profileIds);

            if (profilesError) {
                console.error('Error fetching distribution profiles:', profilesError);
            } else {
                nextProfileMap = (profilesData || []).reduce((acc, item) => {
                    acc[item.id] = item;
                    return acc;
                }, {});
            }
        }

        setPeriod(periodData || null);
        setTransactions(transactionsData || []);
        setDistributions(distributionsData || []);
        setConfig(configData || null);
        setProfileMap(nextProfileMap);
        setInvoices(invoicesData || []);
        setFetching(false);
    }, [periodId]);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchPeriod();
    }, [fetchPeriod, isAdmin]);

    const totals = useMemo(() => {
        const currency = transactions[0]?.currency || config?.default_currency || 'USD';
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
            currency,
        };
    }, [config?.default_currency, transactions]);

    const missingFounderAssignments = useMemo(() => (
        !config?.francisco_profile_id || !config?.federico_profile_id
    ), [config?.federico_profile_id, config?.francisco_profile_id]);

    const paidInvoicesPendingImport = useMemo(() => {
        const importedIds = new Set(transactions.map((transaction) => transaction.invoice_id).filter(Boolean));
        return invoices.filter((invoice) => (
            !importedIds.has(invoice.id)
            && isDateWithinPeriod(getInvoicePaymentDate(invoice), period?.start_date, period?.end_date)
        ));
    }, [invoices, period?.end_date, period?.start_date, transactions]);

    const handleClosePeriod = async () => {
        if (!period?.id || submitting) return;
        if (paidInvoicesPendingImport.length > 0) {
            setError('Este período todavía tiene facturas cobradas sin sincronizar en el ledger. Revisá la sincronización antes de cerrar para que la ganancia quede correcta.');
            return;
        }
        if (!window.confirm('Al cerrar el período se calculan las distribuciones actuales. ¿Querés continuar?')) return;

        setSubmitting(true);
        setError('');

        const { error: closeError } = await supabase.rpc('close_period', { p_period_id: period.id });

        if (closeError) {
            console.error('Error closing finance period:', closeError);
            setError(closeError.message || 'No pudimos cerrar el período.');
            setSubmitting(false);
            return;
        }

        setSubmitting(false);
        await fetchPeriod();
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
            console.error('Error updating distribution payment:', updateError);
            setError(updateError.message || 'No pudimos actualizar el pago.');
            return;
        }

        await fetchPeriod();
    };

    if (loading || (isAdmin && fetching)) {
        return <LoadingFallback type="spinner" />;
    }

    if (!loading && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    if (!period && !fetching) {
        return (
            <div className="rounded-[32px] border border-neutral-200 bg-white p-8 text-neutral-900 shadow-sm">
                <p className="text-lg font-semibold">No encontramos ese período.</p>
                <Link to="/dashboard/finances" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900">
                    <ArrowLeft size={15} />
                    Volver a finanzas
                </Link>
            </div>
        );
    }

    return (
        <div className="pb-16 font-product text-neutral-900">
            <Link
                to="/dashboard/finances"
                className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
            >
                <ArrowLeft size={15} />
                Volver a finanzas
            </Link>

            <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        {period?.status === 'closed' ? (
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
                        <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Período financiero</p>
                    </div>
                    <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{period?.name}</h1>
                    <p className="mt-3 text-lg text-neutral-500">
                        {formatFinancePeriodRange(period?.start_date, period?.end_date)}
                    </p>
                </div>

                {period?.status === 'open' && (
                    <button
                        type="button"
                        onClick={handleClosePeriod}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Lock size={15} />
                        {submitting ? 'Cerrando...' : 'Cerrar período'}
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {period?.status === 'open' && missingFounderAssignments && (
                <div className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        Definí en configuración quién es Francisco y quién es Federico antes de cerrar el período, así el reparto de admins queda correctamente asignado.
                    </div>
                </div>
            )}

            {period?.status === 'open' && paidInvoicesPendingImport.length > 0 && (
                <div className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                        Hay {paidInvoicesPendingImport.length} factura(s) marcada(s) como `paid` dentro de este período que todavía no entraron al ledger automáticamente. El cierre queda bloqueado hasta que esa sincronización quede resuelta.
                    </div>
                </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    icon={Wallet}
                    label="Movimientos"
                    value={transactions.length}
                    sub={period?.status === 'closed' ? `Cerrado el ${formatFinanceDate(period?.closed_at)}` : 'Aún abierto para sumar movimientos.'}
                />
                <FinanceKpiCard
                    icon={Receipt}
                    label="Facturas paid pendientes"
                    value={paidInvoicesPendingImport.length}
                    sub="Cobros del período que todavía no fueron pasados a ingresos."
                    color={paidInvoicesPendingImport.length > 0 ? 'text-amber-600' : 'text-neutral-900'}
                />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-6">
                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Facturación del período</p>
                                <h2 className="mt-2 text-2xl font-black">Sincronización de facturas cobradas</h2>
                                <p className="mt-2 text-sm text-neutral-500">
                                    Las facturas cobradas deberían entrar solas al ledger. Si ves elementos acá, es una alerta para revisar sincronización antes del cierre.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            {paidInvoicesPendingImport.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                                    Este período no tiene facturas cobradas pendientes de sincronización.
                                </div>
                            )}

                            {paidInvoicesPendingImport.map((invoice) => (
                                <div key={invoice.id} className="grid gap-3 rounded-2xl border border-neutral-200 p-4 md:grid-cols-[1.4fr,140px,200px] md:items-center">
                                    <div>
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
                        disabled={period?.status === 'closed'}
                        onSaved={fetchPeriod}
                    />

                    <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Movimientos asociados</p>
                                <h2 className="mt-2 text-2xl font-black">Ledger del período</h2>
                            </div>
                            <Link to="/dashboard/finances/ledger" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900">
                                Abrir ledger completo
                            </Link>
                        </div>

                        <div className="mt-6 space-y-3">
                            {transactions.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                                    No hay movimientos vinculados a este período todavía.
                                </div>
                            )}

                            {transactions.map((transaction) => (
                                <div key={transaction.id} className="grid gap-3 rounded-2xl border border-neutral-200 p-4 md:grid-cols-[120px,120px,1fr,140px] md:items-center">
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
                                    <div>
                                        <p className="font-semibold text-neutral-900">{transaction.description || 'Sin descripción'}</p>
                                        <p className="text-sm text-neutral-500">
                                            {transaction.project ? getProjectDisplayName(transaction.project) : 'Sin proyecto asociado'}
                                        </p>
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

                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Distribuciones</p>
                    <h2 className="mt-2 text-2xl font-black">Resultado del cierre</h2>
                    <p className="mt-2 text-sm text-neutral-500">
                        Cuando el período está abierto, esta lista queda vacía. Al cerrar, se calculan automáticamente los montos para admins, workers y empresa.
                    </p>

                    {distributions.length === 0 && (
                        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
                            Todavía no hay distribuciones generadas.
                        </div>
                    )}

                    {distributions.length > 0 && (() => {
                        const getLabel = (distribution) => distribution.recipient_type === 'company'
                            ? 'Fondo empresa'
                            : profileMap[distribution.profile_id]?.full_name || profileMap[distribution.profile_id]?.email || 'Perfil sin asignar';

                        const admins = distributions.filter((d) => d.recipient_type === 'admin');
                        const workers = distributions.filter((d) => d.recipient_type === 'worker');
                        const company = distributions.filter((d) => d.recipient_type === 'company');

                        const DistributionGroup = ({ title, subtitle, items, accent }) => items.length === 0 ? null : (
                            <div className="mt-6">
                                <div className={`mb-3 flex items-center gap-2 border-b pb-2 ${accent}`}>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em]">{title}</p>
                                    {subtitle && <p className="text-xs text-neutral-400">— {subtitle}</p>}
                                </div>
                                <div className="space-y-3">
                                    {items.map((distribution) => (
                                        <DistributionRow
                                            key={distribution.id}
                                            distribution={distribution}
                                            label={getLabel(distribution)}
                                            disabled={period?.status !== 'closed'}
                                            onSavePayment={handleSaveDistributionPayment}
                                        />
                                    ))}
                                </div>
                            </div>
                        );

                        return (
                            <>
                                <DistributionGroup
                                    title="Admins"
                                    subtitle="reparto personal"
                                    items={admins}
                                    accent="border-skyblue/30 text-skyblue"
                                />
                                <DistributionGroup
                                    title="Equipo"
                                    subtitle="plata reservada para workers"
                                    items={workers}
                                    accent="border-violet-200 text-violet-500"
                                />
                                <DistributionGroup
                                    title="DTE"
                                    subtitle="fondo empresa"
                                    items={company}
                                    accent="border-amber-200 text-amber-600"
                                />
                            </>
                        );
                    })()}
                </section>
            </div>
        </div>
    );
};

export default FinancesPeriod;
