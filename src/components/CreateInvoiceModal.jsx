import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, DollarSign, Calendar, FileText, Briefcase, User, Receipt, Download, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import MultiUseSelect from './MultiUseSelect';


const CreateInvoiceModal = ({
    isOpen,
    onClose,
    onCreated,
    projects = [],
    clients = [],
    initialProjectId = ''
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
        if (isOpen) {
            // Auto-generate invoice number (simple version)
            const random = Math.floor(1000 + Math.random() * 9000);
            const year = new Date().getFullYear();

            setFormData(prev => ({
                ...prev,
                project_id: initialProjectId || (projects.length > 0 ? projects[0].id : ''),
                invoice_number: `INV-${year}-${random}`,
                due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days from now
                amount: '',
                description: ''
            }));
            setError(null);
        }
    }, [isOpen, initialProjectId, projects]);

    useEffect(() => {
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
    }, [formData.project_id, projects]);

    const filteredClients = useMemo(() => {
        if (!formData.project_id) return clients;
        const project = projects.find(p => p.id === formData.project_id);
        if (!project) return clients;

        // Try to get clients from project_clients (multi-client projects)
        if (project.project_clients && project.project_clients.length > 0) {
            return project.project_clients.map(pc => pc.clients).filter(Boolean);
        }

        // Fallback to project.client_id
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
                throw new Error('Seleccioná un proyecto para asignar la factura.');
            }

            const { data, error: insertError } = await supabase
                .from('invoices')
                .insert([{
                    ...formData,
                    description: (formData.description || '').trim(),
                    amount: parseFloat(formData.amount) || 0
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            if (onCreated) onCreated(data);
            onClose();
        } catch (err) {
            console.error('Error creating invoice:', err);
            setError(err.message || 'Error al crear la factura');
        } finally {
            setLoading(false);
        }
    };

    const labelClass = "text-xs font-black uppercase tracking-widest text-neutral-400 mb-2 block";
    const inputClass = "w-full bg-white border border-neutral-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all";
    const selectClass = "w-full bg-white border border-neutral-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none appearance-none transition-all";

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
                                        {t('dashboard.invoices.create.title')}
                                    </h2>
                                    <p className="text-neutral-500 font-medium mt-1">
                                        {t('dashboard.invoices.create.description')}
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

                                    {/* Amount */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <DollarSign size={12} />
                                            {t('dashboard.invoices.create.amount')} (USD)
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                                            placeholder="0.00"
                                        />
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
                                            placeholder="Descripción del trabajo..."
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

                                <button
                                    disabled={loading}
                                    type="submit"
                                    className="w-full py-4 bg-black text-white rounded-[20px] font-bold shadow-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {t('dashboard.invoices.create.processing')}
                                        </>
                                    ) : (
                                        <>
                                            <Download size={20} />
                                            {t('dashboard.invoices.create.submit')}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateInvoiceModal;
