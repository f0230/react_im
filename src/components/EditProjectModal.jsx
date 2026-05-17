import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Search, CheckCircle2, Loader2, Users, ChevronRight, MessageSquare, BookOpen, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { BlotatoConfigModal } from '@/components/projects/BlotatoConfigModal';
import { useAuth } from '@/context/AuthContext';
import { saveNotionSettings, searchNotionPages } from '@/services/notionService';
import { MemberSelector } from '@/components/ui/member-selector';
import FigmaIcon from '@/assets/figma-icon.svg';
import GoogleDriveIcon from '@/assets/google-drive.svg';

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
                                    className="w-full max-w-[480px] max-h-[calc(100vh-2rem)] bg-white rounded-[24px] shadow-2xl font-product border border-neutral-100 pointer-events-auto overflow-hidden flex flex-col"
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                >
                                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent" style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: '#d1d5db transparent'
                                    }}>
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
                                            <h2 className="text-[17px] font-semibold text-neutral-900">Configurar Proyecto</h2>
                                            <button onClick={onClose} className="text-[15px] font-semibold text-blue-500 hover:text-blue-600 transition-colors">
                                                Listo
                                            </button>
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            {/* Avatar Section */}
                                            <div className="flex flex-col items-center gap-3 mb-6">
                                                <div className="relative group">
                                                    <div className="h-24 w-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200 shadow-sm">
                                                        {formData.avatar_url ? (
                                                            <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
                                                                <Camera size={32} />
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
                                            </div>

                                            {/* Project Name */}
                                            <div>
                                                <label className={labelClass}>Nombre del Proyecto</label>
                                                <input
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 px-4 text-sm text-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    placeholder="Ej: Rediseño Web"
                                                    required
                                                />
                                            </div>

                                            {/* Links Section - macOS Settings style */}
                                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden">
                                                {/* Figma Design */}
                                                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 last:border-b-0">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <img src={FigmaIcon} alt="Figma" className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-neutral-700">Figma Design</p>
                                                        <input
                                                            name="figma_url"
                                                            value={formData.figma_url}
                                                            onChange={handleChange}
                                                            className="w-full bg-transparent text-xs text-neutral-500 placeholder-neutral-400 border-none outline-none focus:ring-0 p-0 mt-0.5"
                                                            placeholder="https://www.figma.com/design/..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* Figma JAM */}
                                                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 last:border-b-0">
                                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                        <img src={FigmaIcon} alt="FigJam" className="w-5 h-5 opacity-75" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-neutral-700">Figma JAM</p>
                                                        <input
                                                            name="jam_url"
                                                            value={formData.jam_url}
                                                            onChange={handleChange}
                                                            className="w-full bg-transparent text-xs text-neutral-500 placeholder-neutral-400 border-none outline-none focus:ring-0 p-0 mt-0.5"
                                                            placeholder="https://www.figma.com/board/..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* Google Drive */}
                                                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 last:border-b-0">
                                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <img src={GoogleDriveIcon} alt="Google Drive" className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-neutral-700">Google Drive</p>
                                                        <input
                                                            name="drive_url"
                                                            value={formData.drive_url}
                                                            onChange={handleChange}
                                                            className="w-full bg-transparent text-xs text-neutral-500 placeholder-neutral-400 border-none outline-none focus:ring-0 p-0 mt-0.5"
                                                            placeholder="https://drive.google.com/drive/folders/..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Integrations Section */}
                                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden">
                                                {/* Blotato Row */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsBlotatoConfigOpen(true)}
                                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100 transition-colors"
                                                    disabled={blotatoSyncing}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <Share2 size={18} className="text-purple-600" />
                                                        </div>
                                                        <div className="text-left min-w-0">
                                                            <p className="text-xs font-semibold text-neutral-900">Blotato</p>
                                                            <p className="text-xs text-neutral-500 truncate">
                                                                {assignedAccounts.length > 0
                                                                    ? `${assignedAccounts.length} destino${assignedAccounts.length !== 1 ? 's' : ''}`
                                                                    : 'Configura tus cuentas'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={18} className="text-neutral-400 flex-shrink-0" />
                                                </button>

                                                {/* Team Chat Row */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (linkedChannel) {
                                                            onClose();
                                                            navigate(`/dashboard/team-chat?channel=${linkedChannel.id}`);
                                                        }
                                                    }}
                                                    disabled={!linkedChannel}
                                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100 disabled:hover:bg-neutral-50 disabled:opacity-60 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                            <MessageSquare size={18} className="text-blue-600" />
                                                        </div>
                                                        <div className="text-left min-w-0">
                                                            <p className="text-xs font-semibold text-neutral-900">Team Chat</p>
                                                            <p className="text-xs text-neutral-500 truncate">
                                                                {linkedChannel ? `#${linkedChannel.name}` : 'Pendiente...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={18} className="text-neutral-400 flex-shrink-0" />
                                                </button>
                                            </div>

                                            {canConfigureNotion && (
                                                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden">
                                                    {/* Notion Row */}
                                                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                                <BookOpen size={18} className="text-gray-700" />
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <p className="text-xs font-semibold text-neutral-900">Notion</p>
                                                                <p className="text-xs text-neutral-500 truncate">
                                                                    {notionPageId ? notionPageTitle : 'No conectada'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {notionPageId && (
                                                            <button
                                                                type="button"
                                                                onClick={handleClearNotionPage}
                                                                className="shrink-0 text-[11px] font-semibold text-red-600 hover:text-red-700 transition"
                                                            >
                                                                Quitar
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Search */}
                                                    <div className="px-4 py-3 border-b border-neutral-200 space-y-2">
                                                        <div className="relative">
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
                                                                className="w-full bg-white border border-neutral-200 rounded-lg py-2 px-3 pl-9 text-xs text-neutral-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                                placeholder="Busca una página..."
                                                            />
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                                                <Search size={14} />
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleSearchNotionPages}
                                                            disabled={notionSearching}
                                                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition"
                                                        >
                                                            {notionSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                                            Buscar
                                                        </button>
                                                    </div>

                                                    {/* Results */}
                                                    {notionError && (
                                                        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
                                                            <p className="text-xs font-medium text-red-700">{notionError}</p>
                                                        </div>
                                                    )}

                                                    {notionSearchResults.length > 0 && (
                                                        <div className="max-h-48 overflow-y-auto border-t border-neutral-200">
                                                            {notionSearchResults.map((page) => {
                                                                const isSelected = page.id === notionPageId;
                                                                return (
                                                                    <button
                                                                        key={page.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectNotionPage(page)}
                                                                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 border-b border-neutral-100 last:border-b-0 hover:bg-white transition-colors"
                                                                    >
                                                                        <div className="min-w-0 text-left">
                                                                            <p className="truncate text-xs font-semibold text-neutral-800">
                                                                                {page.title || 'Sin título'}
                                                                            </p>
                                                                        </div>
                                                                        {isSelected && (
                                                                            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isAdmin && (
                                                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                                                    <p className="text-xs font-semibold uppercase text-neutral-600 mb-3">Equipo DTE</p>
                                                    <MemberSelector
                                                        members={teamMemberOptions}
                                                        selected={localTeamIds}
                                                        onChange={setLocalTeamIds}
                                                        maxVisible={6}
                                                        label=""
                                                        addLabel="Agregar"
                                                        searchPlaceholder="Buscar miembro..."
                                                        emptyMessage="Sin miembros"
                                                    />
                                                </div>
                                            )}

                                            {(isAdmin || isClientLeader) && (
                                                <div className="space-y-3">
                                                    {isAdmin && (
                                                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                                                            <p className="text-xs font-semibold uppercase text-neutral-600 mb-3">Clientes</p>
                                                            <MemberSelector
                                                                members={clientEntityOptions}
                                                                selected={localClientIds}
                                                                onChange={setLocalClientIds}
                                                                maxVisible={6}
                                                                label=""
                                                                addLabel="Asignar"
                                                                searchPlaceholder="Buscar cliente..."
                                                                emptyMessage="Sin clientes"
                                                            />
                                                        </div>
                                                    )}
                                                    {localClientIds.length > 0 && (
                                                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                                                            <p className="text-xs font-semibold uppercase text-neutral-600 mb-3">Team del Cliente</p>
                                                            <MemberSelector
                                                                members={clientUserOptions}
                                                                selected={localClientUserIds}
                                                                onChange={setLocalClientUserIds}
                                                                maxVisible={6}
                                                                label=""
                                                                addLabel="Agregar"
                                                                searchPlaceholder="Buscar miembro..."
                                                                emptyMessage={isClientLeader ? 'Sin equipo invitado' : 'Sin usuarios'}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {error && (
                                                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                                                    <p className="text-xs font-medium text-red-700">
                                                        {error}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Footer Buttons */}
                                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                                                <button
                                                    type="button"
                                                    onClick={onClose}
                                                    className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={loading || uploading}
                                                    className="px-6 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-[0.98]"
                                                >
                                                    {loading ? 'Guardando...' : 'Guardar'}
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
