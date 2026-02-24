import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Camera, Link as LinkIcon, Save, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const EditProjectModal = ({
    isOpen,
    onClose,
    project,
    onUpdated,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
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
            setLinkedChannel(null);

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

            if (onUpdated) {
                onUpdated({
                    ...project,
                    ...formData,
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

    const inputClass = "w-full bg-[#f3f4f6] border-none rounded-xl py-3 px-4 text-sm text-neutral-800 focus:ring-2 focus:ring-black outline-none transition-all";
    const labelClass = "text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5 block ml-1";

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
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
                                    className="w-full max-w-[440px] bg-white rounded-[28px] shadow-2xl font-product p-0 border border-neutral-100 pointer-events-auto"
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-bold text-neutral-900">Configurar Proyecto</h2>
                                            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            {/* Avatar section */}
                                            <div className="flex flex-col items-center gap-3 py-2">
                                                <div className="relative group">
                                                    <div className="h-24 w-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-100 shadow-sm">
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
                                                <p className="text-[10px] text-neutral-400 font-medium">Click para cambiar imagen</p>
                                            </div>

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

                                            {/* TeamChat Channel */}
                                            <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 flex items-center justify-between gap-3">
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

                                            {error && (
                                                <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg text-center">
                                                    {error}
                                                </p>
                                            )}


                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading || uploading}
                                                    className="w-full bg-black text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50"
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
