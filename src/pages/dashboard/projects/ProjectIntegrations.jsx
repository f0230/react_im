import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Link2, RefreshCw, Trash2, PlugZap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const formatDateTime = (value) => {
  if (!value) return 'N/D';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/D';
  return date.toLocaleString();
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getProjectTitle = (project) => (
  project?.title || project?.name || project?.project_name || 'Proyecto'
);

const ProjectIntegrations = () => {
  const { projectId: routeProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const callbackMetaStatus = searchParams.get('meta');
  const callbackReason = searchParams.get('reason');
  const { user, profile, client } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metaConnection, setMetaConnection] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaRefreshing, setMetaRefreshing] = useState(false);
  const [metaDisconnecting, setMetaDisconnecting] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [metaNotice, setMetaNotice] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('');

  const activeProjectId = routeProjectId || queryProjectId || null;
  const isAdmin = profile?.role === 'admin';
  const isWorker = profile?.role === 'worker';
  const isClientLeader = profile?.role === 'client' && (profile?.is_client_leader || client?.user_id === user?.id);
  const canManageMeta = isAdmin || isWorker || isClientLeader;

  const applyMetaConnection = useCallback((payload) => {
    setMetaConnection(payload);
    setSelectedPageId(payload?.selected?.pageId || '');
    setSelectedAdAccountId(payload?.selected?.adAccountId || '');
  }, []);

  const getApiToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchProject = useCallback(async () => {
    setLoading(true);

    let query = supabase.from('projects').select('*');
    if (activeProjectId) {
      query = query.eq('id', activeProjectId).maybeSingle();
    } else {
      query = query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    }

    const { data, error } = await query;
    if (!error && data) {
      setProject(data);
    } else {
      setProject(null);
    }
    setLoading(false);
  }, [activeProjectId]);

  const fetchMetaConnection = useCallback(async (projectId) => {
    if (!projectId || !user?.id) return;

    setMetaLoading(true);
    setMetaError('');
    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión.');
      }

      const response = await fetch(`/api/meta/project-connection?projectId=${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await safeJson(response);

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar la integración Meta.');
      }

      applyMetaConnection(payload);
    } catch (error) {
      setMetaError(error?.message || 'No se pudo cargar la integración Meta.');
      applyMetaConnection(null);
    } finally {
      setMetaLoading(false);
    }
  }, [applyMetaConnection, getApiToken, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchProject();
    }
  }, [fetchProject, user?.id]);

  useEffect(() => {
    if (project?.id) {
      fetchMetaConnection(project.id);
    }
  }, [project?.id, fetchMetaConnection]);

  useEffect(() => {
    if (!callbackMetaStatus) return;
    if (callbackMetaStatus === 'connected') {
      setMetaNotice('Cuenta Meta conectada correctamente.');
      return;
    }
    setMetaError(
      callbackReason
        ? `No se pudo conectar Meta (${callbackReason}).`
        : 'No se pudo conectar Meta.'
    );
  }, [callbackMetaStatus, callbackReason]);

  const handleConnectMeta = async () => {
    if (!project?.id || metaConnecting) return;
    setMetaConnecting(true);
    setMetaError('');
    setMetaNotice('');

    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión.');
      }

      const response = await fetch(`/api/meta/connect-url?projectId=${project.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await safeJson(response);

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'No se pudo iniciar OAuth con Meta.');
      }

      window.location.href = payload.url;
    } catch (error) {
      setMetaError(error?.message || 'No se pudo iniciar OAuth con Meta.');
      setMetaConnecting(false);
    }
  };

  const handleSaveSelection = async () => {
    if (!project?.id || metaSaving) return;
    setMetaSaving(true);
    setMetaError('');
    setMetaNotice('');

    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión.');
      }

      const response = await fetch('/api/meta/project-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          selectedPageId: selectedPageId || null,
          selectedAdAccountId: selectedAdAccountId || null,
        }),
      });
      const payload = await safeJson(response);

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo guardar la selección.');
      }

      applyMetaConnection(payload);
      setMetaNotice('Selección Meta guardada.');
    } catch (error) {
      setMetaError(error?.message || 'No se pudo guardar la selección.');
    } finally {
      setMetaSaving(false);
    }
  };

  const handleRefreshAccounts = async () => {
    if (!project?.id || metaRefreshing) return;
    setMetaRefreshing(true);
    setMetaError('');
    setMetaNotice('');

    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión.');
      }

      const response = await fetch('/api/meta/refresh-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId: project.id }),
      });
      const payload = await safeJson(response);

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron refrescar las cuentas Meta.');
      }

      applyMetaConnection(payload);
      setMetaNotice(payload?.warning || 'Cuentas Meta actualizadas.');
    } catch (error) {
      setMetaError(error?.message || 'No se pudieron refrescar las cuentas Meta.');
    } finally {
      setMetaRefreshing(false);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!project?.id || metaDisconnecting) return;
    if (!window.confirm('¿Seguro que querés desconectar Meta de este proyecto?')) return;

    setMetaDisconnecting(true);
    setMetaError('');
    setMetaNotice('');

    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión.');
      }

      const response = await fetch(`/api/meta/project-connection?projectId=${project.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await safeJson(response);

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo desconectar Meta.');
      }

      applyMetaConnection({
        connected: false,
        availablePages: [],
        availableAdAccounts: [],
        selected: {
          pageId: null,
          pageName: null,
          igId: null,
          igUsername: null,
          adAccountId: null,
          adAccountName: null,
        },
      });
      setMetaNotice('Integración Meta desconectada.');
    } catch (error) {
      setMetaError(error?.message || 'No se pudo desconectar Meta.');
    } finally {
      setMetaDisconnecting(false);
    }
  };

  if (loading) return <LoadingFallback type="spinner" />;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-white rounded-[30px] border border-neutral-200">
        <PlugZap className="w-14 h-14 text-neutral-300 mb-4" />
        <h2 className="text-2xl font-bold text-neutral-800">No se encontró el proyecto</h2>
        <p className="text-neutral-500 mt-2 max-w-md">Seleccioná un proyecto para gestionar sus integraciones.</p>
        <Link to="/dashboard/projects" className="mt-6 px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all">
          Ir a proyectos
        </Link>
      </div>
    );
  }

  return (
    <div className="font-product text-neutral-900 pb-16">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-skyblue font-bold mb-2">
          <Link2 size={14} />
          Integraciones
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {getProjectTitle(project)}
        </h1>
        <p className="text-neutral-500 mt-2">
          Página simple de conexiones por proyecto. Acá vas a activar canales y herramientas.
        </p>
      </div>

      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-skyblue font-bold mb-2">
              <Link2 size={14} />
              Integración Meta
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
              Páginas, Instagram y Ads por proyecto
            </h2>
          </div>
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${metaConnection?.connected ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
            {metaConnection?.connected ? 'Conectado' : 'Sin conexión'}
          </span>
        </div>

        {metaError && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {metaError}
          </div>
        )}

        {metaNotice && (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {metaNotice}
          </div>
        )}

        {metaLoading ? (
          <div className="mt-6 text-sm text-neutral-500">Cargando configuración Meta del proyecto...</div>
        ) : (
          <div className="mt-6">
            {!metaConnection?.connected ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-sm text-neutral-600">
                  Este proyecto todavía no tiene una cuenta Meta conectada.
                </p>
                {canManageMeta ? (
                  <button
                    type="button"
                    onClick={handleConnectMeta}
                    disabled={metaConnecting}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                  >
                    <Link2 size={16} />
                    {metaConnecting ? 'Abriendo OAuth...' : 'Conectar Meta'}
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-neutral-500">
                    Solo admin, worker o líder de cliente puede conectar Meta.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                  <p>
                    <span className="font-semibold">Usuario Meta:</span> {metaConnection?.metaUser?.name || 'N/D'}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Última sincronización:</span> {formatDateTime(metaConnection?.lastSyncedAt)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
                      Página de Facebook
                    </label>
                    <select
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      disabled={!canManageMeta}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="">Seleccionar página</option>
                      {(metaConnection?.availablePages || []).map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.name} {page.instagramUsername ? `(IG: ${page.instagramUsername})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
                      Cuenta publicitaria (opcional)
                    </label>
                    <select
                      value={selectedAdAccountId}
                      onChange={(e) => setSelectedAdAccountId(e.target.value)}
                      disabled={!canManageMeta}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                    >
                      <option value="">Sin cuenta publicitaria</option>
                      {(metaConnection?.availableAdAccounts || []).map((adAccount) => (
                        <option key={adAccount.id} value={adAccount.id}>
                          {adAccount.name} ({adAccount.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {canManageMeta && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSelection}
                      disabled={metaSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                    >
                      {metaSaving ? 'Guardando...' : 'Guardar selección'}
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshAccounts}
                      disabled={metaRefreshing}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
                    >
                      <RefreshCw size={16} />
                      {metaRefreshing ? 'Actualizando...' : 'Refrescar cuentas'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectMeta}
                      disabled={metaDisconnecting}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      {metaDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectIntegrations;

