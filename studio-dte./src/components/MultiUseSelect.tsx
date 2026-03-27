import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './nodes/BaseNode';

interface Option {
    label: string;
    value: string;
    disabled?: boolean;
}

interface OptionGroup {
    label: string;
    options: Option[];
}

type OptionOrGroup = Option | OptionGroup;

function isGroup(item: OptionOrGroup): item is OptionGroup {
    return 'options' in item;
}

interface MultiUseSelectProps {
    options: OptionOrGroup[];
    value?: string | string[];
    onChange?: (value: string | string[]) => void;
    placeholder?: string;
    multiple?: boolean;
    disabled?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    alwaysOpen?: boolean;
    className?: string;
    buttonClassName?: string;
    listClassName?: string;
    optionClassName?: string;
    listPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export default function MultiUseSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Selecciona una opción',
    multiple = false,
    disabled = false,
    open,
    onOpenChange,
    alwaysOpen = false,
    className = '',
    buttonClassName = '',
    listClassName = '',
    optionClassName = '',
    listPlacement = 'bottom',
}: MultiUseSelectProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = alwaysOpen || (typeof open === 'boolean' ? open : internalOpen);

    const flatOptions = useMemo(() => {
        const flat: Option[] = [];
        for (const item of options) {
            if (isGroup(item)) {
                flat.push(...item.options);
            } else {
                flat.push(item);
            }
        }
        return flat;
    }, [options]);

    const selectedValues = useMemo(() => {
        if (multiple) return Array.isArray(value) ? value : [];
        return value === undefined || value === null ? [] : [value as string];
    }, [multiple, value]);

    const selectedLabels = useMemo(() => {
        return flatOptions
            .filter((opt) => selectedValues.includes(opt.value))
            .map((opt) => opt.label);
    }, [flatOptions, selectedValues]);

    const displayValue = useMemo(() => {
        if (!selectedLabels.length) return placeholder;
        if (!multiple) return selectedLabels[0];
        if (selectedLabels.length <= 2) return selectedLabels.join(', ');
        return `${selectedLabels[0]}, ${selectedLabels[1]} +${selectedLabels.length - 2}`;
    }, [selectedLabels, multiple, placeholder]);

    const setOpen = (next: boolean) => {
        if (disabled || alwaysOpen) return;
        onOpenChange?.(next);
        if (typeof open !== 'boolean') setInternalOpen(next);
    };

    useEffect(() => {
        if (!isOpen || alwaysOpen) return;
        const handleClick = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, alwaysOpen]);

    const handleSelect = (optionValue: string) => {
        if (disabled) return;
        if (multiple) {
            const next = selectedValues.includes(optionValue)
                ? selectedValues.filter((v) => v !== optionValue)
                : [...selectedValues, optionValue];
            onChange?.(next);
        } else {
            onChange?.(optionValue);
            setOpen(false);
        }
    };

    const placementClass =
        listPlacement === 'top'
            ? 'left-0 right-0 bottom-full mb-2'
            : listPlacement === 'right'
                ? 'left-full top-0 ml-2'
                : listPlacement === 'left'
                    ? 'right-full top-0 mr-2'
                    : 'left-0 right-0 top-full mt-2';

    const renderOption = (opt: Option) => {
        const isSelected = selectedValues.includes(opt.value);
        return (
            <li key={opt.value}>
                <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    disabled={opt.disabled}
                    className={cn(
                        'nodrag flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed',
                        isSelected ? 'text-white' : 'text-white/60',
                        optionClassName,
                    )}
                    role="option"
                    aria-selected={isSelected}
                >
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isSelected ? 'bg-[#0A84FF]' : 'bg-transparent')} />
                    <span className="flex-1 truncate">{opt.label}</span>
                </button>
            </li>
        );
    };

    return (
        <div ref={wrapperRef} className={cn('relative w-full nodrag', className)}>
            {!alwaysOpen && (
                <button
                    type="button"
                    onClick={() => setOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-[12px] bg-white/5 border border-white/10 px-3 py-3 text-left text-[14px] text-white transition-all duration-300',
                        'hover:bg-white/10 focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF]',
                        disabled && 'opacity-50 cursor-not-allowed',
                        buttonClassName,
                    )}
                >
                    <span className={cn('truncate', !selectedValues.length && 'text-white/40')}>
                        {displayValue}
                    </span>
                    <ChevronDown
                        size={14}
                        className={cn('shrink-0 text-white/40 transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                </button>
            )}

            {isOpen && (
                <div
                    className={cn(
                        'absolute z-50 max-h-60 overflow-auto rounded-[16px] bg-[#1a1a1e] border border-white/10 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl',
                        placementClass,
                        listClassName,
                    )}
                    role="listbox"
                    aria-multiselectable={multiple || undefined}
                >
                    <ul className="space-y-0.5">
                        {options.map((item) => {
                            if (isGroup(item)) {
                                return (
                                    <li key={item.label}>
                                        <div className="px-3 pt-2 pb-1 text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                                            {item.label}
                                        </div>
                                        <ul className="space-y-0.5">
                                            {item.options.map(renderOption)}
                                        </ul>
                                    </li>
                                );
                            }
                            return renderOption(item);
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
