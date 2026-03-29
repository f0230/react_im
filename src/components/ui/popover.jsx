import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef(({ className, align = 'center', sideOffset = 10, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn(
                'z-[90] w-80 rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.45)] outline-none',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                className,
            )}
            {...props}
        >
            {props.children}
            <PopoverPrimitive.Arrow className="fill-white stroke-neutral-200" />
        </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
));

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export {
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverTrigger,
};
