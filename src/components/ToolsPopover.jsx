import React, { useState, useEffect } from 'react';
import { LayoutGrid, MessageSquareText, Plus, Sparkles, Workflow, X, Check, Link as LinkIcon, Globe } from 'lucide-react';
import PopoverPanel from './ui/PopoverPanel';
import { MOBILE_POPOVER_BACKDROP_CLASS, POPOVER_PANEL_CLASS } from './ui/popoverStyles';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_TOOLS = [
    {
        id: 'ai-studio',
        name: 'DMS',
        url: 'https://aistudio.google.com/apps/drive/17FfeYIGkOd36xqDwEw5DIKxmWE3ikzUV?showPreview=true&showAssistant=true&fullscreenApplet=true',
        icon: 'Sparkles',
        color: 'from-blue-500 to-purple-600'
    },
    {
        id: 'studio-ia',
        name: 'Estudio IA',
        url: '/dashboard/studio',
        icon: 'Sparkles',
        color: 'from-[#e3ff31] to-[#47D065]'
    },
    {
        id: 'workflows',
        name: 'Workflows',
        url: '/dashboard/studio/workflow',
        icon: 'Workflow',
        color: 'from-neutral-300 to-white'
    },
    {
        id: 'client-message-ai',
        name: 'Mensajes IA',
        action: 'client-message-ai',
        icon: 'MessageSquareText',
        color: 'from-[#2f80ed] to-[#7b2ff7]'
    }
];

const ICONS = {
    Sparkles,
    Workflow,
    MessageSquareText,
    Globe,
    LinkIcon
};

const ToolsPopover = ({ inline = false, isOpen: controlledIsOpen, onToggle, onClose }) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [tools, setTools] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newTool, setNewTool] = useState({ name: '', url: '' });
    const [isLoading, setIsLoading] = useState(false);
    const isControlled = typeof controlledIsOpen === 'boolean';
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const closePopover = () => {
        setIsAdding(false);
        if (onClose) {
            onClose();
            return;
        }
        if (!isControlled) {
            setInternalIsOpen(false);
        }
    };

    const togglePopover = () => {
        if (onToggle) {
            onToggle();
            return;
        }
        if (!isControlled) {
            setInternalIsOpen((prev) => !prev);
        }
    };

    // Load tools from Supabase
    useEffect(() => {
        if (isOpen || inline) {
            fetchTools();
        }
    }, [isOpen, inline]);

    const fetchTools = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('tools')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setTools([...DEFAULT_TOOLS, ...data]);
        } else {
            // Fallback or just show default
            setTools(DEFAULT_TOOLS);
        }
        setIsLoading(false);
    };

    const handleAddTool = async (e) => {
        e.preventDefault();
        if (!newTool.name || !newTool.url) return;

        const { data, error } = await supabase
            .from('tools')
            .insert([{
                name: newTool.name,
                url: newTool.url.startsWith('http') ? newTool.url : `https://${newTool.url}`,
                icon: 'Globe',
                color: 'bg-gradient-to-br from-neutral-700 to-neutral-600'
            }])
            .select()
            .single();

        if (data && !error) {
            setTools(prev => [...prev, data]);
            setNewTool({ name: '', url: '' });
            setIsAdding(false);
        } else {
            console.error('Error adding tool:', error);
            // Optionally show toast error here
        }
    };

    const getIcon = (iconName) => {
        return ICONS[iconName] || Globe;
    };

    const openToolAction = (tool) => {
        if (tool.action === 'client-message-ai') {
            window.dispatchEvent(new CustomEvent('dte:open-client-message-ai'));
            closePopover();
        }
    };

    // Modo inline: grid directo sin popover flotante
    if (inline) {
        return (
            <div className="grid grid-cols-4 gap-4 py-1">
                {tools.map((tool) => {
                    const IconComp = getIcon(tool.icon);
                    const Tag = tool.action ? 'button' : 'a';
                    return (
                        <Tag
                            key={tool.id}
                            href={tool.action ? undefined : tool.url}
                            target={tool.action ? undefined : '_blank'}
                            rel={tool.action ? undefined : 'noopener noreferrer'}
                            type={tool.action ? 'button' : undefined}
                            onClick={tool.action ? () => openToolAction(tool) : undefined}
                            className="group flex flex-col items-center gap-1"
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-200 group-hover:scale-105 group-active:scale-95 bg-gradient-to-br",
                                tool.color || "from-neutral-600 to-neutral-700"
                            )}>
                                <IconComp size={17} />
                            </div>
                            <span className="text-[10px] text-white/60 text-center font-medium truncate w-full group-hover:text-white transition-colors">
                                {tool.name}
                            </span>
                        </Tag>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={togglePopover}
                className={cn(
                    "p-2 rounded-full transition-colors duration-200 flex items-center justify-center",
                    isOpen ? "bg-white/10 text-neutral-700" : "text-neutral-700 hover:text-black hover:bg-white/5"
                )}
                title="Tools"
            >
                <LayoutGrid size={20} />
            </button>

            <PopoverPanel
                isOpen={isOpen}
                onClose={closePopover}
                className={`${POPOVER_PANEL_CLASS} lg:w-[380px]`}
                backdropClassName={MOBILE_POPOVER_BACKDROP_CLASS}
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
                {/* Header estilo App Library */}
                <div className="pt-5 pb-4 px-6 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white/90">
                        <LayoutGrid size={15} strokeWidth={2.5} />
                        <span className="text-[15px] font-semibold tracking-tight">Herramientas</span>
                    </div>
                </div>

                <div className="px-5 pb-6">
                    {/* Add Tool Form */}
                    {isAdding ? (
                        <form onSubmit={handleAddTool} className="flex flex-col gap-3 mb-4 animate-in fade-in zoom-in duration-200 bg-[#2c2c2e]/80 rounded-2xl p-4 border border-white/5">
                            <input
                                type="text"
                                placeholder="Nombre de la app"
                                value={newTool.name}
                                onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
                                autoFocus
                            />
                            <input
                                type="text"
                                placeholder="URL (ej: google.com)"
                                value={newTool.url}
                                onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium py-2.5 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newTool.name || !newTool.url}
                                    className="flex-1 bg-white text-black text-sm font-semibold py-2.5 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Agregar
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Grid estilo App Library iOS */
                        <div className="grid grid-cols-4 gap-x-6 gap-y-5 px-2">
                            {tools.map((tool) => {
                                const IconComp = getIcon(tool.icon);
                                const isLight = tool.id === 'studio-ia' || tool.id === 'workflows';
                                const Tag = tool.action ? 'button' : 'a';
                                return (
                                    <Tag
                                        key={tool.id}
                                        href={tool.action ? undefined : tool.url}
                                        target={tool.action ? undefined : '_blank'}
                                        rel={tool.action ? undefined : 'noopener noreferrer'}
                                        type={tool.action ? 'button' : undefined}
                                        onClick={tool.action ? () => openToolAction(tool) : undefined}
                                        className="group flex flex-col items-center gap-2 relative"
                                    >
                                        {/* Icono grande con fondo tipo carpeta iOS */}
                                        <div className={cn(
                                            "w-[62px] h-[62px] rounded-[18px] flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-active:scale-95 shadow-lg",
                                            "bg-gradient-to-br",
                                            tool.color || "from-neutral-600 to-neutral-700",
                                            isLight ? "text-black" : "text-white"
                                        )}>
                                            <IconComp size={26} strokeWidth={1.8} />
                                        </div>
                                        {/* Label debajo */}
                                        <span className="text-[11px] text-white/80 text-center font-medium w-full truncate group-hover:text-white transition-colors">
                                            {tool.name}
                                        </span>
                                    </Tag>
                                );
                            })}

                            {/* Add New Trigger */}
                            <button
                                onClick={() => setIsAdding(true)}
                                className="group flex flex-col items-center gap-2"
                            >
                                <div className="w-[62px] h-[62px] rounded-[18px] flex items-center justify-center text-white/50 bg-[#2c2c2e] border border-dashed border-white/20 hover:border-white/40 hover:bg-[#3a3a3c] transition-all duration-200 group-hover:scale-105 group-active:scale-95">
                                    <Plus size={24} strokeWidth={2} />
                                </div>
                                <span className="text-[11px] text-white/50 text-center font-medium w-full group-hover:text-white/70 transition-colors">
                                    Nueva
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </PopoverPanel>
        </div>
    );
};

export default ToolsPopover;
