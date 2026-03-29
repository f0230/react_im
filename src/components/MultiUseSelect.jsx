import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const defaultGetOptionLabel = (option) => option?.label ?? option?.value ?? String(option ?? '');
const defaultGetOptionValue = (option) => option?.value ?? option;
const defaultGetSearchText = (option) => [
    option?.label,
    option?.value,
    option?.searchText,
]
    .filter(Boolean)
    .join(' ');

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
    getSearchText = defaultGetSearchText,
    getMultipleDisplayValue,
    groupBy,
    getGroupLabel = (group) => group,
    searchable = false,
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'No hay opciones disponibles.',
    theme = 'dark',
}) => {
    const wrapperRef = useRef(null);
    const [internalOpen, setInternalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const isOpen = alwaysOpen || (typeof open === 'boolean' ? open : internalOpen);

    const themeClasses = theme === 'light'
        ? {
            button: 'border border-neutral-200 bg-white text-neutral-900 shadow-sm hover:border-neutral-300',
            buttonPlaceholder: 'text-neutral-400',
            icon: 'text-neutral-400',
            list: 'border border-neutral-200 bg-white text-neutral-900 shadow-[0_18px_50px_rgba(0,0,0,0.14)]',
            searchWrapper: 'border-b border-neutral-100',
            searchInput: 'border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400',
            searchIcon: 'text-neutral-400',
            option: 'hover:bg-neutral-100',
            optionSelected: 'bg-skyblue/10 text-skyblue',
            indicator: 'bg-skyblue',
            groupLabel: 'px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400',
        }
        : {
            button: 'bg-[#DBDBDB] text-[#666666]',
            buttonPlaceholder: 'text-[#8A8A8A]',
            icon: 'text-[#666666]',
            list: 'bg-[#212121] text-[#D7D7D7] shadow-[0_18px_50px_rgba(0,0,0,0.35)]',
            searchWrapper: 'border-b border-white/10',
            searchInput: 'border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-white/25',
            searchIcon: 'text-white/35',
            option: 'hover:bg-white/5',
            optionSelected: 'text-white',
            indicator: 'bg-[#FF3B3B]',
            groupLabel: 'px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35',
        };

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
        if (multiple && typeof getMultipleDisplayValue === 'function') {
            const selectedOptions = options.filter((option) => {
                const optionValue = getOptionValue(option);
                return selectedValues.some((selected) => selected === optionValue);
            });
            return getMultipleDisplayValue(selectedOptions, selectedValues);
        }
        if (!multiple) return selectedLabels[0];
        if (selectedLabels.length <= 2) return selectedLabels.join(', ');
        return `${selectedLabels[0]}, ${selectedLabels[1]} +${selectedLabels.length - 2}`;
    }, [getMultipleDisplayValue, getOptionValue, multiple, options, placeholder, selectedLabels, selectedValues]);

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

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

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

    const filteredOptions = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return options;

        return options.filter((option) => {
            const labelText = getOptionLabel(option);
            const searchText = getSearchText(option);
            return `${labelText} ${searchText}`.toLowerCase().includes(search);
        });
    }, [getOptionLabel, getSearchText, options, searchTerm]);

    const groupedOptions = useMemo(() => {
        if (!groupBy) {
            return [{ key: '__all__', label: null, options: filteredOptions }];
        }

        const groups = filteredOptions.reduce((acc, option) => {
            const groupKey = groupBy(option) || 'otros';
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(option);
            return acc;
        }, {});

        return Object.entries(groups).map(([key, groupOptions]) => ({
            key,
            label: getGroupLabel(key),
            options: groupOptions,
        }));
    }, [filteredOptions, getGroupLabel, groupBy]);

    const renderOptions = () => (
        <>
            {searchable && (
                <div className={`sticky top-0 z-[1] p-2 ${themeClasses.searchWrapper}`}>
                    <div className="relative">
                        <Search size={14} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.searchIcon}`} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={searchPlaceholder}
                            className={`w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition ${themeClasses.searchInput}`}
                        />
                    </div>
                </div>
            )}

            <ul className="space-y-1">
                {groupedOptions.map((group) => (
                    <React.Fragment key={group.key}>
                        {group.label ? (
                            <li className={themeClasses.groupLabel}>
                                {group.label}
                            </li>
                        ) : null}

                        {group.options.map((option) => {
                            const optionValue = getOptionValue(option);
                            const optionLabel = getOptionLabel(option);
                            const isSelected = selectedValues.includes(optionValue);
                            return (
                                <li key={String(optionValue)}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(optionValue)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${themeClasses.option} ${isSelected ? themeClasses.optionSelected : ''} ${optionClassName}`}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <span
                                            className={`h-2 w-2 rounded-full ${isSelected ? themeClasses.indicator : 'bg-transparent'}`}
                                        />
                                        <span className="flex-1">{optionLabel}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </React.Fragment>
                ))}

                {filteredOptions.length === 0 && (
                    <li className="px-3 py-2 text-sm text-neutral-400">
                        {emptyMessage}
                    </li>
                )}
            </ul>
        </>
    );

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            {!alwaysOpen && (
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`flex w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition ${themeClasses.button} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${buttonClassName}`}
                >
                    <span className={`min-w-0 flex-1 truncate leading-none ${selectedValues.length > 0 ? '' : themeClasses.buttonPlaceholder}`}>
                        {displayValue}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`shrink-0 transition ${themeClasses.icon} ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
            )}

            {isOpen && !isModal && (
                <div
                    className={`absolute z-10 max-h-72 overflow-auto no-scrollbar rounded-2xl p-2 ${themeClasses.list} ${placementClass} ${listClassName}`}
                    role="listbox"
                    aria-multiselectable={multiple || undefined}
                >
                    {renderOptions()}
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
                        className={`relative w-[320px] max-w-[90vw] max-h-[70vh] overflow-auto no-scrollbar rounded-2xl p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${themeClasses.list} ${listClassName}`}
                        role="listbox"
                        aria-multiselectable={multiple || undefined}
                    >
                        {renderOptions()}
                    </div>
                </div>
            )}

            {isOpen && isModal && modalScope === 'anchor' && (
                <div
                    className={`fixed left-1/2 top-1/2 z-50 w-[320px] max-w-[90vw] max-h-[70vh] -translate-x-1/2 -translate-y-1/2 overflow-auto no-scrollbar rounded-2xl p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${themeClasses.list} ${anchorPanelClass} ${listClassName}`}
                    role="listbox"
                    aria-multiselectable={multiple || undefined}
                >
                    {renderOptions()}
                </div>
            )}
        </div>
    );
};

export default MultiUseSelect;
