import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ExternalLink,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateInvoiceModal from '@/components/CreateInvoiceModal';

const ProjectInvoices = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [project, setProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const [invoicesRes, projectRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('*, clients(*)')
          .eq('id', projectId)
          .single()
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (projectRes.error) throw projectRes.error;

      setInvoices(invoicesRes.data || []);
      setProject(projectRes.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchInvoices();
    }
  }, [fetchInvoices, projectId]);

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
      default: return <Clock size={12} />;
    }
  };

  if (loading) return (
    <div className="py-20 flex justify-center">
      <LoadingFallback type="spinner" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header / Summary */}
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto">
          <div className="bg-white p-6 rounded-[24px] border border-neutral-100 shadow-sm min-w-[160px]">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">
              {t('dashboard.invoices.summary.paid')}
            </p>
            <div className="text-xl font-black text-neutral-900">${stats.paid.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-neutral-100 shadow-sm min-w-[160px]">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">
              {t('dashboard.invoices.summary.pending')}
            </p>
            <div className="text-xl font-black text-neutral-900">${stats.pending.toLocaleString()}</div>
          </div>
          <div className="hidden md:block bg-black p-6 rounded-[24px] shadow-lg min-w-[160px]">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-1">
              {t('dashboard.invoices.summary.total')}
            </p>
            <div className="text-xl font-black text-white">${stats.total.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-black text-white rounded-[20px] font-bold hover:bg-neutral-800 transition-all"
            >
              <Plus size={18} />
              {t('dashboard.invoices.newButton')}
            </button>
          )}
          <button
            onClick={() => navigate(`/dashboard/invoices?projectId=${projectId}`)}
            className="p-4 bg-white border border-neutral-100 text-neutral-400 hover:text-black rounded-[20px] transition-all"
            title={t('dashboard.invoices.table.title')}
          >
            <ExternalLink size={20} />
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Receipt size={20} className="text-skyblue" />
            {t('dashboard.invoices.table.title')}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {t('dashboard.invoices.table.headerConcept')}
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {t('dashboard.invoices.table.headerAmount')}
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {t('dashboard.invoices.table.headerStatus')}
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {t('dashboard.invoices.table.headerDueDate')}
                </th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-neutral-50/40 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getStatusColor(inv.status)}`}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 line-clamp-1">{inv.description}</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{inv.invoice_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-md font-black text-neutral-900">${parseFloat(inv.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(inv.status)}`}>
                        {getStatusIcon(inv.status)}
                        {t(`dashboard.invoices.table.status.${inv.status}`)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-neutral-600">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2.5 rounded-xl bg-neutral-50 text-neutral-400 hover:bg-black hover:text-white transition-all border border-neutral-100">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-16 text-center text-neutral-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {t('dashboard.invoices.table.empty')}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchInvoices}
        projects={project ? [project] : []}
        clients={project?.clients ? [project.clients] : []}
        initialProjectId={projectId}
      />
    </div>
  );
};

export default ProjectInvoices;
