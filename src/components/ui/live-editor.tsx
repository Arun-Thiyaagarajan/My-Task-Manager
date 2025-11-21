
'use client';

import * as React from 'react';
import { Bold, Italic, Strikethrough, Code } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type FormatType = 'bold' | 'italic' | 'strike' | 'code';

interface ToolbarProps {
  onFormat: (format: FormatType) => void;
  className?: string;
}

const LiveEditorToolbar = ({ onFormat, className }: ToolbarProps) => {
  const tools: { type: FormatType; icon: React.ReactNode; tooltip: string; command: string }[] = [
    { type: 'bold', icon: <Bold className="h-4 w-4" />, tooltip: 'Bold', command: 'bold' },
    { type: 'italic', icon: <Italic className="h-4 w-4" />, tooltip: 'Italic', command: 'italic' },
    { type: 'strike', icon: <Strikethrough className="h-4 w-4" />, tooltip: 'Strikethrough', command: 'strikeThrough' },
    { type: 'code', icon: <Code className="h-4 w-4" />, tooltip: 'Code', command: 'code' },
  ];

  const handleMouseDown = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command, false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {tools.map(({ type, icon, tooltip, command }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onMouseDown={(e) => handleMouseDown(e, command)}
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
};

interface LiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const LiveEditor = React.forwardRef<HTMLDivElement, LiveEditorProps>(
  ({ value, onChange, placeholder, className }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Sync external value changes to the editor
    React.useEffect(() => {
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      onChange(e.currentTarget.innerHTML);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const handleToolbarFormat = (format: FormatType) => {
      if (editorRef.current) {
        editorRef.current.focus();
        let command: string;
        switch(format) {
            case 'bold': command = 'bold'; break;
            case 'italic': command = 'italic'; break;
            case 'strike': command = 'strikeThrough'; break;
            case 'code':
                // `code` is not a standard execCommand
                toast({ variant: 'destructive', title: "Formatting not supported", description: "Inline code formatting must be applied manually."});
                return;
        }
        document.execCommand(command, false);
      }
    };
    
    // Combine forwarded ref and internal ref
    const combinedRef = React.useCallback((node: HTMLDivElement) => {
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
        (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }, [ref]);

    return (
        <div className="relative rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div
                ref={combinedRef}
                contentEditable={true}
                onInput={handleInput}
                onPaste={handlePaste}
                className={cn(
                    'flex min-h-[120px] w-full rounded-md px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&[placeholder]]:before:text-muted-foreground [&[placeholder]]:before:content-[attr(placeholder)]',
                    className
                )}
                placeholder={placeholder}
                style={{ WebkitUserModify: 'read-write-plaintext-only' } as any}
                dangerouslySetInnerHTML={{ __html: value }}
            />
            <LiveEditorToolbar onFormat={handleToolbarFormat} className="absolute bottom-2 left-2"/>
        </div>
    );
  }
);

LiveEditor.displayName = 'LiveEditor';
