
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { getNotes, addNote, updateNote, deleteNote, getUiConfig } from '@/lib/data';
import type { Note, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FileText, Plus, Trash2, Save, X, StickyNote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat } from '@/components/ui/textarea-toolbar';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { cn, formatTimestamp } from '@/lib/utils';
import { noteSchema } from '@/lib/validators';
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

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(true);

  const { toast } = useToast();
  const descriptionEditorRef = React.useRef<HTMLTextAreaElement>(null);

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
    return () => window.removeEventListener('storage', refreshData);
  }, []);

  useEffect(() => {
    if (activeNote) {
      setEditorTitle(activeNote.title || '');
      setEditorContent(activeNote.content || '');
      setIsCreatingNew(false);
    } else {
      setEditorTitle('');
      setEditorContent('');
      setIsCreatingNew(true);
    }
  }, [activeNote]);

  const hasChanges = useMemo(() => {
    if (isCreatingNew) {
      return editorTitle.trim() !== '' || editorContent.trim() !== '';
    }
    if (activeNote) {
      return editorTitle !== (activeNote.title || '') || editorContent !== (activeNote.content || '');
    }
    return false;
  }, [editorTitle, editorContent, activeNote, isCreatingNew]);

  const handleSaveNote = () => {
    const noteData = {
      title: editorTitle,
      content: editorContent,
    };

    const validationResult = noteSchema.safeParse(noteData);
    if (!validationResult.success) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: validationResult.error.flatten().formErrors[0] || 'A note must have a title or content.',
      });
      return;
    }

    if (activeNote && !isCreatingNew) {
      // Update existing note
      updateNote(activeNote.id, validationResult.data);
      toast({ variant: 'success', title: 'Note Updated' });
    } else {
      // Add new note
      addNote(validationResult.data);
      toast({ variant: 'success', title: 'Note Saved' });
    }
    
    refreshData();
    handleNewNoteClick();
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    toast({
      variant: 'success',
      title: 'Note Deleted',
      description: 'The note has been moved to the bin.',
    });
    if (activeNote?.id === noteId) {
      handleNewNoteClick();
    }
    refreshData();
  };

  const handleNewNoteClick = () => {
    setActiveNote(null);
    setEditorTitle('');
    setEditorContent('');
    setIsCreatingNew(true);
  };
  
  const handleClear = () => {
    setEditorTitle('');
    setEditorContent('');
  };

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading notes..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7"/> Notes
        </h1>
        <Button onClick={handleNewNoteClick}>
            <Plus className="mr-2 h-4 w-4" /> New Note
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {/* Notes List */}
        <div className="md:col-span-1 lg:col-span-1">
          <Card>
             <CardHeader>
                <CardTitle>All Notes</CardTitle>
                <CardDescription>{notes.length} note(s) found.</CardDescription>
             </CardHeader>
             <CardContent>
                {notes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No notes yet.</p>
                        <p className="text-xs mt-1">Click "New Note" to start.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {notes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => setActiveNote(note)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-colors",
                                    activeNote?.id === note.id ? "bg-muted border-primary/50" : "bg-card hover:bg-muted/50"
                                )}
                            >
                                <p className="font-semibold truncate">{note.title || <span className="italic text-muted-foreground">Untitled Note</span>}</p>
                                <p className="text-sm text-muted-foreground truncate">{note.content ? note.content.substring(0, 100) : "No content"}</p>
                            </button>
                        ))}
                    </div>
                )}
             </CardContent>
          </Card>
        </div>

        {/* Note Editor */}
        <div className="md:col-span-2 lg:col-span-3">
          <Card className="sticky top-20">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{isCreatingNew ? 'Create New Note' : 'Edit Note'}</span>
                    {!isCreatingNew && activeNote && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
                                    <AlertDialogAction onClick={() => handleDeleteNote(activeNote.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardTitle>
                 {activeNote && !isCreatingNew && (
                    <p className="text-sm text-muted-foreground pt-1">
                        Last updated: {formatTimestamp(activeNote.updatedAt, uiConfig.timeFormat)}
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Title (optional)"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="text-lg font-semibold border-0 border-b-2 rounded-none px-1 focus-visible:ring-0 focus:border-primary"
              />
              <div className="relative">
                <Textarea
                  ref={descriptionEditorRef}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="Take a note..."
                  className="min-h-[300px] pb-12"
                  enableHotkeys
                />
                <TextareaToolbar onFormatClick={(type) => descriptionEditorRef.current && applyFormat(type, descriptionEditorRef.current)} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleClear} disabled={!editorTitle && !editorContent}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                </Button>
                <Button onClick={handleSaveNote} disabled={!hasChanges}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Note
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
