'use client';

import { Bold, Italic, Strikethrough, Code, Code2, AtSign, Quote, List, ListOrdered, Link2, Undo2, Redo2, Wand2, X, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './tooltip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { refineText } from '@/ai/flows/refine-text-flow';
import { Button } from './button';
import { Skeleton } from './skeleton';

export type FormatType =
  | 'refine'
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'code-block'
  | 'quote'
  | 'bullet-list'
  | 'numbered-list'
  | 'link'
  | 'mention';

interface TextareaToolbarProps {
  onFormatClick: (formatType: FormatType) => void | Promise<void>;
  className?: string;
  storageKey?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export const TEXTAREA_REFINE_PREVIEW_EVENT = 'taskflow-textarea-refine-preview';

type RefinePreviewState = {
    target: HTMLTextAreaElement;
    sourceValue: string;
    selectionStart: number;
    selectionEnd: number;
    hasSelection: boolean;
    refinedText: string;
};

type RefinePreviewPosition = {
    right: number;
    bottom: number;
    width: number;
};

function replaceTextareaRange(
    target: HTMLTextAreaElement,
    replacement: string,
    rangeStart: number,
    rangeEnd: number,
    selectionStart: number,
    selectionEnd: number
) {
    target.focus();
    target.setRangeText(replacement, rangeStart, rangeEnd, 'preserve');
    target.focus();
    target.selectionStart = selectionStart;
    target.selectionEnd = selectionEnd;
    target.dispatchEvent(new Event('input', { bubbles: true }));
}

function replaceWholeTextareaValue(
    target: HTMLTextAreaElement,
    nextValue: string,
    selectionStart: number,
    selectionEnd: number
) {
    replaceTextareaRange(target, nextValue, 0, target.value.length, selectionStart, selectionEnd);
}

function runHistoryAction(target: HTMLTextAreaElement, action: 'undo' | 'redo') {
    target.focus();
    document.execCommand(action);
}

async function applyRefine(target: HTMLTextAreaElement) {
    const { selectionStart, selectionEnd, value } = target;
    const hasSelection = selectionStart !== selectionEnd;
    const textToRefine = hasSelection ? value.slice(selectionStart, selectionEnd) : value;

    if (!textToRefine.trim()) {
        return;
    }

    const contextWindow = 400;
    const contextBefore = hasSelection
        ? value.slice(Math.max(0, selectionStart - contextWindow), selectionStart)
        : undefined;
    const contextAfter = hasSelection
        ? value.slice(selectionEnd, Math.min(value.length, selectionEnd + contextWindow))
        : undefined;

    const { refinedText } = await refineText({
        text: textToRefine,
        contextBefore,
        contextAfter,
    });

    const cleanedText = refinedText.replace(/\r\n/g, '\n');

    if (hasSelection) {
        replaceTextareaRange(
            target,
            cleanedText,
            selectionStart,
            selectionEnd,
            selectionStart,
            selectionStart + cleanedText.length
        );
        return;
    }

    replaceWholeTextareaValue(target, cleanedText, 0, cleanedText.length);
}

function toggleLinePrefix(
    value: string,
    selectionStart: number,
    selectionEnd: number,
    prefixBuilder: (lineIndex: number) => string
) {
    const lineStart = value.lastIndexOf('\n', Math.max(selectionStart - 1, 0)) + 1;
    const afterSelection = value.slice(selectionEnd);
    const lineEndOffset = afterSelection.indexOf('\n');
    const lineEnd = lineEndOffset === -1 ? value.length : selectionEnd + lineEndOffset;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');

    const allPrefixed = lines.every((line, index) => line.startsWith(prefixBuilder(index)));

    const nextLines = lines.map((line, index) => {
        const prefix = prefixBuilder(index);
        return allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`;
    });

    const nextBlock = nextLines.join('\n');
    const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
    const nextSelectionStart = lineStart;
    const nextSelectionEnd = lineStart + nextBlock.length;

    return { nextValue, nextSelectionStart, nextSelectionEnd };
}

export async function applyFormat(formatType: FormatType, target: HTMLTextAreaElement) {
    const { selectionStart, selectionEnd, value } = target;

    if (formatType === 'refine') {
        await applyRefine(target);
        return;
    }

    if (formatType === 'undo' || formatType === 'redo') {
        runHistoryAction(target, formatType);
        return;
    }

    if (formatType === 'mention') {
        const placeholder = 'placeholder';
        const textToInsert = `@<${placeholder}>`;
        const newSelectionStart = selectionStart + 2; // after @<
        const newSelectionEnd = newSelectionStart + placeholder.length;

        replaceTextareaRange(target, textToInsert, selectionStart, selectionEnd, newSelectionStart, newSelectionEnd);
        return;
    }

    if (formatType === 'quote') {
        const { nextValue, nextSelectionStart, nextSelectionEnd } = toggleLinePrefix(
            value,
            selectionStart,
            selectionEnd,
            () => '> '
        );
        replaceWholeTextareaValue(target, nextValue, nextSelectionStart, nextSelectionEnd);
        return;
    }

    if (formatType === 'bullet-list') {
        const { nextValue, nextSelectionStart, nextSelectionEnd } = toggleLinePrefix(
            value,
            selectionStart,
            selectionEnd,
            () => '- '
        );
        replaceWholeTextareaValue(target, nextValue, nextSelectionStart, nextSelectionEnd);
        return;
    }

    if (formatType === 'numbered-list') {
        const { nextValue, nextSelectionStart, nextSelectionEnd } = toggleLinePrefix(
            value,
            selectionStart,
            selectionEnd,
            (lineIndex) => `${lineIndex + 1}. `
        );
        replaceWholeTextareaValue(target, nextValue, nextSelectionStart, nextSelectionEnd);
        return;
    }

    if (formatType === 'link') {
        const selectedText = value.substring(selectionStart, selectionEnd) || 'link text';
        const placeholderUrl = 'https://example.com';
        const insertion = `[${selectedText}](${placeholderUrl})`;
        const urlStart = selectionStart + selectedText.length + 3;
        const urlEnd = urlStart + placeholderUrl.length;
        replaceTextareaRange(target, insertion, selectionStart, selectionEnd, urlStart, urlEnd);
        return;
    }

    let chars = '';
    let block = false;

    switch (formatType) {
        case 'bold': chars = '**'; break;
        case 'italic': chars = '_'; break;
        case 'strike': chars = '~'; break;
        case 'code': chars = '`'; break;
        case 'code-block': chars = '```'; block = true; break;
    }

    const selectedText = value.substring(selectionStart, selectionEnd);
    let newText;
    let newSelectionStart, newSelectionEnd;

    if (block) {
        const isAlreadyBlock = selectedText.startsWith(chars) && selectedText.endsWith(chars);
        if (isAlreadyBlock) {
            newText = value.substring(0, selectionStart) + selectedText.slice(chars.length, -chars.length) + value.substring(selectionEnd);
            newSelectionStart = selectionStart;
            newSelectionEnd = selectionEnd - (2 * chars.length);
        } else {
            const startBreak = selectionStart === 0 || value[selectionStart - 1] === '\n' ? '' : '\n';
            const endBreak = selectionEnd === value.length || value[selectionEnd] === '\n' ? '' : '\n';
            newText = `${value.substring(0, selectionStart)}${startBreak}${chars}\n${selectedText}\n${chars}${endBreak}${value.substring(selectionEnd)}`;
            newSelectionStart = selectionStart + startBreak.length + chars.length + 1;
            newSelectionEnd = newSelectionStart + selectedText.length;
        }
    } else {
        const isAlreadyFormatted = selectedText.startsWith(chars) && selectedText.endsWith(chars);
        const surroundingChars = value.substring(selectionStart - chars.length, selectionEnd + chars.length);
        const isWrapped = surroundingChars.startsWith(chars) && surroundingChars.endsWith(chars);

        if (isAlreadyFormatted) {
            newText = value.substring(0, selectionStart) + selectedText.slice(chars.length, -chars.length) + value.substring(selectionEnd);
            newSelectionStart = selectionStart;
            newSelectionEnd = selectionEnd - (2 * chars.length);
        } else if (isWrapped) {
            newText = value.substring(0, selectionStart - chars.length) + selectedText + value.substring(selectionEnd + chars.length);
            newSelectionStart = selectionStart - chars.length;
            newSelectionEnd = selectionEnd - chars.length;
        } else {
            newText = `${value.substring(0, selectionStart)}${chars}${selectedText || 'text'}${chars}${value.substring(selectionEnd)}`;
            newSelectionStart = selectionStart + chars.length;
            newSelectionEnd = selectionEnd + (selectedText.length || 4) + chars.length;
        }
    }

    replaceWholeTextareaValue(target, newText, newSelectionStart, newSelectionEnd);
}


export function TextareaToolbar({ onFormatClick, className, storageKey, textareaRef }: TextareaToolbarProps) {
    const isMobile = useIsMobile();
    const [commandKey, setCommandKey] = useState('Ctrl');
    const [isMac, setIsMac] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [pendingFormat, setPendingFormat] = useState<FormatType | null>(null);
    const [refinePreview, setRefinePreview] = useState<RefinePreviewState | null>(null);
    const [refineError, setRefineError] = useState<string | null>(null);
    const [previewPosition, setPreviewPosition] = useState<RefinePreviewPosition | null>(null);
    const isMountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const toolbarWrapperRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
        isMountedRef.current = true;
        if (typeof window !== 'undefined') {
            const macDetected = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            setIsMac(macDetected);
            setCommandKey(macDetected ? '⌘' : 'Ctrl');
        }
        return () => {
            isMountedRef.current = false;
            requestIdRef.current += 1;
        };
    }, []);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        const savedValue = window.localStorage.getItem(storageKey);
        if (savedValue === 'expanded') {
            setIsExpanded(true);
        } else if (savedValue === 'collapsed') {
            setIsExpanded(false);
        }
    }, [storageKey]);

    const updatePreviewPosition = useCallback(() => {
        const wrapper = toolbarWrapperRef.current;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const viewportPadding = 16;
        const width = Math.min(448, Math.max(320, rect.width), window.innerWidth - viewportPadding * 2);

        if (!isMountedRef.current) return;
        setPreviewPosition({
            right: Math.max(viewportPadding, window.innerWidth - rect.right),
            bottom: Math.max(viewportPadding, window.innerHeight - rect.top + 12),
            width,
        });
    }, []);

    const openRefinePreview = useCallback(async (target: HTMLTextAreaElement | null | undefined) => {
        if (!target || pendingFormat) return;

        const { selectionStart, selectionEnd, value } = target;
        const hasSelection = selectionStart !== selectionEnd;
        const textToRefine = hasSelection ? value.slice(selectionStart, selectionEnd) : value;

        if (!textToRefine.trim()) {
            return;
        }

        const requestId = ++requestIdRef.current;
        if (!isMountedRef.current) return;
        setPendingFormat('refine');
        setRefineError(null);
        setRefinePreview({
            target,
            sourceValue: value,
            selectionStart,
            selectionEnd,
            hasSelection,
            refinedText: '',
        });
        updatePreviewPosition();

        try {
            const contextWindow = 400;
            const contextBefore = hasSelection
                ? value.slice(Math.max(0, selectionStart - contextWindow), selectionStart)
                : undefined;
            const contextAfter = hasSelection
                ? value.slice(selectionEnd, Math.min(value.length, selectionEnd + contextWindow))
                : undefined;

            const { refinedText } = await refineText({
                text: textToRefine,
                contextBefore,
                contextAfter,
            });

            if (requestId !== requestIdRef.current || !isMountedRef.current) return;

            setRefinePreview({
                target,
                sourceValue: value,
                selectionStart,
                selectionEnd,
                hasSelection,
                refinedText: refinedText.replace(/\r\n/g, '\n'),
            });
        } catch (error) {
            if (requestId !== requestIdRef.current || !isMountedRef.current) return;
            setRefineError(error instanceof Error ? error.message : 'AI refine failed.');
        } finally {
            if (requestId === requestIdRef.current && isMountedRef.current) {
                setPendingFormat(current => current === 'refine' ? null : current);
            }
        }
    }, [pendingFormat, updatePreviewPosition]);

    useEffect(() => {
        if (!refinePreview) return;

        updatePreviewPosition();

        const handlePositionUpdate = () => updatePreviewPosition();
        window.addEventListener('resize', handlePositionUpdate);
        window.addEventListener('scroll', handlePositionUpdate, true);

        return () => {
            window.removeEventListener('resize', handlePositionUpdate);
            window.removeEventListener('scroll', handlePositionUpdate, true);
        };
    }, [refinePreview, updatePreviewPosition]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleRefineRequest = (event: Event) => {
            const customEvent = event as CustomEvent<{ target?: HTMLTextAreaElement }>;
            const target = customEvent.detail?.target;
            if (!target || textareaRef?.current !== target) return;
            void openRefinePreview(target);
        };

        window.addEventListener(TEXTAREA_REFINE_PREVIEW_EVENT, handleRefineRequest as EventListener);
        return () => window.removeEventListener(TEXTAREA_REFINE_PREVIEW_EVENT, handleRefineRequest as EventListener);
    }, [openRefinePreview, textareaRef]);

    const handleRefineReplace = () => {
        if (!refinePreview || !refinePreview.refinedText || !isMountedRef.current) return;

        const { target, selectionStart, selectionEnd, hasSelection, refinedText } = refinePreview;

        if (hasSelection) {
            replaceTextareaRange(
                target,
                refinedText,
                selectionStart,
                selectionEnd,
                selectionStart,
                selectionStart + refinedText.length
            );
        } else {
            replaceWholeTextareaValue(target, refinedText, 0, refinedText.length);
        }

        setRefinePreview(null);
        setRefineError(null);
        setPreviewPosition(null);
    };

    const handleRefineCancel = () => {
        requestIdRef.current += 1;
        if (!isMountedRef.current) return;
        setPendingFormat(current => current === 'refine' ? null : current);
        setRefinePreview(null);
        setRefineError(null);
        setPreviewPosition(null);
    };

    const refineShortcut = useMemo(() => isMac ? undefined : 'Alt+H', [isMac]);

    const tools: { type: FormatType; icon: React.ReactNode; tooltip: string; shortcut?: string; emphasis?: boolean }[] = [
        { type: 'refine', icon: <Wand2 className="h-4 w-4" />, tooltip: 'AI Refine', shortcut: refineShortcut, emphasis: true },
        { type: 'undo', icon: <Undo2 className="h-4 w-4" />, tooltip: 'Undo', shortcut: 'Z' },
        { type: 'redo', icon: <Redo2 className="h-4 w-4" />, tooltip: 'Redo', shortcut: 'Shift+Z' },
        { type: 'bold', icon: <Bold className="h-4 w-4" />, tooltip: 'Bold', shortcut: 'B' },
        { type: 'italic', icon: <Italic className="h-4 w-4" />, tooltip: 'Italic', shortcut: 'I' },
        { type: 'strike', icon: <Strikethrough className="h-4 w-4" />, tooltip: 'Strikethrough', shortcut: 'Shift+X' },
        { type: 'code', icon: <Code className="h-4 w-4" />, tooltip: 'Inline Code', shortcut: 'E' },
        { type: 'code-block', icon: <Code2 className="h-4 w-4" />, tooltip: 'Code Block', shortcut: 'Shift+C' },
        { type: 'quote', icon: <Quote className="h-4 w-4" />, tooltip: 'Quote block' },
        { type: 'bullet-list', icon: <List className="h-4 w-4" />, tooltip: 'Bulleted list' },
        { type: 'numbered-list', icon: <ListOrdered className="h-4 w-4" />, tooltip: 'Numbered list' },
        { type: 'link', icon: <Link2 className="h-4 w-4" />, tooltip: 'Insert link' },
        { type: 'mention', icon: <AtSign className="h-4 w-4" />, tooltip: 'Mention user', shortcut: '@<', emphasis: true },
    ];

    return (
        <>
        <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-end">
            <div ref={toolbarWrapperRef} className={cn("relative", isExpanded ? "w-full" : "w-auto")}>
                <div className={cn(
                    "no-scrollbar flex items-center overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.96),hsl(var(--card)/0.94))] text-foreground shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))] dark:shadow-[0_18px_45px_-28px_rgba(0,0,0,0.8)]",
                    isExpanded ? "w-full max-w-[calc(100vw-1rem)] gap-1 p-1.5" : "w-auto gap-0 p-1",
                    className
                )}>
                    <div
                        className={cn(
                            "no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto transition-all duration-200",
                            isExpanded ? "opacity-100" : "pointer-events-none w-0 opacity-0"
                        )}
                    >
                        {tools.map(({ type, icon, tooltip, shortcut, emphasis }) => (
                            <TooltipProvider key={type}>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                    disabled={pendingFormat !== null}
                                    type="button"
                                    className={cn(
                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all duration-200",
                                        "text-muted-foreground hover:border-border/70 hover:bg-accent/80 hover:text-foreground active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70 dark:hover:bg-accent",
                                        emphasis && "bg-primary/10 text-primary hover:border-primary/20 hover:bg-primary/14 hover:text-primary dark:bg-primary/12"
                                    )}
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        if (type === 'refine') {
                                            await openRefinePreview(textareaRef?.current);
                                            return;
                                        }
                                        setPendingFormat(type);
                                        try {
                                            await onFormatClick(type);
                                        } finally {
                                            setPendingFormat(null);
                                        }
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    >
                                    {pendingFormat === type ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[10px] font-bold">
                                    <div className="flex items-center gap-2">
                                        <span>{tooltip}</span>
                                        {!isMobile && shortcut && (
                                            shortcut === '@<' ? (
                                                <kbd className="bg-muted px-1 rounded border text-[9px]">@&lt;</kbd>
                                            ) : shortcut === 'Alt+H' ? (
                                                <kbd className="bg-muted px-1 rounded border text-[9px]">
                                                    {commandKey === '⌘' ? '⌥' : 'Alt'}+H
                                                </kbd>
                                            ) : (
                                                <kbd className="bg-muted px-1 rounded border text-[9px]">
                                                    {commandKey}+{shortcut}
                                                </kbd>
                                            )
                                        )}
                                    </div>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                    <button
                        type="button"
                        aria-label={isExpanded ? 'Collapse editor tools' : 'Expand editor tools'}
                        className={cn(
                            "flex shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-white/[0.1]",
                            isExpanded ? "h-9 w-9" : "h-10 w-10"
                        )}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsExpanded((prev) => {
                                const next = !prev;
                                if (storageKey && typeof window !== 'undefined') {
                                    window.localStorage.setItem(storageKey, next ? 'expanded' : 'collapsed');
                                }
                                return next;
                            });
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {isExpanded ? <X className="h-4 w-4" /> : <Wand2 className="h-[18px] w-[18px]" />}
                    </button>
                </div>
            </div>
        </div>
        {typeof document !== 'undefined' && refinePreview && previewPosition ? createPortal(
            <div
                className="fixed z-[400] overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-[0_28px_70px_-34px_rgba(15,23,42,0.32)] backdrop-blur-xl pointer-events-auto overscroll-contain dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.9))] dark:shadow-[0_28px_70px_-34px_rgba(0,0,0,0.78)]"
                style={{
                    right: `${previewPosition.right}px`,
                    bottom: `${previewPosition.bottom}px`,
                    width: `${previewPosition.width}px`,
                    maxWidth: 'calc(100vw - 2rem)',
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                <div className="border-b border-border/60 px-4 py-3 dark:border-white/10">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {pendingFormat === 'refine' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Wand2 className="h-4 w-4 text-primary" />}
                        {refinePreview.hasSelection ? 'Refine selection' : 'Refine entire text'}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Review the AI rewrite before replacing your current text.
                    </p>
                </div>
                <div className="max-h-64 overflow-y-auto overscroll-contain px-4 py-3" onWheel={(e) => e.stopPropagation()}>
                    {pendingFormat === 'refine' ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                        </div>
                    ) : refineError ? (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-destructive">{refineError}</p>
                    ) : (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{refinePreview.refinedText}</p>
                    )}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-3 dark:border-white/10">
                    <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={handleRefineCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-xl shadow-sm"
                        disabled={pendingFormat === 'refine' || !!refineError || !refinePreview.refinedText}
                        onClick={handleRefineReplace}
                    >
                        Replace
                    </Button>
                </div>
            </div>,
            document.body
        ) : null}
        </>
    );
}
