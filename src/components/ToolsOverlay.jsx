import { useState, useEffect } from 'react';
import { Globe, Sparkles, Link as LinkIcon, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_TOOLS = [
    {
        id: 'ai-studio',
        name: 'DMS',
        url: 'https://aistudio.google.com/apps/drive/17FfeYIGkOd36xqDwEw5DIKxmWE3ikzUV?showPreview=true&showAssistant=true&fullscreenApplet=true',
        icon: 'Sparkles',
        color: 'bg-gradient-to-br from-blue-500 to-purple-600'
    },
    {
        id: 'studio-ia',
        name: 'Studio IA',
        url: '/dashboard/studio',
        icon: 'Sparkles',
        color: 'bg-gradient-to-br from-[#e3ff31] to-[#47D065] text-black'
    }
];

const ICONS = { Sparkles, Globe, LinkIcon };

const ToolsOverlay = ({ isOpen, onClose }) => {
    const [tools, setTools] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newTool, setNewTool] = useState({ name: '', url: '' });

    useEffect(() => {
        if (isOpen) fetchTools();
    }, [isOpen]);

    const fetchTools = async () => {
        const { data, error } = await supabase.from('tools').select('*').order('created_at', { ascending: true });
        setTools(error || !data ? DEFAULT_TOOLS : [...DEFAULT_TOOLS, ...data]);
    };

    const handleAddTool = async (e) => {
        e.preventDefault();
        if (!newTool.name || !newTool.url) return;
        const { data, error } = await supabase
            .from('tools')
            .insert([{ name: newTool.name, url: newTool.url.startsWith('http') ? newTool.url : `https://${newTool.url}`, icon: 'Globe', color: 'bg-gradient-to-br from-neutral-700 to-neutral-600' }])
            .select().single();
        if (data && !error) {
            setTools(prev => [...prev, data]);
            setNewTool({ name: '', url: '' });
            setIsAdding(false);
        }
    };

    const getIcon = (iconName) => ICONS[iconName] || Globe;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                    className="fixed inset-0 z-50 flex flex-col"
                    style={{ backdropFilter: 'blur(48px) saturate(1.8)', background: 'rgba(10,10,10,0.75)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-16 pb-6">
                        <h2 className="text-white text-2xl font-semibold tracking-tight">Herramientas</h2>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto px-6 pb-10">
                        {isAdding ? (
                            <form onSubmit={handleAddTool} className="flex flex-col gap-3 mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
                                <input
                                    type="text"
                                    placeholder="Nombre"
                                    value={newTool.name}
                                    onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    placeholder="URL (ej: google.com)"
                                    value={newTool.url}
                                    onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                                />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-sm py-2 rounded-xl transition-colors">Cancelar</button>
                                    <button type="submit" disabled={!newTool.name || !newTool.url} className="flex-1 bg-white text-black text-sm font-medium py-2 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40">Agregar</button>
                                </div>
                            </form>
                        ) : null}

                        <div className="grid grid-cols-4 gap-x-4 gap-y-6">
                            {tools.map((tool) => {
                                const IconComp = getIcon(tool.icon);
                                return (
                                    <motion.a
                                        key={tool.id}
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex flex-col items-center gap-2"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <div className={cn(
                                            "w-16 h-16 rounded-[22px] flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-105",
                                            tool.color || "bg-neutral-700"
                                        )}>
                                            <IconComp size={28} />
                                        </div>
                                        <span className="text-[11px] text-white/75 text-center font-medium w-full truncate group-hover:text-white transition-colors">
                                            {tool.name}
                                        </span>
                                    </motion.a>
                                );
                            })}

                            {/* Add */}
                            <button onClick={() => setIsAdding(true)} className="group flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center text-white/50 bg-white/5 border-2 border-dashed border-white/15 hover:border-white/30 hover:bg-white/10 transition-all group-hover:scale-105 group-active:scale-95">
                                    <Plus size={24} />
                                </div>
                                <span className="text-[11px] text-white/40 text-center font-medium w-full group-hover:text-white/60 transition-colors">
                                    Nueva
                                </span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ToolsOverlay;
