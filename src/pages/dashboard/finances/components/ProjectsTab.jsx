import React, { useMemo, useState } from 'react';
import {
    Briefcase,
    ChevronRight,
    DollarSign,
    PieChart,
    Search,
    Target,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency, formatFinanceDate } from '@/utils/finance';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

const ProjectsTab = ({ transactions, invoices, projects, periods, distributions, workerProfiles }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    // Filter paid invoices only (profitability uses paid invoices for income)
    const paidInvoices = useMemo(
        () => invoices.filter((inv) => inv.status === 'paid'),
        [invoices],
    );

    const projectData = useMemo(() => {
        return projects.map((project) => {
            const projectInvoices = paidInvoices.filter((inv) => inv.project_id === project.id);
            const income = projectInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

            const projectExpenses = transactions.filter((t) => t.type === 'expense' && t.project_id === project.id);
            const expenses = projectExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

            const workerCost = distributions
                .filter((d) => {
                    const periodTransactions = transactions.filter((t) => t.project_id === project.id && t.period_id === d.period_id);
                    return periodTransactions.length > 0 && d.recipient_type === 'worker';
                })
                .reduce((sum, d) => sum + Number(d.amount_earned || 0), 0);

            const netProfit = income - expenses;
            const margin = income > 0 ? (netProfit / income) * 100 : 0;
            const budget = Number(project.budget || 0);
            const roi = budget > 0 ? ((income - expenses) / budget) * 100 : null;
            const relatedTransactions = transactions.filter((t) => t.project_id === project.id);

            return { ...project, income, expenses, netProfit, margin, roi, budget, workerCost, relatedTransactions, projectInvoices };
        });
    }, [projects, transactions, paidInvoices, distributions]);

    const filteredProjects = useMemo(() => {
        return projectData.filter((project) => {
            if (selectedPeriod !== 'all') {
                if (!project.relatedTransactions.some((t) => t.period_id === selectedPeriod)) return false;
            }
            if (statusFilter !== 'all' && project.status !== statusFilter) return false;
            if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase();
                return (project.name || '').toLowerCase().includes(search) || (project.clients?.name || '').toLowerCase().includes(search);
            }
            return true;
        });
    }, [projectData, selectedPeriod, statusFilter, searchTerm]);

    const kpis = useMemo(() => {
        const totalIncome = filteredProjects.reduce((sum, p) => sum + p.income, 0);
        const totalExpenses = filteredProjects.reduce((sum, p) => sum + p.expenses, 0);
        const totalNet = totalIncome - totalExpenses;
        const avgMargin = filteredProjects.length > 0 ? filteredProjects.reduce((sum, p) => sum + p.margin, 0) / filteredProjects.length : 0;
        return {
            totalIncome, totalExpenses, totalNet, avgMargin,
            profitableCount: filteredProjects.filter((p) => p.netProfit > 0).length,
            unprofitableCount: filteredProjects.filter((p) => p.netProfit < 0).length,
        };
    }, [filteredProjects]);

    return (
        <div className="space-y-6 font-product text-neutral-900">
            {/* Header */}
            <div>
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Análisis financiero</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Rentabilidad por proyecto</h2>
                <p className="mt-1 text-sm text-neutral-500">Analiza ingresos, gastos y márgenes de cada proyecto.</p>
            </div>

            {/* KPIs */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <motion.div variants={itemVariants}><FinanceKpiCard icon={DollarSign} label="Ingresos totales" value={formatFinanceCurrency(kpis.totalIncome)} color="text-emerald-600" /></motion.div>
                <motion.div variants={itemVariants}><FinanceKpiCard icon={TrendingDown} label="Gastos totales" value={formatFinanceCurrency(kpis.totalExpenses)} color="text-rose-500" /></motion.div>
                <motion.div variants={itemVariants}><FinanceKpiCard icon={TrendingUp} label="Ganancia neta" value={formatFinanceCurrency(kpis.totalNet)} color={kpis.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-500'} /></motion.div>
                <motion.div variants={itemVariants}><FinanceKpiCard icon={PieChart} label="Margen promedio" value={`${kpis.avgMargin.toFixed(1)}%`} sub={`${kpis.profitableCount} rentables / ${kpis.unprofitableCount} con pérdida`} color={kpis.avgMargin >= 0 ? 'text-skyblue' : 'text-rose-500'} /></motion.div>
            </motion.div>

            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar proyecto..." className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-neutral-400" />
                </div>
                <div className="flex gap-3">
                    <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400">
                        <option value="all">Todos los períodos</option>
                        {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400">
                        <option value="all">Todos los estados</option>
                        <option value="active">Activo</option>
                        <option value="completed">Completado</option>
                        <option value="on_hold">En pausa</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
            </motion.div>

            {/* Projects table */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
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
                                <tr><td colSpan={6} className="py-10 text-center text-sm text-neutral-500">No se encontraron proyectos con los filtros seleccionados.</td></tr>
                            ) : (
                                filteredProjects.map((project) => (
                                    <tr key={project.id} className="group hover:bg-neutral-50">
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${project.netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                                    <Briefcase size={16} className={project.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-neutral-900">{project.name}</p>
                                                    <p className="text-xs text-neutral-400">
                                                        {project.status === 'active' ? 'Activo' : project.status === 'completed' ? 'Completado' : project.status === 'on_hold' ? 'En pausa' : 'Cancelado'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4 text-right"><span className="font-semibold text-emerald-600">{formatFinanceCurrency(project.income)}</span></td>
                                        <td className="py-4 pr-4 text-right"><span className="font-semibold text-rose-500">{formatFinanceCurrency(project.expenses)}</span></td>
                                        <td className="py-4 pr-4 text-right"><span className={`font-bold ${project.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatFinanceCurrency(project.netProfit)}</span></td>
                                        <td className="py-4 pr-4 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${project.margin >= 30 ? 'bg-emerald-100 text-emerald-700' : project.margin >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {project.margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {project.margin.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <button onClick={() => setSelectedProject(project)} className="inline-flex items-center gap-1 text-sm font-semibold text-skyblue hover:text-sky-600">
                                                Ver detalle <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.section>

            {/* Project detail modal */}
            <AnimatePresence>
                {selectedProject && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm px-4 py-6 overflow-y-auto" onClick={() => setSelectedProject(null)}>
                        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="mx-auto w-full max-w-4xl rounded-[32px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Detalle del proyecto</p>
                                    <h2 className="mt-2 text-2xl font-black text-neutral-900">{selectedProject.name}</h2>
                                    {selectedProject.clients && <p className="text-sm text-neutral-500">Cliente: {selectedProject.clients.name}</p>}
                                </div>
                                <button onClick={() => setSelectedProject(null)} className="rounded-full border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-900"><X size={18} /></button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="rounded-2xl bg-emerald-50 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Ingresos</p>
                                        <p className="mt-1 text-xl font-bold text-emerald-700">{formatFinanceCurrency(selectedProject.income)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-rose-50 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Gastos</p>
                                        <p className="mt-1 text-xl font-bold text-rose-700">{formatFinanceCurrency(selectedProject.expenses)}</p>
                                    </div>
                                    <div className={`rounded-2xl p-4 ${selectedProject.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                        <p className={`text-xs uppercase tracking-[0.2em] ${selectedProject.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Ganancia</p>
                                        <p className={`mt-1 text-xl font-bold ${selectedProject.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatFinanceCurrency(selectedProject.netProfit)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-skyblue/10 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-skyblue">Margen</p>
                                        <p className="mt-1 text-xl font-bold text-skyblue">{selectedProject.margin.toFixed(1)}%</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold mb-4">Transacciones vinculadas</h3>
                                    {selectedProject.relatedTransactions.length === 0
                                        ? <p className="text-neutral-500 text-sm">No hay transacciones registradas para este proyecto.</p>
                                        : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {selectedProject.relatedTransactions.map((tx) => (
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

                                <div>
                                    <h3 className="text-lg font-bold mb-4">Facturas pagadas</h3>
                                    {selectedProject.projectInvoices.length === 0
                                        ? <p className="text-neutral-500 text-sm">No hay facturas pagadas para este proyecto.</p>
                                        : (
                                            <div className="space-y-2">
                                                {selectedProject.projectInvoices.map((inv) => (
                                                    <div key={inv.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                                                        <div>
                                                            <p className="font-medium text-sm">Factura #{inv.id.slice(0, 8)}</p>
                                                            <p className="text-xs text-neutral-400">{formatFinanceDate(inv.paid_at)}</p>
                                                        </div>
                                                        <span className="font-semibold text-emerald-600">{formatFinanceCurrency(inv.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>

                                {selectedProject.roi !== null && (
                                    <div className="rounded-2xl bg-neutral-50 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target size={16} className="text-neutral-500" />
                                            <span className="text-sm font-medium text-neutral-700">ROI del proyecto</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-2xl font-bold ${selectedProject.roi >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {selectedProject.roi >= 0 ? '+' : ''}{selectedProject.roi.toFixed(1)}%
                                            </span>
                                            <span className="text-sm text-neutral-500">(Presupuesto: {formatFinanceCurrency(selectedProject.budget)})</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectsTab;
