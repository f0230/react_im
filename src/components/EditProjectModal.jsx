import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Camera, Link as LinkIcon, Save, MessageSquare, Share2, BookOpen, CheckCircle2, Loader2, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { BlotatoConfigModal } from '@/components/projects/BlotatoConfigModal';
import { useAuth } from '@/context/AuthContext';
import { saveNotionSettings, searchNotionPages } from '@/services/notionService';
import { MemberSelector } from '@/components/ui/member-selector';

const EditProjectModal = ({
    isOpen,
    onClose,
    project,
    onUpdated,
    isAdmin = false,
    isClientLeader = false,
    teamMemberOptions = [],
    initialTeamIds = [],
    onTeamAssignmentChange,
    clients = [],
    allClientUsers = [],
    initialClientIds = [],
    initialClientUserIds = [],
    onClientAssignmentChange,
    onClientUserAssignmentChange,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        figma_url: '',
        jam_url: '',
        drive_url: '',
        avatar_url: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [linkedChannel, setLinkedChannel] = useState(null);
    const [isBlotatoConfigOpen, setIsBlotatoConfigOpen] = useState(false);
    const [notionPageId, setNotionPageId] = useState('');
    const [notionPageTitle, setNotionPageTitle] = useState('');
    const [notionPageUrl, setNotionPageUrl] = useState('');
    const [notionSearchQuery, setNotionSearchQuery] = useState('');
    const [notionSearchResults, setNotionSearchResults] = useState([]);
    const [notionSearching, setNotionSearching] = useState(false);
    const [notionError, setNotionError] = useState('');
    const [localTeamIds, setLocalTeamIds] = useState([]);
    const [localClientIds, setLocalClientIds] = useState([]);
    const [localClientUserIds, setLocalClientUserIds] = useState([]);

    const {
        allAccounts,
        assignedAccounts,
        syncing: blotatoSyncing,
    } = useBlotatoAccounts(project?.id);
    const canConfigureNotion = profile?.role === 'admin';

    const clientCompanyMap = useMemo(() =>
        new Map(clients.map(c => [c.id, c.company_name || c.full_name || c.email || 'Cliente']))
    , [clients]);

    const clientEntityOptions = useMemo(() => clients.map(c => ({
        id: c.id,
        name: c.company_name || c.full_name || c.email || 'Cliente',
        email: c.email || null,
        subtitle: c.company_name && c.full_name ? c.full_name : c.email || 'Cliente principal',
    })), [clients]);

    const clientUserOptions = useMemo(() => {
        const relevant = isAdmin
            ? allClientUsers.filter(u => localClientIds.includes(u.client_id))
            : allClientUsers;
        return relevant.map(u => ({
            id: u.id,
            name: u.full_name || u.email || 'Usuario',
            email: u.email || null,
            subtitle: u.client_id ? (clientCompanyMap.get(u.client_id) || 'Empresa') : 'Cliente',
        }));
    }, [allClientUsers, localClientIds, isAdmin, clientCompanyMap]);

    useEffect(() => {
        if (isOpen && project) {
            setFormData({
                name: project.name || project.title || project.project_name || '',
                figma_url: project.figma_url || '',
                jam_url: project.jam_url || '',
                drive_url: project.drive_url || '',
                avatar_url: project.avatar_url || project.profile_image_url || '',
            });
            setError(null);
            setNotionError('');
            setNotionPageId(project.notion_page_id || '');
            setNotionPageTitle(project.notion_page_title || '');
            setNotionPageUrl(project.notion_page_url || '');
            setNotionSearchQuery(project.notion_page_title || project.name || project.title || project.project_name || '');
            setNotionSearchResults([]);
            setLinkedChannel(null);
            setLocalTeamIds(initialTeamIds);
            setLocalClientIds(initialClientIds);
            setLocalClientUserIds(initialClientUserIds);

            // Load the linked TeamChat channel
            if (project.team_channel_id) {
                supabase
                    .from('team_channels')
                    .select('id, name')
                    .eq('id', project.team_channel_id)
                    .maybeSingle()
                    .then(({ data }) => setLinkedChannel(data || null));
            } else {
                // Fallback: look for a channel by project_id
                supabase
                    .from('team_channels')
                    .select('id, name')
                    .eq('project_id', project.id)
                    .maybeSingle()
                    .then(({ data }) => setLinkedChannel(data || null));
            }
        }
    }, [isOpen, project]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchNotionPages = async () => {
        if (!project?.id || notionSearching) return;
        setNotionSearching(true);
        setNotionError('');

        try {
            const data = await searchNotionPages(project.id, notionSearchQuery.trim());
            const pages = data.pages || [];
            setNotionSearchResults(pages);
            if (pages.length === 0) {
                setNotionError('No encontramos páginas. Compartí la página con la integración de Notion y volvé a buscar.');
            }
        } catch (err) {
            setNotionError(err.message || 'No se pudo buscar en Notion.');
            setNotionSearchResults([]);
        } finally {
            setNotionSearching(false);
        }
    };

    const handleSelectNotionPage = (page) => {
        setNotionPageId(page.id || '');
        setNotionPageTitle(page.title || '');
        setNotionPageUrl(page.url || '');
        setNotionSearchQuery(page.title || notionSearchQuery);
        setNotionError('');
    };

    const handleClearNotionPage = () => {
        setNotionPageId('');
        setNotionPageTitle('');
        setNotionPageUrl('');
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}-${Math.random()}.${fileExt}`;
            const filePath = `project-avatars/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        } catch (err) {
            console.error('Error uploading image:', err);
            setError(`Error al subir la imagen: ${err.message || 'Verifica que el bucket "avatars" exista y sea público.'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!project?.id) return;
        setLoading(true);
        setError(null);

        try {
            // Determine which name/title column to use by checking the current project object
            const nameColumn = project.name !== undefined ? 'name' :
                project.title !== undefined ? 'title' :
                    project.project_name !== undefined ? 'project_name' : 'name';

            const updateData = {
                [nameColumn]: formData.name,
                figma_url: formData.figma_url || null,
                jam_url: formData.jam_url || null,
                drive_url: formData.drive_url || null,
                avatar_url: formData.avatar_url || null,
            };

            const { error: updateError } = await supabase
                .from('projects')
                .update(updateData)
                .eq('id', project.id);

            if (updateError) {
                console.error('Supabase update error:', updateError);
                // Check if error is about missing columns
                if (updateError.code === '42703') {
                    throw new Error(`La base de datos no tiene las columnas necesarias. ¿Ejecutaste la migración? (${updateError.message})`);
                }
                throw updateError;
            }

            const notionData = {
                notion_page_id: notionPageId || null,
                notion_page_title: notionPageTitle || null,
                notion_page_url: notionPageUrl || null,
            };
            const notionChanged =
                (project.notion_page_id || '') !== (notionData.notion_page_id || '') ||
                (project.notion_page_title || '') !== (notionData.notion_page_title || '') ||
                (project.notion_page_url || '') !== (notionData.notion_page_url || '');

            if (canConfigureNotion && notionChanged) {
                await saveNotionSettings(project.id, notionData);
            }

            if (onTeamAssignmentChange && isAdmin) {
                await onTeamAssignmentChange(project.id, localTeamIds);
            }
            if (onClientAssignmentChange && (isAdmin || isClientLeader)) {
                await onClientAssignmentChange(project.id, localClientIds);
            }
            if (onClientUserAssignmentChange && (isAdmin || isClientLeader)) {
                await onClientUserAssignmentChange(project.id, localClientUserIds);
            }

            if (onUpdated) {
                onUpdated({
                    ...project,
                    ...formData,
                    ...notionData,
                    [nameColumn]: formData.name
                });
            }
            onClose();
        } catch (err) {
            console.error('Error updating project:', err);
            setError(err.message || 'Error al actualizar el proyecto.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-[#f3f4f6] border-none rounded-xl py-2.5 px-4 text-sm text-neutral-800 focus:ring-2 focus:ring-black outline-none transition-all";
    const labelClass = "text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block ml-1";

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose} modal={false}>
            <AnimatePresence>
                {isOpen && (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={onClose}
                            />
                        </Dialog.Overlay>

                        <Dialog.Content asChild>
                            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
                                <motion.div
                                    className="w-full max-w-[760px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-[28px] shadow-2xl font-product p-0 border border-neutral-100 pointer-events-auto"
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                >
                                    <div className="p-5 sm:p-6">
                                        <div className="flex items-center justify-between mb-5">
                                            <h2 className="text-xl font-bold text-neutral-900">Configurar Proyecto</h2>
                                            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid gap-4 lg:grid-cols-[200px,minmax(0,1fr)] lg:items-start">
                                                <div className="flex flex-col items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-5">
                                                    <div className="relative group">
                                                        <div className="h-24 w-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-100 shadow-sm sm:h-28 sm:w-28">
                                                            {formData.avatar_url ? (
                                                                <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                                    <Camera size={28} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                            <Camera size={20} />
                                                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                                        </label>
                                                        {uploading && (
                                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-full">
                                                                <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-neutral-400 font-medium text-center">
                                                        Click para cambiar imagen
                                                    </p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className={labelClass}>Nombre del Proyecto</label>
                                                        <input
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            className={inputClass}
                                                            placeholder="Ej: Rediseño Web"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <div>
                                                            <label className={labelClass}>Link de Figma (Design)</label>
                                                            <div className="relative">
                                                                <input
                                                                    name="figma_url"
                                                                    value={formData.figma_url}
                                                                    onChange={handleChange}
                                                                    className={`${inputClass} pl-10`}
                                                                    placeholder="https://www.figma.com/design/..."
                                                                />
                                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                                                                    <LinkIcon size={16} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className={labelClass}>Link de Figma JAM</label>
                                                            <div className="relative">
                                                                <input
                                                                    name="jam_url"
                                                                    value={formData.jam_url}
                                                                    onChange={handleChange}
                                                                    className={`${inputClass} pl-10`}
                                                                    placeholder="https://www.figma.com/board/..."
                                                                />
                                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                                                                    <LinkIcon size={16} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className={labelClass}>Link de Carpeta Drive</label>
                                                        <div className="relative">
                                                            <input
                                                                name="drive_url"
                                                                value={formData.drive_url}
                                                                onChange={handleChange}
                                                                className={`${inputClass} pl-10`}
                                                                placeholder="https://drive.google.com/drive/folders/..."
                                                            />
                                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                                                                <LinkIcon size={16} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3.5 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Share2 size={16} className="text-neutral-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Blotato</p>
                                                            <p className="text-xs font-semibold text-neutral-700 truncate">
                                                                {assignedAccounts.length > 0
                                                                    ? `${assignedAccounts.length} destino${assignedAccounts.length !== 1 ? 's' : ''} asignado${assignedAccounts.length !== 1 ? 's' : ''}`
                                                                    : allAccounts.length > 0
                                                                        ? `${allAccounts.length} cuenta${allAccounts.length !== 1 ? 's' : ''} disponible${allAccounts.length !== 1 ? 's' : ''}`
                                                                        : 'Sin cuentas sincronizadas'}
                                                            </p>
                                                            <p className="text-[11px] text-neutral-400">
                                                                Configurá qué cuentas usa este proyecto para publicar contenido.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsBlotatoConfigOpen(true)}
                                                        className="shrink-0 text-[11px] font-semibold text-neutral-600 hover:text-black underline underline-offset-2 transition"
                                                    >
                                                        {blotatoSyncing ? 'Sincronizando…' : 'Configurar →'}
                                                    </button>
                                                </div>

                                                <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3.5 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <MessageSquare size={16} className="text-neutral-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Team Chat</p>
                                                            {linkedChannel ? (
                                                                <p className="text-xs font-semibold text-neutral-700 truncate">#{linkedChannel.name}</p>
                                                            ) : (
                                                                <p className="text-xs text-neutral-400">Canal automático pendiente...</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {linkedChannel && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onClose();
                                                                navigate(`/dashboard/team-chat?channel=${linkedChannel.id}`);
                                                            }}
                                                            className="shrink-0 text-[11px] font-semibold text-neutral-600 hover:text-black underline underline-offset-2 transition"
                                                        >
                                                            Ir al chat →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {canConfigureNotion && (
                                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-start gap-2">
                                                            <BookOpen size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Notion</p>
                                                                <p className="text-xs font-semibold text-neutral-700">
                                                                    {notionPageId ? (notionPageTitle || 'Página seleccionada') : 'Sin página conectada'}
                                                                </p>
                                                                <p className="text-[11px] text-neutral-400">
                                                                    Buscá una página compartida con la integración para mostrarla en Servicios.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {notionPageId && (
                                                            <button
                                                                type="button"
                                                                onClick={handleClearNotionPage}
                                                                className="shrink-0 text-[11px] font-semibold text-neutral-500 hover:text-black underline underline-offset-2 transition"
                                                            >
                                                                Quitar
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2 sm:flex-row">
                                                        <div className="relative min-w-0 flex-1">
                                                            <input
                                                                type="search"
                                                                value={notionSearchQuery}
                                                                onChange={(event) => setNotionSearchQuery(event.target.value)}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === 'Enter') {
                                                                        event.preventDefault();
                                                                        handleSearchNotionPages();
                                                                    }
                                                                }}
                                                                className={`${inputClass} pl-10`}
                                                                placeholder="Ej: EPT, GRUPODTE, reuniones..."
                                                            />
                                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                                                                <Search size={16} />
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleSearchNotionPages}
                                                            disabled={notionSearching}
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60"
                                                        >
                                                            {notionSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                                            Buscar
                                                        </button>
                                                    </div>

                                                    {notionError && (
                                                        <p className="mt-2 text-xs font-medium text-red-500">{notionError}</p>
                                                    )}

                                                    {notionSearchResults.length > 0 && (
                                                        <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
                                                            {notionSearchResults.map((page) => {
                                                                const isSelected = page.id === notionPageId;
                                                                return (
                                                                    <button
                                                                        key={page.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectNotionPage(page)}
                                                                        className="flex w-full items-center justify-between gap-3 border-b border-neutral-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-neutral-50"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-xs font-semibold text-neutral-800">
                                                                                {page.title || 'Página sin título'}
                                                                            </p>
                                                                            <p className="truncate text-[10px] text-neutral-400">{page.id}</p>
                                                                        </div>
                                                                        {isSelected ? (
                                                                            <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                                                                        ) : (
                                                                            <span className="shrink-0 text-[10px] font-bold text-neutral-400">Elegir</span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isAdmin && (
                                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Users size={15} className="text-neutral-400 shrink-0" />
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Equipo DTE</p>
                                                    </div>
                                                    <MemberSelector
                                                        members={teamMemberOptions}
                                                        selected={localTeamIds}
                                                        onChange={setLocalTeamIds}
                                                        maxVisible={6}
                                                        label=""
                                                        addLabel="Sumar"
                                                        searchPlaceholder="Buscar worker o admin..."
                                                        emptyMessage="No encontramos miembros del equipo."
                                                    />
                                                </div>
                                            )}

                                            {(isAdmin || isClientLeader) && (
                                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <Users size={15} className="text-blue-400 shrink-0" />
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Clientes & Team</p>
                                                    </div>
                                                    {isAdmin && (
                                                        <MemberSelector
                                                            members={clientEntityOptions}
                                                            selected={localClientIds}
                                                            onChange={setLocalClientIds}
                                                            maxVisible={6}
                                                            label="Empresas / clientes principales"
                                                            addLabel="Asignar"
                                                            searchPlaceholder="Buscar empresa o cliente..."
                                                            emptyMessage="No encontramos clientes."
                                                        />
                                                    )}
                                                    {isAdmin && localClientIds.length === 0 ? (
                                                        <div className="rounded-[20px] border-2 border-dashed border-neutral-200 px-4 py-6 text-center">
                                                            <p className="text-xs text-neutral-400">Seleccioná una empresa para habilitar su team.</p>
                                                        </div>
                                                    ) : (
                                                        <MemberSelector
                                                            members={clientUserOptions}
                                                            selected={localClientUserIds}
                                                            onChange={setLocalClientUserIds}
                                                            maxVisible={6}
                                                            label="Team del cliente"
                                                            addLabel="Agregar"
                                                            searchPlaceholder="Buscar integrante del cliente..."
                                                            emptyMessage={isClientLeader ? 'Todavía no tenés equipo invitado.' : 'Este cliente no tiene usuarios asociados.'}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {error && (
                                                <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg text-center">
                                                    {error}
                                                </p>
                                            )}


                                            <div className="pt-1">
                                                <button
                                                    type="submit"
                                                    disabled={loading || uploading}
                                                    className="w-full bg-black text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    {loading ? 'Guardando...' : (
                                                        <>
                                                            <Save size={18} />
                                                            Guardar Cambios
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>

                                        {project?.id && (
                                            <BlotatoConfigModal
                                                projectId={project.id}
                                                isOpen={isBlotatoConfigOpen}
                                                onClose={() => setIsBlotatoConfigOpen(false)}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
};

export default EditProjectModal;
