
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StickyNote, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { NoteEditorDialog } from '@/components/note-editor-dialog';
import type { Note } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addNote, updateNote } from '@/lib/data';

export function FloatingNotes() {
    const { prompt } = useUnsavedChanges();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
    const [noteToEdit, setNoteToEdit] = useState<Partial<Note> | null>(null);
    const { toast } = useToast();

    const handleViewNotesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        prompt(() => router.push('/notes'));
    };
    
    const handleNewNoteClick = () => {
        setNoteToEdit(null);
        setIsNoteEditorOpen(true);
    };
    
    const handleSaveNote = (id: string | undefined, title: string, content: string) => {
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
        // Dispatch an event that the notes page can listen to, to refresh its data
        window.dispatchEvent(new Event('notes-updated'));
    };

    return (
        <>
            <div
                className="fixed bottom-6 right-6 z-40 group"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
            >
                <div className="relative flex flex-col items-center gap-2">
                    {/* Secondary Actions */}
                    <div 
                        className={cn(
                            "flex flex-col items-center gap-2 transition-all duration-300 ease-in-out",
                            isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                        )}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    className="rounded-full h-12 w-12 shadow-md"
                                    onClick={handleNewNoteClick}
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Create Note</p>
                            </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild size="icon" className="rounded-full h-12 w-12 shadow-md">
                                    <a href="/notes" onClick={handleViewNotesClick}>
                                        <Eye className="h-5 w-5" />
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>View Notes</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Main FAB */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                className="h-14 w-14 rounded-full shadow-lg"
                            >
                                <StickyNote className="h-6 w-6" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Notes</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <NoteEditorDialog
                isOpen={isNoteEditorOpen}
                onOpenChange={setIsNoteEditorOpen}
                note={noteToEdit}
                onSave={handleSaveNote}
            />
        </>
    );
}
