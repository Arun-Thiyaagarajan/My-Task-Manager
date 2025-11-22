

'use client';

import type { Note, UiConfig } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
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
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: Note;
  uiConfig: UiConfig;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  isSelected?: boolean;
}

export function NoteCard({ note, uiConfig, onEdit, onDelete, isSelected }: NoteCardProps) {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note);
  };
  
  const handleDoubleClick = () => {
    onEdit(note);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const handleDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  }

  return (
    <Card 
        className={cn(
            "flex flex-col h-full group w-full overflow-hidden transition-all duration-300", 
            isSelected && "shadow-lg shadow-primary/20 border-primary/50"
        )} 
        onDoubleClick={handleDoubleClick}
    >
      <CardContent className="p-4 flex-grow overflow-y-auto cursor-pointer">
        <RichTextViewer text={note.content} />
      </CardContent>
      <CardFooter className={cn("note-card-footer", "p-2 border-t flex justify-between items-center bg-background/50")}>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(note.updatedAt, uiConfig.timeFormat)}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move the note to the bin. You can restore it from
                  there later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
