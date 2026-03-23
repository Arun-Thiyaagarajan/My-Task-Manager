'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat, FormatType } from '@/components/ui/textarea-toolbar';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteFormProps {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  isPending?: boolean;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  submitLabel?: string;
  isPage?: boolean;
}

/**
 * A shared form component for creating and editing notes.
 * Adapts its layout based on whether it's rendered in a dialog or a full page.
 */
export function NoteForm({
  initialTitle = '',
  initialContent = '',
  onSave,
  onCancel,
  isPending = false,
  titlePlaceholder = 'Title (optional)',
  contentPlaceholder = 'Take a note...',
  submitLabel = 'Save Changes',
  isPage = false
}: NoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    // Focus content area on mount for immediate input
    const timer = setTimeout(() => {
        descriptionEditorRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [initialTitle, initialContent]);

  const handleSave = () => {
    onSave(title, content);
  };

  const handleFormat = (type: FormatType) => {
    if (descriptionEditorRef.current) {
      applyFormat(type, descriptionEditorRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div id={isPage ? "note-form-page" : undefined} className={cn("flex flex-col", isPage ? "min-h-[85vh] pt-2" : "gap-4")} onKeyDown={handleKeyDown}>
      {isPage && (
          <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-10 w-10 -ml-2">
                  <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold tracking-tight">
                  {initialTitle || initialContent ? 'Edit Note' : 'Create Note'}
              </h1>
              <div className="w-10" /> 
          </div>
      )}
      
      <div className="space-y-4 flex-1 flex flex-col">
        <div className="space-y-2">
            {isPage && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Note Title</p>}
            <Input
              placeholder={titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                  "font-bold transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10",
                  isPage ? "text-xl h-14 rounded-2xl border-muted/40" : "text-lg h-12"
              )}
            />
        </div>

        <div className="space-y-2 flex flex-col flex-1">
          {isPage && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Content</p>}
          <div className="relative flex-1">
            <Textarea
              ref={descriptionEditorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={contentPlaceholder}
              className={cn(
                  "w-full text-base pb-14 transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10",
                  isPage ? "min-h-[50vh] flex-1 rounded-2xl bg-muted/5 border-muted/40 p-4" : "min-h-[250px]"
              )}
              enableHotkeys
            />
            <TextareaToolbar onFormatClick={handleFormat} />
          </div>
        </div>
      </div>

      <div className={cn(
          "flex gap-2 pt-6",
          isPage ? "mt-auto pb-8" : "justify-end border-t mt-4"
      )}>
        {!isPage && <Button variant="ghost" onClick={onCancel} disabled={isPending} className="font-medium">Cancel</Button>}
        <Button 
            id={isPage ? "note-form-submit" : undefined}
            onClick={handleSave} 
            disabled={isPending} 
            className={cn(
                "font-bold shadow-lg transition-transform active:scale-95",
                isPage ? "w-full h-14 rounded-2xl text-base" : "rounded-lg"
            )}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isPage ? <Save className="mr-2 h-5 w-5" /> : null)}
          {isPage ? (initialTitle || initialContent ? 'Update Note' : 'Create Note') : submitLabel}
        </Button>
      </div>
    </div>
  );
}
