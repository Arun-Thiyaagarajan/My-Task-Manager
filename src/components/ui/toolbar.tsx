
'use client';

import { Bold, Italic, Strikethrough, Code } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface ToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

export function Toolbar({ editorRef }: ToolbarProps) {
  const handleFormat = (format: 'bold' | 'italic' | 'strikeThrough' | 'insertHTML', value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      if (format === 'insertHTML' && value) {
        document.execCommand(format, false, value);
      } else {
        document.execCommand(format, false, value);
      }
    }
  };

  const tools = [
    { command: 'bold', icon: <Bold className="h-4 w-4" />, tooltip: 'Bold (Ctrl+B)' },
    { command: 'italic', icon: <Italic className="h-4 w-4" />, tooltip: 'Italic (Ctrl+I)' },
    { command: 'strikeThrough', icon: <Strikethrough className="h-4 w-4" />, tooltip: 'Strikethrough (Ctrl+S)' },
  ] as const;

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1">
      {tools.map(({ command, icon, tooltip }) => (
        <Tooltip key={command}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                handleFormat(command);
              }}
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
