
'use client';

import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Link as LinkIcon, Quote } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { useState } from 'react';

type FormatType = 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'formatBlock';

interface ToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
  activeFormats: Record<string, boolean>;
}

export function Toolbar({ editorRef, activeFormats }: ToolbarProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const handleFormat = (format: FormatType, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(format, false, value);
    }
  };

  const handleAddLink = () => {
    if (linkUrl && editorRef.current) {
      editorRef.current.focus();
       // Restore selection if saved
      const sel = window.getSelection();
      if(sel && (sel as any).savedRange) {
        sel.removeAllRanges();
        sel.addRange((sel as any).savedRange);
      }
      
      let urlToInsert = linkUrl;
      if (!urlToInsert.startsWith('http://') && !urlToInsert.startsWith('https://')) {
          urlToInsert = 'https://' + urlToInsert;
      }
      
      document.execCommand('createLink', false, urlToInsert);
      setLinkUrl('');
      setLinkPopoverOpen(false);
    }
  };

  const tools: { command: FormatType; icon: React.ReactNode; tooltip: string; value?: string }[] = [
    { command: 'bold', icon: <Bold className="h-4 w-4" />, tooltip: 'Bold' },
    { command: 'italic', icon: <Italic className="h-4 w-4" />, tooltip: 'Italic' },
    { command: 'strikeThrough', icon: <Strikethrough className="h-4 w-4" />, tooltip: 'Strikethrough' },
    { command: 'formatBlock', icon: <Code className="h-4 w-4" />, tooltip: 'Code Block', value: 'pre' },
    { command: 'insertUnorderedList', icon: <List className="h-4 w-4" />, tooltip: 'Bulleted List' },
    { command: 'insertOrderedList', icon: <ListOrdered className="h-4 w-4" />, tooltip: 'Numbered List' },
  ];

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1">
      {tools.map(({ command, icon, tooltip, value }) => (
        <Tooltip key={command + (value || '')}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 text-muted-foreground", activeFormats[command] && "bg-muted text-foreground")}
              onMouseDown={(e) => {
                e.preventDefault();
                handleFormat(command, value);
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
      <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7 text-muted-foreground", activeFormats['createLink'] && "bg-muted text-foreground")}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            // Save selection before opening popover
                            const sel = window.getSelection();
                            if(sel && sel.rangeCount) {
                               (sel as any).savedRange = sel.getRangeAt(0).cloneRange();
                            }
                        }}
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Add Link</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-2">
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
              <Button size="sm" className="w-full" onClick={handleAddLink}>
                Add Link
              </Button>
            </div>
          </PopoverContent>
        </Popover>
    </div>
  );
}
