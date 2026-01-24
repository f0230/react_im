import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const defaultGetOptionLabel = (option) => option?.label ?? option?.value ?? String(option ?? '');
const defaultGetOptionValue = (option) => option?.value ?? option;

const MultiUseSelect = ({
    options = [],
    value,
    onChange,
    placeholder = 'Selecciona una opcion',
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
    variant = 'dropdown',
    modalAlign = 'center',
    modalScope = 'viewport',
    getOptionLabel = defaultGetOptionLabel,
    getDisplayLabel = defaultGetOptionLabel,
    getOptionValue = defaultGetOptionValue,
}) => {
    const wrapperRef = useRef(null);
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = alwaysOpen || (typeof open === 'boolean' ? open : internalOpen);

    const selectedValues = useMemo(() => {
        if (multiple) {
            return Array.isArray(value) ? value : [];
        }
        return value === undefined || value === null ? [] : [value];
    }, [multiple, value]);

    const selectedLabels = useMemo(() => {
        return options
            .filter((option) => {
                const optionValue = getOptionValue(option);
                return selectedValues.some((selected) => selected === optionValue);
            })
            .map((option) => getDisplayLabel(option))
            .filter(Boolean);
    }, [options, selectedValues, getDisplayLabel, getOptionValue]);

    const displayValue = useMemo(() => {
        if (!selectedLabels.length) return placeholder;
        if (!multiple) return selectedLabels[0];
        if (selectedLabels.length <= 2) return selectedLabels.join(', ');
        return `${selectedLabels[0]}, ${selectedLabels[1]} +${selectedLabels.length - 2}`;
    }, [selectedLabels, multiple, placeholder]);

    const setOpen = (next) => {
        if (disabled || alwaysOpen) return;
        onOpenChange?.(next);
        if (typeof open !== 'boolean') {
            setInternalOpen(next);
        }
    };

    useEffect(() => {
        if (!isOpen || alwaysOpen) return;
        const handleClick = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, alwaysOpen]);

    const handleToggle = () => setOpen(!isOpen);

    const handleSelect = (optionValue) => {
        if (disabled) return;
        if (multiple) {
            const next = selectedValues.includes(optionValue)
                ? selectedValues.filter((item) => item !== optionValue)
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

    const isModal = variant === 'modal';
    const modalContainerClass =
        modalAlign === 'right'
            ? 'justify-end pr-6'
            : modalAlign === 'left'
            ? 'justify-start pl-6'
            : 'justify-center';
    const anchorPanelClass =
        modalAlign === 'left'
            ? 'sm:absolute sm:right-full sm:top-1/2 sm:translate-x-0 sm:mr-3'
            : modalAlign === 'center'
            ? 'sm:absolute sm:left-1/2 sm:top-full sm:-translate-x-1/2 sm:translate-y-0 sm:mt-3'
            : 'sm:absolute sm:left-full sm:top-1/2 sm:translate-x-0 sm:ml-3';

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            {!alwaysOpen && (
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`flex w-full items-center justify-between gap-3 rounded-[8px] bg-[#DBDBDB] px-3 py-2 text-left text-sm text-[#666666] transition ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${buttonClassName}`}
                >
                    <span className="text-[#8A8A8A]">
                        {displayValue}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`shrink-0 text-[#666666] transition ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
            )}

            {isOpen && !isModal && (
                <div
                    className={`absolute z-10 max-h-72 overflow-auto no-scrollbar rounded-2xl bg-[#212121] p-2 text-[#D7D7D7] shadow-[0_18px_50px_rgba(0,0,0,0.35)] ${placementClass} ${listClassName}`}
                    role="listbox"
                    aria-multiselectable={multiple || undefined}
                >
                    <ul className="space-y-1">
                        {options.map((option) => {
                            const optionValue = getOptionValue(option);
                            const optionLabel = getOptionLabel(option);
                            const isSelected = selectedValues.includes(optionValue);
                            return (
                                <li key={String(optionValue)}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(optionValue)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                                            isSelected ? 'text-white' : ''
                                        } ${optionClassName}`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isSelected ? 'bg-[#FF3B3B]' : 'bg-transparent'
                                            }`}
                                        />
                                        <span className="flex-1">{optionLabel}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {isOpen && isModal && modalScope === 'viewport' && (
                <div className={`fixed inset-0 z-50 flex items-center ${modalContainerClass}`}>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/30"
                    />
                    <div
                        className={`relative w-[320px] max-w-[90vw] max-h-[70vh] overflow-auto no-scrollbar rounded-2xl bg-[#212121] p-3 text-[#D7D7D7] shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${listClassName}`}
                        role="listbox"
                        aria-multiselectable={multiple || undefined}
                    >
                        <ul className="space-y-1">
                            {options.map((option) => {
                                const optionValue = getOptionValue(option);
                                const optionLabel = getOptionLabel(option);
                                const isSelected = selectedValues.includes(optionValue);
                                return (
                                    <li key={String(optionValue)}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(optionValue)}
                                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                                                isSelected ? 'text-white' : ''
                                            } ${optionClassName}`}
                                            role="option"
                                            aria-selected={isSelected}
                                        >
                                            <span
                                                className={`h-2 w-2 rounded-full ${
                                                    isSelected ? 'bg-[#FF3B3B]' : 'bg-transparent'
                                                }`}
                                            />
                                            <span className="flex-1">{optionLabel}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}

            {isOpen && isModal && modalScope === 'anchor' && (
                <div
                    className={`fixed left-1/2 top-1/2 z-50 w-[320px] max-w-[90vw] max-h-[70vh] -translate-x-1/2 -translate-y-1/2 overflow-auto no-scrollbar rounded-2xl bg-[#212121] p-3 text-[#D7D7D7] shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${anchorPanelClass} ${listClassName}`}
                    role="listbox"
                    aria-multiselectable={multiple || undefined}
                >
                    <ul className="space-y-1">
                        {options.map((option) => {
                            const optionValue = getOptionValue(option);
                            const optionLabel = getOptionLabel(option);
                            const isSelected = selectedValues.includes(optionValue);
                            return (
                                <li key={String(optionValue)}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(optionValue)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                                            isSelected ? 'text-white' : ''
                                        } ${optionClassName}`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                isSelected ? 'bg-[#FF3B3B]' : 'bg-transparent'
                                            }`}
                                        />
                                        <span className="flex-1">{optionLabel}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default MultiUseSelect;
