import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, DollarSign, Calendar, FileText, Briefcase, Receipt, Download, AlertCircle, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { fetchExchangeRates, convertToUsd, CURRENCY_OPTIONS } from '@/services/exchangeRateService';
import MultiUseSelect from './MultiUseSelect';


const CreateInvoiceModal = ({
    isOpen,
    onClose,
    onCreated,
    projects = [],
    clients = [],
    initialProjectId = '',
    editingInvoice = null,
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    const isEditing = !!editingInvoice;
    const [formData, setFormData] = useState({
        project_id: initialProjectId,
        client_id: '',
        invoice_number: '',
        description: '',
        amount: '',
        currency: 'USD',
        due_date: '',
        status: 'pending'
    });

    useEffect(() => {
        if (!isOpen) return;
        setError(null);

        if (editingInvoice) {
            setFormData({
                project_id: editingInvoice.project_id || '',
                client_id: editingInvoice.client_id || '',
                invoice_number: editingInvoice.invoice_number || '',
                description: editingInvoice.description || '',
                amount: editingInvoice.amount ?? '',
                currency: editingInvoice.currency || 'USD',
                due_date: editingInvoice.due_date ? new Date(editingInvoice.due_date).toISOString().split('T')[0] : '',
                status: editingInvoice.status || 'pending',
            });
        } else {
            const random = Math.floor(1000 + Math.random() * 9000);
            const year = new Date().getFullYear();
            setFormData(prev => ({
                ...prev,
                project_id: initialProjectId || (projects.length > 0 ? projects[0].id : ''),
                client_id: '',
                invoice_number: `INV-${year}-${random}`,
                due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                amount: '',
                description: '',
                status: 'pending',
            }));
        }
    }, [isOpen, initialProjectId, projects, editingInvoice]);

    useEffect(() => {
        if (isEditing) return;
        if (formData.project_id) {
            const project = projects.find(p => p.id === formData.project_id);
            if (project) {
                if (project.client_id) {
                    setFormData(prev => ({ ...prev, client_id: project.client_id }));
                } else if (project.project_clients && project.project_clients.length > 0) {
                    setFormData(prev => ({ ...prev, client_id: project.project_clients[0].client_id }));
                }
            }
        }
    }, [formData.project_id, projects, isEditing]);

    const filteredClients = useMemo(() => {
        if (!formData.project_id) return clients;
        const project = projects.find(p => p.id === formData.project_id);
        if (!project) return clients;

        if (project.project_clients && project.project_clients.length > 0) {
            return project.project_clients.map(pc => pc.clients).filter(Boolean);
        }

        if (project.client_id) {
            return clients.filter(c => c.id === project.client_id);
        }

        return clients;
    }, [formData.project_id, projects, clients]);

    const projectOptions = useMemo(() =>
        projects.map(p => ({
            value: p.id,
            label: p.title || p.name || p.project_name || 'Proyecto sin nombre'
        })), [projects]);

    const clientOptions = useMemo(() =>
        filteredClients.map(c => ({
            value: c.id,
            label: c.company_name ? `${c.company_name} (${c.full_name})` : c.full_name
        })), [filteredClients]);

    const statusOptions = [
        { value: 'pending', label: t('dashboard.invoices.table.status.pending') },
        { value: 'paid', label: t('dashboard.invoices.table.status.paid') },
        { value: 'overdue', label: t('dashboard.invoices.table.status.overdue') },
        { value: 'cancelled', label: t('dashboard.invoices.table.status.cancelled') },
    ];

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.project_id) {
                throw new Error('Selecciona un proyecto para asignar la factura.');
            }

            const amount = parseFloat(formData.amount) || 0;
            let amountUsd = amount;
            let exchangeRate = 1;

            if (formData.currency !== 'USD') {
                const rates = await fetchExchangeRates();
                const conversion = convertToUsd(amount, formData.currency, rates);
                amountUsd = conversion.amountUsd;
                exchangeRate = conversion.exchangeRate;
            }

            const payload = {
                ...formData,
                client_id: formData.client_id || null,
                description: (formData.description || '').trim(),
                amount,
                amount_usd: amountUsd,
                exchange_rate: exchangeRate,
            };

            if (isEditing) {
                const wasPaid = editingInvoice.status === 'paid';
                const nowPaid = formData.status === 'paid';
                if (nowPaid && !wasPaid) {
                    payload.paid_at = new Date().toISOString();
                } else if (!nowPaid && wasPaid) {
                    payload.paid_at = null;
                }

                const { data, error: updateError } = await supabase
                    .from('invoices')
                    .update(payload)
                    .eq('id', editingInvoice.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                if (onCreated) onCreated(data);
            } else {
                payload.paid_at = formData.status === 'paid' ? new Date().toISOString() : null;

                const { data, error: insertError } = await supabase
                    .from('invoices')
                    .insert([payload])
                    .select()
                    .single();

                if (insertError) throw insertError;
                if (onCreated) onCreated(data);
            }

            onClose();
        } catch (err) {
            console.error('Error saving invoice:', err);
            setError(err.message || 'Error al guardar la factura');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingInvoice) return;
        setDeleting(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('invoices')
                .delete()
                .eq('id', editingInvoice.id);

            if (deleteError) throw deleteError;
            if (onCreated) onCreated(null);
            onClose();
        } catch (err) {
            console.error('Error deleting invoice:', err);
            setError(err.message || 'Error al eliminar la factura');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-product">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-xl bg-[#F8F9FA] rounded-[40px] shadow-2xl"
                    >
                        <div className="p-8 md:p-12">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                                        <Receipt className="text-skyblue" size={32} />
                                        {isEditing ? 'Editar factura' : t('dashboard.invoices.create.title')}
                                    </h2>
                                    <p className="text-neutral-500 font-medium mt-1">
                                        {isEditing ? editingInvoice.invoice_number : t('dashboard.invoices.create.description')}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Invoice Number */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <FileText size={12} />
                                            {t('dashboard.invoices.create.invoiceNumber')}
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.invoice_number}
                                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                                            placeholder="INV-XXXX"
                                        />
                                    </div>

                                    {/* Amount + Currency */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <DollarSign size={12} />
                                            {t('dashboard.invoices.create.amount')}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="flex-1 px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                className="w-24 px-3 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold text-sm focus:ring-2 focus:ring-black outline-none transition-all text-center"
                                            >
                                                {CURRENCY_OPTIONS.map(c => (
                                                    <option key={c.value} value={c.value}>{c.value}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Project Select */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <Briefcase size={12} />
                                            {t('dashboard.invoices.create.project')}
                                        </label>
                                        <MultiUseSelect
                                            options={projectOptions}
                                            value={formData.project_id}
                                            onChange={(val) => handleChange('project_id', val)}
                                            placeholder={t('dashboard.invoices.create.projectSelect')}
                                            buttonClassName="!bg-neutral-50 !border-neutral-100 !rounded-[20px] !px-6 !py-4 !text-sm !font-bold !text-neutral-900 focus:!ring-2 focus:!ring-black !h-auto"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <FileText size={12} />
                                            {t('dashboard.invoices.create.concept')}
                                        </label>
                                        <textarea
                                            required
                                            rows="3"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                                            placeholder="Descripcion del trabajo..."
                                        />
                                    </div>

                                    {/* Due Date */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <Calendar size={12} />
                                            {t('dashboard.invoices.create.dueDate')}
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            {t('dashboard.invoices.create.status')}
                                        </label>
                                        <MultiUseSelect
                                            options={statusOptions}
                                            value={formData.status}
                                            onChange={(val) => handleChange('status', val)}
                                            buttonClassName="!bg-neutral-50 !border-neutral-100 !rounded-[20px] !px-6 !py-4 !text-sm !font-bold !text-neutral-900 focus:!ring-2 focus:!ring-black !h-auto"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    {isEditing && (
                                        <button
                                            type="button"
                                            disabled={deleting}
                                            onClick={handleDelete}
                                            className="px-5 py-4 bg-red-50 text-red-500 rounded-[20px] font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-red-100"
                                        >
                                            {deleting ? (
                                                <div className="w-5 h-5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                    )}
                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="flex-1 py-4 bg-black text-white rounded-[20px] font-bold shadow-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {t('dashboard.invoices.create.processing')}
                                            </>
                                        ) : (
                                            <>
                                                {isEditing ? <Save size={20} /> : <Download size={20} />}
                                                {isEditing ? 'Guardar cambios' : t('dashboard.invoices.create.submit')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateInvoiceModal;
