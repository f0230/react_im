import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Receipt, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MultiUseSelect from '@/components/MultiUseSelect';
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
    funding_source: 'external',
    paid_to: '',
    notes: '',
});

const financeSelectButtonClass = 'rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm hover:border-neutral-300';
const financeSelectListClass = 'border border-neutral-200 bg-white text-neutral-900';

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
                funding_source: initialValues.funding_source || 'external',
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

    const typeOptions = useMemo(() => ([
        { value: 'income', label: 'Ingreso' },
        { value: 'expense', label: 'Gasto' },
    ]), []);

    const currencyOptions = useMemo(() => ([
        { value: 'USD', label: 'USD' },
        { value: 'UYU', label: 'UYU' },
        { value: 'EUR', label: 'EUR' },
    ]), []);

    const projectOptions = useMemo(() => ([
        { value: '', label: 'Sin proyecto' },
        ...projects.map((project) => ({
            value: project.id,
            label: getProjectDisplayName(project),
            searchText: `${project.name || ''} ${project.title || ''}`,
        })),
    ]), [projects]);

    const invoiceOptions = useMemo(() => ([
        { value: '', label: 'Sin factura' },
        ...filteredInvoices.map((invoice) => ({
            value: invoice.id,
            label: invoice.invoice_number || invoice.description || invoice.id,
            searchText: `${invoice.invoice_number || ''} ${invoice.description || ''}`,
        })),
    ]), [filteredInvoices]);

    const periodOptions = useMemo(() => ([
        { value: '', label: 'Sin período' },
        ...periods.map((period) => ({
            value: period.id,
            label: period.name,
        })),
    ]), [periods]);

    const fundingSourceOptions = useMemo(() => ([
        { value: 'external', label: 'Caja externa / fuera del fondo' },
        { value: 'company_fund', label: 'Consumir fondo empresa' },
    ]), []);

    const handleChange = (field, value) => {
        setForm((prev) => {
            if (field === 'type') {
                return {
                    ...prev,
                    type: value,
                    category: FINANCE_CATEGORY_OPTIONS[value]?.[0]?.value || '',
                    funding_source: value === 'expense' ? prev.funding_source : 'external',
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
            funding_source: form.type === 'expense' ? form.funding_source || 'external' : 'external',
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
                                    <MultiUseSelect
                                        theme="light"
                                        options={typeOptions}
                                        value={form.type}
                                        onChange={(value) => handleChange('type', value)}
                                        buttonClassName={financeSelectButtonClass}
                                        listClassName={financeSelectListClass}
                                    />
                                </label>

                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Categoría
                                    <MultiUseSelect
                                        theme="light"
                                        options={categoryOptions}
                                        value={form.category}
                                        onChange={(value) => handleChange('category', value)}
                                        buttonClassName={financeSelectButtonClass}
                                        listClassName={financeSelectListClass}
                                    />
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
                                    <MultiUseSelect
                                        theme="light"
                                        options={currencyOptions}
                                        value={form.currency}
                                        onChange={(value) => handleChange('currency', value)}
                                        buttonClassName={financeSelectButtonClass}
                                        listClassName={financeSelectListClass}
                                    />
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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-700">Proyecto asociado</label>
                                    <MultiUseSelect
                                        theme="light"
                                        options={projectOptions}
                                        value={form.project_id}
                                        onChange={(value) => handleChange('project_id', value)}
                                        placeholder="Seleccionar proyecto..."
                                        searchable
                                        searchPlaceholder="Buscar proyecto..."
                                        emptyMessage="No se encontraron proyectos."
                                        buttonClassName={financeSelectButtonClass}
                                        listClassName={financeSelectListClass}
                                    />
                                </div>

                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Factura asociada
                                    <MultiUseSelect
                                        theme="light"
                                        options={invoiceOptions}
                                        value={form.invoice_id}
                                        onChange={(value) => handleChange('invoice_id', value)}
                                        placeholder="Sin factura"
                                        searchable
                                        searchPlaceholder="Buscar factura..."
                                        emptyMessage="No encontramos facturas para este proyecto."
                                        buttonClassName={financeSelectButtonClass}
                                        listClassName={financeSelectListClass}
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-medium text-neutral-700">
                                    Período contable
                                    <MultiUseSelect
                                        theme="light"
                                        options={periodOptions}
                                        value={form.period_id}
                                        onChange={(value) => handleChange('period_id', value)}
                                        placeholder="Sin período"
                                        buttonClassName={financeSelectButtonClass}
                                        listClassName={financeSelectListClass}
                                    />
                                </label>

                                {form.type === 'expense' ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="space-y-2 text-sm font-medium text-neutral-700">
                                            Fuente del gasto
                                            <MultiUseSelect
                                                theme="light"
                                                options={fundingSourceOptions}
                                                value={form.funding_source}
                                                onChange={(value) => handleChange('funding_source', value)}
                                                buttonClassName={financeSelectButtonClass}
                                                listClassName={financeSelectListClass}
                                            />
                                        </label>

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
                                    </div>
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
                                    <span>
                                        {form.type === 'expense' && form.funding_source === 'company_fund'
                                            ? 'Si usás fondo empresa, el saldo operativo se descuenta automáticamente.'
                                            : 'Este módulo solo registra movimientos manuales, no procesa pagos.'}
                                    </span>
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
