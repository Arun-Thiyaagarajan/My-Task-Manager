
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import type { Note } from '@/lib/types';
import { Pencil, Trash2, Copy, Check, StickyNote, Clock3 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


interface NoteViewerDialogProps {
  note: Note | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteViewerDialog({ note, isOpen, onOpenChange, onEdit, onDelete }: NoteViewerDialogProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  if (!note) {
    return null;
  }

  const handleCopy = () => {
    const textToCopy = `${note.title ? `${note.title}\n\n` : ''}${note.content}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        toast({ variant: 'success', title: 'Note copied to clipboard!' });
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        toast({ variant: 'destructive', title: 'Failed to copy' });
    });
  };

  const handleOpenChangeWithReset = (open: boolean) => {
    if (!open) {
      setIsCopied(false);
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChangeWithReset}>
      <DialogContent className="flex max-h-[min(88vh,52rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden rounded-[2rem] border-white/10 bg-background/95 p-0 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.78)] backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(99,102,241,0.035))] px-6 pb-5 pt-6 pr-14">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-[0_18px_36px_-28px_hsl(var(--primary)/0.75)]">
              <StickyNote className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {note.title ? (
                <DialogTitle className="truncate text-2xl font-bold tracking-tight">{note.title}</DialogTitle>
              ) : (
                <DialogTitle className="text-2xl font-bold tracking-tight">View Note</DialogTitle>
              )}
              <DialogDescription className="mt-1 flex items-center gap-2 text-sm leading-relaxed">
                <Clock3 className="h-3.5 w-3.5 text-primary/80" />
                Read, copy, or continue editing this note in a focused view.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="no-scrollbar flex-grow min-h-0 overflow-y-auto px-6 py-5">
          <div className="rounded-[1.6rem] border border-white/10 bg-muted/20 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_50px_-40px_rgba(0,0,0,0.75)]">
            <RichTextViewer text={note.content} />
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 gap-2 border-t border-white/10 bg-muted/10 px-6 py-4 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="h-11 rounded-2xl px-5">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will move the note to the bin. You can restore it from there later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="h-11 min-w-[112px] rounded-2xl border-white/10 bg-white/[0.03]">
                {isCopied ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                    <Copy className="mr-2 h-4 w-4" />
                )}
                {isCopied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] px-5">Close</Button>
            <Button onClick={onEdit} className="h-11 rounded-2xl px-5 shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.72)]">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
