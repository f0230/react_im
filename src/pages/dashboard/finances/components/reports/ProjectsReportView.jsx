import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import MultiUseSelect from '@/components/MultiUseSelect';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    formatFinanceCurrency,
    formatFinanceDate,
    getFinanceTransactionReportingAmount,
    getInvoiceReportingAmount,
} from '@/utils/finance';

const selectButtonClass = 'h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-none hover:border-neutral-300';
const selectListClass = 'border border-neutral-200 bg-white text-neutral-900 text-sm';

const ProjectsReportView = ({ transactions, invoices, projects, periods, distributions, currency = 'USD' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [selectedProject, setSelectedProject] = useState(null);

    const projectData = useMemo(() => projects.map((project) => {
        const paidInvoices = invoices.filter((invoice) => invoice.project_id === project.id && invoice.status === 'paid');
        const relatedTransactions = transactions.filter((transaction) => transaction.project_id === project.id);
        const expenses = relatedTransactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + getFinanceTransactionReportingAmount(transaction), 0);
        const income = paidInvoices.reduce((sum, invoice) => sum + getInvoiceReportingAmount(invoice), 0);
        const workerCost = distributions
            .filter((distribution) => distribution.recipient_type === 'worker' && relatedTransactions.some((transaction) => transaction.period_id === distribution.period_id))
            .reduce((sum, distribution) => sum + Number(distribution.amount_earned || 0), 0);
        const netProfit = income - expenses;
        const margin = income > 0 ? (netProfit / income) * 100 : 0;
        const roi = Number(project.budget || 0) > 0 ? ((income - expenses) / Number(project.budget || 0)) * 100 : null;
        return { ...project, income, expenses, netProfit, margin, roi, workerCost, relatedTransactions };
    }), [distributions, invoices, projects, transactions]);

    const filteredProjects = useMemo(() => projectData.filter((project) => {
        if (statusFilter !== 'all' && project.status !== statusFilter) return false;
        if (periodFilter !== 'all' && !project.relatedTransactions.some((transaction) => transaction.period_id === periodFilter)) return false;
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        return `${project.name || ''} ${project.title || ''}`.toLowerCase().includes(search);
    }), [periodFilter, projectData, searchTerm, statusFilter]);

    const profitableCount = filteredProjects.filter((project) => project.netProfit > 0).length;
    const lossCount = filteredProjects.filter((project) => project.netProfit < 0).length;
    const bestMargin = filteredProjects.reduce((best, project) => (!best || project.margin > best.margin ? project : best), null);
    const bestRoi = filteredProjects.reduce((best, project) => (!best || (project.roi || -Infinity) > (best.roi || -Infinity) ? project : best), null);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <FinanceKpiCard label="Rentables" value={profitableCount} color="text-emerald-600" />
                <FinanceKpiCard label="Con pérdida" value={lossCount} color="text-rose-500" />
                <FinanceKpiCard label="Mejor margen" value={bestMargin ? `${bestMargin.margin.toFixed(1)}%` : '—'} sub={bestMargin?.name} color="text-sky-700" />
                <FinanceKpiCard label="ROI líder" value={bestRoi?.roi != null ? `${bestRoi.roi.toFixed(1)}%` : '—'} sub={bestRoi?.name} />
            </div>

            <div className="flex flex-col gap-2 lg:flex-row">
                <label className="relative block flex-1">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar proyecto..." className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400" />
                </label>
                <MultiUseSelect theme="light" options={[{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Activo' }, { value: 'completed', label: 'Completado' }, { value: 'on_hold', label: 'En pausa' }, { value: 'cancelled', label: 'Cancelado' }]} value={statusFilter} onChange={setStatusFilter} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                <MultiUseSelect theme="light" options={[{ value: 'all', label: 'Todos los períodos' }, ...periods.map((period) => ({ value: period.id, label: period.name }))]} value={periodFilter} onChange={setPeriodFilter} buttonClassName={selectButtonClass} listClassName={selectListClass} />
            </div>

            <section className="rounded-[24px] border border-neutral-200 bg-white">
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                                <th className="px-4 py-2 font-medium">Proyecto</th>
                                <th className="px-4 py-2 font-medium text-right">Neto</th>
                                <th className="px-4 py-2 font-medium text-right">Margen</th>
                                <th className="px-4 py-2 font-medium text-right">ROI</th>
                                <th className="px-4 py-2 font-medium text-right" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No se encontraron proyectos para los filtros actuales.</td></tr>
                            ) : filteredProjects.map((project) => (
                                <tr key={project.id} className="border-b border-neutral-100">
                                    <td className="px-4 py-2.5">
                                        <p className="font-medium text-neutral-900">{project.name}</p>
                                        <p className="text-xs text-neutral-500">{project.status || 'Sin estado'}</p>
                                    </td>
                                    <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${project.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatFinanceCurrency(project.netProfit, currency)}</td>
                                    <td className="px-4 py-2.5 text-right text-neutral-700">{project.margin.toFixed(1)}%</td>
                                    <td className="px-4 py-2.5 text-right text-neutral-700">{project.roi != null ? `${project.roi.toFixed(1)}%` : '—'}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button type="button" onClick={() => setSelectedProject(project)} className="text-sm font-semibold text-neutral-900 underline">Ver detalle</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <Dialog open={Boolean(selectedProject)} onOpenChange={(open) => !open && setSelectedProject(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedProject?.name}</DialogTitle>
                        <DialogDescription>Rentabilidad y movimientos asociados del proyecto.</DialogDescription>
                    </DialogHeader>
                    {selectedProject ? (
                        <div className="space-y-4 px-5 pb-5">
                            <div className="grid gap-3 md:grid-cols-4">
                                <FinanceKpiCard label="Ingresos" value={formatFinanceCurrency(selectedProject.income, currency)} color="text-emerald-600" />
                                <FinanceKpiCard label="Gastos" value={formatFinanceCurrency(selectedProject.expenses, currency)} color="text-rose-500" />
                                <FinanceKpiCard label="Neto" value={formatFinanceCurrency(selectedProject.netProfit, currency)} />
                                <FinanceKpiCard label="Worker cost" value={formatFinanceCurrency(selectedProject.workerCost, currency)} />
                            </div>
                            <div className="rounded-2xl border border-neutral-200">
                                {selectedProject.relatedTransactions.length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-neutral-500">No hay movimientos asociados.</div>
                                ) : (
                                    selectedProject.relatedTransactions.slice(0, 10).map((transaction) => (
                                        <div key={transaction.id} className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3 last:border-b-0">
                                            <div>
                                                <p className="text-sm font-medium text-neutral-900">{transaction.description || transaction.category}</p>
                                                <p className="text-xs text-neutral-500">{formatFinanceDate(transaction.transaction_date)}</p>
                                            </div>
                                            <p className={`font-mono text-sm font-semibold tabular-nums ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {formatFinanceCurrency(transaction.amount, transaction.currency)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectsReportView;
