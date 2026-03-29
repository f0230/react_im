import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Receipt, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MultiUseSelect from '@/components/MultiUseSelect';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

const selectButtonClass = 'h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-none hover:border-neutral-300';
const selectListClass = 'border border-neutral-200 bg-white text-neutral-900 text-sm';
const fieldClass = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400';
const textareaClass = 'min-h-[88px] w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400';

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
        setError('');
        if (!initialValues?.id) {
            setForm(getEmptyForm(defaultType));
            return;
        }
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
    }, [defaultType, initialValues, open]);

    const handleChange = (field, value) => {
        setForm((prev) => (
            field === 'type'
                ? {
                    ...prev,
                    type: value,
                    category: FINANCE_CATEGORY_OPTIONS[value]?.[0]?.value || '',
                    funding_source: value === 'expense' ? prev.funding_source : 'external',
                }
                : { ...prev, [field]: value }
        ));
    };

    const categoryOptions = useMemo(() => FINANCE_CATEGORY_OPTIONS[form.type] || [], [form.type]);
    const filteredInvoices = useMemo(
        () => (form.project_id ? invoices.filter((invoice) => invoice.project_id === form.project_id) : invoices),
        [form.project_id, invoices],
    );
    const typeOptions = useMemo(() => ([
        { value: 'income', label: 'Ingreso' },
        { value: 'expense', label: 'Gasto' },
    ]), []);
    const currencyOptions = useMemo(() => ([
        { value: 'USD', label: 'USD' },
        { value: 'UYU', label: 'UYU' },
        { value: 'EUR', label: 'EUR' },
    ]), []);
    const periodOptions = useMemo(() => ([
        { value: '', label: 'Sin período' },
        ...periods.map((period) => ({ value: period.id, label: period.name })),
    ]), [periods]);
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
    const fundingSourceOptions = useMemo(() => ([
        { value: 'external', label: 'Caja externa / fuera del fondo' },
        { value: 'company_fund', label: 'Consumir fondo empresa' },
    ]), []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) return setError('Ingresá un monto válido mayor a 0.');
        if (!form.category) return setError('Seleccioná una categoría.');

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
        query = initialValues?.id
            ? query.update(payload).eq('id', initialValues.id)
            : query.insert([{ ...payload, created_by: user?.id || null }]);

        const { error: saveError } = await query;
        if (saveError) {
            setSaving(false);
            return setError(saveError.message || 'No pudimos guardar la transacción.');
        }

        setSaving(false);
        await onSaved?.();
        onClose?.();
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
            <DialogContent className="max-w-[42rem]">
                <DialogHeader>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">Libro financiero</p>
                    <DialogTitle>
                        {initialValues?.id ? 'Editar movimiento' : 'Registrar movimiento'}
                    </DialogTitle>
                    <DialogDescription>
                        {form.type === 'income'
                            ? 'Los cobros de facturas se registran solos. Usá este formulario para ingresos manuales o aportes extraordinarios.'
                            : 'Registrá gastos, asociá proyecto o período y definí si salen del fondo empresa.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Tipo
                            <MultiUseSelect theme="light" options={typeOptions} value={form.type} onChange={(value) => handleChange('type', value)} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Categoría
                            <MultiUseSelect theme="light" options={categoryOptions} value={form.category} onChange={(value) => handleChange('category', value)} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Monto
                            <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => handleChange('amount', event.target.value)} className={fieldClass} placeholder="0.00" />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Moneda
                            <MultiUseSelect theme="light" options={currencyOptions} value={form.currency} onChange={(value) => handleChange('currency', value)} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Fecha
                            <input type="date" value={form.transaction_date} onChange={(event) => handleChange('transaction_date', event.target.value)} className={fieldClass} />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Proyecto asociado
                            <MultiUseSelect theme="light" options={projectOptions} value={form.project_id} onChange={(value) => handleChange('project_id', value)} searchable searchPlaceholder="Buscar proyecto..." emptyMessage="No se encontraron proyectos." buttonClassName={selectButtonClass} listClassName={selectListClass} />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Factura asociada
                            <MultiUseSelect theme="light" options={invoiceOptions} value={form.invoice_id} onChange={(value) => handleChange('invoice_id', value)} searchable searchPlaceholder="Buscar factura..." emptyMessage="No encontramos facturas para este proyecto." buttonClassName={selectButtonClass} listClassName={selectListClass} />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                            Período contable
                            <MultiUseSelect theme="light" options={periodOptions} value={form.period_id} onChange={(value) => handleChange('period_id', value)} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                        </label>
                        {form.type === 'expense' ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                                    Fuente
                                    <MultiUseSelect theme="light" options={fundingSourceOptions} value={form.funding_source} onChange={(value) => handleChange('funding_source', value)} buttonClassName={selectButtonClass} listClassName={selectListClass} />
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                                    Pagado a
                                    <input type="text" value={form.paid_to} onChange={(event) => handleChange('paid_to', event.target.value)} className={fieldClass} placeholder="Proveedor, worker..." />
                                </label>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                                Podés vincular este ingreso a un proyecto o factura para mantener trazabilidad.
                            </div>
                        )}
                    </div>

                    <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                        Descripción
                        <input type="text" value={form.description} onChange={(event) => handleChange('description', event.target.value)} className={fieldClass} placeholder="Ej. Pago parcial del proyecto rebranding" />
                    </label>

                    <label className="space-y-1.5 text-sm font-medium text-neutral-700">
                        Notas
                        <textarea rows={4} value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} className={textareaClass} placeholder="Detalle interno, aclaraciones, referencia bancaria..." />
                    </label>

                    <DialogFooter className="px-0 py-0">
                        <div className="mr-auto flex items-center gap-2 text-sm text-neutral-500">
                            <Receipt size={15} />
                            <span>{form.type === 'expense' && form.funding_source === 'company_fund' ? 'Se descontará del fondo empresa al guardar.' : 'Este módulo solo registra movimientos manuales.'}</span>
                        </div>
                        <button type="button" onClick={onClose} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
                            <Save size={15} />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TransactionModal;
