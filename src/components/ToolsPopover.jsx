import React, { useState, useEffect } from 'react';
import { LayoutGrid, Plus, Sparkles, X, Check, Link as LinkIcon, Globe } from 'lucide-react';
import PopoverPanel from './ui/PopoverPanel';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_TOOLS = [
    {
        id: 'ai-studio',
        name: 'DMS',
        url: 'https://aistudio.google.com/apps/drive/17FfeYIGkOd36xqDwEw5DIKxmWE3ikzUV?showPreview=true&showAssistant=true&fullscreenApplet=true',
        icon: 'Sparkles', // Storing icon name for persistence
        color: 'bg-gradient-to-br from-blue-500 to-purple-600'
    }
];

const ICONS = {
    Sparkles,
    Globe,
    LinkIcon
};

const ToolsPopover = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tools, setTools] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newTool, setNewTool] = useState({ name: '', url: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Load tools from Supabase
    useEffect(() => {
        if (isOpen) {
            fetchTools();
        }
    }, [isOpen]);

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

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-2 rounded-full transition-colors duration-200 flex items-center justify-center",
                    isOpen ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
                )}
                title="Tools"
            >
                <LayoutGrid size={20} />
            </button>

            <PopoverPanel
                isOpen={isOpen}
                onClose={() => {
                    setIsOpen(false);
                    setIsAdding(false);
                }}
                className="fixed top-14 left-4 right-4 sm:left-auto sm:right-0 sm:top-full sm:absolute mt-2 w-auto sm:w-[360px] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 z-50 origin-top overflow-hidden"
                initial={{ opacity: 0, scale: 0.9, y: -10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, y: -10, filter: 'blur(10px)' }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-white font-medium text-lg">Tools</h3>
                </div>

                {/* Add Tool Form */}
                {isAdding ? (
                    <form onSubmit={handleAddTool} className="flex flex-col gap-3 mb-2 animate-in fade-in zoom-in duration-200">
                        <input
                            type="text"
                            placeholder="Tool Name"
                            value={newTool.name}
                            onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="URL (e.g., google.com)"
                            value={newTool.url}
                            onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-sm py-2 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newTool.name || !newTool.url}
                                className="flex-1 bg-white text-black text-sm font-medium py-2 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Tool
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Grid */
                    <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                        {tools.map((tool) => {
                            const IconComp = getIcon(tool.icon);
                            return (
                                <a
                                    key={tool.id}
                                    href={tool.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center gap-2 relative"
                                >
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95",
                                        tool.color || "bg-neutral-700"
                                    )}>
                                        <IconComp size={24} />
                                    </div>
                                    <span className="text-[11px] text-white/80 text-center font-medium truncate w-full px-1 group-hover:text-white transition-colors">
                                        {tool.name}
                                    </span>

                                    {/* Delete option could be added here later */}
                                </a>
                            );
                        })}

                        {/* Add New Trigger */}
                        <button
                            onClick={() => setIsAdding(true)}
                            className="group flex flex-col items-center gap-2"
                        >
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white/50 bg-white/5 border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-200 group-hover:scale-105 group-active:scale-95">
                                <Plus size={24} />
                            </div>
                            <span className="text-[11px] text-white/50 text-center font-medium truncate w-full px-1 group-hover:text-white/70 transition-colors">
                                New
                            </span>
                        </button>
                    </div>
                )}
            </PopoverPanel>
        </div>
    );
};

export default ToolsPopover;
