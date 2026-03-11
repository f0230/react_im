import * as React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Check, Plus, Search } from 'lucide-react';

import { cn } from '@/lib/utils';

const getInitials = (name = '') => {
    return name
        .split(' ')
        .map((chunk) => chunk[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getMemberMeta = (member) => member?.subtitle || member?.email || '';

function Avatar({ member, isSelected, onClick }) {
    const shortName = member?.name?.split(' ')?.[0] || member?.name || 'Member';

    return (
        <motion.button
            type="button"
            layoutId={`member-${member.id}`}
            onClick={onClick}
            className="group relative flex cursor-pointer flex-col items-center gap-1.5 outline-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        >
            <div
                className={cn(
                    'relative h-12 w-12 overflow-hidden rounded-full bg-white shadow-sm transition-all duration-200',
                    'group-focus-visible:ring-2 group-focus-visible:ring-black/20 group-focus-visible:ring-offset-2',
                    isSelected ? 'opacity-100 shadow-[0_10px_24px_rgba(0,0,0,0.08)]' : 'opacity-50 group-hover:opacity-80'
                )}
            >
                {member.avatar ? (
                    <img
                        src={member.avatar}
                        alt={member.name}
                        className={cn(
                            'h-full w-full object-cover transition-all duration-200',
                            !isSelected && 'grayscale'
                        )}
                    />
                ) : (
                    <div
                        className={cn(
                            'flex h-full w-full items-center justify-center text-sm font-semibold transition-colors duration-200',
                            isSelected ? 'bg-black/10 text-neutral-900' : 'bg-neutral-200 text-neutral-500'
                        )}
                    >
                        {getInitials(member.name)}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {!isSelected && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                        className="absolute bottom-5 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-black shadow-sm"
                    >
                        <Plus className="h-2.5 w-2.5 text-white" strokeWidth={2.6} />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.span
                layoutId={`member-name-${member.id}`}
                className={cn(
                    'max-w-[64px] truncate text-xs font-medium transition-colors duration-200',
                    isSelected ? 'text-neutral-900' : 'text-neutral-500'
                )}
            >
                {shortName}
            </motion.span>
        </motion.button>
    );
}

function AddButton({ onClick, isOpen, label }) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            className="group flex cursor-pointer flex-col items-center gap-1.5 outline-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
        >
            <div
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed transition-all duration-200',
                    'group-focus-visible:ring-2 group-focus-visible:ring-black/20 group-focus-visible:ring-offset-2',
                    isOpen
                        ? 'border-neutral-900 bg-neutral-900/5 text-neutral-900'
                        : 'border-neutral-300 bg-transparent text-neutral-500 hover:border-neutral-500 hover:bg-white'
                )}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Plus className="h-5 w-5" />
                </motion.div>
            </div>
            <span
                className={cn(
                    'text-xs font-medium transition-colors duration-200',
                    isOpen ? 'text-neutral-900' : 'text-neutral-500'
                )}
            >
                {label}
            </span>
        </motion.button>
    );
}

function Dropdown({
    members,
    selected,
    onSelect,
    searchQuery,
    onSearchChange,
    searchPlaceholder,
    emptyMessage,
    max,
}) {
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const maxReached = Boolean(max && selected.length >= max);

    const filteredMembers = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return members
            .filter((member) => {
                if (!query) return true;
                return [member.name, member.email, member.subtitle]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(query));
            })
            .sort((a, b) => {
                const aSelected = selected.includes(a.id);
                const bSelected = selected.includes(b.id);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [members, searchQuery, selected]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.16)]"
        >
            <div className="border-b border-neutral-100 bg-white/90 p-3 backdrop-blur-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/80 py-2.5 pl-9 pr-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                    />
                </div>
                {maxReached && (
                    <p className="mt-2 text-xs font-medium text-neutral-500">
                        Limite alcanzado. Quita uno para agregar otro.
                    </p>
                )}
            </div>

            <div className="max-h-72 overflow-y-auto p-2 [scrollbar-width:thin]">
                <AnimatePresence mode="popLayout">
                    {filteredMembers.map((member, index) => {
                        const isSelected = selected.includes(member.id);
                        const isDisabled = !isSelected && maxReached;
                        const meta = getMemberMeta(member);

                        return (
                            <motion.button
                                key={member.id}
                                type="button"
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ delay: index * 0.015, duration: 0.14 }}
                                onClick={() => !isDisabled && onSelect(member.id)}
                                disabled={isDisabled}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                                    isSelected
                                        ? 'bg-black/[0.04] hover:bg-black/[0.06]'
                                        : 'hover:bg-neutral-100',
                                    isDisabled && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <div
                                    className={cn(
                                        'h-9 w-9 shrink-0 overflow-hidden rounded-full transition-all duration-200',
                                        !isSelected && 'opacity-70'
                                    )}
                                >
                                    {member.avatar ? (
                                        <img
                                            src={member.avatar}
                                            alt={member.name}
                                            className={cn(
                                                'h-full w-full object-cover',
                                                !isSelected && 'grayscale'
                                            )}
                                        />
                                    ) : (
                                        <div
                                            className={cn(
                                                'flex h-full w-full items-center justify-center text-xs font-semibold',
                                                isSelected
                                                    ? 'bg-black/10 text-neutral-900'
                                                    : 'bg-neutral-200 text-neutral-600'
                                            )}
                                        >
                                            {getInitials(member.name)}
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div
                                        className={cn(
                                            'truncate text-sm font-medium',
                                            isSelected ? 'text-neutral-900' : 'text-neutral-800'
                                        )}
                                    >
                                        {member.name}
                                    </div>
                                    {meta && (
                                        <div
                                            className={cn(
                                                'truncate text-xs',
                                                isSelected ? 'text-neutral-500' : 'text-neutral-500'
                                            )}
                                        >
                                            {meta}
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
                                        isSelected
                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                            : 'border-neutral-300'
                                    )}
                                >
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                                        >
                                            <Check className="h-3 w-3" strokeWidth={3} />
                                        </motion.div>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>

                {filteredMembers.length === 0 && (
                    <div className="px-3 py-10 text-center text-sm text-neutral-500">
                        {emptyMessage}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

const MemberSelector = React.forwardRef(function MemberSelector(
    {
        members = [],
        selected = [],
        onChange,
        max,
        maxVisible = 5,
        label,
        className,
        addLabel = 'Agregar',
        searchPlaceholder = 'Buscar...',
        emptyMessage = 'No se encontraron resultados',
    },
    ref
) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortedMembers = React.useMemo(() => {
        return [...members].sort((a, b) => {
            const aSelected = selected.includes(a.id);
            const bSelected = selected.includes(b.id);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [members, selected]);

    const visibleMembers = sortedMembers.slice(0, maxVisible);

    const toggleMember = (id) => {
        const isCurrentlySelected = selected.includes(id);

        if (isCurrentlySelected) {
            onChange?.(selected.filter((selectedId) => selectedId !== id));
            return;
        }

        if (max && selected.length >= max) return;
        onChange?.([...selected, id]);
    };

    return (
        <div ref={ref} className={cn('relative', className)}>
            {label && (
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                        {label}
                    </span>
                    <span className="text-xs text-neutral-400">
                        {selected.length} seleccionados
                    </span>
                </div>
            )}

            <div
                ref={containerRef}
                className="rounded-[28px] border border-neutral-200 bg-[#f4f4f4] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5"
            >
                <LayoutGroup>
                    <div className="flex flex-wrap items-start gap-4">
                        {visibleMembers.map((member) => (
                            <Avatar
                                key={member.id}
                                member={member}
                                isSelected={selected.includes(member.id)}
                                onClick={() => toggleMember(member.id)}
                            />
                        ))}

                        <div className="relative">
                            <AddButton
                                isOpen={isOpen}
                                label={addLabel}
                                onClick={() => setIsOpen((open) => !open)}
                            />

                            <AnimatePresence>
                                {isOpen && (
                                    <Dropdown
                                        members={members}
                                        selected={selected}
                                        onSelect={toggleMember}
                                        searchQuery={searchQuery}
                                        onSearchChange={setSearchQuery}
                                        searchPlaceholder={searchPlaceholder}
                                        emptyMessage={emptyMessage}
                                        max={max}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </LayoutGroup>
            </div>
        </div>
    );
});

export { MemberSelector };
