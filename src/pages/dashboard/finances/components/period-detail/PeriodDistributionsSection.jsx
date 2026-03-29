import React from 'react';
import DistributionRow from '@/components/finances/DistributionRow';
import { formatFinanceCurrency, getPersonDisplayName } from '@/utils/finance';

const PreviewRow = ({ label, amount, detail, tone = 'neutral', currency }) => {
    const toneClass = {
        neutral: 'text-neutral-900',
        sky: 'text-sky-700',
        violet: 'text-violet-700',
        amber: 'text-amber-700',
    };

    return (
        <div className="grid items-center gap-3 rounded-2xl border border-neutral-200 px-3 py-2.5 md:grid-cols-[minmax(0,1.5fr),160px,1fr]">
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{label}</p>
                <p className="mt-1 text-xs text-neutral-500">{detail}</p>
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Estimado</p>
                <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${toneClass[tone]}`}>
                    {formatFinanceCurrency(amount, currency)}
                </p>
            </div>
            <div className="text-sm text-neutral-500">
                Preview del cierre. Se persiste al cerrar el período.
            </div>
        </div>
    );
};

const PersistedDistributionGroup = ({
    title,
    description,
    items,
    profileMap,
    periodStatus,
    onSavePayment,
    fallbackLabel,
    emptyMessage = 'Sin registros para esta sección.',
}) => (
    <div className="space-y-3">
        <div>
            <p className="text-sm font-semibold text-neutral-900">{title}</p>
            <p className="text-sm text-neutral-500">{description}</p>
        </div>

        {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                {emptyMessage}
            </div>
        ) : (
            items.map((distribution) => (
                <DistributionRow
                    key={distribution.id}
                    distribution={distribution}
                    label={distribution.profile_id ? getPersonDisplayName(profileMap[distribution.profile_id]) : fallbackLabel}
                    disabled={periodStatus !== 'closed'}
                    onSavePayment={onSavePayment}
                />
            ))
        )}
    </div>
);

const PreviewDistributionGroup = ({ title, description, rows = [], emptyMessage }) => (
    <div className="space-y-3">
        <div>
            <p className="text-sm font-semibold text-neutral-900">{title}</p>
            <p className="text-sm text-neutral-500">{description}</p>
        </div>

        {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                {emptyMessage}
            </div>
        ) : rows}
    </div>
);

const PeriodDistributionsSection = ({
    adminDistributions,
    workerDistributions,
    legacyCompanyDistributions,
    profileMap,
    periodStatus,
    onSavePayment,
    previewDistributions,
    currency,
}) => {
    if (periodStatus === 'open') {
        const adminPreviewRows = [
            previewDistributions?.francisco?.amount > 0 ? (
                <PreviewRow
                    key="francisco"
                    label="Francisco"
                    amount={previewDistributions.francisco.amount}
                    detail={`${previewDistributions.francisco.pct}% del neto`}
                    tone="sky"
                    currency={currency}
                />
            ) : null,
            previewDistributions?.federico?.amount > 0 ? (
                <PreviewRow
                    key="federico"
                    label="Federico"
                    amount={previewDistributions.federico.amount}
                    detail={`${previewDistributions.federico.pct}% del neto`}
                    tone="sky"
                    currency={currency}
                />
            ) : null,
        ].filter(Boolean);

        const workerPreviewRows = (previewDistributions?.workersPool?.breakdown || []).map((worker) => (
            <PreviewRow
                key={worker.workerId}
                label={worker.name}
                amount={worker.amount}
                detail={`${worker.weightedPoints.toFixed(2)} pts · ${(worker.sharePercentage * 100).toFixed(2)}% del pool`}
                tone="violet"
                currency={currency}
            />
        ));

        return (
            <div className="space-y-5">
                <PreviewDistributionGroup
                    title="Admins"
                    description="Compensaciones estimadas si cerraras el período ahora."
                    rows={adminPreviewRows}
                    emptyMessage="Todavía no hay neto positivo para distribuir a admins."
                />
                <PreviewDistributionGroup
                    title="Workers"
                    description="Pool workers ganado hasta este momento."
                    rows={workerPreviewRows}
                    emptyMessage="Todavía no hay work logs aprobados con monto distribuible."
                />
                <PreviewDistributionGroup
                    title="Legacy empresa"
                    description="Este bloque solo aplica a cierres heredados del modelo anterior."
                    rows={[]}
                    emptyMessage="No aplica para este período abierto."
                />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PersistedDistributionGroup
                title="Admins"
                description="Compensaciones administrativas generadas por el cierre."
                items={adminDistributions}
                profileMap={profileMap}
                periodStatus={periodStatus}
                onSavePayment={onSavePayment}
                fallbackLabel="Admin"
            />
            <PersistedDistributionGroup
                title="Workers"
                description="Pagos calculados por puntos y ponderación del período."
                items={workerDistributions}
                profileMap={profileMap}
                periodStatus={periodStatus}
                onSavePayment={onSavePayment}
                fallbackLabel="Worker"
            />
            <PersistedDistributionGroup
                title="Legacy empresa"
                description="Filas heredadas del modelo anterior para control histórico."
                items={legacyCompanyDistributions}
                profileMap={profileMap}
                periodStatus={periodStatus}
                onSavePayment={onSavePayment}
                fallbackLabel="Fondo empresa"
                emptyMessage="No hay registros legacy en este cierre."
            />
        </div>
    );
};

export default PeriodDistributionsSection;
