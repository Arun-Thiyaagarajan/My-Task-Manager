
'use client';

import { Bold, Italic, Strikethrough, Code, Code2, AtSign } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';

export type FormatType = 'bold' | 'italic' | 'strike' | 'code' | 'code-block' | 'mention';

interface TextareaToolbarProps {
  onFormatClick: (formatType: FormatType) => void;
}

export function applyFormat(formatType: FormatType, target: HTMLTextAreaElement, mentionValue?: string) {
    const { selectionStart, selectionEnd, value } = target;

    if (formatType === 'mention') {
        const placeholder = 'placeholder';
        const textToInsert = `@<${placeholder}>`;
        const newSelectionStart = selectionStart + 2; // after @<
        const newSelectionEnd = newSelectionStart + placeholder.length;
        const newValue = value.substring(0, selectionStart) + textToInsert + value.substring(selectionEnd);
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(target, newValue);
        
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
        
        target.focus();
        target.selectionStart = newSelectionStart;
        target.selectionEnd = newSelectionEnd;
        
        // This will trigger the popover in the textarea component
        const inputEvent = new Event('input', { bubbles: true });
        target.dispatchEvent(inputEvent);
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

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    nativeInputValueSetter?.call(target, newText);

    const event = new Event('input', { bubbles: true });
    target.dispatchEvent(event);

    target.selectionStart = newSelectionStart;
    target.selectionEnd = newSelectionEnd;
    target.focus();
}


export function TextareaToolbar({ onFormatClick }: TextareaToolbarProps) {
    const [commandKey, setCommandKey] = useState('Ctrl');
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            setCommandKey(isMac ? '⌘' : 'Ctrl');
        }
    }, []);

    const tools: { type: FormatType; icon: React.ReactNode; tooltip: string; shortcut: string; }[] = [
        { type: 'bold', icon: <Bold className="h-4 w-4" />, tooltip: 'Bold', shortcut: 'B' },
        { type: 'italic', icon: <Italic className="h-4 w-4" />, tooltip: 'Italic', shortcut: 'I' },
        { type: 'strike', icon: <Strikethrough className="h-4 w-4" />, tooltip: 'Strikethrough', shortcut: 'Shift+X' },
        { type: 'code', icon: <Code className="h-4 w-4" />, tooltip: 'Inline Code', shortcut: 'E' },
        { type: 'code-block', icon: <Code2 className="h-4 w-4" />, tooltip: 'Code Block', shortcut: 'Shift+C' },
        { type: 'mention', icon: <AtSign className="h-4 w-4" />, tooltip: 'Mention User', shortcut: '@&lt;' },
    ];

    return (
        <div className={cn(
            "absolute bottom-2 left-2 flex items-center gap-1",
            "p-1 rounded-lg bg-background/60 backdrop-blur-sm border border-border"
        )}>
        {tools.map(({ type, icon, tooltip, shortcut }) => (
            <Tooltip key={type}>
            <TooltipTrigger asChild>
                <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={(e) => {
                    e.preventDefault();
                    onFormatClick(type);
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent textarea from losing focus
                >
                {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
                <div className="flex items-center gap-2">
                    <span>{tooltip}</span>
                    {shortcut === '@&lt;' ? (
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                           @&lt;
                        </kbd>
                    ) : (
                         <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">{commandKey}</span>
                            {shortcut.includes('+') ? `+${shortcut.split('+')[1]}` : shortcut}
                        </kbd>
                    )}
                </div>
            </TooltipContent>
            </Tooltip>
        ))}
        </div>
    );
}
