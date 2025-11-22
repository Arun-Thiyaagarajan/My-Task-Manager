
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StickyNote, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
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
    const [commandKey, setCommandKey] = useState('Ctrl');
    
    const handleOpenNewNoteDialog = useCallback(() => {
        setNoteToEdit(null);
        setIsNoteEditorOpen(true);
    }, []);
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            setCommandKey(isMac ? '⌘' : 'Ctrl');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                handleOpenNewNoteDialog();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleOpenNewNoteDialog]);

    const handleViewNotesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        prompt(() => router.push('/notes'));
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
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        className="rounded-full h-12 w-12 shadow-md"
                                        onClick={handleOpenNewNoteDialog}
                                    >
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                     <div className="flex items-center gap-2">
                                        <span>Create Note</span>
                                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                            <span className="text-xs">{commandKey}</span>/
                                        </kbd>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
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
                        </TooltipProvider>
                    </div>

                    {/* Main FAB */}
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button asChild size="icon" className="h-14 w-14 rounded-full shadow-lg">
                                    <a href="/notes" onClick={handleViewNotesClick}>
                                        <StickyNote className="h-6 w-6" />
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Notes</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
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
