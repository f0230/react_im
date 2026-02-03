import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
    Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const Invoices = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('all');

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setProjects(data);
        }
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchProjects();
        }
    }, [fetchProjects, user?.id]);

    if (loading) return <LoadingFallback type="spinner" />;

    // Mock invoices
    const invoices = [
        {
            id: 'INV-2024-001',
            project: projects[0]?.title || 'Proyecto Web',
            amount: '1,200.00',
            currency: 'USD',
            date: '2024-03-01',
            dueDate: '2024-03-15',
            status: 'paid',
            description: 'Hito 1: Diseño y Prototipado'
        },
        {
            id: 'INV-2024-002',
            project: projects[0]?.title || 'Proyecto Web',
            amount: '2,500.00',
            currency: 'USD',
            date: '2024-03-20',
            dueDate: '2024-04-05',
            status: 'pending',
            description: 'Hito 2: Desarrollo Frontend'
        },
        {
            id: 'INV-2024-003',
            project: projects[1]?.title || 'Campaña Ads',
            amount: '850.00',
            currency: 'USD',
            date: '2024-03-25',
            dueDate: '2024-04-10',
            status: 'overdue',
            description: 'Gestión mensual de pautas'
        }
    ];

    return (
        <div className="font-product text-neutral-900 pb-16">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-skyblue font-bold mb-2">
                        <DollarSign size={14} />
                        Gestión de Facturación
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
                        Facturas & Pagos
                    </h1>
                    <p className="text-neutral-500 mt-3 max-w-2xl text-lg">
                        Historial de transacciones, estados de pago y descarga de comprobantes.
                    </p>
                </div>

                <button className="flex items-center gap-3 px-6 py-4 bg-black text-white rounded-full font-bold shadow-xl hover:bg-neutral-800 transition-all group">
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Nueva Solicitud
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green/5 rounded-bl-[100px] transition-all group-hover:w-28 group-hover:h-28" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-1">Total Pagado</p>
                    <div className="text-3xl font-black text-neutral-900 leading-none">$12,450.00</div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-green">
                        <TrendingUp size={14} />
                        +12% vs mes anterior
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-[100px] transition-all group-hover:w-28 group-hover:h-28" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-1">Pendiente</p>
                    <div className="text-3xl font-black text-neutral-900 leading-none">$2,500.00</div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-amber-500">
                        <Clock size={14} />
                        Vence en 5 días
                    </div>
                </div>

                <div className="bg-black text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[150px]" />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black mb-1">Método de Pago</p>
                    <div className="flex items-center gap-3 mt-1">
                        <div className="w-10 h-7 bg-white/10 rounded-md flex items-center justify-center border border-white/20">
                            <CreditCard size={18} className="text-skyblue" />
                        </div>
                        <span className="text-lg font-bold">**** 4512</span>
                    </div>
                    <button className="flex items-center gap-2 mt-6 text-[10px] font-black uppercase tracking-widest text-skyblue hover:text-white transition-colors">
                        Gestionar Métodos <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* Selector and Filter */}
            <div className="mb-8 flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setSelectedProject('all')}
                    className={`shrink-0 px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${selectedProject === 'all'
                            ? 'bg-black text-white border-black shadow-lg'
                            : 'bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200'
                        }`}
                >
                    Todos los proyectos
                </button>
                {projects.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedProject(p.id)}
                        className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${selectedProject === p.id
                                ? 'bg-black text-white border-black shadow-lg'
                                : 'bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200'
                            }`}
                    >
                        <Briefcase size={14} />
                        {p.title || p.name}
                    </button>
                ))}
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-[40px] border border-neutral-100 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-neutral-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <Receipt size={24} className="text-skyblue" />
                        Movimientos Recientes
                    </h3>
                    <div className="text-xs font-medium text-neutral-400">
                        Mostrando {invoices.length} resultados
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-neutral-50/50">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Concepto / ID</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Proyecto</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Importe</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Estado</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Vencimiento</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {invoices.map((inv, idx) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * idx }}
                                    key={inv.id}
                                    className="group hover:bg-neutral-50/40 transition-all"
                                >
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${inv.status === 'paid' ? 'bg-green/5 text-green' : inv.status === 'pending' ? 'bg-amber-500/5 text-amber-500' : 'bg-red-500/5 text-red-500'
                                                }`}>
                                                <FileText size={22} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900">{inv.description}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">{inv.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-xs font-bold text-neutral-500">{inv.project}</span>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-neutral-900">${inv.amount}</span>
                                            <span className="text-[10px] text-neutral-400 font-bold">{inv.currency}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${inv.status === 'paid'
                                                ? 'bg-green/5 text-green border-green/10'
                                                : inv.status === 'pending'
                                                    ? 'bg-amber-500/5 text-amber-500 border-amber-500/10'
                                                    : 'bg-red-500/5 text-red-500 border-red-500/10'
                                            }`}>
                                            {inv.status === 'paid' ? <CheckCircle2 size={12} /> : inv.status === 'pending' ? <Clock size={12} /> : <AlertCircle size={12} />}
                                            {inv.status === 'paid' ? 'Pagada' : inv.status === 'pending' ? 'Pendiente' : 'Vencida'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-xs font-bold text-neutral-800">{inv.dueDate}</span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <button className="p-3 rounded-2xl bg-neutral-50 text-neutral-400 hover:bg-black hover:text-white transition-all border border-neutral-100 hover:border-black shadow-sm group-hover:scale-110 active:scale-95">
                                            <Download size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-10 bg-neutral-50/30 text-center">
                    <button className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-black transition-colors">
                        Cargar más transacciones
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Invoices;
