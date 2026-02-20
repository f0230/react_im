import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    CreditCard,
    Download,
    Receipt,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ArrowRight,
    TrendingUp,
    DollarSign,
    Briefcase,
    Filter,
    Search,
    X
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateInvoiceModal from '@/components/CreateInvoiceModal';

const Invoices = () => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const projectIdParam = searchParams.get('projectId');

    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedProject, setSelectedProject] = useState(projectIdParam || 'all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const isAdmin = profile?.role === 'admin';

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('invoices')
                .select(`
                    *,
                    projects (*),
                    clients (*)
                `)
                .order('created_at', { ascending: false });

            if (selectedProject !== 'all') {
                query = query.eq('project_id', selectedProject);
            }

            // If not admin, only see own invoices (RLS handles this but we filter for clarity)
            if (!isAdmin) {
                // RLS will take care of this, but we could add .eq('client_id', ...) if we had refined client context
            }

            const { data, error } = await query;
            if (error) {
                // If table doesn't exist, we might get an error. We'll handle it by showing empty.
                console.error('Error fetching invoices:', error);
                setInvoices([]);
            } else {
                setInvoices(data || []);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedProject, isAdmin]);

    const fetchData = useCallback(async () => {
        // Fetch projects for filters and modal
        const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        setProjects(projectsData || []);

        if (isAdmin) {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });
            setClients(clientsData || []);
        }

        fetchInvoices();
    }, [fetchInvoices, isAdmin]);

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [fetchData, user?.id]);

    useEffect(() => {
        if (projectIdParam) {
            setSelectedProject(projectIdParam);
        }
    }, [projectIdParam]);

    const stats = useMemo(() => {
        const total = invoices.reduce((acc, inv) => acc + (parseFloat(inv.amount) || 0), 0);
        const paid = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((acc, inv) => acc + (parseFloat(inv.amount) || 0), 0);
        const pending = invoices
            .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
            .reduce((acc, inv) => acc + (parseFloat(inv.amount) || 0), 0);

        return { total, paid, pending };
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const search = searchTerm.toLowerCase();
            return (
                inv.invoice_number?.toLowerCase().includes(search) ||
                inv.description?.toLowerCase().includes(search) ||
                inv.projects?.title?.toLowerCase().includes(search) ||
                inv.projects?.project_name?.toLowerCase().includes(search) ||
                inv.clients?.company_name?.toLowerCase().includes(search) ||
                inv.clients?.full_name?.toLowerCase().includes(search)
            );
        });
    }, [invoices, searchTerm]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green/5 text-green border-green/10';
            case 'pending': return 'bg-amber-500/5 text-amber-500 border-amber-500/10';
            case 'overdue': return 'bg-red-500/5 text-red-500 border-red-500/10';
            case 'cancelled': return 'bg-neutral-100 text-neutral-400 border-neutral-200';
            default: return 'bg-neutral-50 text-neutral-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'paid': return <CheckCircle2 size={12} />;
            case 'pending': return <Clock size={12} />;
            case 'overdue': return <AlertCircle size={12} />;
            case 'cancelled': return <X size={12} />;
            default: return <Clock size={12} />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return t('dashboard.invoices.table.status.paid');
            case 'pending': return t('dashboard.invoices.table.status.pending');
            case 'overdue': return t('dashboard.invoices.table.status.overdue');
            case 'cancelled': return t('dashboard.invoices.table.status.cancelled');
            default: return status;
        }
    };

    return (
        <div className="font-product text-neutral-900 pb-16">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  
                    <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
                        {t('dashboard.invoices.title')}
                    </h1>
                    <p className="text-neutral-500 mt-3 max-w-2xl text-lg font-medium">
                        {t('dashboard.invoices.subtitle')}
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-black text-white rounded-[20px] font-bold shadow-xl hover:bg-neutral-800 transition-all group shrink-0"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        {t('dashboard.invoices.newButton')}
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green/5 rounded-bl-[100px] transition-all group-hover:w-28 group-hover:h-28" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-1">
                        {t('dashboard.invoices.summary.paid')}
                    </p>
                    <div className="text-3xl font-black text-neutral-900 leading-none">${stats.paid.toLocaleString()}</div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-green">
                        <TrendingUp size={14} />
                        {t('dashboard.invoices.summary.confirmed')}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-[100px] transition-all group-hover:w-28 group-hover:h-28" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-1">
                        {t('dashboard.invoices.summary.pending')}
                    </p>
                    <div className="text-3xl font-black text-neutral-900 leading-none">${stats.pending.toLocaleString()}</div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-amber-500">
                        <Clock size={14} />
                        {t('dashboard.invoices.summary.active')}
                    </div>
                </div>

                <div className="bg-black text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[150px]" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-1">
                        {t('dashboard.invoices.summary.total')}
                    </p>
                    <div className="text-3xl font-black leading-none mt-1">${stats.total.toLocaleString()}</div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-skyblue">
                        {t('dashboard.invoices.summary.history')}
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide flex-1">
                    <button
                        onClick={() => {
                            setSelectedProject('all');
                            setSearchParams({});
                        }}
                        className={`shrink-0 px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${selectedProject === 'all'
                            ? 'bg-black text-white border-black shadow-lg'
                            : 'bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200'
                            }`}
                    >
                        {t('dashboard.invoices.filters.all')}
                    </button>
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => {
                                setSelectedProject(p.id);
                                setSearchParams({ projectId: p.id });
                            }}
                            className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${selectedProject === p.id
                                ? 'bg-black text-white border-black shadow-lg'
                                : 'bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200'
                                }`}
                        >
                            <Briefcase size={14} />
                            {p.title || p.name || p.project_name}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('dashboard.invoices.filters.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-neutral-100 rounded-full pl-11 pr-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center bg-white rounded-[40px] border border-neutral-100">
                    <LoadingFallback type="spinner" />
                </div>
            ) : (
                <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-8 md:p-10 border-b border-neutral-100 flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                            <Receipt size={24} className="text-skyblue" />
                            {t('dashboard.invoices.table.title')}
                        </h3>
                        <div className="text-xs font-black uppercase tracking-widest text-neutral-400">
                            {filteredInvoices.length} {t('dashboard.invoices.table.found')}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/50">
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.invoices.table.headerConcept')}
                                    </th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.invoices.table.headerProject')}
                                    </th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.invoices.table.headerAmount')}
                                    </th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.invoices.table.headerStatus')}
                                    </th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                        {t('dashboard.invoices.table.headerDueDate')}
                                    </th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                <AnimatePresence mode="popLayout">
                                    {filteredInvoices.length > 0 ? (
                                        filteredInvoices.map((inv, idx) => (
                                            <motion.tr
                                                key={inv.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="group hover:bg-neutral-50/40 transition-all cursor-default"
                                            >
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getStatusColor(inv.status)}`}>
                                                            <FileText size={22} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-neutral-900 line-clamp-1">{inv.description}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">{inv.invoice_number}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className="text-xs font-bold text-neutral-500">
                                                        {inv.projects?.title || inv.projects?.project_name || 'Sin asignar'}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-neutral-900">${parseFloat(inv.amount).toLocaleString()}</span>
                                                        <span className="text-[10px] text-neutral-400 font-bold">{inv.currency}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(inv.status)}`}>
                                                        {getStatusIcon(inv.status)}
                                                        {getStatusLabel(inv.status)}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className="text-xs font-bold text-neutral-800">
                                                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <button className="p-3 rounded-2xl bg-neutral-50 text-neutral-400 hover:bg-black hover:text-white transition-all border border-neutral-100 hover:border-black shadow-sm group-hover:scale-110 active:scale-95">
                                                        <Download size={18} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-10 py-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-neutral-400">
                                                    <FileText size={48} className="mb-4 opacity-10" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">
                                                        {t('dashboard.invoices.table.empty')}
                                                    </p>
                                                    <p className="text-xs mt-1">
                                                        {t('dashboard.invoices.table.emptySub')}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <CreateInvoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => {
                    fetchInvoices();
                    setIsModalOpen(false);
                }}
                projects={projects}
                clients={clients}
                initialProjectId={selectedProject !== 'all' ? selectedProject : ''}
            />
        </div>
    );
};

export default Invoices;
