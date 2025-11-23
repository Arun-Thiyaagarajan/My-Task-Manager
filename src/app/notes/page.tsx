
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { addNote, getNotes, updateNote, deleteNote, getUiConfig, updateNoteLayouts, resetNotesLayout, deleteMultipleNotes, importNotes, addLog } from '@/lib/data';
import type { Note, UiConfig, NoteLayout } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StickyNote, LayoutGrid, Plus, CheckSquare, X, Trash2, Upload, Download } from 'lucide-react';
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
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { NoteCard } from '@/components/note-card';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { NoteEditorDialog } from '@/components/note-editor-dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { NoteViewerDialog } from '@/components/note-viewer-dialog';
import { format } from 'date-fns';
import { noteSchema } from '@/lib/validators';


const ResponsiveGridLayout = WidthProvider(Responsive);

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [noteToEdit, setNoteToEdit] = useState<Partial<Note> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();
  const [commandKey, setCommandKey] = useState('Ctrl');
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  const [noteToView, setNoteToView] = useState<Note | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const handleOpenNewNoteDialog = useCallback(() => {
    setNoteToEdit(null);
    setIsEditorOpen(true);
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

  const handleCardClick = (note: Note) => {
    setNoteToView(note);
    setIsViewerOpen(true);
  };

  const handleEditFromViewer = () => {
    setIsViewerOpen(false);
    setNoteToEdit(noteToView);
    setIsEditorOpen(true);
  };

  const handleDeleteFromViewer = () => {
    setIsViewerOpen(false);
    if(noteToView) {
      deleteNote(noteToView.id);
      toast({
        variant: 'success',
        title: 'Note Deleted',
        description: 'The note has been moved to the bin.',
      });
      refreshData();
    }
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
    refreshData();
    setIsEditorOpen(false);
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
  
  const handleToggleSelectMode = () => {
    setIsSelectMode(prev => !prev);
    setSelectedNoteIds([]);
  };

  const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedNoteIds(checked === true ? notes.map(n => n.id) : []);
  };
  
  const handleBulkDelete = () => {
    deleteMultipleNotes(selectedNoteIds);
    toast({
        variant: 'success',
        title: `${selectedNoteIds.length} Note(s) Deleted`,
        description: 'The selected notes have been moved to the bin.',
    });
    refreshData();
    setIsSelectMode(false);
  };
  
  const handleExportNotes = () => {
    if (!uiConfig) return;
    const currentNotes = getNotes();
    const appNamePrefix = uiConfig.appName?.replace(/\s+/g, '_') || 'MyTaskManager';
    const dateSuffix = format(new Date(), "yyyy-MM-dd");
    const fileName = `${appNamePrefix}_Notes_${dateSuffix}.json`;

    const exportData = {
        appName: uiConfig.appName,
        appIcon: uiConfig.appIcon,
        notes: currentNotes,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = fileName;
    link.click();

    toast({ variant: 'success', title: 'Export Successful', description: `${currentNotes.length} notes exported.` });
  };

  const handleImportNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const parsedJson = JSON.parse(text);

            let importedNotesData: Partial<Note>[] = [];
            if (Array.isArray(parsedJson)) { // Legacy format: array of notes
                importedNotesData = parsedJson;
            } else if (parsedJson && typeof parsedJson === 'object' && Array.isArray(parsedJson.notes)) {
                importedNotesData = parsedJson.notes;
            } else {
                 throw new Error("Invalid format: The JSON file must be an array of notes or an object with a 'notes' array.");
            }
            
            const validationResults = importedNotesData.map(note => noteSchema.safeParse(note));
            const validNotes = validationResults.map((res, i) => res.success ? importedNotesData[i] : null).filter((n): n is Partial<Note> => n !== null);
            const failedCount = validationResults.length - validNotes.length;

            if (validNotes.length > 0) {
                const newNotes = importNotes(validNotes);
                addLog({ message: `Imported ${newNotes.length} notes.` });
                toast({ variant: 'success', title: 'Import Complete', description: `${newNotes.length} notes were successfully imported.` });
            }

            if (failedCount > 0) {
                toast({ variant: 'warning', title: 'Import Warning', description: `${failedCount} notes failed validation and were not imported.` });
            }

            if(validNotes.length === 0 && failedCount === 0) {
                 toast({ variant: 'default', title: 'Nothing to Import', description: 'The file contained no notes to import.' });
            }

            refreshData();

        } catch (error: any) {
            console.error("Error importing notes:", error);
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'There was an error processing your file.' });
        } finally {
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
        }
    };
    reader.readAsText(file);
  };

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading notes..." />;
  }

  const layouts = {
      lg: notes.map(note => note.layout),
      md: notes.map((note, i) => ({ ...note.layout, x: (i % 2) * 6, w: 6, h: 6 })),
      sm: notes.map((note, i) => ({ ...note.layout, x: (i % 2) * 6, w: 6, h: 6 })),
      xs: notes.map(note => ({ ...note.layout, x: 0, w: 1, h: 6 })),
      xxs: notes.map(note => ({ ...note.layout, x: 0, w: 1, h: 6 })),
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <StickyNote className="h-7 w-7"/> Notes
        </h1>
         <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportNotes}><Download className="mr-2 h-4 w-4"/>Export Notes</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>Import Notes</Button>
            <input type="file" ref={fileInputRef} onChange={handleImportNotes} className="hidden" accept=".json" />
            <Button
                variant={isSelectMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleToggleSelectMode}
            >
              {isSelectMode ? <X className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
              {isSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetLayout}>
                <LayoutGrid className="mr-2 h-4 w-4"/>
                Reset Layout
            </Button>
        </div>
      </div>
      
       <div className="mb-8">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleOpenNewNoteDialog}
                            className="w-full text-left p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-muted-foreground shadow-sm"
                        >
                            Take a note...
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="flex items-center gap-2">
                            <span>Create a new note</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">{commandKey}</span>/
                            </kbd>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

      {isSelectMode && (
          <div className="sticky top-[68px] z-30 mb-4">
            <Card className="border-primary/50 bg-background/90 backdrop-blur-sm shadow-lg">
              <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-notes"
                    checked={
                      notes.length > 0 &&
                      selectedNoteIds.length === notes.length
                        ? true
                        : selectedNoteIds.length > 0
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all notes"
                    disabled={notes.length === 0}
                  />
                  <Label
                    htmlFor="select-all-notes"
                    className="text-sm font-medium"
                  >
                    {selectedNoteIds.length > 0
                      ? `${selectedNoteIds.length} of ${notes.length} selected`
                      : `Select all notes`}
                  </Label>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={selectedNoteIds.length === 0}>
                      <Trash2 className="mr-2 h-4 w-4" /> Move to Bin
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Move to Bin?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to move the selected{' '}
                        {selectedNoteIds.length} note(s) to the bin? You
                        can restore them later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Move to Bin
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
      )}
      
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
              cols={{lg: 12, md: 12, sm: 12, xs: 1, xxs: 1}}
              rowHeight={30}
              onLayoutChange={onLayoutChange}
              draggableHandle=".drag-handle"
          >
              {notes.map(note => (
                  <div key={note.id} data-grid={note.layout} className="relative group/card-wrapper">
                      {isSelectMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox
                                checked={selectedNoteIds.includes(note.id)}
                                onCheckedChange={checked => {
                                    setSelectedNoteIds(prev =>
                                        checked ? [...prev, note.id] : prev.filter(id => id !== note.id)
                                    );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={cn("bg-background/80 h-5 w-5", selectedNoteIds.includes(note.id) && "bg-primary")}
                            />
                          </div>
                      )}
                      <NoteCard 
                          note={note} 
                          uiConfig={uiConfig}
                          onClick={() => handleCardClick(note)}
                          isSelected={selectedNoteIds.includes(note.id)}
                      />
                  </div>
              ))}
          </ResponsiveGridLayout>
        )}
      </div>
      
      <NoteViewerDialog
        note={noteToView}
        isOpen={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        onEdit={handleEditFromViewer}
        onDelete={handleDeleteFromViewer}
      />

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
