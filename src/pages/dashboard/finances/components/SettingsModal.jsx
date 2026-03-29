import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Settings2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MultiUseSelect from '@/components/MultiUseSelect';

const RECOMMENDED_SPLIT = {
    pct_francisco: 40,
    pct_federico: 30,
    pct_workers: 15,
    pct_company: 15,
};

const financeSelectButtonClass = 'rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm hover:border-neutral-300';
const financeSelectListClass = 'border border-neutral-200 bg-white text-neutral-900';

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
        workers_target_weighted_points: '100',
        company_fund_release_enabled: false,
        company_fund_reserve_floor: '0',
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
                workers_target_weighted_points: String(config.workers_target_weighted_points ?? 100),
                company_fund_release_enabled: Boolean(config.company_fund_release_enabled ?? false),
                company_fund_reserve_floor: String(config.company_fund_reserve_floor ?? 0),
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

    const adminOptions = useMemo(() => ([
        { value: '', label: 'Seleccionar admin' },
        ...adminProfiles.map((admin) => ({
            value: admin.id,
            label: admin.full_name || admin.email,
        })),
    ]), [adminProfiles]);

    const currencyOptions = useMemo(() => ([
        { value: 'USD', label: 'USD' },
        { value: 'UYU', label: 'UYU' },
        { value: 'EUR', label: 'EUR' },
    ]), []);

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
            workers_target_weighted_points: Number(form.workers_target_weighted_points || 100),
            company_fund_release_enabled: Boolean(form.company_fund_release_enabled),
            company_fund_reserve_floor: Number(form.company_fund_reserve_floor || 0),
            francisco_profile_id: form.francisco_profile_id || null,
            federico_profile_id: form.federico_profile_id || null,
            default_currency: form.default_currency || 'USD',
            updated_by: user?.id || null,
            updated_at: new Date().toISOString(),
        };

        if (payload.workers_target_weighted_points <= 0) {
            setError('El target de puntos ponderados debe ser mayor a 0.');
            setSaving(false);
            return;
        }

        if (payload.company_fund_reserve_floor < 0) {
            setError('El colchón del fondo empresa no puede ser negativo.');
            setSaving(false);
            return;
        }

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

                            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <h3 className="text-lg font-black">Activación del pool workers</h3>
                                <p className="mt-2 text-sm text-neutral-500">
                                    El porcentaje workers ahora funciona como techo. El 100% de ese pool solo se habilita cuando el período alcanza este target de puntos ponderados.
                                </p>

                                <div className="mt-4 grid gap-4 md:grid-cols-[220px,1fr]">
                                    <label className="space-y-2 text-sm font-medium text-neutral-700">
                                        Target puntos ponderados
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={form.workers_target_weighted_points}
                                            onChange={(e) => setForm((prev) => ({ ...prev, workers_target_weighted_points: e.target.value }))}
                                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400"
                                        />
                                    </label>

                                    <div className="rounded-2xl bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                                        Ejemplo: si el pool máximo workers del período es 15% y el target es 100 puntos,
                                        entonces con 25 puntos ponderados se habilita 25% del pool, con 100 o más se habilita el 100%.
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <h3 className="text-lg font-black">Reinversión del fondo empresa</h3>
                                <p className="mt-2 text-sm text-neutral-500">
                                    Si activás esta política, el excedente acumulado del fondo empresa por encima del colchón protegido se libera automáticamente como bonus extraordinario en el cierre del período.
                                </p>

                                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={form.company_fund_release_enabled}
                                        onChange={(e) => setForm((prev) => ({ ...prev, company_fund_release_enabled: e.target.checked }))}
                                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-900">Activar liberación automática del excedente</p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            La liberación sale del saldo acumulado que entra al período, no del resultado nuevo del mismo período. Se registra separado en snapshot, ledger y compensaciones.
                                        </p>
                                    </div>
                                </label>

                                <div className="mt-4 grid gap-4 md:grid-cols-[220px,1fr]">
                                    <label className="space-y-2 text-sm font-medium text-neutral-700">
                                        Colchón mínimo del fondo
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.company_fund_reserve_floor}
                                            onChange={(e) => setForm((prev) => ({ ...prev, company_fund_reserve_floor: e.target.value }))}
                                            disabled={!form.company_fund_release_enabled}
                                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100"
                                        />
                                    </label>

                                    <div className="rounded-2xl bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                                        Ejemplo: si el fondo llega con `US$ 1.200` y el colchón es `US$ 800`, el sistema puede liberar `US$ 400`.
                                        Ese bonus extraordinario se reparte por fuera del pool normal: admins según su split y workers según los weighted points del período.
                                    </div>
                                </div>
                            </section>

                            {/* Assignments */}
                            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <h3 className="text-lg font-black mb-4">Fundadores y moneda</h3>

                                <div className="space-y-4">
                                    <label className="block space-y-2 text-sm font-medium text-neutral-700">
                                        Perfil de Francisco
                                        <MultiUseSelect
                                            theme="light"
                                            options={adminOptions}
                                            value={form.francisco_profile_id}
                                            onChange={(value) => setForm((prev) => ({ ...prev, francisco_profile_id: value }))}
                                            placeholder="Seleccionar admin"
                                            searchable
                                            searchPlaceholder="Buscar admin..."
                                            buttonClassName={financeSelectButtonClass}
                                            listClassName={financeSelectListClass}
                                        />
                                    </label>

                                    <label className="block space-y-2 text-sm font-medium text-neutral-700">
                                        Perfil de Federico
                                        <MultiUseSelect
                                            theme="light"
                                            options={adminOptions}
                                            value={form.federico_profile_id}
                                            onChange={(value) => setForm((prev) => ({ ...prev, federico_profile_id: value }))}
                                            placeholder="Seleccionar admin"
                                            searchable
                                            searchPlaceholder="Buscar admin..."
                                            buttonClassName={financeSelectButtonClass}
                                            listClassName={financeSelectListClass}
                                        />
                                    </label>

                                    <label className="block space-y-2 text-sm font-medium text-neutral-700">
                                        Moneda base
                                        <MultiUseSelect
                                            theme="light"
                                            options={currencyOptions}
                                            value={form.default_currency}
                                            onChange={(value) => setForm((prev) => ({ ...prev, default_currency: value }))}
                                            placeholder="Seleccionar moneda"
                                            buttonClassName={financeSelectButtonClass}
                                            listClassName={financeSelectListClass}
                                        />
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
