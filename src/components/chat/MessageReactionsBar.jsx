import React, { memo, useMemo } from 'react';
import clsx from 'clsx';

const MessageReactionsBar = ({ reactions, currentUserId, onToggle }) => {
    const summary = useMemo(() => {
        const map = new Map();
        (reactions || []).forEach((reaction) => {
            const existing = map.get(reaction.emoji) || { count: 0, reactedByMe: false };
            existing.count += 1;
            if (reaction.user_id === currentUserId) existing.reactedByMe = true;
            map.set(reaction.emoji, existing);
        });
        return Array.from(map.entries()).map(([emoji, value]) => ({
            emoji,
            count: value.count,
            reactedByMe: value.reactedByMe,
        }));
    }, [reactions, currentUserId]);

    if (!summary.length) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {summary.map((item) => (
                <button
                    key={item.emoji}
                    type="button"
                    onClick={() => onToggle(item.emoji)}
                    className={clsx(
                        'px-2 py-0.5 rounded-full border text-xs flex items-center gap-1 transition',
                        item.reactedByMe ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-neutral-200 text-neutral-700'
                    )}
                    aria-pressed={item.reactedByMe}
                >
                    <span>{item.emoji}</span>
                    <span>{item.count}</span>
                </button>
            ))}
        </div>
    );
};

export default memo(MessageReactionsBar);
