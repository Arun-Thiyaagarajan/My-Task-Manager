'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppTooltip } from '@/components/ui/tooltip';
import { NoteEditorDialog } from '@/components/note-editor-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { addNote, updateNote } from '@/lib/data';
import type { Note } from '@/lib/types';

export function DesktopNotesShortcut() {
  const router = useRouter();
  const { prompt } = useUnsavedChanges();
  const { toast } = useToast();
  const [commandKey, setCommandKey] = React.useState('Ctrl');
  const [isNoteEditorOpen, setIsNoteEditorOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setCommandKey(isMac ? '⌘' : 'Ctrl');
  }, []);

  const handleSaveNote = React.useCallback((id: string | undefined, title: string, content: string) => {
    if (!content.trim() && !title.trim()) {
      toast({ variant: 'destructive', title: 'Cannot save empty note.' });
      return;
    }

    if (id) {
      updateNote(id, { title, content });
      toast({ variant: 'success', title: 'Note Updated' });
    } else {
      addNote({ title, content });
      toast({ variant: 'success', title: 'Note Saved' });
    }

    window.dispatchEvent(new Event('notes-updated'));
    setIsNoteEditorOpen(false);
  }, [toast]);

  return (
    <>
      <div className="flex items-center overflow-hidden rounded-2xl border border-border/70 bg-background/92 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-all dark:shadow-[0_18px_36px_-28px_rgba(0,0,0,0.5)]">
        <AppTooltip content="Open notes workspace" side="bottom">
          <Button
            id="desktop-notes-workspace-trigger"
            type="button"
            variant="ghost"
            className="h-11 rounded-none border-0 px-4 font-medium hover:bg-primary/5 hover:text-primary"
            onClick={() => prompt(() => router.push('/notes'))}
          >
            <StickyNote className="mr-2 h-4 w-4" />
            Notes
          </Button>
        </AppTooltip>
        <div className="h-6 w-px bg-border/70" />
        <AppTooltip content="Create note" side="bottom">
          <Button
            id="desktop-notes-quick-create-trigger"
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none border-0 hover:bg-primary/5 hover:text-primary"
            onClick={() => setIsNoteEditorOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Create note</span>
          </Button>
        </AppTooltip>
      </div>

      <NoteEditorDialog
        isOpen={isNoteEditorOpen}
        onOpenChange={setIsNoteEditorOpen}
        note={null}
        onSave={handleSaveNote}
      />
    </>
  );
}
