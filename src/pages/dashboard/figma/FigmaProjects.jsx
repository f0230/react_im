import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Figma,
    Search,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Loader2,
    FolderOpen,
    ArrowRight,
    UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import FigmaPanel from '@/components/FigmaPanel';

const FIGMA_TEAM_ID = '1600493316386635894';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

const FigmaProjects = () => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncedProjects, setSyncedProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);

    const fetchUserFigmaProjects = useCallback(async () => {
        if (!user?.email) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/figma-proxy?action=sync-user-projects&email=${encodeURIComponent(user.email)}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al sincronizar proyectos de Figma');

            setSyncedProjects(data.projects || []);

            // Si solo hay uno, lo seleccionamos por defecto
            if (data.projects?.length === 1) {
                setSelectedProject(data.projects[0]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.email]);

    useEffect(() => {
        fetchUserFigmaProjects();
    }, [fetchUserFigmaProjects]);

    return (
        <div className="font-product text-neutral-900 pb-16">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-500 font-bold mb-2">
                    <Figma size={14} />
                    Figma Integration
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
                    Mis Diseños
                </h1>
                <p className="text-neutral-500 mt-3 max-w-2xl text-lg">
                    Proyectos de Figma vinculados automáticamente a tu cuenta <span className="text-neutral-900 font-semibold">{user?.email}</span>.
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <Loader2 size={40} className="animate-spin text-violet-500" />
                    <p className="text-neutral-500 font-medium">Buscando tus proyectos en Figma...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 rounded-[32px] p-8 text-center max-w-2xl mx-auto">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-800">Ups! Algo salió mal</h3>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button
                        onClick={fetchUserFigmaProjects}
                        className="mt-6 px-6 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={18} />
                        Reintentar
                    </button>
                </div>
            ) : syncedProjects.length === 0 ? (
                <div className="bg-white border border-neutral-100 rounded-[32px] p-12 text-center max-w-2xl mx-auto shadow-sm">
                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-neutral-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-800">No encontramos proyectos</h3>
                    <p className="text-neutral-500 mt-3">
                        No pudimos encontrar proyectos en el Team de Figma que coincidan con tu correo.
                        Asegúrate de que tu cuenta de Figma use el mismo correo o que el proyecto tenga tu nombre.
                    </p>
                    <div className="mt-8 p-4 bg-violet-50 rounded-2xl text-left border border-violet-100">
                        <p className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <UserCheck size={14} /> Tip profesional
                        </p>
                        <p className="text-sm text-violet-600">
                            Pide al administrador que incluya tu nombre o el correo <span className="font-bold underline">{user?.email}</span> en el nombre del proyecto de Figma.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Selector de Proyectos (Sidebar) */}
                    <div className="lg:col-span-4 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 ml-2">Proyectos Encontrados</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {syncedProjects.map((proj) => (
                                <button
                                    key={proj.id}
                                    onClick={() => setSelectedProject(proj)}
                                    className={`flex items-center justify-between p-5 rounded-[24px] transition-all text-left border-2 ${selectedProject?.id === proj.id
                                            ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200'
                                            : 'bg-white border-neutral-100 text-neutral-800 hover:border-violet-200 hover:bg-violet-50/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedProject?.id === proj.id ? 'bg-white/20' : 'bg-neutral-100 text-neutral-500'
                                            }`}>
                                            <FolderOpen size={20} />
                                        </div>
                                        <div>
                                            <span className="block font-bold truncate max-w-[180px]">{proj.name}</span>
                                            <span className={`text-[10px] uppercase font-black tracking-tighter ${selectedProject?.id === proj.id ? 'text-white/60' : 'text-neutral-400'
                                                }`}>ID: {proj.id}</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className={selectedProject?.id === proj.id ? 'opacity-100' : 'opacity-0'} />
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={fetchUserFigmaProjects}
                            className="w-full mt-4 flex items-center justify-center gap-2 py-4 text-xs font-bold text-neutral-400 hover:text-violet-500 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Sincronizar de nuevo
                        </button>
                    </div>

                    {/* Visualización del Proyecto Seleccionado */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            {selectedProject ? (
                                <motion.div
                                    key={selectedProject.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-8"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-black text-neutral-900">{selectedProject.name}</h2>
                                            <p className="text-sm text-neutral-400">Archivos y prototipos activos</p>
                                        </div>
                                        <a
                                            href={selectedProject.figmaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-3 rounded-2xl bg-neutral-100 text-neutral-600 hover:bg-neutral-900 hover:text-white transition-all shadow-sm"
                                        >
                                            <ExternalLink size={20} />
                                        </a>
                                    </div>

                                    <FigmaPanel
                                        project={{ figma_project_id: selectedProject.id }}
                                        isAdmin={profile?.role === 'admin'}
                                        onFigmaProjectUpdate={() => { }}
                                    />
                                </motion.div>
                            ) : (
                                <div className="h-full flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-[32px] p-12 text-center">
                                    <div>
                                        <Figma size={48} className="text-neutral-200 mx-auto mb-4" />
                                        <p className="text-neutral-400 font-medium italic">Selecciona un proyecto de la lista para ver sus archivos</p>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FigmaProjects;
