
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getNotes, addNote, updateNote, deleteNote, getUiConfig } from '@/lib/data';
import type { Note } from '@/lib/types';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { StickyNote, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { TextareaToolbar, applyFormat } from '@/components/ui/textarea-toolbar';
import { noteSchema } from '@/lib/validators';
import { cn } from '@/lib/utils';


type NoteFormData = z.infer<typeof noteSchema>;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '' },
  });
  
  const newNoteContent = watch('content');
  const newNoteTitle = watch('title');
  const showSaveButton = (newNoteContent && newNoteContent.trim() !== '') || (newNoteTitle && newNoteTitle.trim() !== '');
  
  const newNoteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     const config = getUiConfig();
     document.title = `Notes | ${config.appName || 'My Task Manager'}`;
  }, []);

  const refreshNotes = () => {
    setNotes(getNotes());
  };

  useEffect(() => {
    refreshNotes();
    setIsLoading(false);

    function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            if (showSaveButton) {
                handleSubmit(onSubmit)();
            } else {
                setIsCreating(false);
            }
        }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSaveButton]);
  
  const onSubmit = async (data: NoteFormData) => {
    addNote({ title: data.title, content: data.content });
    toast({ variant: 'success', title: "Note created successfully" });
    reset({ title: '', content: '' });
    setIsCreating(false);
    refreshNotes();
  };

  const handleUpdateNote = (id: string, data: Partial<Note>) => {
    try {
        updateNote(id, data);
        toast({ variant: 'success', title: "Note updated" });
        setEditingNoteId(null);
        refreshNotes();
    } catch(e: any) {
        toast({ variant: 'destructive', title: "Error updating note", description: e.message });
    }
  }

  const handleDeleteNote = (id: string) => {
    try {
        deleteNote(id);
        toast({ variant: 'success', title: "Note deleted" });
        refreshNotes();
    } catch(e: any) {
        toast({ variant: 'destructive', title: "Error deleting note", description: e.message });
    }
  };
  
  const handleCloseNewNote = () => {
    reset({ title: '', content: '' });
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <StickyNote className="h-7 w-7" /> Notes
          </h1>
          <p className="text-muted-foreground mt-1">A place for your thoughts, ideas, and to-dos.</p>
        </div>
      </div>
      
      <div ref={containerRef} className="max-w-2xl mx-auto mb-12">
        <Card className="shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)}>
             <CardContent className="p-4 pt-6">
               <div className="relative space-y-2">
                 {isCreating && (
                    <Input
                        {...register('title')}
                        placeholder="Title"
                        className="text-lg font-semibold border-0 focus-visible:ring-0 shadow-none px-2 h-auto"
                    />
                 )}
                 <Textarea
                      {...register('content')}
                      ref={newNoteTextareaRef}
                      placeholder="Take a note..."
                      className={cn(
                          "border-0 focus-visible:ring-0 shadow-none px-2 min-h-[60px]", 
                          isCreating ? 'pb-12' : 'min-h-[40px] flex items-center'
                      )}
                      onFocus={() => setIsCreating(true)}
                      enableHotkeys
                  />
                  {isCreating && (
                      <TextareaToolbar 
                          onFormatClick={(type) => newNoteTextareaRef.current && applyFormat(type, newNoteTextareaRef.current)}
                      />
                  )}
               </div>
            </CardContent>
            {isCreating && (
                <CardFooter className="p-3 flex justify-end gap-2">
                    {showSaveButton && (
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={handleCloseNewNote}>
                        Close
                    </Button>
                </CardFooter>
            )}
          </form>
        </Card>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-lg font-semibold">No notes yet.</p>
          <p className="mt-1">Use the form above to create your first note.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              isEditing={editingNoteId === note.id}
              onEditStart={() => setEditingNoteId(note.id)}
              onEditCancel={() => setEditingNoteId(null)}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: Note;
  isEditing: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onUpdate: (id: string, data: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

function NoteCard({ note, isEditing, onEditStart, onEditCancel, onUpdate, onDelete }: NoteCardProps) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: note.title, content: note.content },
  });
  
  const editNoteTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      reset({ title: note.title, content: note.content });
    }
  }, [note, isEditing, reset]);

  const handleUpdateSubmit = async (data: NoteFormData) => {
    onUpdate(note.id, { title: data.title, content: data.content });
  };
  
  return (
    <Card className="break-inside-avoid-column flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4 flex-grow cursor-pointer" onClick={!isEditing ? onEditStart : undefined}>
        {isEditing ? (
          <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-2">
            <Input {...register('title')} placeholder="Title" className="text-md font-semibold border-0 focus-visible:ring-0 shadow-none px-1 h-auto"/>
            <div className="pt-1"></div>
            <div className="relative">
              <Textarea 
                {...register('content')} 
                ref={editNoteTextareaRef}
                placeholder="Take a note..." 
                className="border-0 focus-visible:ring-0 shadow-none px-1 min-h-[100px] pb-12"
                enableHotkeys
                autoFocus
              />
              <TextareaToolbar onFormatClick={(type) => editNoteTextareaRef.current && applyFormat(type, editNoteTextareaRef.current)} />
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {note.title && <h3 className="font-semibold">{note.title}</h3>}
            {note.title && note.content && <div className="pt-1"></div>}
            <div className="text-sm text-foreground space-y-1">
              <RichTextViewer text={note.content || ''} />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 flex justify-between items-center">
        {isEditing ? (
            <div className="flex w-full justify-end gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={onEditCancel}>Cancel</Button>
                <Button type="button" size="sm" disabled={isSubmitting} onClick={handleSubmit(handleUpdateSubmit)}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Save
                </Button>
            </div>
        ) : (
            <>
                <span className="text-xs text-muted-foreground px-2">
                    {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </span>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete this note. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(note.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )}
      </CardFooter>
    </Card>
  );
}
