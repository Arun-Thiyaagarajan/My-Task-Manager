
'use client';

import { useState, useEffect, useRef } from 'react';
import { addNote, getNotes, updateNote, deleteNote, getUiConfig } from '@/lib/data';
import type { Note, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FileText, Trash2, Edit, Save, StickyNote } from 'lucide-react';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { cn, formatTimestamp } from '@/lib/utils';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat } from '@/components/ui/textarea-toolbar';

function EditNoteDialog({ note, isOpen, onOpenChange, onSave }: { note: Note | null, isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (id: string, content: string) => void }) {
    const [content, setContent] = useState('');
    const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (note) {
            setContent(note.content);
        }
    }, [note]);

    if (!note) return null;

    const handleSave = () => {
        onSave(note.id, content);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Edit Note</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Textarea
                        ref={descriptionEditorRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Take a note..."
                        className="min-h-[200px]"
                        enableHotkeys
                    />
                    <TextareaToolbar onFormatClick={(type) => descriptionEditorRef.current && applyFormat(type, descriptionEditorRef.current)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NoteCard({ note, uiConfig, onEdit, onDelete }: { note: Note, uiConfig: UiConfig, onEdit: (note: Note) => void, onDelete: (noteId: string) => void }) {
    return (
        <Card className="flex flex-col h-full group">
            <CardContent className="p-4 flex-grow">
                <RichTextViewer text={note.content} />
            </CardContent>
            <CardFooter className="p-2 border-t flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                    {formatTimestamp(note.updatedAt, uiConfig.timeFormat)}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(note)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                                <AlertDialogDescription>This will move the note to the bin. You can restore it from there later.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(note.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardFooter>
        </Card>
    );
}

function NoteInputBar() {
    const [content, setContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();
    const [commandKey, setCommandKey] = useState('Ctrl');

    useEffect(() => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        setCommandKey(isMac ? '⌘' : 'Ctrl');

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                textareaRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSave = () => {
        if (!content.trim()) {
            toast({
                variant: 'destructive',
                title: 'Cannot save an empty note.',
            });
            return;
        }

        addNote({ content });
        toast({
            variant: 'success',
            title: 'Note Saved',
        });
        setContent('');
        window.dispatchEvent(new Event('notes-updated'));
    };

    return (
         <div className="max-w-3xl mx-auto w-full">
            <div className="relative flex items-center gap-2 py-3">
                <div className="relative w-full">
                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`Take a note... (${commandKey}+/)`}
                        className="pr-12 resize-none max-h-40 shadow-lg pb-12"
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            }
                        }}
                        enableHotkeys
                    />
                     <TextareaToolbar onFormatClick={(type) => textareaRef.current && applyFormat(type, textareaRef.current)} />
                </div>
                <Button
                    size="icon"
                    className={cn("absolute right-2 bottom-5 shrink-0 transition-opacity duration-300", content.trim() ? "opacity-100" : "opacity-0 pointer-events-none")}
                    onClick={handleSave}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  const { toast } = useToast();

  const refreshData = () => {
    setNotes(getNotes());
    const config = getUiConfig();
    setUiConfig(config);
    document.title = `Notes | ${config.appName || 'My Task Manager'}`;
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('storage', refreshData);
    window.addEventListener('notes-updated', refreshData);
    return () => {
        window.removeEventListener('storage', refreshData);
        window.removeEventListener('notes-updated', refreshData);
    };
  }, []);

  const handleEditNote = (note: Note) => {
    setNoteToEdit(note);
  };

  const handleSaveEdit = (id: string, content: string) => {
    updateNote(id, { content });
    toast({ variant: 'success', title: 'Note Updated' });
    refreshData();
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    toast({
      variant: 'success',
      title: 'Note Deleted',
      description: 'The note has been moved to the bin.',
    });
    refreshData();
  };

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading notes..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <StickyNote className="h-7 w-7"/> Notes
        </h1>
      </div>

      <NoteInputBar />

      {notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg mt-8">
            <p className="text-lg font-semibold">No notes yet.</p>
            <p className="mt-1">Use the input bar above to create your first note.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-8">
            {notes.map(note => (
                <NoteCard key={note.id} note={note} uiConfig={uiConfig} onEdit={handleEditNote} onDelete={handleDeleteNote} />
            ))}
        </div>
      )}

      <EditNoteDialog 
        note={noteToEdit} 
        isOpen={!!noteToEdit}
        onOpenChange={(isOpen) => !isOpen && setNoteToEdit(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
