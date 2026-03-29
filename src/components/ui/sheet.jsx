import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            'fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            className,
        )}
        {...props}
    />
));

SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SHEET_POSITIONS = {
    right: 'inset-y-0 right-0 h-full w-[min(100%,48rem)] translate-x-0 border-l',
    left: 'inset-y-0 left-0 h-full w-[min(100%,48rem)] translate-x-0 border-r',
};

const SheetContent = React.forwardRef(({ className, children, side = 'right', ...props }, ref) => (
    <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'fixed z-[81] flex flex-col bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)]',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
                side === 'right'
                    ? 'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right'
                    : 'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
                SHEET_POSITIONS[side],
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-900">
                <X size={16} />
                <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </SheetPortal>
));

SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }) => (
    <div className={cn('border-b border-neutral-200 px-5 py-4', className)} {...props} />
);

const SheetBody = ({ className, ...props }) => (
    <div className={cn('flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
);

const SheetFooter = ({ className, ...props }) => (
    <div className={cn('border-t border-neutral-200 px-5 py-4', className)} {...props} />
);

export {
    Sheet,
    SheetBody,
    SheetClose,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTrigger,
};
