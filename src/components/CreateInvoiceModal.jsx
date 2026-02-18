import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, DollarSign, Calendar, FileText, Briefcase, User, Receipt, Download, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';

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
            if (project && project.client_id) {
                setFormData(prev => ({ ...prev, client_id: project.client_id }));
            }
        }
    }, [formData.project_id, projects]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: insertError } = await supabase
                .from('invoices')
                .insert([{
                    ...formData,
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
                        className="relative w-full max-w-xl bg-[#F8F9FA] rounded-[40px] shadow-2xl overflow-hidden"
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
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <Briefcase size={12} />
                                            {t('dashboard.invoices.create.project')}
                                        </label>
                                        <select
                                            required
                                            value={formData.project_id}
                                            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all appearance-none"
                                        >
                                            <option value="">{t('dashboard.invoices.create.projectSelect')}</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.title || p.project_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Client Select */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-4 flex items-center gap-2">
                                            <User size={12} />
                                            {t('dashboard.invoices.create.client')}
                                        </label>
                                        <select
                                            required
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all appearance-none"
                                        >
                                            <option value="">{t('dashboard.invoices.create.clientSelect')}</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.company_name} ({c.full_name})</option>
                                            ))}
                                        </select>
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
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-[20px] font-bold focus:ring-2 focus:ring-black outline-none transition-all appearance-none"
                                        >
                                            <option value="pending">{t('dashboard.invoices.table.status.pending')}</option>
                                            <option value="paid">{t('dashboard.invoices.table.status.paid')}</option>
                                            <option value="overdue">{t('dashboard.invoices.table.status.overdue')}</option>
                                            <option value="cancelled">{t('dashboard.invoices.table.status.cancelled')}</option>
                                        </select>
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
