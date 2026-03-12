import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const RECOMMENDED_SPLIT = {
    pct_francisco: 40,
    pct_federico: 30,
    pct_workers: 15,
    pct_company: 15,
};

const FinancesSettings = () => {
    const { profile, user, loading } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [config, setConfig] = useState(null);
    const [adminProfiles, setAdminProfiles] = useState([]);
    const [form, setForm] = useState({
        pct_francisco: '40',
        pct_federico: '30',
        pct_workers: '15',
        pct_company: '15',
        francisco_profile_id: '',
        federico_profile_id: '',
        default_currency: 'USD',
    });

    const isAdmin = profile?.role === 'admin';

    const fetchSettings = useCallback(async () => {
        setFetching(true);
        setError('');

        const [
            { data: configData, error: configError },
            { data: adminsData, error: adminsError },
        ] = await Promise.all([
            supabase.from('finance_config').select('*').limit(1).maybeSingle(),
            supabase.from('profiles').select('id, full_name, email').eq('role', 'admin').order('full_name', { ascending: true }),
        ]);

        if (configError || adminsError) {
            const message = configError?.message || adminsError?.message;
            console.error('Error fetching finance settings:', { configError, adminsError });
            setError(message || 'No pudimos cargar la configuración.');
            setFetching(false);
            return;
        }

        setConfig(configData || null);
        setAdminProfiles(adminsData || []);

        if (configData) {
            setForm({
                pct_francisco: String(configData.pct_francisco ?? 40),
                pct_federico: String(configData.pct_federico ?? 30),
                pct_workers: String(configData.pct_workers ?? 15),
                pct_company: String(configData.pct_company ?? 15),
                francisco_profile_id: configData.francisco_profile_id || '',
                federico_profile_id: configData.federico_profile_id || '',
                default_currency: configData.default_currency || 'USD',
            });
        }

        setFetching(false);
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchSettings();
    }, [fetchSettings, isAdmin]);

    const totalPct = useMemo(() => (
        ['pct_francisco', 'pct_federico', 'pct_workers', 'pct_company']
            .reduce((sum, key) => sum + Number(form[key] || 0), 0)
    ), [form]);

    const handleSave = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        if (Math.round(totalPct * 100) / 100 !== 100) {
            setError('Los porcentajes deben sumar exactamente 100%.');
            setSaving(false);
            return;
        }

        const payload = {
            pct_francisco: Number(form.pct_francisco || 0),
            pct_federico: Number(form.pct_federico || 0),
            pct_workers: Number(form.pct_workers || 0),
            pct_company: Number(form.pct_company || 0),
            francisco_profile_id: form.francisco_profile_id || null,
            federico_profile_id: form.federico_profile_id || null,
            default_currency: form.default_currency || 'USD',
            updated_by: user?.id || null,
            updated_at: new Date().toISOString(),
        };

        let query = supabase.from('finance_config');
        if (config?.id) {
            query = query.update(payload).eq('id', config.id);
        } else {
            query = query.insert([payload]);
        }

        const { error: saveError } = await query;

        if (saveError) {
            console.error('Error saving finance settings:', saveError);
            setError(saveError.message || 'No pudimos guardar la configuración.');
            setSaving(false);
            return;
        }

        setSaving(false);
        setSuccess('Configuración guardada correctamente.');
        await fetchSettings();
    };

    if (loading || (isAdmin && fetching)) {
        return <LoadingFallback type="spinner" />;
    }

    if (!loading && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="pb-16 font-product text-neutral-900">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Configuración financiera</p>
                    <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Reparto de ganancias</h1>
                    <p className="mt-3 max-w-3xl text-lg text-neutral-500">
                        Elegí quién representa a Francisco y Federico en la base, ajustá los porcentajes y definí la moneda base de los cierres.
                    </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Recomendado: 40% Francisco, 30% Federico, 15% workers, 15% empresa.
                </div>
            </div>

            {error && (
                <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
                    {error}
                </div>
            )}

            {success && (
                <div className="mt-6 flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    {success}
                </div>
            )}

            <form onSubmit={handleSave} className="mt-8 grid gap-6 xl:grid-cols-[1fr,0.9fr]">
                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-neutral-100 p-3">
                            <Settings2 size={18} className="text-neutral-700" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Porcentajes</p>
                            <h2 className="mt-1 text-2xl font-black">Distribución base</h2>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-neutral-700">
                            Francisco
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.pct_francisco}
                                onChange={(event) => setForm((prev) => ({ ...prev, pct_francisco: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-neutral-700">
                            Federico
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.pct_federico}
                                onChange={(event) => setForm((prev) => ({ ...prev, pct_federico: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-neutral-700">
                            Pool workers
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.pct_workers}
                                onChange={(event) => setForm((prev) => ({ ...prev, pct_workers: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-neutral-700">
                            Fondo empresa
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.pct_company}
                                onChange={(event) => setForm((prev) => ({ ...prev, pct_company: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            />
                        </label>
                    </div>
                </section>

                <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Asignaciones</p>
                    <h2 className="mt-2 text-2xl font-black">Fundadores y moneda</h2>

                    <div className="mt-6 space-y-4">
                        <label className="block space-y-2 text-sm font-medium text-neutral-700">
                            Perfil de Francisco
                            <select
                                value={form.francisco_profile_id}
                                onChange={(event) => setForm((prev) => ({ ...prev, francisco_profile_id: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            >
                                <option value="">Seleccionar admin</option>
                                {adminProfiles.map((admin) => (
                                    <option key={admin.id} value={admin.id}>
                                        {admin.full_name || admin.email}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block space-y-2 text-sm font-medium text-neutral-700">
                            Perfil de Federico
                            <select
                                value={form.federico_profile_id}
                                onChange={(event) => setForm((prev) => ({ ...prev, federico_profile_id: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            >
                                <option value="">Seleccionar admin</option>
                                {adminProfiles.map((admin) => (
                                    <option key={admin.id} value={admin.id}>
                                        {admin.full_name || admin.email}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block space-y-2 text-sm font-medium text-neutral-700">
                            Moneda base
                            <select
                                value={form.default_currency}
                                onChange={(event) => setForm((prev) => ({ ...prev, default_currency: event.target.value }))}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                            >
                                <option value="USD">USD</option>
                                <option value="UYU">UYU</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-6 rounded-3xl bg-neutral-50 p-5">
                        <p className="text-sm font-semibold text-neutral-900">Chequeo rápido</p>
                        <p className={`mt-2 text-sm ${Math.round(totalPct * 100) / 100 === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            Total actual: {totalPct.toFixed(2)}%
                        </p>
                        <p className="mt-3 text-sm text-neutral-500">
                            Esta distribución se usa al momento de cerrar un período. Si la cambiás después, no modifica cierres ya calculados.
                        </p>
                    </div>
                </section>

                <div className="xl:col-span-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
                    <div>
                        <p className="text-sm font-semibold text-neutral-900">Recomendación inicial</p>
                        <p className="mt-2 text-sm text-neutral-500">
                            La propuesta actual prioriza el peso operativo de Francisco, sostiene la dirección visual de Federico, deja un incentivo claro para workers y mantiene caja para reinversión.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setForm({
                                ...form,
                                pct_francisco: String(RECOMMENDED_SPLIT.pct_francisco),
                                pct_federico: String(RECOMMENDED_SPLIT.pct_federico),
                                pct_workers: String(RECOMMENDED_SPLIT.pct_workers),
                                pct_company: String(RECOMMENDED_SPLIT.pct_company),
                            })}
                            className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                        >
                            Usar recomendado
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? 'Guardando...' : 'Guardar configuración'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default FinancesSettings;
