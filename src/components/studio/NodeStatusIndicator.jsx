import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A node wrapper that indicates the status of a node.
 * Status: "initial" | "loading" | "success" | "error"
 * Loading variants: "border" (spinning border) | "overlay" (full overlay + spinner)
 */
export default function NodeStatusIndicator({
    children,
    status = 'initial',
    loadingVariant = 'border',
    className,
}) {
    const isLoading = status === 'loading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    return (
        <div className={cn('relative rounded-xl', className)}>
            {/* ── Border variant: spinning gradient border ── */}
            {isLoading && loadingVariant === 'border' && (
                <>
                    <div className="pointer-events-none absolute -inset-[2px] z-20 overflow-hidden rounded-xl">
                        <div
                            className="absolute inset-[-50%] animate-[node-border-spin_1.4s_linear_infinite]"
                            style={{
                                background:
                                    'conic-gradient(from 0deg, transparent 30%, #E3FF31 50%, transparent 70%)',
                            }}
                        />
                        {/* Inner cutout to create the border effect */}
                        <div className="absolute inset-[2px] rounded-[10px] bg-[#0b0b0b]" />
                    </div>
                    <div className="pointer-events-none absolute -inset-[2px] z-10 rounded-xl shadow-[0_0_12px_2px_rgba(227,255,49,0.15)]" />
                </>
            )}

            {/* ── Success: brief green glow ── */}
            {isSuccess && (
                <div className="pointer-events-none absolute -inset-[1px] z-10 rounded-xl border border-emerald-400/50 shadow-[0_0_10px_1px_rgba(52,211,153,0.2)] transition-opacity duration-700" />
            )}

            {/* ── Error: red border ── */}
            {isError && (
                <div className="pointer-events-none absolute -inset-[1px] z-10 rounded-xl border border-red-400/60 shadow-[0_0_10px_1px_rgba(248,113,113,0.2)]" />
            )}

            {/* ── Content ── */}
            <div className="relative z-0 overflow-hidden rounded-xl">
                {children}
            </div>

            {/* ── Overlay variant: semi-transparent overlay + spinner ── */}
            {isLoading && loadingVariant === 'overlay' && (
                <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-[2px]">
                    <Loader2 className="h-8 w-8 animate-spin text-banana" />
                </div>
            )}

            <style>{`
                @keyframes node-border-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
