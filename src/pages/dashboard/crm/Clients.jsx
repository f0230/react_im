import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, RefreshCw, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const STATUS_META = {
    lead: { label: 'Lead', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    inactive: { label: 'Inactive', className: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
    archived: { label: 'Archived', className: 'bg-neutral-100 text-neutral-500 border border-neutral-200' },
};

const STATUS_ORDER = ['lead', 'active', 'inactive', 'archived'];

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const getInitial = (name) => {
    if (!name) return 'C';
    return name.trim().charAt(0).toUpperCase();
};

const Clients = () => {
    const { profile, loading: authLoading, profileStatus } = useAuth();
    const isAllowed = profile?.role === 'admin';
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastSyncAt, setLastSyncAt] = useState(null);

    const loadClients = useCallback(async () => {
        if (!isAllowed) return;
        setLoading(true);
        setError('');
        const { data, error: supaError } = await supabase
            .from('clients')
            .select('id, created_at, full_name, company_name, email, phone, status, source, notes')
            .order('created_at', { ascending: false });

        if (supaError) {
            setError('No se pudo cargar el CRM.');
        } else {
            setClients(data || []);
            setLastSyncAt(new Date().toISOString());
        }
        setLoading(false);
    }, [isAllowed]);

    const filteredClients = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return clients.filter((client) => {
            if (filterStatus !== 'all' && client.status !== filterStatus) {
                return false;
            }
            if (!term) return true;
            return [
                client.full_name,
                client.company_name,
                client.email,
                client.phone,
                client.source,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term));
        });
    }, [clients, searchTerm, filterStatus]);

    const statusCounts = useMemo(() => {
        return clients.reduce((acc, client) => {
            const status = client.status || 'lead';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
    }, [clients]);

    useEffect(() => {
        if (!isAllowed) return;
        loadClients();
    }, [isAllowed, loadClients]);

    if (authLoading || profileStatus === 'loading' || !profile?.role) {
        return <LoadingFallback type="spinner" />;
    }

    if (!isAllowed) {
        return (
            <div className="font-product text-neutral-900">
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-8">
                    <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
                    <p className="text-sm text-neutral-500">
                        El CRM de clientes solo esta disponible para administradores.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="font-product text-neutral-900 space-y-6 pb-6 pt-2">


            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 min-h-0">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl bg-white border border-black/5 shadow-xl flex flex-col overflow-hidden"
                >
                    <div className="p-4 border-b border-black/5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar cliente, correo o telefono..."
                                    className="w-full rounded-full border border-black/10 bg-neutral-50 pl-9 pr-3 py-2 text-sm focus:border-black/40 focus:bg-white transition"
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(event) => setFilterStatus(event.target.value)}
                                className="rounded-full border border-black/10 bg-neutral-50 px-3 py-2 text-xs uppercase tracking-wide text-neutral-600"
                            >
                                <option value="all">Todos</option>
                                <option value="lead">Lead</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div className="divide-y divide-black/5">
                        {loading && (
                            <div className="text-xs text-neutral-400 px-4 py-4">Cargando clientes...</div>
                        )}
                        {!loading && filteredClients.length === 0 && (
                            <div className="text-sm text-neutral-400 px-4 py-6">No hay clientes.</div>
                        )}
                        {filteredClients.map((client) => {
                            const statusMeta = STATUS_META[client.status] || STATUS_META.lead;
                            const displayCompany = client.company_name || 'Sin empresa';
                            const displaySource = client.source || 'sin fuente';
                            return (
                                <Link
                                    key={client.id}
                                    to={`/dashboard/clients/${client.id}`}
                                    className="block px-4 py-4 hover:bg-neutral-50 transition text-neutral-900"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center text-sm font-semibold shrink-0">
                                                {getInitial(client.full_name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">{client.full_name}</p>
                                                <p className="text-xs text-neutral-500 truncate">{displayCompany}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                                            {client.email && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Mail size={12} />
                                                    {client.email}
                                                </span>
                                            )}
                                            {client.phone && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Phone size={12} />
                                                    {client.phone}
                                                </span>
                                            )}
                                            {!client.email && !client.phone && (
                                                <span className="text-neutral-400">Sin contacto</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                                                {statusMeta.label}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                                                {displaySource}
                                            </span>
                                            <span className="text-[10px] text-neutral-400">
                                                {formatDate(client.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    {client.notes && (
                                        <p className="mt-3 text-xs text-neutral-500 whitespace-pre-wrap">
                                            {client.notes}
                                        </p>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl bg-white border border-black/5 shadow-xl p-5 space-y-5"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                            <Users size={18} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-widest text-neutral-400">Resumen</p>
                            <p className="text-sm font-semibold">Estado de clientes</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {STATUS_ORDER.map((status) => {
                            const meta = STATUS_META[status];
                            return (
                                <div key={status} className="flex items-center justify-between text-sm">
                                    <span className="text-neutral-600">{meta.label}</span>
                                    <span className="font-semibold text-neutral-900">{statusCounts[status] || 0}</span>
                                </div>
                            );
                        })}
                    </div>

                </motion.div>
            </div>
        </div>
    );
};

export default Clients;
