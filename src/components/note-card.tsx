
'use client';

import type { Note, UiConfig } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
            "flex flex-col h-full group w-full overflow-hidden transition-all duration-300 cursor-pointer", 
            isSelected && "shadow-lg shadow-primary/20 border-primary/50"
        )}
        onClick={onClick}
    >
      {note.title && (
          <CardHeader className="p-4 pb-2 border-b">
            <CardTitle className="text-base font-semibold leading-snug line-clamp-2">{note.title}</CardTitle>
          </CardHeader>
      )}
      <div className={cn("note-card-content flex-grow overflow-y-auto", note.title ? 'p-4 pt-2' : 'p-4')}>
        <RichTextViewer text={note.content} />
      </div>
      <CardFooter className={cn("note-card-footer", "p-2 border-t flex justify-end items-center bg-background/50")}>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(note.updatedAt, uiConfig.timeFormat)}
        </p>
      </CardFooter>
    </Card>
  );
}

    