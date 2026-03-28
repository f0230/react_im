import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Settings2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const RECOMMENDED_SPLIT = {
    pct_francisco: 40,
    pct_federico: 30,
    pct_workers: 15,
    pct_company: 15,
};

const SettingsModal = ({ open, onClose, config, adminProfiles = [], onSaved }) => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        pct_francisco: '40',
        pct_federico: '30',
        pct_workers: '15',
        pct_company: '15',
        francisco_profile_id: '',
        federico_profile_id: '',
        default_currency: 'USD',
    });

    // Sync form when config prop changes
    useEffect(() => {
        if (config) {
            setForm({
                pct_francisco: String(config.pct_francisco ?? 40),
                pct_federico: String(config.pct_federico ?? 30),
                pct_workers: String(config.pct_workers ?? 15),
                pct_company: String(config.pct_company ?? 15),
                francisco_profile_id: config.francisco_profile_id || '',
                federico_profile_id: config.federico_profile_id || '',
                default_currency: config.default_currency || 'USD',
            });
        }
    }, [config]);

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
        if (onSaved) await onSaved();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-neutral-200 bg-white p-6 shadow-xl"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">Configuración financiera</p>
                            <h2 className="mt-3 text-2xl font-black tracking-tight">Reparto de ganancias</h2>
                            <p className="mt-2 text-sm text-neutral-500">
                                Ajustá los porcentajes y definí la moneda base de los cierres.
                            </p>
                        </div>

                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Recomendado: 40% Francisco, 30% Federico, 15% workers, 15% empresa.
                        </div>

                        {error && (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                <CheckCircle2 size={16} />
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="mt-6 space-y-6">
                            {/* Percentages */}
                            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="rounded-xl bg-neutral-100 p-2.5">
                                        <Settings2 size={16} className="text-neutral-700" />
                                    </div>
                                    <h3 className="text-lg font-black">Distribución base</h3>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {[
                                        { key: 'pct_francisco', label: 'Francisco' },
                                        { key: 'pct_federico', label: 'Federico' },
                                        { key: 'pct_workers', label: 'Pool workers' },
                                        { key: 'pct_company', label: 'Fondo empresa' },
                                    ].map(({ key, label }) => (
                                        <label key={key} className="space-y-2 text-sm font-medium text-neutral-700">
                                            {label}
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={form[key]}
                                                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* Assignments */}
                            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <h3 className="text-lg font-black mb-4">Fundadores y moneda</h3>

                                <div className="space-y-4">
                                    <label className="block space-y-2 text-sm font-medium text-neutral-700">
                                        Perfil de Francisco
                                        <select
                                            value={form.francisco_profile_id}
                                            onChange={(e) => setForm((prev) => ({ ...prev, francisco_profile_id: e.target.value }))}
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
                                            onChange={(e) => setForm((prev) => ({ ...prev, federico_profile_id: e.target.value }))}
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
                                            onChange={(e) => setForm((prev) => ({ ...prev, default_currency: e.target.value }))}
                                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="UYU">UYU</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                                    <p className="text-sm font-semibold text-neutral-900">Chequeo rápido</p>
                                    <p className={`mt-1 text-sm ${Math.round(totalPct * 100) / 100 === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        Total actual: {totalPct.toFixed(2)}%
                                    </p>
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
