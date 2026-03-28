import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, Wallet, ChevronDown, TrendingUp, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { formatFinanceCurrency, getPersonDisplayName } from '@/utils/finance';

const WorkerEarningsWidget = () => {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [periods, setPeriods] = useState([]);
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [showAllHistory, setShowAllHistory] = useState(false);

    const isAdmin = profile?.role === 'admin';
    const currentWorkerId = selectedWorker || user?.id;

    // Fetch available workers (for admin view)
    const fetchWorkers = useCallback(async () => {
        if (!isAdmin) return;
        
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('role', ['worker', 'admin'])
            .order('full_name', { ascending: true });
        
        setWorkers(data || []);
    }, [isAdmin]);

    useEffect(() => {
        void fetchWorkers();
    }, [fetchWorkers]);

    // Fetch periods for filtering
    const fetchPeriods = useCallback(async () => {
        const { data } = await supabase
            .from('finance_periods')
            .select('id, name, start_date, end_date, status, closed_at')
            .order('start_date', { ascending: false });
        
        setPeriods(data || []);
    }, []);

    useEffect(() => {
        void fetchPeriods();
    }, [fetchPeriods]);

    const fetchRows = useCallback(async () => {
        if (!currentWorkerId || !['admin', 'worker'].includes(profile?.role)) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        let query = supabase
            .from('finance_distributions')
            .select(`
                id,
                amount_earned,
                amount_paid,
                amount_pending,
                currency,
                recipient_type,
                period_id,
                created_at,
                finance_periods (
                    name,
                    status,
                    closed_at,
                    start_date
                )
            `)
            .eq('profile_id', currentWorkerId)
            .order('created_at', { ascending: false });

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching personal earnings:', fetchError);
            setError(fetchError.message || 'No pudimos cargar tus ganancias.');
            setRows([]);
            setLoading(false);
            return;
        }

        setRows(data || []);
        setLoading(false);
    }, [currentWorkerId, profile?.role]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    // Filter rows by selected year
    const filteredRows = useMemo(() => {
        if (selectedYear === 'all') return rows;
        
        return rows.filter(row => {
            const periodDate = row.finance_periods?.start_date || row.created_at;
            const year = new Date(periodDate).getFullYear();
            return year.toString() === selectedYear;
        });
    }, [rows, selectedYear]);

    // Calculate stats
    const stats = useMemo(() => {
        const currency = filteredRows[0]?.currency || 'USD';
        const totals = filteredRows.reduce((acc, row) => ({
            earned: acc.earned + Number(row.amount_earned || 0),
            paid: acc.paid + Number(row.amount_paid || 0),
            pending: acc.pending + Number(row.amount_pending || 0),
        }), { earned: 0, paid: 0, pending: 0 });

        return { ...totals, currency };
    }, [filteredRows]);

    // Data for evolution chart (last 6 periods)
    const chartData = useMemo(() => {
        const last6Periods = [...filteredRows]
            .filter(row => row.finance_periods)
            .sort((a, b) => new Date(a.finance_periods?.start_date) - new Date(b.finance_periods?.start_date))
            .slice(-6);

        if (last6Periods.length === 0) return [];

        const maxValue = Math.max(...last6Periods.map(r => Number(r.amount_earned || 0)));
        
        return last6Periods.map(row => ({
            period: row.finance_periods?.name?.slice(0, 10) || 'Período',
            earned: Number(row.amount_earned || 0),
            paid: Number(row.amount_paid || 0),
            pending: Number(row.amount_pending || 0),
            height: maxValue > 0 ? (Number(row.amount_earned || 0) / maxValue) * 100 : 0,
        }));
    }, [filteredRows]);

    // Available years for filter
    const availableYears = useMemo(() => {
        const years = new Set();
        rows.forEach(row => {
            const date = row.finance_periods?.start_date || row.created_at;
            if (date) {
                years.add(new Date(date).getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [rows]);

    // Current worker info
    const currentWorkerInfo = useMemo(() => {
        if (!isAdmin || !selectedWorker) return null;
        return workers.find(w => w.id === selectedWorker);
    }, [isAdmin, selectedWorker, workers]);

    if (!['admin', 'worker'].includes(profile?.role)) {
        return null;
    }

    return (
        <div className="mb-8 rounded-3xl border border-white/10 bg-[#111] p-6 text-white shadow-xl">
            {/* Header con filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Ganancias personales</p>
                    <h2 className="mt-2 text-2xl font-black">
                        {isAdmin && currentWorkerInfo 
                            ? `Ganancias de ${getPersonDisplayName(currentWorkerInfo)}`
                            : profile?.role === 'admin' ? 'Tus dividendos acumulados' : 'Tus ganancias acumuladas'
                        }
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-gray-400">
                        Este resumen muestra lo que ya generaste, lo que se pagó y lo que sigue pendiente en los cierres financieros.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Selector de worker (solo admins) */}
                    {isAdmin && workers.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedWorker || user?.id || ''}
                                onChange={(e) => setSelectedWorker(e.target.value)}
                                className="appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-white/30"
                            >
                                <option value={user?.id} className="bg-[#111]">Yo ({profile?.full_name || 'Admin'})</option>
                                {workers.filter(w => w.id !== user?.id).map(worker => (
                                    <option key={worker.id} value={worker.id} className="bg-[#111]">
                                        {getPersonDisplayName(worker)} ({worker.role})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                    )}

                    {/* Selector de año */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-white/30"
                        >
                            <option value="all" className="bg-[#111]">Todos los años</option>
                            {availableYears.map(year => (
                                <option key={year} value={year} className="bg-[#111]">{year}</option>
                            ))}
                        </select>
                        <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cargando ganancias...</span>
                </div>
            ) : error ? (
                <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-300">
                    {error}
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
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

                    {/* Gráfico de evolución */}
                    {chartData.length > 1 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={16} className="text-gray-500" />
                                <span className="text-sm font-medium text-gray-300">Evolución últimos períodos</span>
                            </div>
                            
                            <div className="h-32 flex items-end gap-2">
                                {chartData.map((data, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                        <div 
                                            className="w-full max-w-[40px] rounded-t bg-emerald-500/60 hover:bg-emerald-400 transition-colors relative group"
                                            style={{ height: `${Math.max(data.height, 5)}%` }}
                                            title={`Ganado: ${formatFinanceCurrency(data.earned)}`}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {formatFinanceCurrency(data.earned)}
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-gray-500 text-center truncate w-full">
                                            {data.period}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Historial completo */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-300">
                                Historial de distribuciones ({filteredRows.length})
                            </h3>
                            {filteredRows.length > 5 && (
                                <button
                                    onClick={() => setShowAllHistory(!showAllHistory)}
                                    className="text-xs text-skyblue hover:text-sky-400 transition"
                                >
                                    {showAllHistory ? 'Ver menos' : `Ver todas (${filteredRows.length})`}
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {filteredRows.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-gray-500">
                                    {selectedYear === 'all' 
                                        ? 'Todavía no tenés cierres financieros asignados.'
                                        : `No hay distribuciones para el año ${selectedYear}.`
                                    }
                                </div>
                            ) : (
                                filteredRows.slice(0, showAllHistory ? undefined : 5).map((row) => (
                                    <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1.5fr,1fr,1fr,1fr] md:items-center">
                                        <div>
                                            <p className="font-semibold text-white">{row.finance_periods?.name || 'Período'}</p>
                                            <p className="text-sm text-gray-500">
                                                {row.recipient_type === 'admin' ? 'Dividendo de administrador' : 'Participación de worker'}
                                            </p>
                                            {row.finance_periods?.closed_at && (
                                                <p className="text-xs text-gray-600">
                                                    Cerrado: {new Date(row.finance_periods.closed_at).toLocaleDateString('es-UY')}
                                                </p>
                                            )}
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
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default WorkerEarningsWidget;
