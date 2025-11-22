
'use client';

import type { Note, UiConfig } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  uiConfig: UiConfig;
  onClick: () => void;
  isSelected?: boolean;
}

export function NoteCard({ note, uiConfig, onClick, isSelected }: NoteCardProps) {
  return (
    <Card 
        className={cn(
            "flex flex-col h-full group w-full overflow-hidden transition-all duration-300", 
            isSelected && "shadow-lg shadow-primary/20 border-primary/50"
        )}
    >
      {note.title && (
          <CardHeader 
            className="note-card-header p-4 pb-2 border-b drag-handle flex-row items-center justify-between cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CardTitle className="text-base font-semibold leading-snug line-clamp-2">{note.title}</CardTitle>
            <GripVertical className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </CardHeader>
      )}
      <CardContent 
        className={cn("note-card-content flex-grow overflow-y-auto cursor-pointer", note.title ? 'p-4 pt-2' : 'p-4')}
        onClick={onClick}
      >
        <RichTextViewer text={note.content} />
      </CardContent>
      <CardFooter className={cn(
        "note-card-footer", 
        "p-2 border-t flex justify-between items-center bg-background/50 drag-handle cursor-grab active:cursor-grabbing"
      )} onMouseDown={(e) => e.stopPropagation()}>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(note.updatedAt, uiConfig.timeFormat)}
        </p>
        <GripVertical className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </CardFooter>
    </Card>
  );
}
