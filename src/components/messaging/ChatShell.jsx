import React from 'react';
import { Moon, Search, Sun } from 'lucide-react';
import MessagingTabs from '@/components/messaging/MessagingTabs';
import useChatDark from '@/hooks/useChatDark';

/**
 * Wrapper compartido para todas las páginas de mensajería.
 *
 * Props:
 *   searchTerm          — valor del input de búsqueda en sidebar
 *   onSearchChange      — setter del searchTerm
 *   searchPlaceholder   — placeholder del input (default: "Buscar...")
 *   selectedId          — id del item activo (controla responsive show/hide del sidebar)
 *   sidebarList         — nodo React con los items de la lista (channels, threads, etc.)
 *   sidebarActions      — botones extra en la barra de acciones del sidebar (ej: botón "+")
 *   threadPanel         — panel de hilo opcional (ocupa la tercera columna en desktop)
 *   children            — área principal (header + mensajes + composer)
 */
const ChatShell = ({
    searchTerm = '',
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    selectedId,
    sidebarList,
    sidebarActions,
    threadPanel,
    children,
}) => {
    const { isDark, toggle } = useChatDark();
    const hasSidebar = sidebarList !== undefined && sidebarList !== null;

    return (
        <div
            className="font-product text-neutral-900 fixed inset-x-0 z-10 mx-auto w-full max-w-[1440px] flex flex-col overflow-hidden overscroll-none bg-white"
            data-chat-dark={isDark ? 'true' : undefined}
            style={{
                top: '45px',
                height: 'calc(var(--app-height, 100dvh) + var(--app-viewport-offset-top, 0px) - 45px)',
            }}
        >
            <div
                className={`flex-1 grid grid-cols-1 min-h-0 ${
                    hasSidebar && threadPanel ? 'lg:grid-cols-[260px_1fr_340px]'
                    : hasSidebar ? 'lg:grid-cols-[260px_1fr]'
                    : threadPanel ? 'lg:grid-cols-[1fr_340px]'
                    : 'grid-cols-1'
                }`}
            >
                {/* ── Sidebar ── */}
                {hasSidebar && (
                <div className={`flex flex-col min-h-0 h-full overflow-hidden border-r border-neutral-100 bg-white ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
                    <MessagingTabs variant="sidebar" />

                    <div className="px-3 pb-2 space-y-1.5 border-b border-neutral-100">
                        <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange?.(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-7 pr-2 py-1.5 text-[12px] focus:border-neutral-300 focus:bg-white transition-all"
                                />
                            </div>
                            <button
                                onClick={toggle}
                                className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
                                title={isDark ? 'Modo claro' : 'Modo oscuro'}
                            >
                                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                            </button>
                            {sidebarActions}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar overscroll-y-contain">
                        {sidebarList}
                    </div>
                </div>
                )}

                {/* ── Main content ── */}
                <div className={`relative flex flex-col min-h-0 h-full overflow-hidden bg-white ${hasSidebar && !selectedId ? 'hidden lg:flex' : 'flex'}`}>
                    {children}
                </div>

                {/* ── Thread panel (opcional) ── */}
                {threadPanel && (
                    <div className="hidden lg:flex flex-col min-h-0 h-full overflow-hidden">
                        {threadPanel}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatShell;
