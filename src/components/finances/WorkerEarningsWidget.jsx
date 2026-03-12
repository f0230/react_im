import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { formatFinanceCurrency } from '@/utils/finance';

const WorkerEarningsWidget = () => {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');

    const fetchRows = useCallback(async () => {
        if (!user?.id || !['admin', 'worker'].includes(profile?.role)) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        const { data, error: fetchError } = await supabase
            .from('finance_distributions')
            .select(`
                id,
                amount_earned,
                amount_paid,
                amount_pending,
                currency,
                recipient_type,
                created_at,
                finance_periods (
                    name,
                    status,
                    closed_at
                )
            `)
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Error fetching personal earnings:', fetchError);
            setError(fetchError.message || 'No pudimos cargar tus ganancias.');
            setRows([]);
            setLoading(false);
            return;
        }

        setRows(data || []);
        setLoading(false);
    }, [profile?.role, user?.id]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    const stats = useMemo(() => {
        const currency = rows[0]?.currency || 'USD';
        const totals = rows.reduce((acc, row) => ({
            earned: acc.earned + Number(row.amount_earned || 0),
            paid: acc.paid + Number(row.amount_paid || 0),
            pending: acc.pending + Number(row.amount_pending || 0),
        }), { earned: 0, paid: 0, pending: 0 });

        return { ...totals, currency };
    }, [rows]);

    if (!['admin', 'worker'].includes(profile?.role)) {
        return null;
    }

    return (
        <div className="mb-8 rounded-3xl border border-white/10 bg-[#111] p-6 text-white shadow-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Ganancias personales</p>
                    <h2 className="mt-2 text-2xl font-black">
                        {profile?.role === 'admin' ? 'Tus dividendos acumulados' : 'Tus ganancias acumuladas'}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-gray-400">
                        Este resumen muestra lo que ya generaste, lo que se pagó y lo que sigue pendiente en los cierres financieros.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cargando tus ganancias...</span>
                </div>
            ) : error ? (
                <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-300">
                    {error}
                </div>
            ) : (
                <>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.25em] text-gray-500">Ganado</span>
                                <Coins size={16} className="text-gray-500" />
                            </div>
                            <p className="mt-3 text-2xl font-black text-white">
                                {formatFinanceCurrency(stats.earned, stats.currency)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.25em] text-gray-500">Pagado</span>
                                <Wallet size={16} className="text-gray-500" />
                            </div>
                            <p className="mt-3 text-2xl font-black text-emerald-400">
                                {formatFinanceCurrency(stats.paid, stats.currency)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.25em] text-gray-500">Pendiente</span>
                                <Wallet size={16} className="text-gray-500" />
                            </div>
                            <p className="mt-3 text-2xl font-black text-amber-400">
                                {formatFinanceCurrency(stats.pending, stats.currency)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {rows.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-gray-500">
                                Todavía no tenés cierres financieros asignados.
                            </div>
                        )}

                        {rows.slice(0, 5).map((row) => (
                            <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1.5fr,1fr,1fr,1fr] md:items-center">
                                <div>
                                    <p className="font-semibold text-white">{row.finance_periods?.name || 'Período'}</p>
                                    <p className="text-sm text-gray-500">
                                        {row.recipient_type === 'admin' ? 'Dividendo de administrador' : 'Participación de worker'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Ganado</p>
                                    <p className="mt-1 text-sm font-semibold text-white">
                                        {formatFinanceCurrency(row.amount_earned, row.currency)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Pagado</p>
                                    <p className="mt-1 text-sm font-semibold text-emerald-400">
                                        {formatFinanceCurrency(row.amount_paid, row.currency)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Pendiente</p>
                                    <p className="mt-1 text-sm font-semibold text-amber-400">
                                        {formatFinanceCurrency(row.amount_pending, row.currency)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default WorkerEarningsWidget;
