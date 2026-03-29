import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Landmark, PiggyBank, Wallet } from 'lucide-react';
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

    return (
        <div className="flex flex-wrap gap-2">
            <FinanceKpiCard
                icon={Wallet}
                label="Balance actual"
                value={formatFinanceCurrency(summaryKpis.net, currency)}
                color={summaryKpis.net >= 0 ? 'text-neutral-900' : 'text-rose-500'}
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Balance global</p>
                        <BreakdownList
                            items={[
                                { label: 'Ingresos acumulados', value: formatFinanceCurrency(summaryKpis.income, currency), className: 'text-emerald-600' },
                                { label: 'Gastos acumulados', value: formatFinanceCurrency(summaryKpis.expenses, currency), className: 'text-rose-500' },
                                { label: 'Resultado neto', value: formatFinanceCurrency(summaryKpis.net, currency) },
                            ]}
                        />
                    </div>
                )}
            />
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
            <FinanceKpiCard
                icon={Landmark}
                label="Fondo empresa"
                value={formatFinanceCurrency(summaryKpis.companyFundBalance, currency)}
                color="text-amber-600"
                popover={(
                    <div className="space-y-3">
                        <p className="font-semibold text-neutral-900">Saldo operativo</p>
                        <BreakdownList
                            items={[
                                { label: 'Saldo actual', value: formatFinanceCurrency(summaryKpis.companyFundBalance, currency), className: 'text-amber-600' },
                                { label: 'Último movimiento', value: lastCompanyMovement?.description || 'Sin movimientos recientes' },
                                { label: 'Fecha', value: lastCompanyMovement?.movement_date ? formatFinanceDate(lastCompanyMovement.movement_date) : '—' },
                            ]}
                        />
                    </div>
                )}
            />
        </div>
    );
};

export default DashboardKpiStrip;
