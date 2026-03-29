import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const FinanceKpiRow = ({
    icon: Icon,
    label,
    value,
    sub,
    color = 'text-neutral-900',
    className,
    showChevron = false,
}) => (
    <div
        className={cn(
            'inline-flex min-h-9 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm',
            className,
        )}
    >
        {Icon && <Icon size={15} className="shrink-0 text-neutral-400" />}
        <span className="truncate text-neutral-500">{label}</span>
        <span className={cn('font-mono text-[15px] font-semibold tabular-nums', color)}>{value}</span>
        {sub ? <span className="truncate text-xs text-neutral-400">{sub}</span> : null}
        {showChevron ? <ChevronDown size={14} className="shrink-0 text-neutral-300" /> : null}
    </div>
);

const FinanceKpiCard = (props) => {
    const { popover, label } = props;

    if (!popover) {
        return <FinanceKpiRow {...props} />;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex rounded-full text-left outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300"
                    aria-label={`Ver detalle de ${label}`}
                >
                    <FinanceKpiRow {...props} showChevron className={cn('cursor-pointer', props.className)} />
                    <span className="sr-only">{label}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-w-sm">
                {typeof popover === 'function' ? popover() : popover}
            </PopoverContent>
        </Popover>
    );
};

export default FinanceKpiCard;
