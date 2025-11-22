
'use client';

import { Bold, Italic, Strikethrough, Code, Code2 } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

type FormatType = 'bold' | 'italic' | 'strike' | 'code' | 'code-block';

interface TextareaToolbarProps {
  onFormatClick: (formatType: FormatType) => void;
}

export function applyFormat(formatType: FormatType, target: HTMLTextAreaElement) {
    const { selectionStart, selectionEnd, value } = target;
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
    let newSelectionStart = selectionStart + chars.length;
    let newSelectionEnd = selectionEnd + chars.length;

    if (block) {
        const isAlreadyBlock = selectedText.startsWith(chars) && selectedText.endsWith(chars);
        if (isAlreadyBlock) {
            newText = value.substring(0, selectionStart) + selectedText.slice(chars.length, -chars.length) + value.substring(selectionEnd);
            newSelectionStart = selectionStart;
            newSelectionEnd = selectionEnd - (2 * chars.length);
        } else {
            newText = `${value.substring(0, selectionStart)}${chars}\n${selectedText}\n${chars}${value.substring(selectionEnd)}`;
            newSelectionStart = selectionStart + chars.length + 1;
            newSelectionEnd = newSelectionStart + selectedText.length;
        }
    } else {
        newText = `${value.substring(0, selectionStart)}${chars}${selectedText}${chars}${value.substring(selectionEnd)}`;
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
  const tools: { type: FormatType; icon: React.ReactNode; tooltip: string }[] = [
    { type: 'bold', icon: <Bold className="h-4 w-4" />, tooltip: 'Bold (Ctrl+B)' },
    { type: 'italic', icon: <Italic className="h-4 w-4" />, tooltip: 'Italic (Ctrl+I)' },
    { type: 'strike', icon: <Strikethrough className="h-4 w-4" />, tooltip: 'Strikethrough' },
    { type: 'code', icon: <Code className="h-4 w-4" />, tooltip: 'Inline Code' },
    { type: 'code-block', icon: <Code2 className="h-4 w-4" />, tooltip: 'Code Block' },
  ];

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1">
      {tools.map(({ type, icon, tooltip }) => (
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
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
