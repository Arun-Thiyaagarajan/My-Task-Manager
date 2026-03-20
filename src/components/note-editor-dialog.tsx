'use client';

import { NoteForm } from './note-form';
import type { Note } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NoteEditorDialogProps {
  note: Partial<Note> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string | undefined, title: string, content: string) => void;
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
}: NoteEditorDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {note?.id ? 'Edit Note' : 'New Note'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
            <NoteForm 
                initialTitle={note?.title}
                initialContent={note?.content}
                onSave={(title, content) => onSave(note?.id, title, content)}
                onCancel={() => onOpenChange(false)}
                submitLabel={note?.id ? 'Update Note' : 'Save Note'}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
