
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { addNote, getNotes, updateNote, deleteNote, getUiConfig, updateNoteLayouts, resetNotesLayout } from '@/lib/data';
import type { Note, UiConfig, NoteLayout } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Edit, Trash2, StickyNote, LayoutGrid } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat } from '@/components/ui/textarea-toolbar';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

function NoteEditorDialog({
  note,
  isOpen,
  onOpenChange,
  onSave,
}: {
  note: Partial<Note> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string | undefined, content: string) => void;
}) {
  const [content, setContent] = useState('');
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(note?.content || '');
      setTimeout(() => {
        descriptionEditorRef.current?.focus();
      }, 100);
    }
  }, [isOpen, note]);

  const handleSave = () => {
    onSave(note?.id, content);
    onOpenChange(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{note?.id ? 'Edit Note' : 'New Note'}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="py-4 space-y-2">
            <Textarea
              ref={descriptionEditorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Take a note..."
              className="min-h-[200px] max-h-[calc(80vh-200px)] w-full text-base"
              enableHotkeys
              onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
                  }
              }}
            />
            <TextareaToolbar onFormatClick={(type) => descriptionEditorRef.current && applyFormat(type, descriptionEditorRef.current)} />
          </div>
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
        <Card className="flex flex-col h-full group w-full overflow-hidden">
            <CardContent className="p-4 flex-grow overflow-y-auto">
                <RichTextViewer text={note.content} />
            </CardContent>
            <CardFooter className="p-2 border-t flex justify-between items-center bg-background/50">
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

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [noteToEdit, setNoteToEdit] = useState<Partial<Note> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();
  const [commandKey, setCommandKey] = useState('Ctrl');
  
  const handleOpenNewNoteDialog = useCallback(() => {
    setNoteToEdit(null);
    setIsEditorOpen(true);
  }, []);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setCommandKey(navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl');
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

  const refreshData = useCallback(() => {
    setNotes(getNotes());
    const config = getUiConfig();
    setUiConfig(config);
    document.title = `Notes | ${config.appName || 'My Task Manager'}`;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('storage', refreshData);
    window.addEventListener('notes-updated', refreshData);
    return () => {
        window.removeEventListener('storage', refreshData);
        window.removeEventListener('notes-updated', refreshData);
    };
  }, [refreshData]);

  const handleEditNote = (note: Note) => {
    setNoteToEdit(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = (id: string | undefined, content: string) => {
    if (!content.trim()) {
        toast({ variant: 'destructive', title: 'Cannot save empty note.' });
        return;
    }
    if (id) {
        updateNote(id, { content });
        toast({ variant: 'success', title: 'Note Updated' });
    } else {
        addNote({ content });
        toast({ variant: 'success', title: 'Note Saved' });
    }
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
  
  const handleResetLayout = () => {
    if (resetNotesLayout()) {
        toast({ variant: 'success', title: 'Layout Reset', description: 'Your notes layout has been reset to the default grid.' });
        refreshData();
    }
  };

  const onLayoutChange = (layout: any, layouts: any) => {
    updateNoteLayouts(layouts.lg);
  };

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading notes..." />;
  }

  const layouts = {
      lg: notes.map(note => note.layout)
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <StickyNote className="h-7 w-7"/> Notes
        </h1>
        <Button variant="outline" size="sm" onClick={handleResetLayout}>
            <LayoutGrid className="mr-2 h-4 w-4"/>
            Reset Layout
        </Button>
      </div>
      
       <div className="mb-8">
            <button
                onClick={handleOpenNewNoteDialog}
                className="w-full text-left p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-muted-foreground shadow-sm"
            >
                Take a note... ({commandKey} + /)
            </button>
        </div>

      <div className="pb-8">
        {notes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg mt-8">
              <p className="text-lg font-semibold">No notes yet.</p>
              <p className="mt-1">Use the bar above to create your first note.</p>
          </div>
        ) : (
          <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}}
              cols={{lg: 12, md: 10, sm: 6, xs: 4, xxs: 2}}
              rowHeight={30}
              onLayoutChange={onLayoutChange}
              isDraggable
              isResizable
          >
              {notes.map(note => (
                  <div key={note.id} data-grid={note.layout}>
                      <NoteCard 
                          note={note} 
                          uiConfig={uiConfig} 
                          onEdit={handleEditNote} 
                          onDelete={handleDeleteNote} 
                      />
                  </div>
              ))}
          </ResponsiveGridLayout>
        )}
      </div>
      
      <NoteEditorDialog 
        note={noteToEdit} 
        isOpen={isEditorOpen}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                setNoteToEdit(null);
            }
            setIsEditorOpen(isOpen);
        }}
        onSave={handleSaveNote}
      />
    </div>
  );
}
