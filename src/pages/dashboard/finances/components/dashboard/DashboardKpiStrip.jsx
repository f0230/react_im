import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Banknote, Landmark, PiggyBank, Users } from 'lucide-react';
import FinanceKpiCard from '@/components/finances/FinanceKpiCard';
import { formatFinanceCurrency, formatFinanceDate } from '@/utils/finance';

const BreakdownList = ({ items }) => (
    <div className="space-y-2">
        {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
                <span className="text-neutral-500">{item.label}</span>
                <span className={`font-mono font-semibold tabular-nums ${item.className || 'text-neutral-900'}`}>{item.value}</span>
            </div>
        ))}
    </div>
);

const DashboardKpiStrip = ({
    currentPeriod,
    currentPeriodIncome,
    currentPeriodExpenses,
    pendingReceivables,
    pendingReceivableCount,
    summaryKpis,
    currency,
    companyFundMovements,
}) => {
    const lastCompanyMovement = companyFundMovements[0];
    const cajaEstimada = summaryKpis.cajaEstimada ?? (summaryKpis.net - (summaryKpis.totalPaidDistributions || 0));

    return (
        <div className="flex flex-wrap gap-2">
            {/* CASH: best estimate of real money available today */}
            <FinanceKpiCard
                icon={Banknote}
                label="Caja estimada"
                value={formatFinanceCurrency(cajaEstimada, currency)}
                color={cajaEstimada >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Plata disponible hoy (estimada)</p>
                        <p className="text-xs text-neutral-500">
                            Resultado P&L menos lo que ya se pagó en distribuciones a founders y workers. Es la mejor estimación del dinero real disponible mientras no se registren cuentas bancarias reales.
                        </p>
                        <BreakdownList
                            items={[
                                { label: 'Ingresos acumulados', value: formatFinanceCurrency(summaryKpis.income, currency), className: 'text-emerald-600' },
                                { label: 'Gastos acumulados', value: formatFinanceCurrency(summaryKpis.expenses, currency), className: 'text-rose-500' },
                                { label: 'Resultado neto (P&L)', value: formatFinanceCurrency(summaryKpis.net, currency) },
                                { label: 'Ya pagado (distrib.)', value: `− ${formatFinanceCurrency(summaryKpis.totalPaidDistributions || 0, currency)}`, className: 'text-rose-500' },
                                { label: 'Caja estimada', value: formatFinanceCurrency(cajaEstimada, currency), className: cajaEstimada >= 0 ? 'text-emerald-600' : 'text-rose-500' },
                            ]}
                        />
                    </div>
                )}
            />

            {/* Current period income */}
            <FinanceKpiCard
                icon={ArrowUpCircle}
                label={currentPeriod ? `Ingresos ${currentPeriod.name}` : 'Ingresos período'}
                value={formatFinanceCurrency(currentPeriodIncome, currency)}
                color="text-emerald-600"
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Ingresos del período actual</p>
                        <BreakdownList
                            items={[
                                { label: 'Período', value: currentPeriod?.name || 'Sin período abierto' },
                                { label: 'Cobrado en período', value: formatFinanceCurrency(currentPeriodIncome, currency), className: 'text-emerald-600' },
                            ]}
                        />
                    </div>
                )}
            />

            {/* Current period expenses */}
            <FinanceKpiCard
                icon={ArrowDownCircle}
                label={currentPeriod ? `Gastos ${currentPeriod.name}` : 'Gastos período'}
                value={formatFinanceCurrency(currentPeriodExpenses, currency)}
                color="text-rose-500"
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Egresos del período actual</p>
                        <BreakdownList
                            items={[
                                { label: 'Período', value: currentPeriod?.name || 'Sin período abierto' },
                                { label: 'Gastado en período', value: formatFinanceCurrency(currentPeriodExpenses, currency), className: 'text-rose-500' },
                            ]}
                        />
                    </div>
                )}
            />

            {/* Pending receivables (invoices not yet paid) */}
            <FinanceKpiCard
                icon={PiggyBank}
                label="Pendiente cobro"
                value={formatFinanceCurrency(pendingReceivables, currency)}
                color={pendingReceivables > 0 ? 'text-amber-600' : 'text-neutral-900'}
                sub={pendingReceivableCount ? `${pendingReceivableCount} facturas` : null}
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Facturación por cobrar</p>
                        <BreakdownList
                            items={[
                                { label: 'Facturas pendientes', value: String(pendingReceivableCount) },
                                { label: 'Monto esperado', value: formatFinanceCurrency(pendingReceivables, currency), className: 'text-amber-600' },
                            ]}
                        />
                    </div>
                )}
            />

            {/* Company fund/reserve — internal buffer, NOT real bank balance */}
            <FinanceKpiCard
                icon={Landmark}
                label="Fondo empresa"
                value={formatFinanceCurrency(summaryKpis.companyFundBalance, summaryKpis.companyFundCurrency || currency)}
                color="text-amber-600"
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Reserva operativa interna</p>
                        <p className="text-xs text-neutral-500">Acumula el excedente asignado a la empresa en cada cierre. No representa saldo bancario real.</p>
                        <BreakdownList
                            items={[
                                { label: 'Saldo reserva', value: formatFinanceCurrency(summaryKpis.companyFundBalance, summaryKpis.companyFundCurrency || currency), className: 'text-amber-600' },
                                { label: 'Último movimiento', value: lastCompanyMovement?.description || 'Sin movimientos recientes' },
                                { label: 'Fecha', value: lastCompanyMovement?.movement_date ? formatFinanceDate(lastCompanyMovement.movement_date) : '—' },
                            ]}
                        />
                    </div>
                )}
            />

            {/* Obligations: what is owed to founders and workers */}
            <FinanceKpiCard
                icon={Users}
                label="Obligaciones"
                value={formatFinanceCurrency(summaryKpis.pendingPayouts, currency)}
                color={summaryKpis.pendingPayouts > 0 ? 'text-rose-500' : 'text-neutral-900'}
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Pendiente founders y workers</p>
                        <p className="text-xs text-neutral-500">Distribuciones generadas en cierres anteriores que aún no han sido pagadas.</p>
                        <BreakdownList
                            items={[
                                { label: 'Monto pendiente', value: formatFinanceCurrency(summaryKpis.pendingPayouts, currency), className: summaryKpis.pendingPayouts > 0 ? 'text-rose-500' : undefined },
                            ]}
                        />
                    </div>
                )}
            />

        </div>
    );
};

export default DashboardKpiStrip;
