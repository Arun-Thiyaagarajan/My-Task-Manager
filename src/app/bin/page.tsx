
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBinnedTasks, getUiConfig, getDevelopers, getTesters, restoreMultipleTasks, permanentlyDeleteMultipleTasks, emptyBin } from '@/lib/data';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Trash2, History, ArrowLeft, Recycle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useActiveCompany } from '@/hooks/use-active-company';


export default function BinPage() {
  const activeCompanyId = useActiveCompany();
  const [binnedTasks, setBinnedTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const { toast } = useToast();

  const refreshData = () => {
    if (activeCompanyId) {
        setBinnedTasks(getBinnedTasks());
        setUiConfig(getUiConfig());
    }
  };

  useEffect(() => {
    document.title = 'Bin | My Task Manager';
    if(activeCompanyId) {
      refreshData();
      setIsLoading(false);
    }
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, [activeCompanyId]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedTaskIds(checked ? binnedTasks.map(task => task.id) : []);
  };

  const handleSelectOne = (taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleRestore = () => {
    restoreMultipleTasks(selectedTaskIds);
    toast({
      variant: 'success',
      title: 'Tasks Restored',
      description: `${selectedTaskIds.length} task(s) have been restored to your main list.`
    });
    refreshData();
    setSelectedTaskIds([]);
  };

  const handlePermanentDelete = () => {
    permanentlyDeleteMultipleTasks(selectedTaskIds);
    toast({
      variant: 'success',
      title: 'Tasks Deleted',
      description: `${selectedTaskIds.length} task(s) have been permanently deleted.`
    });
    refreshData();
    setSelectedTaskIds([]);
  };
  
  const handleEmptyBin = () => {
    emptyBin();
    toast({
      variant: 'success',
      title: 'Bin Emptied',
      description: 'All tasks in the bin have been permanently deleted.'
    });
    refreshData();
    setSelectedTaskIds([]);
  };

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading bin..." />;
  }

  const developers = getDevelopers();
  const testers = getTesters();
  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t]));

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trash2 className="h-7 w-7"/> Bin
            </h1>
            <p className="text-muted-foreground mt-1">Tasks deleted in the last 30 days. Items will be permanently deleted after this period.</p>
        </div>
        <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tasks
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Deleted Tasks</CardTitle>
                 {binnedTasks.length > 0 && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive"><Recycle className="mr-2 h-4 w-4"/> Empty Bin</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone. All {binnedTasks.length} tasks in the bin will be permanently deleted.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleEmptyBin} className="bg-destructive hover:bg-destructive/90">Empty Bin</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                 )}
            </div>
            {selectedTaskIds.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedTaskIds.length} task(s) selected</span>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleRestore}><History className="mr-2 h-4 w-4"/> Restore</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete Permanently</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the selected {selectedTaskIds.length} task(s). This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            )}
        </CardHeader>
        <CardContent>
          {binnedTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-semibold">The bin is empty.</p>
              <p className="mt-1">Deleted tasks will appear here.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox
                        checked={selectedTaskIds.length === binnedTasks.length && binnedTasks.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignees</TableHead>
                    <TableHead className="text-right">Deleted</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {binnedTasks.map(task => {
                        const assignees = [
                            ...(task.developers || []).map(id => developersById.get(id)?.name),
                            ...(task.testers || []).map(id => testersById.get(id)?.name)
                        ].filter(Boolean);

                        return (
                            <TableRow key={task.id} data-state={selectedTaskIds.includes(task.id) && "selected"}>
                                <TableCell>
                                    <Checkbox
                                    checked={selectedTaskIds.includes(task.id)}
                                    onCheckedChange={checked => handleSelectOne(task.id, !!checked)}
                                    aria-label={`Select task ${task.title}`}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{task.title}</TableCell>
                                <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                                <TableCell className="text-muted-foreground text-xs truncate max-w-xs">{assignees.join(', ') || 'N/A'}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">
                                    {task.deletedAt ? `${formatDistanceToNow(new Date(task.deletedAt))} ago` : 'Recently'}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
