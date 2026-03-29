export const WORKERS_TARGET_REFERENCE_ACTIVE_WORKERS = 4;

export const getDynamicWorkersTarget = ({
    baseTargetWeightedPoints,
    activeWorkersCount,
    referenceActiveWorkers = WORKERS_TARGET_REFERENCE_ACTIVE_WORKERS,
}) => {
    const normalizedBaseTarget = Math.max(Number(baseTargetWeightedPoints || 0), 1);
    const normalizedReferenceWorkers = Math.max(Number(referenceActiveWorkers || 0), 1);
    const normalizedActiveWorkers = Math.max(Number(activeWorkersCount || 0), 1);

    return Math.max(
        Math.round(
            (
                (normalizedBaseTarget * normalizedActiveWorkers / normalizedReferenceWorkers)
                + Number.EPSILON
            ) * 100,
        ) / 100,
        1,
    );
};
