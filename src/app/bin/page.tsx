'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBinnedTasks, getUiConfig, getDevelopers, getTesters, restoreMultipleTasks, permanentlyDeleteMultipleTasks, emptyBin, restoreTask } from '@/lib/data';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Trash2, History, ArrowLeft, Recycle, StickyNote, MoreVertical, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useActiveCompany } from '@/hooks/use-active-company';
import { formatTimestamp, cn } from '@/lib/utils';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


function NoteViewerDialog({ isOpen, onOpenChange, note }: { isOpen: boolean, onOpenChange: (open: boolean) => void, note: Task | null }) {
    if (!note) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-semibold">
                        <StickyNote className="h-5 w-5" /> Deleted Note
                    </DialogTitle>
                    <DialogDescription>{note.title.replace('Note: ', '')}</DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0 overflow-y-auto pr-4">
                    <RichTextViewer text={note.description || ''} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MobileBinCard({ task, uiConfig, onRestore, onDelete, onClick }: { task: Task, uiConfig: UiConfig, onRestore: () => void, onDelete: () => void, onClick: () => void }) {
    const isNote = task.title.startsWith('Note: ');
    const displayTitle = isNote ? task.title.replace('Note: ', '') : task.title;

    return (
        <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] border-muted/60" onClick={onClick}>
            <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        {isNote && <StickyNote className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                        <h3 className="text-sm font-bold text-foreground leading-tight truncate">{displayTitle}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Deleted {task.deletedAt ? formatTimestamp(task.deletedAt, uiConfig.timeFormat) : 'Recently'}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" onClick={onRestore}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restore</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-bold">Delete Permanently?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-normal">This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-4 gap-2">
                                <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </Card>
    );
}

export default function BinPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const router = useRouter();
  const activeCompanyId = useActiveCompany();
  const [binnedTasks, setBinnedTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  
  const [noteToView, setNoteToView] = useState<Task | null>(null);
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false);

  const refreshData = () => {
    if (activeCompanyId) {
        setBinnedTasks(getBinnedTasks());
        const config = getUiConfig();
        setUiConfig(config);
        document.title = `Bin | ${config.appName || 'My Task Manager'}`;
        setIsLoading(false);
        window.dispatchEvent(new Event('navigation-end'));
    }
  };

  useEffect(() => {
    if(activeCompanyId) {
      refreshData();
    }
    window.addEventListener('storage', refreshData);
    window.addEventListener('company-changed', refreshData);
    return () => {
        window.removeEventListener('storage', refreshData);
        window.removeEventListener('company-changed', refreshData);
    };
  }, [activeCompanyId]);

  const handleRowClick = (task: Task) => {
    if (task.title.startsWith('Note: ')) {
        setNoteToView(task);
        setIsNoteViewerOpen(true);
    } else {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(`/tasks/${task.id}`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? binnedTasks.map(task => task.id) : []);
  };

  const handleSelectOne = (taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleRestore = (taskId: string) => {
    restoreTask(taskId);
    toast({
      variant: 'success',
      title: 'Item Restored',
      description: `The item has been restored successfully.`
    });
    refreshData();
  };

  const handleRestoreMultiple = () => {
    restoreMultipleTasks(selectedTaskIds);
    toast({
      variant: 'success',
      title: 'Items Restored',
      description: `${selectedTaskIds.length} item(s) have been restored.`
    });
    refreshData();
    setSelectedTaskIds([]);
  };

  const handlePermanentDeleteOne = (taskId: string) => {
    permanentlyDeleteMultipleTasks([taskId]);
    toast({
      variant: 'success',
      title: 'Item Deleted',
      description: `The item has been permanently deleted.`
    });
    refreshData();
  };

  const handlePermanentDeleteMultiple = () => {
    permanentlyDeleteMultipleTasks(selectedTaskIds);
    toast({
      variant: 'success',
      title: 'Items Deleted',
      description: `${selectedTaskIds.length} item(s) have been permanently deleted.`
    });
    refreshData();
    setSelectedTaskIds([]);
  };
  
  const handleEmptyBin = () => {
    emptyBin();
    toast({
      variant: 'success',
      title: 'Bin Emptied',
      description: 'All items in the bin have been permanently deleted.'
    });
    refreshData();
    setSelectedTaskIds([]);
  };

  if (isLoading || !uiConfig) {
    return null;
  }

  const developers = getDevelopers();
  const testers = getTesters();
  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t]));

  const handleBack = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push(isMobile ? '/profile' : '/');
  };

  return (
    <div id="bin-page" className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 -ml-2 rounded-full shrink-0">
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Trash2 className="h-6 w-6 sm:h-7 sm:w-7"/> Bin
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-normal">Items deleted in the last 30 days. They will be permanently deleted after this period.</p>
            </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Deleted Items</h2>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold">{binnedTasks.length}</Badge>
            </div>
            {binnedTasks.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="font-bold rounded-xl h-10 px-4 shadow-md"><Recycle className="mr-2 h-4 w-4"/> Empty Bin</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-bold tracking-tight">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="font-normal text-sm leading-relaxed">This action cannot be undone. All {binnedTasks.length} items in the bin will be permanently deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="pt-4 gap-2">
                            <AlertDialogCancel className="font-medium rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleEmptyBin} className="bg-destructive hover:bg-destructive/90 font-bold rounded-xl px-6">Empty Bin</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>

        {selectedTaskIds.length > 0 && (
            <Card className="border-primary/20 bg-primary/5 animate-in slide-in-from-top-2 duration-300 rounded-2xl">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-sm font-bold text-primary">{selectedTaskIds.length} item(s) selected</span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button size="sm" onClick={handleRestoreMultiple} className="flex-1 sm:flex-none font-bold rounded-xl h-10"><History className="mr-2 h-4 w-4"/> Restore</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="flex-1 sm:flex-none font-bold rounded-xl h-10"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="font-bold">Permanently Delete?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-normal text-sm">This will permanently delete the selected {selectedTaskIds.length} item(s). This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="pt-4 gap-2">
                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePermanentDeleteMultiple} className="bg-destructive hover:bg-destructive/90 font-bold rounded-xl">Delete Forever</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
        )}

        {binnedTasks.length === 0 ? (
            <div className="text-center py-24 bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-muted-foreground/20">
                <Trash2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-xl font-bold tracking-tight">The bin is empty.</p>
                <p className="mt-1 text-sm text-muted-foreground font-medium">Deleted items will appear here for 30 days.</p>
            </div>
        ) : (
            isMobile ? (
                <div className="grid grid-cols-1 gap-3 pb-20">
                    {binnedTasks.map(task => (
                        <MobileBinCard 
                            key={task.id}
                            task={task}
                            uiConfig={uiConfig}
                            onRestore={() => handleRestore(task.id)}
                            onDelete={() => handlePermanentDeleteOne(task.id)}
                            onClick={() => handleRowClick(task)}
                        />
                    ))}
                </div>
            ) : (
                <Card className="rounded-2xl overflow-hidden border-none shadow-xl">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedTaskIds.length === binnedTasks.length && binnedTasks.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Title</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Assignees</TableHead>
                                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Deleted</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {binnedTasks.map(task => {
                                const assignees = [
                                    ...(task.developers || []).map(id => developersById.get(id)?.name),
                                    ...(task.testers || []).map(id => testersById.get(id)?.name)
                                ].filter(Boolean);
                                
                                const isNote = task.title.startsWith('Note: ');

                                return (
                                    <TableRow
                                      key={task.id}
                                      data-state={selectedTaskIds.includes(task.id) && "selected"}
                                      onClick={() => handleRowClick(task)}
                                      className="cursor-pointer group"
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                            checked={selectedTaskIds.includes(task.id)}
                                            onCheckedChange={checked => handleSelectOne(task.id, !!checked)}
                                            aria-label={`Select task ${task.title}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-bold group-hover:text-primary transition-colors whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {isNote && <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />}
                                                {isNote ? task.title.replace('Note: ', '') : task.title}
                                            </div>
                                        </TableCell>
                                        <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                                        <TableCell className="text-muted-foreground text-xs truncate max-w-xs font-medium">{assignees.join(', ') || 'N/A'}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap font-medium">
                                            {task.deletedAt ? formatTimestamp(task.deletedAt, uiConfig.timeFormat) : 'Recently'}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )
        )}
      </div>
      
      <NoteViewerDialog isOpen={isNoteViewerOpen} onOpenChange={setIsNoteViewerOpen} note={noteToView} />
    </div>
  );
}
