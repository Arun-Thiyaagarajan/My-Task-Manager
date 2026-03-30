'use client';

import { NoteForm } from './note-form';
import type { Note } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StickyNote } from 'lucide-react';

interface NoteEditorDialogProps {
  note: Partial<Note> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string | undefined, title: string, content: string) => void;
  isPending?: boolean;
}

/**
 * Desktop-friendly dialog for editing notes.
 * Uses the shared NoteForm component.
 */
export function NoteEditorDialog({
  note,
  isOpen,
  onOpenChange,
  onSave,
  isPending = false,
}: NoteEditorDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,52rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden rounded-[2rem] border-white/10 bg-background/95 p-0 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.78)] backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(99,102,241,0.035))] px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-[0_18px_36px_-28px_hsl(var(--primary)/0.75)]">
              <StickyNote className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {note?.id ? 'Edit Note' : 'New Note'}
              </DialogTitle>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Capture ideas cleanly with a more focused, distraction-free editor.
              </p>
            </div>
          </div>
        </DialogHeader>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <NoteForm 
                initialTitle={note?.title}
                initialContent={note?.content}
                onSave={(title, content) => onSave(note?.id, title, content)}
                onCancel={() => onOpenChange(false)}
                isPending={isPending}
                submitLabel={note?.id ? 'Update Note' : 'Save Note'}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
