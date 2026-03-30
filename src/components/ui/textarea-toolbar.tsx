'use client';

import { Bold, Italic, Strikethrough, Code, Code2, AtSign, Quote, List, ListOrdered, Link2, Undo2, Redo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './tooltip';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export type FormatType =
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
  onFormatClick: (formatType: FormatType) => void;
}

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

export function applyFormat(formatType: FormatType, target: HTMLTextAreaElement) {
    const { selectionStart, selectionEnd, value } = target;

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


export function TextareaToolbar({ onFormatClick }: TextareaToolbarProps) {
    const isMobile = useIsMobile();
    const [commandKey, setCommandKey] = useState('Ctrl');
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            setCommandKey(isMac ? '⌘' : 'Ctrl');
        }
    }, []);

    const tools: { type: FormatType; icon: React.ReactNode; tooltip: string; shortcut?: string; emphasis?: boolean }[] = [
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
        <div className={cn(
            "no-scrollbar absolute bottom-2 left-2 right-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1 overflow-x-auto",
            "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))] p-1.5 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        )}>
        {tools.map(({ type, icon, tooltip, shortcut, emphasis }) => (
            <TooltipProvider key={type}>
                <Tooltip>
                <TooltipTrigger asChild>
                    <button
                    type="button"
                    className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all duration-200",
                        "text-muted-foreground hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.08] hover:text-foreground active:translate-y-0 active:scale-95",
                        emphasis && "bg-primary/10 text-primary hover:border-primary/20 hover:bg-primary/14 hover:text-primary"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        onFormatClick(type);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    >
                    {icon}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                        <span>{tooltip}</span>
                        {!isMobile && shortcut && (
                            shortcut === '@<' ? (
                                <kbd className="bg-muted px-1 rounded border text-[9px]">@&lt;</kbd>
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
    );
}
