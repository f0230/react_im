import React, { useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

const mergeRefs = (refs) => (node) => {
    refs.forEach((ref) => {
        if (!ref) return;
        if (typeof ref === 'function') ref(node);
        else ref.current = node;
    });
};

const composeHandlers = (theirHandler, ourHandler) => (event) => {
    if (theirHandler) theirHandler(event);
    if (!event.defaultPrevented && ourHandler) ourHandler(event);
};

const ReactionPickerPopover = ({ onSelect, children, triggerRef, enableLongPress = true }) => {
    const [open, setOpen] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const quick = useMemo(() => QUICK_REACTIONS, []);
    const child = React.Children.only(children);
    const timerRef = useRef(null);
    const openedByLongPressRef = useRef(false);

    const clearTimer = () => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const startLongPress = () => {
        clearTimer();
        timerRef.current = window.setTimeout(() => {
            setOpen(true);
            openedByLongPressRef.current = true;
            clearTimer();
        }, 450);
    };

    return (
        <Popover.Root
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setShowPicker(false);
            }}
        >
            <Popover.Trigger asChild>
                {React.cloneElement(child, {
                    ref: mergeRefs([triggerRef, child.ref]),
                    onPointerDown: composeHandlers(child.props?.onPointerDown, (event) => {
                        if (!enableLongPress) return;
                        if (event.pointerType === 'touch') startLongPress();
                    }),
                    onPointerUp: composeHandlers(child.props?.onPointerUp, () => clearTimer()),
                    onPointerLeave: composeHandlers(child.props?.onPointerLeave, () => clearTimer()),
                    onClick: composeHandlers(child.props?.onClick, (event) => {
                        if (openedByLongPressRef.current) {
                            openedByLongPressRef.current = false;
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }),
                    onContextMenu: composeHandlers(child.props?.onContextMenu, (event) => {
                        if (!enableLongPress) return;
                        event.preventDefault();
                        setOpen(true);
                        openedByLongPressRef.current = true;
                        clearTimer();
                    }),
                })}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="top"
                    align="center"
                    sideOffset={8}
                    className="rounded-xl bg-white shadow-lg border border-neutral-200 p-2 w-[260px] z-[200]"
                >
                    <div className="flex items-center gap-1">
                        {quick.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    onSelect(emoji);
                                    setOpen(false);
                                    setShowPicker(false);
                                }}
                                className="h-9 w-9 rounded-lg hover:bg-neutral-100 text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="h-9 w-9 rounded-lg hover:bg-neutral-100 text-sm border border-neutral-200"
                            onClick={() => setShowPicker((value) => !value)}
                        >
                            +
                        </button>
                    </div>

                    {showPicker && (
                        <div className="mt-2">
                            <Picker
                                data={data}
                                onEmojiSelect={(emoji) => {
                                    onSelect(emoji.native);
                                    setOpen(false);
                                    setShowPicker(false);
                                }}
                                theme="light"
                                previewPosition="none"
                                searchPosition="none"
                                navPosition="bottom"
                                perLine={7}
                            />
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

export default ReactionPickerPopover;
