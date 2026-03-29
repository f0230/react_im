import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Loader2,
    Plus,
    Trash2,
    ClipboardList,
    Sparkles,
    Calculator,
    BarChart3,
    Briefcase,
    Info,
    TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MultiUseSelect from '@/components/MultiUseSelect';
import {
    formatFinanceCurrency,
    getPersonDisplayName,
    getProjectDisplayName,
} from '@/utils/finance';

const TASK_CATEGORY_LABELS = {
    campanas: 'Campañas',
    contenido: 'Contenido',
    custom: 'Custom / transicional',
    dev: 'Desarrollo',
    digital: 'Digital',
    diseno: 'Diseño',
    estrategia: 'Estrategia',
    espacios: 'Espacios',
    gestion: 'Gestión',
    marca: 'Marca',
    producto: 'Producto',
    social: 'Social / community',
    video: 'Video / motion',
};

const getEmptyForm = (dateFallback) => ({
    worker_id: '',
    project_id: '',
    task_type_ids: [],
    task_description: '',
    worked_date: dateFallback || new Date().toISOString().slice(0, 10),
    quantity: '1',
    criticality_level: 'normal',
    hours_spent: '',
    points_override: '',
    notes: '',
});

const formLabelClass = 'text-[10px] uppercase tracking-[0.24em] leading-none text-neutral-400';
const formInputClass = 'h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm leading-none text-neutral-900 outline-none transition focus:border-neutral-400 disabled:bg-neutral-100';
const financeSelectButtonClass = 'w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm leading-none text-neutral-900 shadow-sm hover:border-neutral-300';
const financeSelectListClass = 'border border-neutral-200 bg-white text-neutral-900 text-[13px]';
const financeSelectOptionClass = 'rounded-lg px-2 py-1.5 text-[12px] leading-4';
const taskChipClass = 'inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2 py-1 text-[10px] leading-none text-neutral-600';

const getWorkLogTaskItems = (log, taskTypeMap) => {
    if (Array.isArray(log?.task_types_snapshot) && log.task_types_snapshot.length > 0) {
        return log.task_types_snapshot;
    }

    if (Array.isArray(log?.task_type_ids) && log.task_type_ids.length > 0) {
        return log.task_type_ids
            .map((taskTypeId) => taskTypeMap[taskTypeId])
            .filter(Boolean);
    }

    const fallbackTask = log?.task_type || taskTypeMap[log?.task_type_id];
    if (fallbackTask) return [fallbackTask];
    if (log?.task_name) return [{ name: log.task_name }];
    return [];
};

const formatMultiplier = (value) => `x${Number(value || 1).toFixed(2)}`;

const formatContributionPct = (value) => `${(Number(value || 0) * 100).toFixed(2)}%`;

const getProjectValueTone = (multiplier = 1) => {
    if (Number(multiplier || 1) > 1.05) {
        return {
            panelClass: 'border-emerald-200 bg-emerald-50/80',
            badgeClass: 'bg-emerald-100 text-emerald-700',
            barClass: 'bg-emerald-500',
            accentClass: 'text-emerald-700',
        };
    }

    if (Number(multiplier || 1) < 0.95) {
        return {
            panelClass: 'border-amber-200 bg-amber-50/80',
            badgeClass: 'bg-amber-100 text-amber-700',
            barClass: 'bg-amber-500',
            accentClass: 'text-amber-700',
        };
    }

    return {
        panelClass: 'border-neutral-200 bg-neutral-50',
        badgeClass: 'bg-neutral-200 text-neutral-700',
        barClass: 'bg-neutral-400',
        accentClass: 'text-neutral-700',
    };
};

const getProjectValueMetrics = (
    projectId,
    totalPeriodIncome,
    projectIncomeById,
    overrides = {},
) => {
    const normalizedTotalIncome = Number(totalPeriodIncome || 0);
    const projectIncome = projectId ? Number(projectIncomeById[projectId] || 0) : null;
    const derivedContribution = projectId && normalizedTotalIncome > 0
        ? projectIncome / normalizedTotalIncome
        : null;
    const normalizedContribution = overrides.projectRevenueContribution != null
        ? Number(overrides.projectRevenueContribution)
        : (derivedContribution == null ? null : Number(derivedContribution.toFixed(4)));
    const normalizedMultiplier = overrides.projectValueMultiplier != null
        ? Number(overrides.projectValueMultiplier)
        : (!projectId || normalizedTotalIncome <= 0
            ? 1
            : Math.max(Number((derivedContribution * 2).toFixed(2)), 0.5));

    return {
        projectIncome,
        totalPeriodIncome: normalizedTotalIncome,
        projectRevenueContribution: normalizedContribution,
        projectValueMultiplier: normalizedMultiplier,
    };
};

const resolveProjectValueReason = ({
    projectId,
    totalPeriodIncome,
    projectRevenueContribution,
    projectValueMultiplier,
}) => {
    if (!projectId) return 'no_project';
    if (Number(totalPeriodIncome || 0) <= 0) return 'zero_period_income';

    if (
        projectRevenueContribution == null
        && Math.abs(Number(projectValueMultiplier || 1) - 1) < 0.001
    ) {
        return 'legacy_neutral_default';
    }

    if (Number(projectRevenueContribution || 0) <= 0) return 'project_without_income_floor';
    return 'project_income_share';
};

const getProjectValueTooltip = ({
    projectName,
    projectId,
    projectIncome,
    totalPeriodIncome,
    projectRevenueContribution,
    projectValueMultiplier,
    currency,
}) => {
    const reason = resolveProjectValueReason({
        projectId,
        totalPeriodIncome,
        projectRevenueContribution,
        projectValueMultiplier,
    });

    if (reason === 'no_project') {
        return 'Este work log no tiene proyecto asociado, por eso usa factor neutro x1.00.';
    }

    if (reason === 'zero_period_income') {
        return 'El período todavía no registró ingresos, así que todos los work logs usan factor neutro x1.00.';
    }

    if (reason === 'legacy_neutral_default') {
        return 'Este work log conserva factor neutro x1.00 por compatibilidad histórica; no se recalculó retroactivamente.';
    }

    if (reason === 'project_without_income_floor') {
        return `${projectName || 'Este proyecto'} no registró ingresos en el período. Se aplica el piso de ${formatMultiplier(projectValueMultiplier)}.`;
    }

    return `${projectName || 'Este proyecto'} aportó ${formatContributionPct(projectRevenueContribution)} de los ingresos del período (${formatFinanceCurrency(projectIncome, currency)} de ${formatFinanceCurrency(totalPeriodIncome, currency)}), así que aplica ${formatMultiplier(projectValueMultiplier)}.`;
};

const getWorkerProjectValueSummary = (row, projectMap) => {
    const logs = Array.isArray(row?.calculation_breakdown?.logs)
        ? row.calculation_breakdown.logs
        : [];

    if (logs.length === 0) return null;

    const groupedByProject = logs.reduce((acc, log) => {
        const key = log?.project_id || '__no_project__';

        if (!acc[key]) {
            acc[key] = {
                projectId: log?.project_id || null,
                points: 0,
                multiplier: Number(log?.project_value_multiplier || 1),
            };
        }

        acc[key].points += Number(log?.calculated_points || 0);
        return acc;
    }, {});

    const multipliers = logs.map((log) => Number(log?.project_value_multiplier || 1));
    const dominantProject = Object.values(groupedByProject)
        .sort((a, b) => b.points - a.points)[0];
    const dominantProjectName = dominantProject?.projectId
        ? getProjectDisplayName(projectMap[dominantProject.projectId])
        : 'Sin proyecto';
    const minMultiplier = multipliers.length > 0 ? Math.min(...multipliers) : 1;
    const maxMultiplier = multipliers.length > 0 ? Math.max(...multipliers) : 1;
    const uniqueProjectCount = new Set(logs.map((log) => log?.project_id || '__no_project__')).size;
    const primaryLabel = uniqueProjectCount <= 1
        ? `${dominantProjectName} · ${formatMultiplier(dominantProject?.multiplier || 1)}`
        : `Dominante ${dominantProjectName} · ${formatMultiplier(dominantProject?.multiplier || 1)}`;
    const secondaryLabel = uniqueProjectCount > 1
        ? `${uniqueProjectCount} proyectos · ${formatMultiplier(minMultiplier)}-${formatMultiplier(maxMultiplier)}`
        : '1 proyecto';

    return {
        primaryLabel,
        secondaryLabel,
        multiplier: Number(dominantProject?.multiplier || 1),
    };
};

const WorkerWeightEditor = ({
    periodId,
    periodStatus = 'open',
    workersPoolAmount = 0,
    workersPoolEarnedAmount = 0,
    workersPoolUnallocatedAmount = 0,
    workersTargetWeightedPoints = 100,
    totalWeightedPoints = 0,
    poolUtilizationRatio = 0,
    currency = 'USD',
    profileMap = {},
    disabled = false,
    onSaved,
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [taskTypes, setTaskTypes] = useState([]);
    const [incomeEntries, setIncomeEntries] = useState([]);
    const [logs, setLogs] = useState([]);
    const [workerRows, setWorkerRows] = useState([]);
    const [form, setForm] = useState(getEmptyForm());

    const isClosed = periodStatus === 'closed';

    const workerMap = useMemo(
        () => workers.reduce((acc, worker) => {
            acc[worker.id] = worker;
            return acc;
        }, { ...profileMap }),
        [profileMap, workers],
    );

    const projectMap = useMemo(
        () => projects.reduce((acc, project) => {
            acc[project.id] = project;
            return acc;
        }, {}),
        [projects],
    );

    const taskTypeMap = useMemo(
        () => taskTypes.reduce((acc, taskType) => {
            acc[taskType.id] = taskType;
            return acc;
        }, {}),
        [taskTypes],
    );

    const totalPeriodIncome = useMemo(() => (
        incomeEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    ), [incomeEntries]);

    const projectIncomeById = useMemo(
        () => incomeEntries.reduce((acc, entry) => {
            if (!entry.project_id) return acc;
            acc[entry.project_id] = (acc[entry.project_id] || 0) + Number(entry.amount || 0);
            return acc;
        }, {}),
        [incomeEntries],
    );

    const workLogCountByProject = useMemo(
        () => logs.reduce((acc, log) => {
            if (!log.project_id) return acc;
            acc[log.project_id] = (acc[log.project_id] || 0) + 1;
            return acc;
        }, {}),
        [logs],
    );

    const summary = useMemo(() => {
        const totals = workerRows.reduce((acc, row) => ({
            rawPoints: acc.rawPoints + Number(row.raw_points || 0),
            weightedPoints: acc.weightedPoints + Number(row.weighted_points || 0),
            amount: acc.amount + Number(row.amount_earned || row.estimated_amount || 0),
        }), {
            rawPoints: 0,
            weightedPoints: 0,
            amount: 0,
        });

        return {
            ...totals,
            taskCount: logs.length,
            workersWithCompensation: workerRows.length,
        };
    }, [logs.length, workerRows]);

    const workerOptions = useMemo(() => ([
        { value: '', label: 'Seleccionar worker...' },
        ...workers.map((worker) => ({
            value: worker.id,
            label: getPersonDisplayName(worker),
        })),
    ]), [workers]);

    const projectOptions = useMemo(() => ([
        { value: '', label: 'Seleccionar proyecto...' },
        ...projects.map((project) => ({
            value: project.id,
            label: getProjectDisplayName(project),
            searchText: `${project.name || ''} ${project.title || ''}`,
        })),
    ]), [projects]);

    const taskTypeOptions = useMemo(() => (
        taskTypes.map((taskType) => ({
            value: taskType.id,
            label: `${taskType.name} (${taskType.base_points} pts)`,
            displayLabel: taskType.name,
            helperLabel: `${TASK_CATEGORY_LABELS[taskType.category] || taskType.category || 'General'} · ${Number(taskType.base_points || 0).toFixed(2)} pts`,
            description: taskType.description || '',
            category: taskType.category || 'otros',
            searchText: `${TASK_CATEGORY_LABELS[taskType.category] || taskType.category || ''} ${taskType.name} ${taskType.code || ''} ${taskType.description || ''}`,
        }))
    ), [taskTypes]);

    const criticalityOptions = useMemo(() => ([
        { value: 'normal', label: 'Normal' },
        { value: 'importante', label: 'Importante' },
        { value: 'critica', label: 'Crítica' },
        { value: 'emergencia', label: 'Emergencia' },
    ]), []);

    const selectedTaskTypes = useMemo(() => (
        (form.task_type_ids || [])
            .map((taskTypeId) => taskTypeMap[taskTypeId])
            .filter(Boolean)
    ), [form.task_type_ids, taskTypeMap]);

    const selectedTaskTypesSummary = useMemo(() => {
        const totalBasePoints = selectedTaskTypes.reduce((sum, taskType) => (
            sum + Number(taskType.base_points || 0)
        ), 0);

        return {
            totalBasePoints,
            count: selectedTaskTypes.length,
        };
    }, [selectedTaskTypes]);

    const projectDistribution = useMemo(() => {
        const projectIds = Array.from(new Set([
            ...Object.keys(projectIncomeById),
            ...Object.keys(workLogCountByProject),
        ]));

        return projectIds
            .map((projectId) => {
                const metrics = getProjectValueMetrics(projectId, totalPeriodIncome, projectIncomeById);

                return {
                    projectId,
                    projectName: getProjectDisplayName(projectMap[projectId]),
                    projectIncome: Number(metrics.projectIncome || 0),
                    totalPeriodIncome: Number(metrics.totalPeriodIncome || 0),
                    projectRevenueContribution: metrics.projectRevenueContribution,
                    projectValueMultiplier: metrics.projectValueMultiplier,
                    workLogCount: Number(workLogCountByProject[projectId] || 0),
                };
            })
            .sort((left, right) => {
                const contributionDiff = Number(right.projectRevenueContribution || 0) - Number(left.projectRevenueContribution || 0);
                if (Math.abs(contributionDiff) > 0.0001) return contributionDiff;

                const incomeDiff = Number(right.projectIncome || 0) - Number(left.projectIncome || 0);
                if (Math.abs(incomeDiff) > 0.009) return incomeDiff;

                const workDiff = Number(right.workLogCount || 0) - Number(left.workLogCount || 0);
                if (workDiff !== 0) return workDiff;

                return left.projectName.localeCompare(right.projectName, 'es');
            });
    }, [projectIncomeById, projectMap, totalPeriodIncome, workLogCountByProject]);

    const leadingProject = useMemo(() => projectDistribution[0] || null, [projectDistribution]);

    const visibleProjectDistribution = useMemo(
        () => projectDistribution.slice(0, 5),
        [projectDistribution],
    );

    const selectedProjectValuePreview = useMemo(
        () => (
            form.project_id
                ? getProjectValueMetrics(form.project_id, totalPeriodIncome, projectIncomeById)
                : null
        ),
        [form.project_id, projectIncomeById, totalPeriodIncome],
    );

    const refreshPreview = useCallback(async () => {
        if (!periodId) return;

        if (isClosed) {
            const { data, error: compensationError } = await supabase
                .from('finance_worker_period_compensations')
                .select('*')
                .eq('period_id', periodId)
                .order('weighted_points', { ascending: false });

            if (compensationError) {
                throw compensationError;
            }

            setWorkerRows((data || []).map((row) => ({
                ...row,
                estimated_amount: row.amount_earned,
            })));
            return;
        }

        const { data, error: previewError } = await supabase.rpc('get_period_worker_compensation_preview', {
            p_period_id: periodId,
            p_workers_pool: Number(workersPoolAmount || 0),
        });

        if (previewError) {
            throw previewError;
        }

        setWorkerRows(data || []);
    }, [isClosed, periodId, workersPoolAmount]);

    const refreshAll = useCallback(async () => {
        if (!periodId) return;

        setLoading(true);
        setError('');

        try {
            const [
                { data: workersData, error: workersError },
                { data: projectsData, error: projectsError },
                { data: taskTypesData, error: taskTypesError },
                { data: logsData, error: logsError },
                { data: incomeEntriesData, error: incomeEntriesError },
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url')
                    .eq('role', 'worker')
                    .order('full_name', { ascending: true }),
                supabase
                    .from('projects')
                    .select('id, name')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('worker_task_types')
                    .select('*')
                    .eq('is_active', true)
                    .order('category', { ascending: true })
                    .order('name', { ascending: true }),
                supabase
                    .from('worker_work_logs')
                    .select(`
                        *,
                        project:projects(id, name),
                        task_type:worker_task_types(id, code, name, category, base_points)
                    `)
                    .eq('period_id', periodId)
                    .order('worked_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                supabase
                    .from('finance_transactions')
                    .select('project_id, amount')
                    .eq('period_id', periodId)
                    .eq('type', 'income'),
            ]);

            if (workersError || projectsError || taskTypesError || logsError || incomeEntriesError) {
                throw workersError || projectsError || taskTypesError || logsError || incomeEntriesError;
            }

            setWorkers(workersData || []);
            setProjects(projectsData || []);
            setTaskTypes(taskTypesData || []);
            setIncomeEntries(incomeEntriesData || []);
            setLogs(logsData || []);

            await refreshPreview();

            const fallbackDate = logsData?.[0]?.worked_date || new Date().toISOString().slice(0, 10);
            setForm((prev) => ({
                ...getEmptyForm(fallbackDate),
                worker_id: prev.worker_id || workersData?.[0]?.id || '',
                project_id: prev.project_id || projectsData?.[0]?.id || '',
                task_type_ids: prev.task_type_ids?.length
                    ? prev.task_type_ids
                    : (taskTypesData?.[0]?.id ? [taskTypesData[0].id] : []),
            }));
        } catch (fetchError) {
            console.error('Error fetching worker compensation data:', fetchError);
            setError(fetchError.message || 'No pudimos cargar la compensación de workers.');
        } finally {
            setLoading(false);
        }
    }, [periodId, refreshPreview]);

    useEffect(() => {
        void refreshAll();
    }, [refreshAll]);

    useEffect(() => {
        if (isClosed) return;
        void refreshPreview();
    }, [isClosed, refreshPreview, workersPoolAmount]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddLog = async (event) => {
        event.preventDefault();

        if (!form.worker_id || !form.project_id || !form.task_type_ids?.length || !form.task_description.trim()) {
            setError('Completá worker, proyecto, al menos un tipo de tarea y una descripción breve.');
            return;
        }

        setSaving(true);
        setError('');

        const payload = {
            period_id: periodId,
            worker_id: form.worker_id,
            project_id: form.project_id,
            task_type_id: form.task_type_ids[0],
            task_type_ids: form.task_type_ids,
            task_description: form.task_description.trim(),
            worked_date: form.worked_date,
            quantity: Number(form.quantity || 1),
            criticality_level: form.criticality_level,
            hours_spent: form.hours_spent ? Number(form.hours_spent) : null,
            points_override: form.points_override ? Number(form.points_override) : null,
            notes: form.notes.trim() || null,
            status: 'approved',
            approved_by: user?.id || null,
            created_by: user?.id || null,
        };

        const { error: insertError } = await supabase
            .from('worker_work_logs')
            .insert([payload]);

        if (insertError) {
            console.error('Error saving worker work log:', insertError);
            setError(insertError.message || 'No pudimos guardar el work log.');
            setSaving(false);
            return;
        }

        setForm((prev) => ({
            ...getEmptyForm(prev.worked_date),
            worker_id: prev.worker_id,
            project_id: prev.project_id,
            task_type_ids: prev.task_type_ids,
        }));

        setSaving(false);
        await refreshAll();
        if (onSaved) await onSaved();
    };

    const handleDeleteLog = async (logId) => {
        if (!logId || disabled || isClosed) return;
        if (!window.confirm('¿Eliminar este work log del período?')) return;

        setSaving(true);
        setError('');

        const { error: deleteError } = await supabase
            .from('worker_work_logs')
            .delete()
            .eq('id', logId);

        if (deleteError) {
            console.error('Error deleting worker work log:', deleteError);
            setError(deleteError.message || 'No pudimos borrar el work log.');
            setSaving(false);
            return;
        }

        setSaving(false);
        await refreshAll();
        if (onSaved) await onSaved();
    };

    if (loading) {
        return (
            <div className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3 text-neutral-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cargando compensación workers...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Workers pool</p>
                    <h2 className="mt-1.5 text-[1.55rem] font-black leading-tight text-neutral-900 md:text-[1.7rem]">Compensación basada en trabajo real</h2>
                    <p className="mt-1.5 max-w-3xl text-sm leading-5 text-neutral-500">
                        Este período ya no usa weights manuales. El porcentaje workers funciona como techo; el monto efectivamente ganado sale de tipos de tarea, criticidad, seniority y del valor relativo de cada proyecto dentro del período.
                    </p>
                </div>
                <div className="rounded-[18px] bg-neutral-100 px-3.5 py-2 text-sm text-neutral-600">
                    Pool workers máximo:{' '}
                    <span className="font-semibold text-neutral-900">
                        {formatFinanceCurrency(workersPoolAmount, currency)}
                    </span>
                </div>
            </div>

            {error && (
                <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                    {error}
                </div>
            )}

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0 rounded-[20px] border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <ClipboardList size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Work logs</span>
                    </div>
                    <p className="mt-1.5 text-lg font-black leading-tight text-neutral-900 md:text-[1.5rem]">{summary.taskCount}</p>
                </div>
                <div className="min-w-0 rounded-[20px] border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <Calculator size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Puntos ajustados</span>
                    </div>
                    <p className="mt-1.5 text-lg font-black leading-tight text-neutral-900 md:text-[1.5rem]">{summary.rawPoints.toFixed(2)}</p>
                    <p className="mt-1 text-[11px] leading-4 text-neutral-500">Incluyen criticidad, cantidad y valor de proyecto.</p>
                </div>
                <div className="min-w-0 rounded-[20px] border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <Sparkles size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Puntos ponderados</span>
                    </div>
                    <p className="mt-1.5 text-lg font-black leading-tight text-neutral-900 md:text-[1.5rem]">{summary.weightedPoints.toFixed(2)}</p>
                </div>
                <div className="min-w-0 rounded-[20px] border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <Sparkles size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Pool ganado</span>
                    </div>
                    <p className="mt-1.5 break-words text-lg font-black leading-tight text-neutral-900 md:text-[1.5rem]">
                        {formatFinanceCurrency(workersPoolEarnedAmount, currency)}
                    </p>
                </div>
            </div>

            <div className="mt-2.5 rounded-[20px] border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-neutral-500">
                            <BarChart3 size={14} />
                            <span className="text-[10px] uppercase tracking-[0.22em]">Distribución por proyecto</span>
                        </div>
                        <p className="mt-1.5 text-sm text-neutral-600">
                            Ingresos considerados para el factor: <span className="font-semibold text-neutral-900">{formatFinanceCurrency(totalPeriodIncome, currency)}</span>
                        </p>
                    </div>
                    {leadingProject && totalPeriodIncome > 0 && (
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getProjectValueTone(leadingProject.projectValueMultiplier).badgeClass}`}>
                            <TrendingUp size={12} />
                            Lidera {leadingProject.projectName} · {formatContributionPct(leadingProject.projectRevenueContribution)} · {formatMultiplier(leadingProject.projectValueMultiplier)}
                        </div>
                    )}
                </div>

                <div className="mt-3 space-y-2">
                    {visibleProjectDistribution.length === 0 && (
                        <div className="rounded-[16px] border border-dashed border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-500">
                            Todavía no hay proyectos con ingresos ni work logs para calcular distribución.
                        </div>
                    )}

                    {visibleProjectDistribution.map((projectItem) => {
                        const tone = getProjectValueTone(projectItem.projectValueMultiplier);
                        const barWidth = totalPeriodIncome > 0
                            ? Math.max(Number(projectItem.projectRevenueContribution || 0) * 100, projectItem.workLogCount > 0 ? 8 : 0)
                            : 0;

                        return (
                            <div
                                key={projectItem.projectId}
                                className="rounded-[16px] border border-white/80 bg-white p-3"
                                title={getProjectValueTooltip({
                                    projectName: projectItem.projectName,
                                    projectId: projectItem.projectId,
                                    projectIncome: projectItem.projectIncome,
                                    totalPeriodIncome: projectItem.totalPeriodIncome,
                                    projectRevenueContribution: projectItem.projectRevenueContribution,
                                    projectValueMultiplier: projectItem.projectValueMultiplier,
                                    currency,
                                })}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-neutral-900">{projectItem.projectName}</p>
                                        <p className="mt-1 text-xs text-neutral-500">
                                            {formatFinanceCurrency(projectItem.projectIncome, currency)}
                                            {' · '}
                                            {projectItem.workLogCount > 0
                                                ? `${projectItem.workLogCount} work log(s)`
                                                : 'Sin work logs'}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-neutral-900">
                                            {formatContributionPct(projectItem.projectRevenueContribution)}
                                        </p>
                                        <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${tone.badgeClass}`}>
                                            {formatMultiplier(projectItem.projectValueMultiplier)}
                                        </span>
                                    </div>
                                </div>

                                {totalPeriodIncome > 0 && (
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                                        <div
                                            className={`h-full rounded-full ${tone.barClass}`}
                                            style={{ width: `${Math.min(barWidth, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {projectDistribution.length > visibleProjectDistribution.length && (
                    <p className="mt-2 text-xs text-neutral-500">
                        +{projectDistribution.length - visibleProjectDistribution.length} proyecto(s) más fuera del resumen rápido.
                    </p>
                )}

                {totalPeriodIncome <= 0 && projectDistribution.length > 0 && (
                    <div className="mt-3 rounded-[16px] border border-neutral-200 bg-white px-3 py-2 text-xs leading-5 text-neutral-500">
                        Este período todavía no tiene ingresos. Mientras siga así, todos los proyectos aplican factor neutro <span className="font-semibold text-neutral-900">x1.00</span>.
                    </div>
                )}
            </div>

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                <div className="min-w-0 rounded-[18px] border border-neutral-200 bg-neutral-50 p-2.5">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <Sparkles size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Remanente</span>
                    </div>
                    <p className="mt-1.5 break-words text-base font-black leading-tight text-neutral-900 md:text-lg">
                        {formatFinanceCurrency(workersPoolUnallocatedAmount, currency)}
                    </p>
                </div>
                <div className="min-w-0 rounded-[18px] border border-neutral-200 bg-neutral-50 p-2.5">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <Sparkles size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Target</span>
                    </div>
                    <p className="mt-1.5 text-base font-black leading-tight text-neutral-900 md:text-lg">
                        {Number(workersTargetWeightedPoints || 0).toFixed(2)}
                    </p>
                </div>
                <div className="min-w-0 rounded-[18px] border border-neutral-200 bg-neutral-50 p-2.5">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <Sparkles size={14} />
                        <span className="text-[10px] uppercase tracking-[0.22em]">Utilización</span>
                    </div>
                    <p className="mt-1.5 text-base font-black leading-tight text-neutral-900 md:text-lg">
                        {(Number(poolUtilizationRatio || 0) * 100).toFixed(2)}%
                    </p>
                </div>
            </div>

            <div className="mt-3 rounded-[18px] border border-violet-200 bg-violet-50/40 px-3.5 py-2.5 text-sm leading-5 text-neutral-600">
                Este período lleva <span className="font-semibold text-neutral-900">{Number(totalWeightedPoints || 0).toFixed(2)} puntos ponderados</span> sobre un target de{' '}
                <span className="font-semibold text-neutral-900">{Number(workersTargetWeightedPoints || 0).toFixed(2)}</span>.
                El reparto estimado entre personas hoy suma{' '}
                <span className="font-semibold text-neutral-900">{formatFinanceCurrency(summary.amount, currency)}</span>, que coincide con el pool ganado.
            </div>

            {!isClosed && (
                <form onSubmit={handleAddLog} className="mt-4 rounded-[22px] border border-neutral-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Nuevo work log</p>
                            <h3 className="mt-1 text-[1.45rem] font-black leading-none text-neutral-900 md:text-[1.6rem]">Registrar aporte del período</h3>
                        </div>
                    </div>

                    <div className="mt-3 rounded-[14px] border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] leading-5 text-neutral-500">
                        Si falta una tarea exacta, usá <span className="font-semibold text-neutral-900">Trabajo especializado / custom</span> y ajustá el puntaje con override. El catálogo sigue creciendo con la oferta real de DTE.
                    </div>

                    <div className="mt-3 grid gap-2 xl:grid-cols-12">
                        <label className="space-y-1 xl:col-span-3">
                            <span className={formLabelClass}>Worker</span>
                            <MultiUseSelect
                                theme="light"
                                options={workerOptions}
                                value={form.worker_id}
                                onChange={(value) => handleChange('worker_id', value)}
                                placeholder="Seleccionar worker..."
                                searchable
                                searchPlaceholder="Buscar worker..."
                                disabled={disabled || saving}
                                buttonClassName={financeSelectButtonClass}
                                listClassName={financeSelectListClass}
                                optionClassName={financeSelectOptionClass}
                            />
                        </label>

                        <label className="space-y-1 xl:col-span-3">
                            <span className={formLabelClass}>Proyecto</span>
                            <MultiUseSelect
                                theme="light"
                                options={projectOptions}
                                value={form.project_id}
                                onChange={(value) => handleChange('project_id', value)}
                                placeholder="Seleccionar proyecto..."
                                searchable
                                searchPlaceholder="Buscar proyecto..."
                                disabled={disabled || saving}
                                buttonClassName={financeSelectButtonClass}
                                listClassName={financeSelectListClass}
                                optionClassName={financeSelectOptionClass}
                            />
                            {selectedProjectValuePreview && (
                                <div className={`rounded-[14px] border px-3 py-2 ${getProjectValueTone(selectedProjectValuePreview.projectValueMultiplier).panelClass}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-700">
                                            <Briefcase size={12} />
                                            Valor proyecto hoy
                                        </div>
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${getProjectValueTone(selectedProjectValuePreview.projectValueMultiplier).badgeClass}`}>
                                            {formatMultiplier(selectedProjectValuePreview.projectValueMultiplier)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] leading-5 text-neutral-600">
                                        {selectedProjectValuePreview.totalPeriodIncome > 0
                                            ? selectedProjectValuePreview.projectIncome > 0
                                                ? `${formatFinanceCurrency(selectedProjectValuePreview.projectIncome, currency)} de ${formatFinanceCurrency(selectedProjectValuePreview.totalPeriodIncome, currency)} del período (${formatContributionPct(selectedProjectValuePreview.projectRevenueContribution)}).`
                                                : `Sin ingresos registrados en el período. Si lo guardás ahora, aplica el piso ${formatMultiplier(selectedProjectValuePreview.projectValueMultiplier)}.`
                                            : 'Este período todavía no tiene ingresos; el factor quedaría neutro en x1.00.'}
                                    </p>
                                </div>
                            )}
                        </label>

                        <label className="space-y-1 xl:col-span-4">
                            <span className={formLabelClass}>Tipo de tarea</span>
                            <MultiUseSelect
                                theme="light"
                                options={taskTypeOptions}
                                value={form.task_type_ids}
                                onChange={(value) => handleChange('task_type_ids', value)}
                                placeholder="Seleccionar una o más tareas..."
                                multiple
                                searchable
                                searchPlaceholder="Buscar tarea..."
                                emptyMessage="No encontramos tipos de tarea. Usá el tipo custom con override si necesitás salir del catálogo."
                                groupBy={(option) => option.category}
                                getGroupLabel={(category) => TASK_CATEGORY_LABELS[category] || category}
                                getDisplayLabel={(option) => option.displayLabel || option.label}
                                getMultipleDisplayValue={(selectedOptions) => {
                                    if (selectedOptions.length === 0) return 'Seleccionar una o más tareas...';
                                    if (selectedOptions.length === 1) {
                                        return selectedOptions[0]?.displayLabel || selectedOptions[0]?.label || '1 tarea';
                                    }
                                    return `${selectedOptions.length} tareas seleccionadas`;
                                }}
                                disabled={disabled || saving}
                                buttonClassName={financeSelectButtonClass}
                                listClassName={financeSelectListClass}
                                optionClassName={financeSelectOptionClass}
                            />
                            {selectedTaskTypes.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[11px] leading-none text-neutral-500">
                                        {selectedTaskTypesSummary.count} tarea(s) · {selectedTaskTypesSummary.totalBasePoints.toFixed(2)} pts base
                                    </p>
                                    <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                                        {selectedTaskTypes.map((taskType) => (
                                            <span
                                                key={taskType.id}
                                                className={taskChipClass}
                                            >
                                                {taskType.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </label>

                        <label className="space-y-1 xl:col-span-2">
                            <span className={formLabelClass}>Fecha trabajada</span>
                            <input
                                type="date"
                                value={form.worked_date}
                                onChange={(event) => handleChange('worked_date', event.target.value)}
                                disabled={disabled || saving}
                                className={formInputClass}
                            />
                        </label>
                    </div>

                    <div className="mt-2 grid gap-2 xl:grid-cols-12">
                        <label className="space-y-1 xl:col-span-5">
                            <span className={formLabelClass}>Descripción</span>
                            <input
                                type="text"
                                value={form.task_description}
                                onChange={(event) => handleChange('task_description', event.target.value)}
                                disabled={disabled || saving}
                                placeholder="Qué hizo concretamente esta persona"
                                className={formInputClass}
                            />
                        </label>

                        <label className="space-y-1 xl:col-span-2">
                            <span className={formLabelClass}>Cantidad</span>
                            <input
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={form.quantity}
                                onChange={(event) => handleChange('quantity', event.target.value)}
                                disabled={disabled || saving}
                                className={formInputClass}
                            />
                        </label>

                        <label className="space-y-1 xl:col-span-2">
                            <span className={formLabelClass}>Criticidad</span>
                            <MultiUseSelect
                                theme="light"
                                options={criticalityOptions}
                                value={form.criticality_level}
                                onChange={(value) => handleChange('criticality_level', value)}
                                disabled={disabled || saving}
                                buttonClassName={financeSelectButtonClass}
                                listClassName={financeSelectListClass}
                                optionClassName={financeSelectOptionClass}
                            />
                        </label>

                        <label className="space-y-1 xl:col-span-3">
                            <span className={formLabelClass}>Horas</span>
                            <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={form.hours_spent}
                                onChange={(event) => handleChange('hours_spent', event.target.value)}
                                disabled={disabled || saving}
                                placeholder="Opcional"
                                className={formInputClass}
                            />
                        </label>
                    </div>

                    <div className="mt-2 grid gap-2 xl:grid-cols-12">
                        <label className="space-y-1 xl:col-span-3">
                            <span className={formLabelClass}>Override de puntos</span>
                            <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={form.points_override}
                                onChange={(event) => handleChange('points_override', event.target.value)}
                                disabled={disabled || saving}
                                placeholder="Opcional"
                                className={formInputClass}
                            />
                        </label>

                        <label className="space-y-1 xl:col-span-6">
                            <span className={formLabelClass}>Notas</span>
                            <input
                                type="text"
                                value={form.notes}
                                onChange={(event) => handleChange('notes', event.target.value)}
                                disabled={disabled || saving}
                                placeholder="Contexto opcional para auditar el cálculo"
                                className={formInputClass}
                            />
                        </label>

                        <div className="flex items-end xl:col-span-3">
                            <button
                                type="submit"
                                disabled={disabled || saving}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus size={15} />
                                {saving ? 'Guardando...' : 'Agregar work log'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="mt-4 grid gap-3.5 xl:grid-cols-[minmax(0,1.08fr),minmax(320px,0.92fr)]">
                <section className="rounded-[24px] border border-neutral-200 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Bitácora</p>
                            <h3 className="mt-1 text-lg font-bold text-neutral-900">Work logs del período</h3>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {logs.length === 0 && (
                            <div className="rounded-[18px] border border-dashed border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-500">
                                Todavía no hay trabajo registrado para este período.
                            </div>
                        )}

                        {logs.map((log) => {
                            const taskItems = getWorkLogTaskItems(log, taskTypeMap);
                            const taskNames = taskItems
                                .map((taskItem) => taskItem?.name)
                                .filter(Boolean);
                            const taskSummary = taskNames.length > 0
                                ? taskNames.join(' · ')
                                : (log.task_type?.name || taskTypeMap[log.task_type_id]?.name || log.task_name || 'Tarea');
                            const projectName = getProjectDisplayName(log.project || projectMap[log.project_id]);
                            const logProjectMetrics = getProjectValueMetrics(
                                log.project_id,
                                totalPeriodIncome,
                                projectIncomeById,
                                {
                                    projectRevenueContribution: log.project_revenue_contribution,
                                    projectValueMultiplier: log.project_value_multiplier,
                                },
                            );
                            const logProjectTone = getProjectValueTone(logProjectMetrics.projectValueMultiplier);

                            return (
                                <div key={log.id} className="rounded-[18px] border border-neutral-200 p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-neutral-900">
                                                {getPersonDisplayName(workerMap[log.worker_id])}
                                            </p>
                                            <p className="mt-1 text-sm text-neutral-500">
                                                {projectName}
                                                {' · '}
                                                {taskSummary}
                                            </p>
                                            {taskNames.length > 1 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {taskNames.map((taskName) => (
                                                        <span
                                                            key={`${log.id}-${taskName}`}
                                                            className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] leading-4 text-neutral-500"
                                                        >
                                                            {taskName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="mt-2 text-sm text-neutral-700">{log.task_description}</p>
                                            {log.notes && (
                                                <p className="mt-2 text-sm text-neutral-500">{log.notes}</p>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <div className="rounded-[16px] bg-neutral-100 px-2.5 py-2 text-right text-sm text-neutral-600">
                                                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Puntos</p>
                                                <p className="mt-1 font-semibold text-neutral-900">{Number(log.calculated_points || 0).toFixed(2)}</p>
                                            </div>
                                            {!isClosed && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    disabled={disabled || saving}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-[16px] border border-neutral-200 text-neutral-500 transition hover:border-rose-200 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-neutral-500">
                                        <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                                            Fecha: {log.worked_date}
                                        </span>
                                        <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                                            Criticidad: {log.criticality_level}
                                        </span>
                                        <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                                            Cantidad: {Number(log.quantity || 0).toFixed(2)}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${logProjectTone.badgeClass}`}
                                            title={getProjectValueTooltip({
                                                projectName,
                                                projectId: log.project_id,
                                                projectIncome: logProjectMetrics.projectIncome,
                                                totalPeriodIncome: logProjectMetrics.totalPeriodIncome,
                                                projectRevenueContribution: logProjectMetrics.projectRevenueContribution,
                                                projectValueMultiplier: logProjectMetrics.projectValueMultiplier,
                                                currency,
                                            })}
                                        >
                                            <Info size={12} />
                                            Valor proyecto: {formatMultiplier(logProjectMetrics.projectValueMultiplier)}
                                        </span>
                                        {log.hours_spent != null && (
                                            <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                                                Horas: {Number(log.hours_spent || 0).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-[24px] border border-neutral-200 p-3.5">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                            {isClosed ? 'Snapshot de compensación' : 'Preview de compensación'}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-neutral-900">
                            {isClosed ? 'Compensaciones generadas' : 'Cómo se repartiría hoy el pool'}
                        </h3>
                        <p className="mt-2 text-sm text-neutral-500">
                            {isClosed
                                ? 'Este bloque refleja el cálculo congelado al cerrar el período.'
                                : 'Se recalcula con los work logs aprobados, el seniority acumulado y el valor relativo de cada proyecto.'}
                        </p>
                    </div>

                    <div className="mt-4 rounded-[18px] border border-neutral-200 bg-neutral-50 p-3">
                        {leadingProject && totalPeriodIncome > 0 ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Proyecto con mayor peso</p>
                                    <p className="mt-1 font-semibold text-neutral-900">{leadingProject.projectName}</p>
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Aporta {formatContributionPct(leadingProject.projectRevenueContribution)} de los ingresos del período y empuja sus work logs a {formatMultiplier(leadingProject.projectValueMultiplier)}.
                                    </p>
                                </div>
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getProjectValueTone(leadingProject.projectValueMultiplier).badgeClass}`}>
                                    <TrendingUp size={12} />
                                    {formatFinanceCurrency(leadingProject.projectIncome, currency)}
                                </span>
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-500">
                                {projectDistribution.length > 0
                                    ? 'Todavía no hay ingresos en el período, así que ningún proyecto domina el cálculo y todos usan factor neutro x1.00.'
                                    : 'Todavía no hay proyectos con peso financiero registrado para este período.'}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 space-y-3">
                        {workerRows.length === 0 && (
                            <div className="rounded-[18px] border border-dashed border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-500">
                                {workersPoolAmount > 0
                                    ? 'Todavía no hay puntos aprobados. El pool workers ganado sigue en 0 y el remanente volvería al fondo empresa.'
                                    : 'El período aún no genera pool workers positivo.'}
                            </div>
                        )}

                        {workerRows.map((row) => {
                            const amount = Number(row.amount_earned || row.estimated_amount || 0);
                            const projectValueSummary = getWorkerProjectValueSummary(row, projectMap);
                            return (
                                <div key={row.worker_id} className="rounded-[18px] border border-neutral-200 bg-neutral-50 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-neutral-900">
                                                {getPersonDisplayName(workerMap[row.worker_id])}
                                            </p>
                                            <p className="mt-1 text-sm text-neutral-500">
                                                {row.months_worked} período(s) previos · {row.seniority_tier} · x{Number(row.multiplier_applied || 1).toFixed(2)}
                                            </p>
                                            {projectValueSummary && (
                                                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${getProjectValueTone(projectValueSummary.multiplier).badgeClass}`}>
                                                        Valor proyecto: {projectValueSummary.primaryLabel}
                                                    </span>
                                                    <span className="rounded-full bg-white px-2.5 py-1 text-neutral-500">
                                                        {projectValueSummary.secondaryLabel}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-lg font-black text-neutral-900">
                                            {formatFinanceCurrency(amount, currency)}
                                        </p>
                                    </div>

                                    <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Puntos ajustados</p>
                                            <p className="mt-1 font-semibold text-neutral-900">{Number(row.raw_points || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Puntos ponderados</p>
                                            <p className="mt-1 font-semibold text-neutral-900">{Number(row.weighted_points || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400">Participación</p>
                                            <p className="mt-1 font-semibold text-neutral-900">{Number(row.share_percentage || 0).toFixed(2)}%</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default WorkerWeightEditor;
