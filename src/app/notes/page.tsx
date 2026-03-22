'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { addNote, getNotes, updateNote, deleteNote, getUiConfig, updateNoteLayouts, resetNotesLayout, deleteMultipleNotes, importNotes, addLog, getAuthMode, getUserPreferences, updateUserPreferences, isInitialSyncComplete, getActiveCompanyId } from '@/lib/data';
import type { Note, UiConfig, NoteLayout, UserPreferences } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StickyNote, LayoutGrid, Plus, CheckSquare, X, Trash2, Upload, Download, Search, CalendarIcon, XCircle, Loader2, CornerDownLeft, Filter, ChevronDown, ChevronRight, FileText, SearchX } from 'lucide-react';
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
import { cn, fuzzySearch } from '@/lib/utils';
import { NoteEditorDialog } from '@/components/note-editor-dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { NoteViewerDialog } from '@/components/note-viewer-dialog';
import { format, startOfDay, endOfDay } from 'date-fns';
import { noteSchema } from '@/lib/validators';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { FolderSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { NotesSkeleton } from '@/components/notes-skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface NoteSuggestion {
    id: string;
    title: string;
    subLabel: string;
    icon: any;
    note: Note;
}

function NotesPageContent() {
  const isMobile = useIsMobile();
  const { isUserLoading } = useFirebase();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [executedSearchQuery, setExecutedSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
  
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydrate preferences
  useEffect(() => {
    const prefs = getUserPreferences();
    if (prefs.noteFilters) {
        setSearchQuery(prefs.noteFilters.search || '');
        setExecutedSearchQuery(prefs.noteFilters.search || '');
        if (prefs.noteFilters.dateFrom) {
            setDateFilter({
                from: new Date(prefs.noteFilters.dateFrom),
                to: prefs.noteFilters.dateTo ? new Date(prefs.noteFilters.dateTo) : undefined
            });
        }
    }
  }, []);

  // Update preferences
  useEffect(() => {
    if (!mounted) return;
    const noteFilters: any = {
        search: executedSearchQuery,
    };
    
    if (dateFilter?.from) {
        noteFilters.dateFrom = dateFilter.from.toISOString();
    }
    
    if (dateFilter?.to) {
        noteFilters.dateTo = dateFilter.to.toISOString();
    }

    updateUserPreferences({
        noteFilters
    });
  }, [executedSearchQuery, dateFilter, mounted]);
  
  const handleOpenNewNoteDialog = useCallback(() => {
    if (isMobile) {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/notes/new');
    } else {
        setNoteToEdit(null);
        setIsEditorOpen(true);
    }
  }, [isMobile, router]);
  
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

  // Listen for mobile-specific add note trigger from navbar
  useEffect(() => {
    const handleOpenNoteEvent = () => handleOpenNewNoteDialog();
    window.addEventListener('open-note-editor', handleOpenNoteEvent);
    return () => window.removeEventListener('open-note-editor', handleOpenNoteEvent);
  }, [handleOpenNewNoteDialog]);

  const refreshData = useCallback(() => {
    const authMode = getAuthMode();
    const companyId = getActiveCompanyId();
    
    if (isUserLoading || (authMode === 'authenticate' && (!companyId || !isInitialSyncComplete(companyId)))) {
        return;
    }

    setNotes(getNotes());
    const config = getUiConfig();
    setUiConfig(config);
    document.title = `Notes | ${config.appName || 'My Task Manager'}`;
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, [isUserLoading]);

  useEffect(() => {
    refreshData();
    window.addEventListener('storage', refreshData);
    window.addEventListener('notes-updated', refreshData);
    window.addEventListener('company-changed', refreshData);
    window.addEventListener('sync-complete', refreshData);
    return () => {
        window.removeEventListener('storage', refreshData);
        window.removeEventListener('notes-updated', refreshData);
        window.removeEventListener('company-changed', refreshData);
        window.removeEventListener('sync-complete', refreshData);
    };
  }, [refreshData]);

  const triggerSearch = () => {
    const trimmed = searchQuery.trim();
    if (trimmed === executedSearchQuery.trim()) {
        setIsFiltering(false);
        return;
    }
    setIsSearchFocused(false);
    window.dispatchEvent(new Event('sync-start'));
    setTimeout(() => {
        setExecutedSearchQuery(trimmed);
    }, 50);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setExecutedSearchQuery('');
  };

  // Background Filtering Logic
  useEffect(() => {
    const performFilter = () => {
        try {
            const results = notes.filter(note => {
                const searchMatch = executedSearchQuery.trim() === '' ||
                    fuzzySearch(executedSearchQuery, note.title) ||
                    fuzzySearch(executedSearchQuery, note.content);
                
                const dateMatch = (() => {
                    if (!dateFilter?.from) return true;
                    const noteDate = new Date(note.updatedAt);
                    const from = startOfDay(dateFilter.from);
                    const to = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from);
                    return noteDate >= from && noteDate <= to;
                })();
                
                return searchMatch && dateMatch;
            });
            setFilteredNotes(results);
        } catch (e) {
            console.error("Notes filtering failed", e);
        } finally {
            setIsFiltering(false);
            window.dispatchEvent(new Event('sync-end'));
        }
    };

    const rafId = requestAnimationFrame(performFilter);
    return () => cancelAnimationFrame(rafId);
  }, [notes, executedSearchQuery, dateFilter]);

  const handleCardClick = (note: Note) => {
    if (isMobile) {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(`/notes/${note.id}`);
    } else {
        setNoteToView(note);
        setIsViewerOpen(true);
    }
  };

  const handleEditFromViewer = () => {
    setIsViewerOpen(false);
    if (isMobile) {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(`/notes/${noteToView?.id}/edit`);
    } else {
        setNoteToEdit(noteToView);
        setIsEditorOpen(true);
    }
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
        toast({ variant: 'success', title: 'Layout Reset', description: 'Your notes layout has been reset to a compact grid.' });
        refreshData();
    }
  };

  const onLayoutChange = (layout: any, layouts: any) => {
    if (areFiltersActive) return;
    updateNoteLayouts(layouts.lg);
  };
  
  const handleToggleSelectMode = () => {
    setIsSelectMode(prev => !prev);
    setSelectedNoteIds([]);
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
    
    if (currentNotes.length === 0) {
        toast({
            variant: 'warning',
            title: 'Nothing to Export',
            description: 'There are no notes to export.',
        });
        return;
    }

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

            window.dispatchEvent(new Event('sync-start'));
            let importedNotesData: Partial<Note>[] = [];
            if (Array.isArray(parsedJson)) {
                importedNotesData = parsedJson;
            } else if (parsedJson && typeof parsedJson === 'object' && Array.isArray(parsedJson.notes)) {
                importedNotesData = parsedJson.notes;
            } else {
                 throw new Error("Invalid format: The JSON file must be an array of notes or an object with a 'notes' array.");
            }
            
            const validationResults = importedNotesData.map(note => noteSchema.safeParse(note));
            const validNotes = validationResults.map((res, i) => res.success ? importedNotesData[i] : null).filter((n): n is Partial<Note> => n !== null);
            const failedCount = validationResults.length - validNotes.length;

            const existingNotes = getNotes();
            const existingContent = new Set(existingNotes.map(n => `${(n.title || '').trim()}|${(n.content || '').trim()}`));
            const uniqueNotesToImport = validNotes.filter(n => {
                const noteContent = `${(n.title || '').trim()}|${(n.content || '').trim()}`;
                return !existingContent.has(noteContent);
            });
            const duplicateCount = validNotes.length - uniqueNotesToImport.length;
            
            if (uniqueNotesToImport.length > 0) {
                importNotes(uniqueNotesToImport);
                addLog({ message: `Imported ${uniqueNotesToImport.length} notes.` });
                toast({ variant: 'success', title: 'Import Complete', description: `${uniqueNotesToImport.length} notes were successfully imported.` });
            }

            if (failedCount > 0) {
                toast({ variant: 'warning', title: 'Import Warning', description: `${failedCount} notes failed validation and were not imported.` });
            }
            if (duplicateCount > 0) {
                toast({ variant: 'default', title: 'Duplicates Skipped', description: `${duplicateCount} duplicate notes were already present.` });
            }

            if(uniqueNotesToImport.length === 0 && failedCount === 0) {
                 toast({ variant: 'default', title: 'Nothing to Import', description: 'All notes in the file were already present and were skipped.' });
            }

            refreshData();

        } catch (error: any) {
            console.error("Error importing notes:", error);
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'There was an error processing your file.' });
        } finally {
            if (fileInputRef.current) { fileInputRef.current.value = ''; }
            window.dispatchEvent(new Event('sync-end'));
        }
    };
    reader.readAsText(file);
  };
  
  const areFiltersActive = useMemo(() => {
      return executedSearchQuery.trim() !== '' || dateFilter !== undefined;
  }, [executedSearchQuery, dateFilter]);

  const layouts = useMemo(() => {
    const generateCompactLayout = (notesToLayout: Note[]) => {
        let colHeights: { [key: string]: number } = { lg: 0, md: 0, sm: 0, xs: 0, xxs: 0 };
        const cols: { [key: string]: number } = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
        
        const layouts: { [key: string]: NoteLayout[] } = { lg: [], md: [], sm: [], xs: [], xxs: [] };

        notesToLayout.forEach(note => {
            Object.keys(cols).forEach(bp => {
                const colWidth = cols[bp];
                const layoutItem = {
                    ...note.layout,
                    i: note.id,
                    x: 0,
                    y: colHeights[bp],
                    w: colWidth,
                    isDraggable: false,
                    isResizable: false,
                };
                layouts[bp].push(layoutItem);
                colHeights[bp] += note.layout.h;
            });
        });
        
        return layouts;
    };
    
    if (areFiltersActive) {
        return generateCompactLayout(filteredNotes);
    }
    
    return { lg: filteredNotes.map(n => n.layout) };
}, [areFiltersActive, filteredNotes]);

  const searchSuggestions = useMemo((): NoteSuggestion[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const suggestions: NoteSuggestion[] = [];
    notes.forEach(note => {
        if (fuzzySearch(q, note.title)) {
            suggestions.push({
                id: `note-title-${note.id}`,
                title: note.title,
                subLabel: "Matched in title",
                icon: StickyNote,
                note
            });
        } else if (fuzzySearch(q, note.content)) {
            suggestions.push({
                id: `note-content-${note.id}`,
                title: note.title || "Untitled Note",
                subLabel: "Matched in content",
                icon: FileText,
                note
            });
        }
    });

    return suggestions.slice(0, 8);
  }, [searchQuery, notes]);

  const handleSuggestionClick = (note: Note) => {
    setIsSearchFocused(false);
    handleCardClick(note);
  };

  const authMode = getAuthMode();
  const activeCompanyIdForSync = getActiveCompanyId();
  const isSyncing = authMode === 'authenticate' && (!activeCompanyIdForSync || !isInitialSyncComplete(activeCompanyIdForSync));
  const activeSkeletons = !mounted || isLoading || isUserLoading || isSyncing;

  if (activeSkeletons || !uiConfig) {
    return <NotesSkeleton />;
  }

  const mode = getAuthMode();
  const isSearchActive = searchQuery.trim().length >= 2;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-start lg:items-center justify-between mb-6 flex-col lg:flex-row gap-4">
        <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <StickyNote className="h-7 w-7"/> Notes
            </h1>
            <Badge variant="outline" className={cn("hidden sm:flex", mode === 'authenticate' ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground")}>
                {mode === 'authenticate' ? 'Cloud Sync' : 'Local Only'}
            </Badge>
        </div>
         <div className="hidden lg:flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportNotes} className="font-medium"><Upload className="mr-2 h-4 w-4"/>Export Notes</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="font-medium"><Download className="mr-2 h-4 w-4"/>Import Notes</Button>
            <input type="file" ref={fileInputRef} onChange={handleImportNotes} className="hidden" accept=".json" />
            <Button
                variant={isSelectMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleToggleSelectMode}
                className="font-medium"
            >
              {isSelectMode ? <X className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
              {isSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetLayout} className="font-medium">
                <LayoutGrid className="mr-2 h-4 w-4"/>
                Reset Layout
            </Button>
        </div>
      </div>
      
       <div className="space-y-4 mb-8">
            <button
                onClick={handleOpenNewNoteDialog}
                className="hidden lg:flex w-full text-left p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-muted-foreground shadow-sm justify-between items-center h-11"
            >
                <span className="font-normal">Take a note...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">{commandKey}</span>/
                </kbd>
            </button>

            <div className="lg:hidden grid grid-cols-2 gap-2 mb-4">
                <Button variant="outline" className="font-medium h-11 rounded-xl" onClick={handleExportNotes}><Upload className="mr-2 h-4 w-4"/>Export</Button>
                <Button variant="outline" className="font-medium h-11 rounded-xl" onClick={() => fileInputRef.current?.click()}><Download className="mr-2 h-4 w-4"/>Import</Button>
                <Button
                    variant={isSelectMode ? 'secondary' : 'outline'}
                    className="font-medium h-11 rounded-xl"
                    onClick={handleToggleSelectMode}
                >
                  {isSelectMode ? <X className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                  {isSelectMode ? 'Cancel' : 'Select'}
                </Button>
                <Button variant="outline" className="font-medium h-11 rounded-xl" onClick={handleResetLayout}>
                    <LayoutGrid className="mr-2 h-4 w-4"/>
                    Reset
                </Button>
            </div>

            <Button 
                variant="secondary" 
                className="w-full flex lg:hidden items-center justify-between h-12 px-4 font-medium shadow-sm border rounded-xl"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            >
                <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {areFiltersActive && (
                        <Badge className="bg-primary text-primary-foreground h-5 px-1.5 min-w-5">
                            {(executedSearchQuery ? 1 : 0) + (dateFilter ? 1 : 0)}
                        </Badge>
                    )}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isFiltersOpen && "rotate-180")} />
            </Button>

             <div className={cn(
                  "transition-all duration-300 overflow-visible",
                  "lg:block", 
                  isFiltersOpen ? "block opacity-100 max-h-[500px]" : "hidden lg:opacity-100 lg:max-h-none opacity-0 max-h-0"
              )}>
                <Card className="border shadow-lg lg:shadow-none bg-card lg:bg-transparent lg:border-none overflow-visible rounded-3xl lg:rounded-none">
                    <CardContent className="p-4 lg:p-3 overflow-visible">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative flex flex-col w-full">
                                <div className="relative flex items-center w-full">
                                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search notes..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') triggerSearch(); }}
                                        className={cn(
                                            "w-full pl-10 h-11 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40 rounded-xl",
                                            executedSearchQuery && "border-primary/40 bg-primary/5 shadow-sm"
                                        )}
                                    />
                                    <div className="absolute right-1 flex items-center h-full gap-1">
                                        {searchQuery && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground"
                                                onClick={clearSearch}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground cursor-help">
                                                        <span className="text-xs">{commandKey}</span>K
                                                    </kbd>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <div className="flex items-center gap-2">
                                                        <CornerDownLeft className="h-3 w-3" />
                                                        <span>Press Enter to search</span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>

                                {isSearchFocused && isSearchActive && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 w-full max-w-[calc(100vw-2rem)] mx-auto sm:max-w-none">
                                        <div className="px-4 py-2 border-b bg-muted/30">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Note Suggestions</p>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                            {searchSuggestions.length > 0 ? (
                                                searchSuggestions.map((suggestion) => (
                                                    <button
                                                        key={suggestion.id}
                                                        onClick={() => handleSuggestionClick(suggestion.note)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted active:bg-muted/80 transition-colors text-left border-b last:border-0 group"
                                                    >
                                                        <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors text-primary">
                                                            <suggestion.icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{suggestion.title}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-tight">{suggestion.subLabel}</p>
                                                        </div>
                                                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center animate-in zoom-in-95 duration-300">
                                                    <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                                                        <SearchX className="h-6 w-6 text-muted-foreground/40" />
                                                    </div>
                                                    <p className="text-sm font-bold text-foreground/80">No matches found</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Try a different keyword</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "justify-start text-left h-11 font-normal rounded-xl",
                                            !dateFilter && "text-muted-foreground",
                                            dateFilter && "border-primary/40 bg-primary/5 shadow-sm text-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFilter?.from ? (
                                            dateFilter.to ? (
                                            <>
                                                {format(dateFilter.from, "LLL dd, y")} - {format(dateFilter.to, "LLL dd, y")}
                                            </>
                                            ) : (
                                            format(dateFilter.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Filter by date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-3xl" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateFilter?.from}
                                        selected={dateFilter}
                                        onSelect={setDateFilter}
                                        numberOfMonths={isMobile ? 1 : 2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {(searchQuery || dateFilter) && (
                            <div className="flex items-center gap-2 pt-3">
                                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setExecutedSearchQuery(''); setDateFilter(undefined); }} className="font-medium">
                                    <XCircle className="mr-2 h-4 w-4" /> Clear filters
                                </Button>
                                {isFiltering ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Filtering notes...
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground font-normal">
                                        {filteredNotes.length} of {notes.length} notes shown.
                                        {areFiltersActive && (
                                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-5 px-2 text-[10px] font-black uppercase tracking-wider rounded-full ml-2">
                                                Filtered
                                            </Badge>
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

      {isSelectMode && (
          <div className="sticky top-[68px] z-30 mb-4">
            <Card className="border-primary/50 bg-background/90 backdrop-blur-sm shadow-lg rounded-2xl">
              <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-notes"
                    checked={
                      filteredNotes.length > 0 &&
                      selectedNoteIds.length === filteredNotes.length
                        ? true
                        : selectedNoteIds.length > 0
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={(checked) => {
                        const idsToSelect = filteredNotes.map(n => n.id);
                        setSelectedNoteIds(checked === true ? idsToSelect : []);
                    }}
                    aria-label="Select all notes"
                    disabled={filteredNotes.length === 0}
                  />
                  <Label
                    htmlFor="select-all-notes"
                    className="text-sm font-medium"
                  >
                    {selectedNoteIds.length > 0
                      ? `${selectedNoteIds.length} of ${filteredNotes.length} selected`
                      : `Select all notes`}
                  </Label>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={selectedNoteIds.length === 0} className="font-semibold rounded-xl px-6">
                      <Trash2 className="mr-2 h-4 w-4" /> Move to Bin
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-semibold">Move to Bin?</AlertDialogTitle>
                      <AlertDialogDescription className="font-normal">
                        Are you sure you want to move the selected{' '}
                        {selectedNoteIds.length} note(s) to the bin? You
                        can restore them later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-medium rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive hover:bg-destructive/90 font-semibold rounded-xl px-6"
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
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-[2.5rem] mt-8 bg-muted/5">
              <FolderSearch className="h-16 w-16 mb-4 text-muted-foreground/50 mx-auto"/>
              <p className="text-lg font-semibold">{notes.length > 0 ? 'No notes match your filters.' : 'No notes yet.'}</p>
              <p className="mt-1 font-normal">{notes.length > 0 ? 'Try adjusting your search or date filters.' : 'Use the add button below to create your first note.'}</p>
          </div>
        ) : (
          <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}}
              cols={{lg: 12, md: 10, sm: 6, xs: 4, xxs: 2}}
              rowHeight={30}
              onLayoutChange={onLayoutChange}
              draggableHandle={areFiltersActive ? undefined : ".drag-handle"}
              isDraggable={!areFiltersActive}
              isResizable={!areFiltersActive}
          >
              {filteredNotes.map(note => (
                  <div key={note.id} data-grid={areFiltersActive ? layouts.lg.find(l => l.i === note.id) : note.layout} className="relative group/card-wrapper">
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

export default function NotesPage() {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NotesPageContent />
    </Suspense>
  );
}