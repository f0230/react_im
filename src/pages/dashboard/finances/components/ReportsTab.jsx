import React from 'react';
import MonthlyReportView from './reports/MonthlyReportView';
import ProjectsReportView from './reports/ProjectsReportView';
import CashflowReportView from './reports/CashflowReportView';

const REPORT_VIEWS = [
    { key: 'mensual', label: 'Mensual' },
    { key: 'proyectos', label: 'Proyectos' },
    { key: 'cashflow', label: 'Cashflow' },
];

const ReportsTab = ({ reportView, onChangeView, ...props }) => (
    <div className="space-y-4 font-product text-neutral-900">
        <section className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Análisis</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Reportes</h2>
            <p className="mt-1 text-sm text-neutral-500">Tres vistas de lectura para análisis histórico, proyectos y proyección de caja.</p>

            <div className="mt-4 inline-flex rounded-full bg-neutral-100 p-1">
                {REPORT_VIEWS.map((view) => (
                    <button
                        key={view.key}
                        type="button"
                        onClick={() => onChangeView(view.key)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${reportView === view.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                    >
                        {view.label}
                    </button>
                ))}
            </div>
        </section>

        {reportView === 'mensual' ? <MonthlyReportView {...props} /> : null}
        {reportView === 'proyectos' ? <ProjectsReportView {...props} /> : null}
        {reportView === 'cashflow' ? <CashflowReportView {...props} /> : null}
    </div>
);

export default ReportsTab;
