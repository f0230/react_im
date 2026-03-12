import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getPersonDisplayName, getProjectDisplayName } from '@/utils/finance';

const getDraftKey = (projectId, workerId) => `${projectId}:${workerId}`;

const WorkerWeightEditor = ({ periodId, disabled = false, onSaved }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [projectBlocks, setProjectBlocks] = useState([]);
    const [draftWeights, setDraftWeights] = useState({});

    const fetchData = useCallback(async () => {
        if (!periodId) return;

        setLoading(true);
        setError('');

        const [
            { data: projectsData, error: projectsError },
            { data: assignmentsData, error: assignmentsError },
            { data: workersData, error: workersError },
            { data: contributionsData, error: contributionsError },
        ] = await Promise.all([
            supabase.from('projects').select('id, name').order('created_at', { ascending: false }),
            supabase.from('project_assignments').select('project_id, worker_id'),
            supabase.from('profiles').select('id, full_name, email, avatar_url').eq('role', 'worker').order('full_name', { ascending: true }),
            supabase.from('finance_worker_contributions').select('project_id, worker_id, contribution_weight').eq('period_id', periodId),
        ]);

        if (projectsError || assignmentsError || workersError || contributionsError) {
            const message = projectsError?.message || assignmentsError?.message || workersError?.message || contributionsError?.message;
            console.error('Error fetching worker contribution data:', { projectsError, assignmentsError, workersError, contributionsError });
            setError(message || 'No pudimos cargar las contribuciones.');
            setLoading(false);
            return;
        }

        const workerMap = new Map((workersData || []).map((worker) => [worker.id, worker]));
        const contributionsMap = new Map(
            (contributionsData || []).map((row) => [getDraftKey(row.project_id, row.worker_id), row.contribution_weight?.toString() || '0'])
        );

        const assignmentsByProject = (assignmentsData || []).reduce((acc, assignment) => {
            if (!workerMap.has(assignment.worker_id)) return acc;
            if (!acc[assignment.project_id]) acc[assignment.project_id] = [];
            acc[assignment.project_id].push(workerMap.get(assignment.worker_id));
            return acc;
        }, {});

        const blocks = (projectsData || [])
            .map((project) => ({
                ...project,
                workers: (assignmentsByProject[project.id] || []).filter(Boolean),
            }))
            .filter((project) => project.workers.length > 0);

        const initialDrafts = {};
        blocks.forEach((project) => {
            project.workers.forEach((worker) => {
                const key = getDraftKey(project.id, worker.id);
                initialDrafts[key] = contributionsMap.get(key) || '0';
            });
        });

        setProjectBlocks(blocks);
        setDraftWeights(initialDrafts);
        setLoading(false);
    }, [periodId]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const totalWeight = useMemo(() => (
        Object.values(draftWeights).reduce((sum, value) => sum + (Number(value) || 0), 0)
    ), [draftWeights]);

    const handleSave = async () => {
        setSaving(true);
        setError('');

        const rows = Object.entries(draftWeights)
            .map(([key, value]) => {
                const [projectId, workerId] = key.split(':');
                return {
                    period_id: periodId,
                    project_id: projectId,
                    worker_id: workerId,
                    contribution_weight: Number(value || 0),
                };
            })
            .filter((row) => Number.isFinite(row.contribution_weight) && row.contribution_weight > 0);

        const { error: deleteError } = await supabase
            .from('finance_worker_contributions')
            .delete()
            .eq('period_id', periodId);

        if (deleteError) {
            console.error('Error clearing worker contributions:', deleteError);
            setError(deleteError.message || 'No pudimos actualizar las contribuciones.');
            setSaving(false);
            return;
        }

        if (rows.length > 0) {
            const { error: insertError } = await supabase
                .from('finance_worker_contributions')
                .insert(rows);

            if (insertError) {
                console.error('Error saving worker contributions:', insertError);
                setError(insertError.message || 'No pudimos guardar las contribuciones.');
                setSaving(false);
                return;
            }
        }

        setSaving(false);
        if (onSaved) await onSaved();
    };

    if (loading) {
        return (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-neutral-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cargando weights de workers...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Workers pool</p>
                    <h2 className="mt-2 text-2xl font-black text-neutral-900">Pesos de contribución</h2>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-500">
                        Asigná cuánto aportó cada worker en este período. El sistema distribuye el pool proporcionalmente al total de weight asignado.
                    </p>
                </div>
                <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
                    Weight total del período: <span className="font-semibold text-neutral-900">{totalWeight.toFixed(2)}</span>
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                </div>
            )}

            <div className="mt-6 space-y-4">
                {projectBlocks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                        No hay workers asignados a proyectos todavía.
                    </div>
                )}

                {projectBlocks.map((project) => (
                    <div key={project.id} className="rounded-2xl border border-neutral-200 p-4">
                        <div className="mb-4">
                            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Proyecto</p>
                            <h3 className="mt-1 text-lg font-bold text-neutral-900">{getProjectDisplayName(project)}</h3>
                        </div>

                        <div className="space-y-3">
                            {project.workers.map((worker) => {
                                const draftKey = getDraftKey(project.id, worker.id);
                                return (
                                    <div key={draftKey} className="grid gap-3 rounded-2xl bg-neutral-50 p-3 md:grid-cols-[1fr,180px] md:items-center">
                                        <div>
                                            <p className="font-semibold text-neutral-900">{getPersonDisplayName(worker)}</p>
                                            <p className="text-sm text-neutral-500">Worker asignado a este proyecto</p>
                                        </div>
                                        <label className="space-y-2">
                                            <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Weight</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.50"
                                                disabled={disabled}
                                                value={draftWeights[draftKey] || '0'}
                                                onChange={(event) => setDraftWeights((prev) => ({ ...prev, [draftKey]: event.target.value }))}
                                                className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100"
                                            />
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Save size={15} />
                    {saving ? 'Guardando...' : 'Guardar weights'}
                </button>
            </div>
        </div>
    );
};

export default WorkerWeightEditor;
