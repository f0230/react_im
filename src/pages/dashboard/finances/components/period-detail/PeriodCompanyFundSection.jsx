import React from 'react';
import { Landmark } from 'lucide-react';
import { formatFinanceCurrency, formatFinanceDate } from '@/utils/finance';

const Stat = ({ label, value, caption }) => (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">{label}</p>
        <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-900">{value}</p>
        {caption ? <p className="mt-1 text-xs text-neutral-500">{caption}</p> : null}
    </div>
);

const PeriodCompanyFundSection = ({
    displayCurrency,
    displayedCompanyFundBalance,
    companyFundReleaseSummary,
    projectedCompanyFundBalance,
    companyFundCreditAmount,
    periodCompanyFundMovements,
}) => (
    <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
            <Stat label="Saldo visible" value={formatFinanceCurrency(displayedCompanyFundBalance, displayCurrency)} />
            <Stat label="Crédito del período" value={formatFinanceCurrency(companyFundCreditAmount, displayCurrency)} caption="Base empresa + remanente workers" />
            <Stat label="Release" value={formatFinanceCurrency(companyFundReleaseSummary.releaseAmount, displayCurrency)} caption={`Colchón protegido ${formatFinanceCurrency(companyFundReleaseSummary.reserveFloor, displayCurrency)}`} />
            <Stat label="Saldo proyectado" value={formatFinanceCurrency(projectedCompanyFundBalance, displayCurrency)} />
        </div>

        <div className="rounded-2xl border border-neutral-200">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
                <Landmark size={15} className="text-amber-600" />
                <p className="text-sm font-semibold text-neutral-900">Movimientos del período</p>
            </div>

            <div className="space-y-2 p-3">
                {periodCompanyFundMovements.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                        No hay movimientos de fondo empresa asociados a este período.
                    </div>
                ) : (
                    periodCompanyFundMovements.map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-3 py-2.5">
                            <div>
                                <p className="text-sm font-medium text-neutral-900">{movement.description || 'Movimiento de fondo empresa'}</p>
                                <p className="text-xs text-neutral-500">{formatFinanceDate(movement.movement_date)}</p>
                            </div>
                            <p className={`font-mono text-sm font-semibold tabular-nums ${movement.movement_type === 'credit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {movement.movement_type === 'credit' ? '+' : '-'}
                                {formatFinanceCurrency(movement.amount, movement.currency || displayCurrency)}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
);

export default PeriodCompanyFundSection;
