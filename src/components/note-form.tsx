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
    <div
      id={isPage ? "note-form-page" : undefined}
      className={cn("flex flex-col", isPage ? "min-h-0 flex-1 overflow-hidden pt-2" : "gap-5")}
      onKeyDown={handleKeyDown}
    >
      {isPage && (
          <div className="sticky top-0 z-20 -mx-1 mb-5 flex shrink-0 items-center justify-between border-b border-white/10 bg-background/95 px-1 pb-4 pt-1 backdrop-blur-xl">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                disabled={isPending}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-foreground shadow-[0_14px_30px_-22px_rgba(0,0,0,0.78)] hover:bg-white/[0.08] hover:text-foreground active:bg-white/[0.1]"
              >
                  <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold tracking-tight">
                  {initialTitle || initialContent ? 'Edit Note' : 'Create Note'}
              </h1>
              <div className="w-10" /> 
          </div>
      )}
      
      <div className="flex flex-1 flex-col space-y-4 min-h-0">
        <div className="space-y-2">
            {isPage && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Note Title</p>}
            <Input
              placeholder={titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              className={cn(
                  "font-bold transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10",
                  isPage ? "text-xl h-14 rounded-2xl border-muted/40" : "h-14 rounded-[1.35rem] border-white/10 bg-muted/20 px-4 text-xl shadow-[0_18px_40px_-34px_rgba(0,0,0,0.75)]"
              )}
            />
        </div>

        <div className="flex min-h-0 flex-1 flex-col space-y-2">
          {isPage && <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Content</p>}
          <div className="relative flex-1 min-h-0">
            <Textarea
              ref={descriptionEditorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={contentPlaceholder}
              autoGrow={!isPage}
              disabled={isPending}
              className={cn(
                  "no-scrollbar w-full overflow-y-auto pb-14 text-base transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10",
                  isPage ? "h-full min-h-[18rem] rounded-2xl bg-muted/5 border-muted/40 p-4" : "min-h-[250px] max-h-[min(48vh,26rem)] resize-none rounded-[1.5rem] border-white/10 bg-muted/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_50px_-40px_rgba(0,0,0,0.75)]"
              )}
              enableHotkeys
            />
            <TextareaToolbar onFormatClick={handleFormat} />
          </div>
        </div>
      </div>

      <div className={cn(
          "flex gap-2 pt-6",
          isPage ? "mt-auto shrink-0 border-t border-white/10 bg-background/95 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-5 backdrop-blur-xl" : "mt-1 justify-end border-t border-white/10 pt-5"
      )}>
        {!isPage && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-5 font-medium text-foreground/80 hover:bg-white/[0.06] hover:text-foreground"
          >
            Cancel
          </Button>
        )}
        <Button 
            id={isPage ? "note-form-submit" : undefined}
            onClick={handleSave} 
            disabled={isPending} 
            className={cn(
                "font-bold shadow-lg transition-transform active:scale-95",
                isPage ? "w-full h-14 rounded-2xl text-base shadow-[0_20px_44px_-24px_hsl(var(--primary)/0.76)]" : "h-11 rounded-2xl px-6 shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.72)]"
            )}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isPage ? <Save className="mr-2 h-5 w-5" /> : null)}
          {isPage ? (initialTitle || initialContent ? 'Update Note' : 'Create Note') : submitLabel}
        </Button>
      </div>
    </div>
  );
}
