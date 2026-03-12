import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Receipt, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { FINANCE_CATEGORY_OPTIONS, getProjectDisplayName } from '@/utils/finance';

const getEmptyForm = (defaultType = 'income') => ({
    type: defaultType,
    amount: '',
    currency: 'USD',
    description: '',
    category: FINANCE_CATEGORY_OPTIONS[defaultType]?.[0]?.value || '',
    transaction_date: new Date().toISOString().slice(0, 10),
    project_id: '',
    invoice_id: '',
    period_id: '',
    paid_to: '',
    notes: '',
});

const TransactionModal = ({
    open,
    onClose,
    onSaved,
    periods = [],
    projects = [],
    invoices = [],
    initialValues = null,
    defaultType = 'income',
}) => {
    const { user } = useAuth();
    const [form, setForm] = useState(getEmptyForm(defaultType));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;

        if (initialValues?.id) {
            setForm({
                type: initialValues.type || defaultType,
                amount: initialValues.amount?.toString() || '',
                currency: initialValues.currency || 'USD',
                description: initialValues.description || '',
                category: initialValues.category || FINANCE_CATEGORY_OPTIONS[initialValues.type || defaultType]?.[0]?.value || '',
                transaction_date: initialValues.transaction_date || new Date().toISOString().slice(0, 10),
                project_id: initialValues.project_id || '',
                invoice_id: initialValues.invoice_id || '',
                period_id: initialValues.period_id || '',
                paid_to: initialValues.paid_to || '',
                notes: initialValues.notes || '',
            });
        } else {
            setForm(getEmptyForm(defaultType));
        }

        setError('');
    }, [defaultType, initialValues, open]);

    const categoryOptions = useMemo(
        () => FINANCE_CATEGORY_OPTIONS[form.type] || [],
        [form.type]
    );

    const filteredInvoices = useMemo(() => {
        if (!form.project_id) return invoices;
        return invoices.filter((invoice) => invoice.project_id === form.project_id);
    }, [form.project_id, invoices]);

    const handleChange = (field, value) => {
        setForm((prev) => {
            if (field === 'type') {
                return {
                    ...prev,
                    type: value,
                    category: FINANCE_CATEGORY_OPTIONS[value]?.[0]?.value || '',
                };
            }

            return { ...prev, [field]: value };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Ingresá un monto válido mayor a 0.');
            return;
        }

        if (!form.category) {
            setError('Seleccioná una categoría.');
            return;
        }

        const payload = {
            type: form.type,
            amount,
            currency: form.currency || 'USD',
            description: form.description?.trim() || null,
            category: form.category,
            transaction_date: form.transaction_date,
            project_id: form.project_id || null,
            invoice_id: form.invoice_id || null,
            period_id: form.period_id || null,
            paid_to: form.type === 'expense' ? form.paid_to?.trim() || null : null,
            notes: form.notes?.trim() || null,
        };

        setSaving(true);
        setError('');

        let query = supabase.from('finance_transactions');
        if (initialValues?.id) {
            query = query.update(payload).eq('id', initialValues.id);
        } else {
            query = query.insert([{ ...payload, created_by: user?.id || null }]);
        }

        const { error: saveError } = await query;

        if (saveError) {
            console.error('Error saving finance transaction:', saveError);
            setError(saveError.message || 'No pudimos guardar la transacción.');
            setSaving(false);
            return;
        }

        setSaving(false);
        if (onSaved) await onSaved();
        if (onClose) onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm px-4 py-6 overflow-y-auto"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        className="mx-auto w-full max-w-3xl rounded-[32px] bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                                    Libro contable
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-neutral-900">
                                    {initialValues?.id
                                        ? 'Editar movimiento'
                                        : form.type === 'income'
                                            ? 'Ingreso extra (no facturación)'
                                            : 'Nuevo gasto'}
                                </h2>
                                {!initialValues?.id && form.type === 'income' && (
                                    <p className="mt-1 text-sm text-neutral-500">
                                        Los cobros de facturas se registran solos. Usá esto para ingresos externos: inversiones, aportes de capital u otros.
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
                            {error && (
                                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Tipo
                                    <select
                                        value={form.type}
                                        onChange={(event) => handleChange('type', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    >
                                        <option value="income">Ingreso</option>
                                        <option value="expense">Gasto</option>
                                    </select>
                                </label>

                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Categoría
                                    <select
                                        value={form.category}
                                        onChange={(event) => handleChange('category', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    >
                                        {categoryOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Monto
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(event) => handleChange('amount', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                        placeholder="0.00"
                                    />
                                </label>

                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Moneda
                                    <select
                                        value={form.currency}
                                        onChange={(event) => handleChange('currency', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="UYU">UYU</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </label>

                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Fecha
                                    <input
                                        type="date"
                                        value={form.transaction_date}
                                        onChange={(event) => handleChange('transaction_date', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Proyecto asociado
                                    <select
                                        value={form.project_id}
                                        onChange={(event) => handleChange('project_id', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    >
                                        <option value="">Sin proyecto</option>
                                        {projects.map((project) => (
                                            <option key={project.id} value={project.id}>
                                                {getProjectDisplayName(project)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Factura asociada
                                    <select
                                        value={form.invoice_id}
                                        onChange={(event) => handleChange('invoice_id', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    >
                                        <option value="">Sin factura</option>
                                        {filteredInvoices.map((invoice) => (
                                            <option key={invoice.id} value={invoice.id}>
                                                {invoice.invoice_number || invoice.description || invoice.id}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Período contable
                                    <select
                                        value={form.period_id}
                                        onChange={(event) => handleChange('period_id', event.target.value)}
                                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    >
                                        <option value="">Sin período</option>
                                        {periods.map((period) => (
                                            <option key={period.id} value={period.id}>
                                                {period.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {form.type === 'expense' ? (
                                    <label className="space-y-2 text-sm font-medium text-neutral-700">
                                        Pagado a
                                        <input
                                            type="text"
                                            value={form.paid_to}
                                            onChange={(event) => handleChange('paid_to', event.target.value)}
                                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                            placeholder="Proveedor, worker, herramienta..."
                                        />
                                    </label>
                                ) : (
                                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                                        Podés vincular este ingreso a un proyecto o una factura para mantener trazabilidad.
                                    </div>
                                )}
                            </div>

                            <label className="space-y-2 text-sm font-medium text-neutral-700">
                                Descripción
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(event) => handleChange('description', event.target.value)}
                                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    placeholder="Ej. Pago parcial del proyecto rebranding"
                                />
                            </label>

                            <label className="space-y-2 text-sm font-medium text-neutral-700">
                                Notas
                                <textarea
                                    rows={4}
                                    value={form.notes}
                                    onChange={(event) => handleChange('notes', event.target.value)}
                                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-neutral-400"
                                    placeholder="Detalle interno, aclaraciones, referencia bancaria..."
                                />
                            </label>

                            <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2 text-sm text-neutral-500">
                                    <Receipt size={15} />
                                    <span>Este módulo solo registra movimientos manuales, no procesa pagos.</span>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Save size={15} />
                                        {saving ? 'Guardando...' : 'Guardar movimiento'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TransactionModal;
