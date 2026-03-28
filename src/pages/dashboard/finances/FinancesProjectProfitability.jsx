import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    ArrowUpRight, 
    Briefcase, 
    DollarSign, 
    TrendingUp, 
    TrendingDown,
    Users,
    Search,
    Filter,
    X,
    ChevronRight,
    PieChart,
    Clock,
    Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency, formatFinanceDate, getProjectDisplayName } from '@/utils/finance';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 }
};

const FinancesProjectProfitability = () => {
    const { profile, loading } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [projects, setProjects] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [distributions, setDistributions] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    const isAdmin = profile?.role === 'admin';

    const fetchData = useCallback(async () => {
        setFetching(true);
        setError('');

        try {
            const [
                { data: projectsData, error: projectsError },
                { data: transactionsData, error: transactionsError },
                { data: invoicesData, error: invoicesError },
                { data: periodsData, error: periodsError },
                { data: workersData, error: workersError },
                { data: distributionsData, error: distributionsError },
            ] = await Promise.all([
                supabase.from('projects').select('id, name, status, created_at, updated_at, budget, client_id, clients(name)').order('created_at', { ascending: false }),
                supabase.from('finance_transactions').select('id, type, amount, currency, project_id, period_id, category, description, transaction_date'),
                supabase.from('invoices').select('id, amount, currency, status, project_id, paid_at').eq('status', 'paid'),
                supabase.from('finance_periods').select('id, name, start_date, end_date, status').order('start_date', { ascending: false }),
                supabase.from('profiles').select('id, full_name, email').eq('role', 'worker'),
                supabase.from('finance_distributions').select('id, amount_earned, profile_id, period_id, recipient_type'),
            ]);

            if (projectsError || transactionsError || invoicesError || periodsError || workersError || distributionsError) {
                throw new Error(
                    projectsError?.message || 
                    transactionsError?.message || 
                    invoicesError?.message || 
                    periodsError?.message ||
                    workersError?.message ||
                    distributionsError?.message
                );
            }

            setProjects(projectsData || []);
            setTransactions(transactionsData || []);
            setInvoices(invoicesData || []);
            setPeriods(periodsData || []);
            setWorkers(workersData || []);
            setDistributions(distributionsData || []);
        } catch (err) {
            console.error('Error fetching project data:', err);
            setError(err.message || 'No pudimos cargar los datos de proyectos.');
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchData();
    }, [fetchData, isAdmin]);

    // ─── Cálculos de rentabilidad por proyecto ────────────────────────────────
    const projectData = useMemo(() => {
        return projects.map(project => {
            // Ingresos: facturas pagadas vinculadas al proyecto
            const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
            const income = projectInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

            // Gastos: transacciones tipo expense con project_id
            const projectExpenses = transactions.filter(t => 
                t.type === 'expense' && t.project_id === project.id
            );
            const expenses = projectExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

            // Workers asignados y sus costos
            const projectWorkers = workers.filter(w => {
                // Distribuciones de este worker relacionadas con períodos donde el proyecto tuvo actividad
                const workerDistributions = distributions.filter(d => 
                    d.profile_id === w.id && 
                    d.recipient_type === 'worker'
                );
                return workerDistributions.length > 0;
            });

            // Calcular costo de workers (suma de distribuciones relacionadas a períodos del proyecto)
            const workerCost = distributions
                .filter(d => {
                    // Buscar transacciones del proyecto en el período de esta distribución
                    const periodTransactions = transactions.filter(t => 
                        t.project_id === project.id && 
                        t.period_id === d.period_id
                    );
                    return periodTransactions.length > 0 && d.recipient_type === 'worker';
                })
                .reduce((sum, d) => sum + Number(d.amount_earned || 0), 0);

            // Ganancia neta y margen
            const netProfit = income - expenses;
            const margin = income > 0 ? (netProfit / income) * 100 : 0;

            // ROI si hay presupuesto definido
            const budget = Number(project.budget || 0);
            const roi = budget > 0 ? ((income - expenses) / budget) * 100 : null;

            // Transacciones totales vinculadas
            const relatedTransactions = transactions.filter(t => t.project_id === project.id);

            return {
                ...project,
                income,
                expenses,
                netProfit,
                margin,
                roi,
                budget,
                workerCost,
                projectWorkers,
                relatedTransactions,
                projectInvoices,
            };
        });
    }, [projects, transactions, invoices, workers, distributions]);

    // Filtrado de proyectos
    const filteredProjects = useMemo(() => {
        return projectData.filter(project => {
            // Filtro por período
            if (selectedPeriod !== 'all') {
                const hasTransactionsInPeriod = project.relatedTransactions.some(t => t.period_id === selectedPeriod);
                if (!hasTransactionsInPeriod) return false;
            }

            // Filtro por estado
            if (statusFilter !== 'all' && project.status !== statusFilter) return false;

            // Filtro por búsqueda
            if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase();
                const nameMatch = (project.name || '').toLowerCase().includes(search);
                const clientMatch = (project.clients?.name || '').toLowerCase().includes(search);
                return nameMatch || clientMatch;
            }

            return true;
        });
    }, [projectData, selectedPeriod, statusFilter, searchTerm]);

    // KPIs generales
    const kpis = useMemo(() => {
        const totalIncome = filteredProjects.reduce((sum, p) => sum + p.income, 0);
        const totalExpenses = filteredProjects.reduce((sum, p) => sum + p.expenses, 0);
        const totalNet = totalIncome - totalExpenses;
        const avgMargin = filteredProjects.length > 0 
            ? filteredProjects.reduce((sum, p) => sum + p.margin, 0) / filteredProjects.length 
            : 0;
        
        const profitableCount = filteredProjects.filter(p => p.netProfit > 0).length;
        const unprofitableCount = filteredProjects.filter(p => p.netProfit < 0).length;

        return {
            totalIncome,
            totalExpenses,
            totalNet,
            avgMargin,
            profitableCount,
            unprofitableCount,
            projectCount: filteredProjects.length,
        };
    }, [filteredProjects]);

    // Modal de detalle del proyecto
    const ProjectDetailModal = ({ project, onClose }) => {
        if (!project) return null;

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm px-4 py-6 overflow-y-auto"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="mx-auto w-full max-w-4xl rounded-[32px] bg-white shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Detalle del proyecto</p>
                                <h2 className="mt-2 text-2xl font-black text-neutral-900">{project.name}</h2>
                                {project.clients && (
                                    <p className="text-sm text-neutral-500">Cliente: {project.clients.name}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-900"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* KPIs del proyecto */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Ingresos</p>
                                    <p className="mt-1 text-xl font-bold text-emerald-700">
                                        {formatFinanceCurrency(project.income)}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-rose-50 p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Gastos</p>
                                    <p className="mt-1 text-xl font-bold text-rose-700">
                                        {formatFinanceCurrency(project.expenses)}
                                    </p>
                                </div>
                                <div className={`rounded-2xl p-4 ${project.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                    <p className={`text-xs uppercase tracking-[0.2em] ${project.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Ganancia</p>
                                    <p className={`mt-1 text-xl font-bold ${project.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {formatFinanceCurrency(project.netProfit)}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-skyblue/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-skyblue">Margen</p>
                                    <p className="mt-1 text-xl font-bold text-skyblue">
                                        {project.margin.toFixed(1)}%
                                    </p>
                                </div>
                            </div>

                            {/* Transacciones vinculadas */}
                            <div>
                                <h3 className="text-lg font-bold mb-4">Transacciones vinculadas</h3>
                                {project.relatedTransactions.length === 0 ? (
                                    <p className="text-neutral-500 text-sm">No hay transacciones registradas para este proyecto.</p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {project.relatedTransactions.map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                                                <div>
                                                    <p className="font-medium text-sm">{tx.description || tx.category}</p>
                                                    <p className="text-xs text-neutral-400">{formatFinanceDate(tx.transaction_date)}</p>
                                                </div>
                                                <span className={`font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatFinanceCurrency(tx.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Facturas pagadas */}
                            <div>
                                <h3 className="text-lg font-bold mb-4">Facturas pagadas</h3>
                                {project.projectInvoices.length === 0 ? (
                                    <p className="text-neutral-500 text-sm">No hay facturas pagadas para este proyecto.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {project.projectInvoices.map(inv => (
                                            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                                                <div>
                                                    <p className="font-medium text-sm">Factura #{inv.id.slice(0, 8)}</p>
                                                    <p className="text-xs text-neutral-400">{formatFinanceDate(inv.paid_at)}</p>
                                                </div>
                                                <span className="font-semibold text-emerald-600">
                                                    {formatFinanceCurrency(inv.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ROI si hay presupuesto */}
                            {project.roi !== null && (
                                <div className="rounded-2xl bg-neutral-50 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={16} className="text-neutral-500" />
                                        <span className="text-sm font-medium text-neutral-700">ROI del proyecto</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-bold ${project.roi >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {project.roi >= 0 ? '+' : ''}{project.roi.toFixed(1)}%
                                        </span>
                                        <span className="text-sm text-neutral-500">
                                            (Presupuesto: {formatFinanceCurrency(project.budget)})
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    };

    if (loading || (isAdmin && fetching)) return <LoadingFallback type="spinner" />;
    if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

    return (
        <div className="pb-16 font-product text-neutral-900">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <Link
                    to="/dashboard/finances"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900 w-fit"
                >
                    <ArrowLeft size={15} />
                    Volver a finanzas
                </Link>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight md:text-5xl">Rentabilidad por proyecto</h1>
                        <p className="mt-3 max-w-2xl text-lg text-neutral-500">
                            Analiza ingresos, gastos y márgenes de cada proyecto. Identifica los más rentables.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {/* ── KPIs ───────────────────────────────────────────────────────── */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={DollarSign}
                        label="Ingresos totales"
                        value={formatFinanceCurrency(kpis.totalIncome)}
                        color="text-emerald-600"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={TrendingDown}
                        label="Gastos totales"
                        value={formatFinanceCurrency(kpis.totalExpenses)}
                        color="text-rose-500"
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={TrendingUp}
                        label="Ganancia neta"
                        value={formatFinanceCurrency(kpis.totalNet)}
                        color={kpis.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                    />
                </motion.div>
                <motion.div variants={itemVariants}>
                    <FinanceKpiCard
                        icon={PieChart}
                        label="Margen promedio"
                        value={`${kpis.avgMargin.toFixed(1)}%`}
                        sub={`${kpis.profitableCount} rentables / ${kpis.unprofitableCount} con pérdida`}
                        color={kpis.avgMargin >= 0 ? 'text-skyblue' : 'text-rose-500'}
                    />
                </motion.div>
            </motion.div>

            {/* ── Filtros ────────────────────────────────────────────────────── */}
            <motion.div 
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex flex-col lg:flex-row gap-4"
            >
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar proyecto..."
                        className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-neutral-400"
                    />
                </div>
                
                <div className="flex gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                    >
                        <option value="all">Todos los períodos</option>
                        {periods.map(period => (
                            <option key={period.id} value={period.id}>{period.name}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activo</option>
                        <option value="completed">Completado</option>
                        <option value="on_hold">En pausa</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
            </motion.div>

            {/* ── Tabla de proyectos ─────────────────────────────────────────── */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm"
            >
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400 border-b border-neutral-200">
                                <th className="pb-4 pr-4 font-medium">Proyecto</th>
                                <th className="pb-4 pr-4 font-medium text-right">Ingresos</th>
                                <th className="pb-4 pr-4 font-medium text-right">Gastos</th>
                                <th className="pb-4 pr-4 font-medium text-right">Ganancia</th>
                                <th className="pb-4 pr-4 font-medium text-right">Margen</th>
                                <th className="pb-4 font-medium text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-sm text-neutral-500">
                                        No se encontraron proyectos con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map((project) => (
                                    <tr key={project.id} className="group hover:bg-neutral-50">
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                                                    project.netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'
                                                }`}>
                                                    <Briefcase size={16} className={project.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-neutral-900">{project.name}</p>
                                                    <p className="text-xs text-neutral-400">
                                                        {project.status === 'active' ? 'Activo' : 
                                                         project.status === 'completed' ? 'Completado' : 
                                                         project.status === 'on_hold' ? 'En pausa' : 'Cancelado'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <span className="font-semibold text-emerald-600">
                                                {formatFinanceCurrency(project.income)}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <span className="font-semibold text-rose-500">
                                                {formatFinanceCurrency(project.expenses)}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <span className={`font-bold ${project.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {formatFinanceCurrency(project.netProfit)}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                                project.margin >= 30 ? 'bg-emerald-100 text-emerald-700' :
                                                project.margin >= 0 ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                                {project.margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {project.margin.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <button
                                                onClick={() => setSelectedProject(project)}
                                                className="inline-flex items-center gap-1 text-sm font-semibold text-skyblue hover:text-sky-600"
                                            >
                                                Ver detalle
                                                <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.section>

            {/* ── Modal de detalle ───────────────────────────────────────────── */}
            {selectedProject && (
                <ProjectDetailModal 
                    project={selectedProject} 
                    onClose={() => setSelectedProject(null)} 
                />
            )}
        </div>
    );
};

export default FinancesProjectProfitability;
