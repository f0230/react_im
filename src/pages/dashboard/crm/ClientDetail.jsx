import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Plus, Copy, Check, Trash2, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const STATUS_META = {
    lead: { label: 'Lead', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    inactive: { label: 'Inactive', className: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
    archived: { label: 'Archived', className: 'bg-neutral-100 text-neutral-500 border border-neutral-200' },
};

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

const normalizePhone = (value) => {
    if (!value) return '';
    return String(value).replace(/\D/g, '');
};

const ClientDetail = ({ clientIdOverride = null, hideBackLink = false }) => {
    const { profile, loading: authLoading, profileStatus } = useAuth();
    const isAllowed = profile?.role === 'admin';
    const { clientId: routeClientId } = useParams();
    const clientId = clientIdOverride || routeClientId;

    const [client, setClient] = useState(null);
    const [team, setTeam] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Invitation states
    const [newEmail, setNewEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);

    const loadClientData = useCallback(async () => {
        if (!clientId) {
            setError('No se pudo identificar el cliente.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            // Fetch client details
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('id, created_at, full_name, company_name, email, phone, status, notes')
                .eq('id', clientId)
                .single();

            if (clientError) throw clientError;
            setClient(clientData);

            // Fetch team members
            const { data: teamData } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .eq('client_id', clientId)
                .order('full_name', { ascending: true });

            setTeam(teamData || []);

            // Fetch pending invitations
            const { data: invData } = await supabase
                .from('client_invitations')
                .select('*')
                .eq('client_id', clientId);

            setInvitations(invData || []);

        } catch (supaError) {
            console.error('Error loading client data:', supaError);
            setError('No se pudo cargar la información del cliente.');
            setClient(null);
        } finally {
            setIsLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        if (!isAllowed) return;
        loadClientData();
    }, [isAllowed, loadClientData]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes('@')) return;

        try {
            setInviting(true);
            const token = crypto.randomUUID();

            const { data, error: invError } = await supabase
                .from('client_invitations')
                .insert([{
                    client_id: clientId,
                    email: newEmail.trim().toLowerCase(),
                    token: token
                }])
                .select()
                .single();

            if (invError) {
                if (invError.code === '23505') throw new Error('Ya existe una invitación para este correo.');
                throw invError;
            }

            setInvitations([...invitations, data]);
            setNewEmail('');
        } catch (err) {
            console.error('Invite error:', err);
            alert(err.message || 'Error al enviar invitación');
        } finally {
            setInviting(false);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('¿Revocar esta invitación?')) return;
        try {
            const { error: revokeError } = await supabase
                .from('client_invitations')
                .delete()
                .eq('id', id);

            if (revokeError) throw revokeError;
            setInvitations(invitations.filter(inv => inv.id !== id));
        } catch (err) {
            console.error('Revoke error:', err);
        }
    };

    const copyInviteLink = (token) => {
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const url = `${baseUrl}/invite?token=${token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const statusMeta = useMemo(() => {
        if (!client?.status) return STATUS_META.lead;
        return STATUS_META[client.status] || STATUS_META.lead;
    }, [client?.status]);

    const displayName = client?.full_name || client?.company_name || '';
    const displayRole = client?.company_name ? 'Empresa' : 'Contacto';
    const normalizedPhone = normalizePhone(client?.phone);

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
        <div className="font-product text-neutral-900 space-y-6 pb-8">
            <div className="flex items-center justify-between">
                {!hideBackLink && (
                    <Link
                        to="/dashboard/clients"
                        className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900 transition"
                    >
                        <ArrowLeft size={14} />
                        Volver al CRM
                    </Link>
                )}
                {client && (
                    <span className={`text-[10px] uppercase px-2 py-1 rounded-full ${statusMeta.className}`}>
                        {statusMeta.label}
                    </span>
                )}
            </div>

            <div className="rounded-3xl bg-white border border-black/5 shadow-xl p-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-neutral-200" />
                    <div>
                        <h1 className="text-2xl font-semibold">{displayName}</h1>
                        {client && (
                            <p className="text-sm text-neutral-500">
                                {displayRole}
                            </p>
                        )}
                        {client?.created_at && (
                            <p className="text-xs text-neutral-400 mt-1">
                                Cliente desde {formatDate(client.created_at)}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    className="self-start md:self-auto rounded-full bg-neutral-200 text-neutral-600 text-xs px-4 py-2"
                >
                    Editar perfil
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6">
                    <div className="h-24 rounded-2xl bg-neutral-100" />
                    <h3 className="mt-5 text-lg font-semibold">Proyectos</h3>
                    <p className="text-xs text-neutral-500">Seguimiento de tus proyectos en curso</p>
                </div>
                <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6">
                    <div className="h-24 rounded-2xl bg-neutral-100" />
                    <h3 className="mt-5 text-lg font-semibold">Servicios</h3>
                    <p className="text-xs text-neutral-500">Tareas y servicios en ejecucion</p>
                </div>
                <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6">
                    <div className="h-24 rounded-2xl bg-neutral-100" />
                    <h3 className="mt-5 text-lg font-semibold">Informes</h3>
                    <p className="text-xs text-neutral-500">Reportes de avances y estadisticas</p>
                </div>
                <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6">
                    <div className="h-24 rounded-2xl bg-neutral-100" />
                    <h3 className="mt-5 text-lg font-semibold">Facturas</h3>
                    <p className="text-xs text-neutral-500">Historial de facturacion y pagos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                        Notas
                    </h3>
                    <div className="mt-4 min-h-[120px] rounded-2xl border border-dashed border-neutral-200 bg-neutral-50" />
                    {client?.notes && (
                        <p className="mt-3 text-xs text-neutral-500 whitespace-pre-wrap">{client.notes}</p>
                    )}
                </div>
                <div className="flex flex-col gap-6">
                    {/* Sección de Contacto */}
                    <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6 space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                            Contacto
                        </h3>
                        {client && !error && (
                            <div className="space-y-2 text-sm text-neutral-600">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} />
                                    {client?.email || 'Sin correo'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} />
                                    {client?.phone || 'Sin telefono'}
                                </div>
                                {normalizedPhone ? (
                                    <Link
                                        to={`/dashboard/inbox?wa=${normalizedPhone}`}
                                        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
                                    >
                                        Abrir chat en Inbox
                                    </Link>
                                ) : (
                                    <p className="text-xs text-neutral-400">Sin telefono para abrir chat.</p>
                                )}
                            </div>
                        )}
                        {error && <p className="text-xs text-red-500">{error}</p>}
                    </div>

                    {/* Sección de Team */}
                    <div className="rounded-3xl bg-white border border-black/5 shadow-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                                Team / Usuarios
                            </h3>
                        </div>

                        {/* Invitar Usuario Form */}
                        <form onSubmit={handleInvite} className="flex gap-2">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="Email de invitación"
                                className="flex-1 bg-neutral-50 border border-black/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-black/30"
                                required
                            />
                            <button
                                type="submit"
                                disabled={inviting || !newEmail}
                                className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition disabled:opacity-50"
                            >
                                <Plus size={14} className="inline mr-1" /> Invitar
                            </button>
                        </form>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                            {/* Pendientes */}
                            {invitations.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Invitaciones Pendientes</p>
                                    {invitations.map(inv => (
                                        <div key={inv.id} className="flex items-center justify-between p-2 bg-amber-50/50 border border-amber-100 rounded-xl">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium truncate">{inv.email}</p>
                                                <p className="text-[9px] text-amber-600">Pendiente</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => copyInviteLink(inv.token)}
                                                    className="p-1.5 hover:bg-white rounded-lg transition"
                                                    title="Copiar Link"
                                                >
                                                    {copiedToken === inv.token ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                                </button>
                                                <button
                                                    onClick={() => handleRevoke(inv.id)}
                                                    className="p-1.5 hover:bg-white text-red-500 rounded-lg transition"
                                                    title="Revocar"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Activos */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Miembros Activos</p>
                                {team.length === 0 ? (
                                    <p className="text-xs text-neutral-400">No hay usuarios asignados.</p>
                                ) : (
                                    team.map((member) => (
                                        <div key={member.id} className="flex flex-col gap-0.5 border-b border-black/[0.03] pb-2 last:border-0">
                                            <p className="text-sm font-medium">{member.full_name || 'Sin nombre'}</p>
                                            <p className="text-[10px] text-neutral-500 truncate">{member.email}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetail;
