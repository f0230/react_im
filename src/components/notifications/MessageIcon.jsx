import React from 'react';
import { MessageSquare } from 'lucide-react';

const MessageIcon = ({ unreadCount = 0, isOpen, onClick }) => {
    const displayCount = unreadCount > 99 ? '99+' : unreadCount;
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Mensajes"
            className={`relative flex items-center justify-center p-2 rounded-full transition-colors ${isOpen ? 'text-skyblue' : 'text-white hover:text-skyblue'}`}
        >
            <MessageSquare size={18} />
            {unreadCount > 0 && (
                <span
                    className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center"
                    aria-live="polite"
                >
                    {displayCount}
                </span>
            )}
        </button>
    );
};

export default MessageIcon;
