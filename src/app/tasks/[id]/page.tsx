

'use client';

import { useState, useEffect, useRef } from 'react';
import { getTaskById, getUiConfig, updateTask, getDevelopers, getTesters, getTasks, restoreTask, getLogsForTask, clearExpiredReminders } from '@/lib/data';
import { getLinkAlias } from '@/ai/flows/get-link-alias-flow';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, ListChecks, Paperclip, CheckCircle2, Clock, Box, Check, Code2, ClipboardCheck, Link2, ZoomIn, Image, X, Ban, Sparkles, Share2, History, MessageSquare, BellRing, MoreVertical, Trash2, FileJson, Copy, Download } from 'lucide-react';
import { getStatusConfig, TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { PrLinksGroup } from '@/components/pr-links-group';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarColor, cn, getRepoBadgeStyle } from '@/lib/utils';
import { format } from 'date-fns';
import type { Task, FieldConfig, UiConfig, TaskStatus, Person, Attachment, Log, Comment } from '@/lib/types';
import { CommentsSection } from '@/components/comments-section';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PersonProfileCard } from '@/components/person-profile-card';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { attachmentSchema } from '@/lib/validators';
import { RelatedTasksSection } from '@/components/related-tasks-section';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { FavoriteToggleButton } from '@/components/favorite-toggle';
import { TaskHistory } from '@/components/task-history';
import { ReminderDialog } from '@/components/reminder-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { generateTaskPdf, generateTasksText } from '@/lib/share-utils';


const isImageUrl = (url: string): boolean => {
  try {
    const path = new URL(url).pathname;
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path);
  } catch {
    return false;
  }
};


export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const [personInView, setPersonInView] = useState<{person: Person, isDeveloper: boolean} | null>(null);
  const [isEditingPrLinks, setIsEditingPrLinks] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string; name: string} | null>(null);
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [isAddLinkPopoverOpen, setIsAddLinkPopoverOpen] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '' });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [relatedTasksTitle, setRelatedTasksTitle] = useState<string>('');
  const [taskLogs, setTaskLogs] = useState<Log[]>([]);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  
  const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
  const taskId = params.id as string;
  
  const loadData = () => {
    // Clear state before loading new task data to prevent content bleed
    setTask(null); 
    setIsLoading(true);

    if (taskId) {
      const allDevs = getDevelopers();
      const allTesters = getTesters();
      const foundTask = getTaskById(taskId);
      const config = getUiConfig();
      
      setTask(foundTask || null);
      setUiConfig(config);
      setDevelopers(allDevs);
      setTesters(allTesters);

      if (foundTask) {
        document.title = `${foundTask.title} | ${config.appName || 'My Task Manager'}`;
        
        const isBinned = !!foundTask.deletedAt;
        if (isBinned) {
            setTaskLogs([]);
        } else {
            setTaskLogs(getLogsForTask(taskId));
            config.fields.forEach(field => {
                const isLinkField = field.type === 'url' || (field.type === 'text' && !!field.baseUrl);
                if (isLinkField && field.isCustom) {
                    const value = foundTask.customFields?.[field.key];
                    const aliasKey = `${field.key}_alias`;
                    const hasAlias = foundTask.customFields?.[aliasKey];

                    if (value && !hasAlias) {
                        (async () => {
                            try {
                                const fullUrl = (field.type === 'text' && field.baseUrl) ? `${field.baseUrl}${value}` : value;
                                const result = await getLinkAlias({ url: fullUrl });
                                if (result.alias) {
                                    const currentTask = getTaskById(taskId);
                                    if (currentTask) {
                                        updateTask(taskId, {
                                            customFields: {
                                                ...currentTask.customFields,
                                                [aliasKey]: result.alias,
                                            }
                                        });
                                    }
                                }
                            } catch (e) {
                                console.error(`Failed to generate alias for ${field.key}:`, e);
                            }
                        })();
                    }
                }
            });
        }
      } else {
        document.title = `Task Not Found | ${config.appName || 'My Task Manager'}`;
      }
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Run this first to clear any expired reminders before we read data
    const { updatedTaskIds } = clearExpiredReminders();
    if (updatedTaskIds.includes(taskId)) {
        toast({ title: 'Reminder Cleared', description: 'The reminder for this task expired and was automatically cleared.' });
    }

    const savedPinnedTasks = localStorage.getItem(PINNED_TASKS_STORAGE_KEY);
    if (savedPinnedTasks) {
      setPinnedTaskIds(JSON.parse(savedPinnedTasks));
    }
    loadData();

    const handleStorageChange = () => {
        const updatedPinnedTasks = localStorage.getItem(PINNED_TASKS_STORAGE_KEY);
        if (updatedPinnedTasks) {
          setPinnedTaskIds(JSON.parse(updatedPinnedTasks));
        }
        loadData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [taskId]);

  useEffect(() => {
    if (!task || task.deletedAt) {
      setRelatedTasks([]);
      setRelatedTasksTitle('');
      return;
    }
    
    // This logic runs only on the client, after the task has been loaded.
    // This avoids hydration errors from Math.random().
    const allDevs = getDevelopers();
    const allTasks = getTasks().filter(t => t.id !== task.id);
    const strategies: (() => { title: string, tasks: Task[] } | null)[] = [];

    if (task.developers && task.developers.length > 0) {
        const primaryDevId = task.developers[0];
        const primaryDev = allDevs.find(d => d.id === primaryDevId);
        if (primaryDev) {
            strategies.push(() => {
              const related = allTasks.filter(t => t.developers?.includes(primaryDevId));
              return related.length > 0 ? {
                title: `More from ${primaryDev.name}`,
                tasks: related
              } : null;
            });
        }
    }

    if (task.repositories && task.repositories.length > 0) {
        const primaryRepo = task.repositories[0];
        strategies.push(() => {
          const related = allTasks.filter(t => t.repositories?.includes(primaryRepo));
          return related.length > 0 ? {
            title: `More in ${primaryRepo}`,
            tasks: related
          } : null;
        });
    }

    if (task.devStartDate) {
        const taskDate = new Date(task.devStartDate);
        const taskMonth = taskDate.getMonth();
        const taskYear = taskDate.getFullYear();
        strategies.push(() => {
          const related = allTasks.filter(t => {
              if (!t.devStartDate) return false;
              const otherDate = new Date(t.devStartDate);
              return otherDate.getMonth() === taskMonth && otherDate.getFullYear() === taskYear;
          });
          return related.length > 0 ? {
            title: `Also from ${format(taskDate, 'MMMM yyyy')}`,
            tasks: related
          } : null;
        });
    }
    
    const validStrategies = strategies.map(s => s()).filter(s => s !== null) as { title: string, tasks: Task[] }[];

    if (validStrategies.length > 0) {
        const randomIndex = Math.floor(Math.random() * validStrategies.length);
        const selectedStrategy = validStrategies[randomIndex];
        
        const shuffled = selectedStrategy.tasks.sort(() => 0.5 - Math.random());
        setRelatedTasks(shuffled.slice(0, 4));
        setRelatedTasksTitle(selectedStrategy.title);
    } else {
        setRelatedTasks([]);
        setRelatedTasksTitle('');
    }
  }, [task]);
  
  const handleTogglePin = (taskIdToToggle: string) => {
    const isCurrentlyPinned = pinnedTaskIds.includes(taskIdToToggle);
    let newPinnedIds: string[];

    if (isCurrentlyPinned) {
        newPinnedIds = pinnedTaskIds.filter(id => id !== taskIdToToggle);
        toast({ title: 'Reminder Unpinned', description: 'The reminder will no longer appear on the main page.', duration: 3000 });
    } else {
        newPinnedIds = [...pinnedTaskIds, taskIdToToggle];
        toast({ title: 'Reminder Pinned', description: 'This reminder will now appear on the main page.', duration: 3000 });
    }

    setPinnedTaskIds(newPinnedIds);
    localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinnedIds));
  };

  const handleCommentsUpdate = (newComments: Comment[]) => {
    if (task) {
      setTask({ ...task, comments: newComments });
      setTaskLogs(getLogsForTask(task.id));
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task) return;

    const updatedTask = updateTask(task.id, { status: newStatus });
    if(updatedTask) {
        setTask(updatedTask);
        setTaskLogs(getLogsForTask(task.id));
        toast({
            variant: 'success',
            title: 'Status Updated',
            description: `Task status changed to "${newStatus}".`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update task status.',
        });
    }
  };

  const handleToggleDeployment = (env: string) => {
    if (!task) return;

    const isSelected = task.deploymentStatus?.[env] ?? false;
    const hasDate = task.deploymentDates && task.deploymentDates[env];
    const isDeployed = isSelected && (env === 'dev' || !!hasDate);

    const newIsDeployed = !isDeployed;

    const newDeploymentStatus = { ...task.deploymentStatus };
    const newDeploymentDates = { ...task.deploymentDates };

    if (newIsDeployed) {
      newDeploymentStatus[env] = true;
      if (env !== 'dev') {
        newDeploymentDates[env] = new Date().toISOString();
      }
    } else {
      newDeploymentStatus[env] = false;
      newDeploymentDates[env] = null;
    }

    const updatedTaskData = {
        deploymentStatus: newDeploymentStatus,
        deploymentDates: newDeploymentDates,
    };
    
    const updatedTaskResult = updateTask(task.id, updatedTaskData);
    if(updatedTaskResult) {
        setTask(updatedTaskResult);
        setJustUpdatedEnv(env);
        toast({
            variant: 'success',
            title: 'Deployment Status Updated',
            description: `Status for ${env.charAt(0).toUpperCase() + env.slice(1)} set to ${newIsDeployed ? 'Deployed' : 'Pending'}.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update deployment status.',
        });
    }
  };

  const handlePrLinksUpdate = (newPrLinks: Task['prLinks']) => {
    if (!task) return;

    const updatedTask = updateTask(task.id, { prLinks: newPrLinks });
    if(updatedTask) {
        setTask(updatedTask);
        setTaskLogs(getLogsForTask(task.id));
        toast({
            variant: 'success',
            title: 'Pull Requests Updated',
            description: `Your changes to PR links have been saved.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update pull request links.',
        });
    }
  };

  const updateAttachments = (newAttachments: Attachment[]) => {
      if (!task) return;
      const updatedTask = updateTask(task.id, { attachments: newAttachments });
      if (updatedTask) {
          setTask(updatedTask);
          setTaskLogs(getLogsForTask(task.id));
      }
      return updatedTask;
  };

  const handleDeleteAttachment = (index: number) => {
      const newAttachments = [...(task?.attachments || [])];
      newAttachments.splice(index, 1);
      if(updateAttachments(newAttachments)) {
        toast({ variant: 'success', title: 'Attachment removed.' });
      }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'Image too large', description: 'Please upload an image smaller than 2MB.' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        const newAttachment: Attachment = { name: file.name, url: dataUri, type: 'image' };
        if(updateAttachments([...(task?.attachments || []), newAttachment])) {
          toast({ variant: 'success', title: 'Image added.' });
        }
    };
    reader.readAsDataURL(file);

    if (event.target) {
        event.target.value = '';
    }
  };
  
  const handleSaveLink = () => {
      const validationResult = attachmentSchema.safeParse({ ...newLink, type: 'link' });
      if(!validationResult.success) {
          const errors = validationResult.error.flatten().fieldErrors;
          toast({ variant: 'destructive', title: 'Invalid Link', description: errors.url?.[0] || errors.name?.[0] || 'Please check your inputs.' });
          return;
      }
      const newAttachment: Attachment = { ...validationResult.data, type: 'link' };
      if(updateAttachments([...(task?.attachments || []), newAttachment])) {
        toast({ variant: 'success', title: 'Link added.' });
        setNewLink({ name: '', url: '' });
        setIsAddLinkPopoverOpen(false);
      }
  }
  
  const handleRestore = () => {
    if (task && task.deletedAt) {
      restoreTask(task.id);
      toast({
        variant: 'success',
        title: 'Task Restored',
        description: `Task "${task.title}" has been successfully restored.`,
      });
      router.push('/bin');
    }
  };

  const handleReminderSuccess = () => {
    const updatedTask = getTaskById(taskId);
    if(updatedTask) {
        setTask(updatedTask);
        setTaskLogs(getLogsForTask(taskId));
    }
  };

  const handleRemoveReminder = () => {
      if (!task) return;
      
      updateTask(task.id, { reminder: null, reminderExpiresAt: null });
      if (pinnedTaskIds.includes(task.id)) {
        handleTogglePin(task.id);
      }
      
      toast({ 
        variant: 'success', 
        title: 'Reminder Removed', 
        description: `The reminder for "${task.title}" has been removed.` 
      });
      
      handleReminderSuccess(); // This reloads the task data
  };
  
  const handleExportJson = () => {
    if (!task) return;

    const sanitizeFilename = (name: string): string => name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
    const jsonFilename = `${sanitizeFilename(task.title)}.json`;

    const devIdsInTask = new Set(task.developers || []);
    const testerIdsInTask = new Set(task.testers || []);

    const developersToExport = developers.filter(d => devIdsInTask.has(d.id));
    const testersToExport = testers.filter(t => testerIdsInTask.has(t.id));
    const logsToExport = getLogsForTask(task.id);

    const devIdToName = new Map(developers.map(d => [d.id, d.name]));
    const testerIdToName = new Map(testers.map(t => [t.id, t.name]));

    const taskWithNames = {
        ...task,
        developers: (task.developers || []).map(id => devIdToName.get(id)).filter(Boolean),
        testers: (task.testers || []).map(id => testerIdToName.get(id)).filter(Boolean),
    };

    const exportData = {
        appName: uiConfig?.appName,
        appIcon: uiConfig?.appIcon,
        repositoryConfigs: uiConfig?.repositoryConfigs,
        developers: developersToExport.map(p => ({ name: p.name, email: p.email, phone: p.phone })),
        testers: testersToExport.map(p => ({ name: p.name, email: p.email, phone: p.phone })),
        tasks: [taskWithNames],
        logs: logsToExport,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = jsonFilename;
    link.click();

    toast({
        variant: 'success',
        title: 'JSON Exported',
        description: `Task "${task.title}" has been exported.`,
    });
};


  const renderCustomFieldValue = (fieldConfig: FieldConfig, value: any) => {
      if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">N/A</span>;
      
      const aliasKey = `${fieldConfig.key}_alias`;
      const alias = task?.customFields?.[aliasKey];

      switch (fieldConfig.type) {
          case 'text': {
              if (fieldConfig.baseUrl && value) {
                  const url = `${fieldConfig.baseUrl}${value}`;
                  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2 break-all"><ExternalLink className="h-4 w-4 shrink-0"/> {alias || value}</a>
              }
              return <span className="break-words">{String(value)}</span>;
          }
          case 'date':
              return value ? format(new Date(value), 'PPP') : 'Not set';
          case 'checkbox':
              return value ? 'Yes' : 'No';
          case 'url': {
              const urlValue = String(value);
              return <a href={urlValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{alias || urlValue}</a>
          }
          case 'multiselect':
          case 'tags':
              return Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                      {value.map((v: any) => <Badge key={v} variant="secondary">{v}</Badge>)}
                  </div>
              ) : <span className="break-words">{String(value)}</span>;
          default:
              return <span className="break-words">{String(value)}</span>;
      }
  }

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading task details..." />;
  }

  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Task not found</h1>
            <p className="text-muted-foreground">The task you are looking for does not exist.</p>
            <Button onClick={() => router.push('/')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Home
            </Button>
        </div>
      </div>
    );
  }

  const isBinned = !!task.deletedAt;
  const statusConfig = getStatusConfig(task.status);
  const { Icon, cardClassName, iconColorClassName } = statusConfig;

  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));

  const allConfiguredEnvs = uiConfig.environments || [];
  
  const customFields = uiConfig.fields.filter(f => f.isCustom && f.isActive && task.customFields && typeof task.customFields[f.key] !== 'undefined' && task.customFields[f.key] !== null && task.customFields[f.key] !== '');
  
  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t]));

  const azureFieldConfig = uiConfig.fields.find(f => f.key === 'azureWorkItemId');
  const prField = uiConfig.fields.find(f => f.key === 'prLinks' && f.isActive);
  const deploymentField = uiConfig.fields.find(f => f.key === 'deploymentStatus' && f.isActive);
  const attachmentsField = uiConfig.fields.find(f => f.key === 'attachments' && f.isActive);
  const commentsField = uiConfig.fields.find(f => f.key === 'comments' && f.isActive);
  const historyField = !isBinned && taskLogs.length > 0;
  const timeFormatString = uiConfig.timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';
  
  const isValidDate = (d: any): d is string => d && !isNaN(new Date(d).getTime());

  return (
    <>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <Button asChild variant="ghost" className="pl-1">
            <Link href={isBinned ? "/bin" : "/"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isBinned ? "Back to Bin" : "Back to tasks"}
            </Link>
          </Button>
          {isBinned ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  Restore Task
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore this task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the task "{task.title}" back to your active tasks list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => generateTaskPdf([task], uiConfig, developers, testers, 'save')}>
                           <Download className="mr-2 h-4 w-4" /> Download as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleExportJson}>
                            <FileJson className="mr-2 h-4 w-4" /> Export as JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => generateTasksText([task], uiConfig, developers, testers)}>
                           <Copy className="mr-2 h-4 w-4" /> Copy as Text
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button asChild variant="outline" size="sm">
                  <Link href={`/tasks/${task.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <DeleteTaskButton taskId={task.id} taskTitle={task.title} onSuccess={() => router.push('/')} />
            </div>
          )}
        </div>

        {isBinned && (
          <Alert variant="destructive" className="mb-6 border-yellow-500/50 text-yellow-600 dark:border-yellow-500 [&>svg]:text-yellow-600">
            <Ban className="h-4 w-4" />
            <AlertTitle>This task is in the Bin</AlertTitle>
            <AlertDescription>
              You are viewing a deleted task. To make changes, you must first restore it.
            </AlertDescription>
          </Alert>
        )}
        
        {task.reminder && (
          <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <AlertTitle className="text-amber-800 dark:text-amber-200">Reminder Note</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                    {task.reminder}
                    {isValidDate(task.reminderExpiresAt) && (
                      <span className="block text-xs italic mt-1 text-amber-600 dark:text-amber-400">
                        (Expires {format(new Date(task.reminderExpiresAt), timeFormatString)})
                      </span>
                    )}
                  </AlertDescription>
                </div>
              </div>
              {!isBinned && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/40 dark:hover:text-amber-300">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove reminder</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove Reminder?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove the reminder note from this task.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemoveReminder}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Alert>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className={cn("relative overflow-hidden", cardClassName)}>
                <Icon className={cn('absolute -bottom-12 -right-12 h-48 w-48 pointer-events-none transition-transform duration-300 ease-in-out', iconColorClassName, task.status !== 'In Progress' && 'group-hover/card:scale-110 group-hover/card:-rotate-6')} />
                <div className="relative z-10 flex flex-col h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 flex items-center gap-3">
                        <CardTitle className="text-3xl font-bold">
                          {task.title}
                        </CardTitle>
                        {uiConfig.remindersEnabled && !isBinned && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsReminderOpen(true)}>
                                <BellRing className={cn("h-5 w-5 text-muted-foreground", task.reminder && "text-amber-600 dark:text-amber-400")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{task.reminder ? 'Edit Reminder' : 'Set Reminder'}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center">
                        {!isBinned && <FavoriteToggleButton taskId={task.id} isFavorite={!!task.isFavorite} onUpdate={loadData} />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" disabled={isBinned} className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100">
                              <TaskStatusBadge status={task.status} variant="prominent" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {uiConfig.taskStatuses.map(s => {
                              const currentStatusConfig = getStatusConfig(s);
                              const { Icon } = currentStatusConfig;
                              return (
                                <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={cn("h-3 w-3", s === 'In Progress' && 'animate-spin')} />
                                    <span>{s}</span>
                                  </div>
                                  {task.status === s && <Check className="ml-auto h-4 w-4" />}
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2 flex-grow">
                    <CardDescription className="mb-4">
                        Last updated on {isValidDate(task.updatedAt) ? format(new Date(task.updatedAt), 'PPP') : 'N/A'}
                    </CardDescription>
                    <p className="text-foreground/80 whitespace-pre-wrap">{task.description}</p>
                  </CardContent>
                </div>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {deploymentField && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl"><CheckCircle2 className="h-5 w-5" />{fieldLabels.get('deploymentStatus') || 'Deployments'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        {allConfiguredEnvs.length > 0 ? (
                          allConfiguredEnvs.map(env => {
                            const isSelected = task.deploymentStatus?.[env] ?? false;
                            const hasDate = task.deploymentDates && task.deploymentDates[env];
                            const isDeployed = isSelected && (env === 'dev' || !!hasDate);
                            return (
                              <div key={env} className={cn("flex justify-between items-center p-2 -m-2 rounded-lg transition-colors",!isBinned && 'cursor-pointer hover:bg-muted/50')} onClick={!isBinned ? () => handleToggleDeployment(env) : undefined}>
                                <span className="capitalize text-foreground font-medium">{env}</span>
                                <div onAnimationEnd={() => setJustUpdatedEnv(null)} className={cn('flex items-center gap-2 font-medium', isDeployed ? 'text-green-600 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-500', justUpdatedEnv === env && 'animate-status-in')}>
                                  {isDeployed ? (<><CheckCircle2 className="h-4 w-4" /><span>Deployed</span></>) : (<><Clock className="h-4 w-4" /><span>Pending</span></>)}
                                </div>
                              </div>
                            );
                          })
                        ) : (<p className="text-muted-foreground text-center text-xs pt-2">No environments configured in settings.</p>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {prField && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-xl"><GitMerge className="h-5 w-5" />{fieldLabels.get('prLinks') || 'Pull Requests'}</CardTitle>
                      {!isBinned && task.repositories && task.repositories.length > 0 && allConfiguredEnvs.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingPrLinks(!isEditingPrLinks)}>
                          {isEditingPrLinks ? 'Done' : (<><Pencil className="h-3 w-3 mr-1.5" /> Edit</>)}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <PrLinksGroup prLinks={task.prLinks} repositories={task.repositories} configuredEnvs={uiConfig.environments} repositoryConfigs={uiConfig.repositoryConfigs} onUpdate={handlePrLinksUpdate} isEditing={isEditingPrLinks && !isBinned} />
                    </CardContent>
                  </Card>
                )}
            </div>

            {customFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><Box className="h-5 w-5" />Other Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customFields.map(field => (
                    <div key={field.key} className="break-words">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-1">{field.label}</h4>
                      <div className="text-sm text-foreground min-w-0">{renderCustomFieldValue(field, task.customFields?.[field.key])}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {attachmentsField && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />{fieldLabels.get('attachments') || 'Attachments'}</CardTitle>
                  {!isBinned && (<Button variant="ghost" size="sm" onClick={() => setIsEditingAttachments(!isEditingAttachments)}>{isEditingAttachments ? 'Done' : <><Pencil className="h-3 w-3 mr-1.5" /> Edit</>}</Button>)}
                </CardHeader>
                <CardContent>
                  {(!task.attachments || task.attachments.length === 0) && !isEditingAttachments ? (
                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                      <Paperclip className="h-8 w-8 mb-2 text-muted-foreground/70" />
                      <p className="text-base font-semibold">No attachments yet.</p>
                      <p className="mt-1 text-sm">Click 'Edit' to add links or upload images.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {task.attachments?.map((att, index) => {
                          const shouldRenderAsImage = att.type === 'image' || isImageUrl(att.url);
                          let hostname: string | null = null;
                          let faviconUrl: string | null = null;
                          if (!shouldRenderAsImage) { try { hostname = new URL(att.url).hostname; faviconUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${hostname}&size=32`; } catch (e) { hostname = 'Invalid Link'; } }
                          return (
                            <div key={index} className="space-y-1.5 relative group/attachment">
                              {isEditingAttachments && !isBinned && ( <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 z-10 rounded-full" onClick={() => handleDeleteAttachment(index)}><X className="h-4 w-4" /></Button> )}
                              {shouldRenderAsImage ? (<>
                                <div className="p-px bg-border rounded-lg group aspect-square w-full">
                                  <button onClick={() => setPreviewImage({ url: att.url, name: att.name })} className="block relative group/img aspect-square w-full rounded-md overflow-hidden">
                                    <img src={att.url} alt={att.name} className="object-cover w-full h-full transition-all group-hover/img:brightness-75" />
                                    {!isEditingAttachments && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="h-8 w-8 text-white" /></div>}
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground truncate" title={att.name}>{att.name}</p>
                              </>) : (
                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="block p-px bg-border rounded-lg group aspect-square w-full">
                                  <div className="bg-card flex flex-col items-start justify-between gap-2 h-full rounded-md p-3 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">{faviconUrl && <img src={faviconUrl} alt={`${hostname} favicon`} className="h-5 w-5 object-contain rounded" />}</div>
                                    <div className="w-full space-y-1">
                                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{att.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{hostname}</p>
                                    </div>
                                  </div>
                                </a>
                              )}
                            </div>
                          )})}
                      </div>
                      {isEditingAttachments && !isBinned && (
                        <div className="flex gap-2 pt-4 border-t">
                          <Popover open={isAddLinkPopoverOpen} onOpenChange={setIsAddLinkPopoverOpen}>
                            <PopoverTrigger asChild><Button variant="outline" size="sm"><Link2 className="h-4 w-4 mr-2" /> Add Link</Button></PopoverTrigger>
                            <PopoverContent className="w-80"><div className="grid gap-4"><div className="space-y-2"><h4 className="font-medium leading-none">Add Link</h4><p className="text-sm text-muted-foreground">Add an external link as an attachment.</p></div><div className="grid gap-2"><div className="grid grid-cols-3 items-center gap-4"><Label htmlFor="link-name">Name</Label><Input id="link-name" value={newLink.name} onChange={(e) => setNewLink(p => ({...p, name: e.target.value}))} className="col-span-2 h-8" /></div><div className="grid grid-cols-3 items-center gap-4"><Label htmlFor="link-url">URL</Label><Input id="link-url" value={newLink.url} onChange={(e) => setNewLink(p => ({...p, url: e.target.value}))} className="col-span-2 h-8" /></div></div><Button size="sm" onClick={handleSaveLink}>Save Link</Button></div></PopoverContent>
                          </Popover>
                          <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}><Image className="h-4 w-4 mr-2" /> Add Image</Button>
                          <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
             {historyField && (
                <div className="lg:col-span-2">
                    <TaskHistory logs={taskLogs} />
                </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><ListChecks className="h-5 w-5" />Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TaskDetailSection title={fieldLabels.get('developers') || 'Developers'} people={task.developers} peopleMap={developersById} setPersonInView={setPersonInView} isDeveloper={true} />
                  <Separator />
                  <TaskDetailSection title={fieldLabels.get('testers') || 'QA'} people={task.testers} peopleMap={testersById} setPersonInView={setPersonInView} isDeveloper={false} />
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">{fieldLabels.get('repositories') || 'Repositories'}</h4>
                    <div className="flex flex-wrap gap-1">
                      {(task.repositories && task.repositories.length > 0) ? (task.repositories || []).map(repo => (
                        <Badge key={repo} variant="repo" style={getRepoBadgeStyle(repo)}>{repo}</Badge>
                      )) : (<p className="text-sm text-muted-foreground">No repositories assigned.</p>)}
                    </div>
                  </div>
                  {azureFieldConfig && azureFieldConfig.isActive && task.azureWorkItemId && (<>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">{azureFieldConfig.label || 'Azure DevOps'}</h4>
                      {azureFieldConfig.baseUrl ? (
                        <a href={`${azureFieldConfig.baseUrl}${task.azureWorkItemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
                          <ExternalLink className="h-4 w-4" />
                          <span>Work Item #{task.azureWorkItemId}</span>
                        </a>
                      ) : (<span className="text-sm text-foreground">{task.azureWorkItemId}</span>)}
                    </div>
                  </>)}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Important Dates</h4>
                    <TimelineSection task={task} fieldLabels={fieldLabels} />
                  </div>
                </CardContent>
            </Card>
            {commentsField && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><MessageSquare className="h-5 w-5" />{fieldLabels.get('comments') || 'Comments'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentsSection taskId={task.id} comments={task.comments || []} onCommentsUpdate={handleCommentsUpdate} readOnly={isBinned} hideHeader />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {!isBinned && relatedTasks.length > 0 && (
          <div className="mt-8 lg:col-span-3">
            <RelatedTasksSection
              title={relatedTasksTitle}
              tasks={relatedTasks}
              onTaskUpdate={loadData}
              uiConfig={uiConfig}
              developers={developers}
              testers={testers}
              pinnedTaskIds={pinnedTaskIds}
              onPinToggle={handleTogglePin}
            />
          </div>
        )}
      </div>
      <PersonProfileCard
        person={personInView?.person ?? null}
        isDeveloper={personInView?.isDeveloper ?? true}
        typeLabel={personInView?.isDeveloper ? (fieldLabels.get('developers') || 'Developer') : (fieldLabels.get('testers') || 'QA')}
        isOpen={!!personInView}
        onOpenChange={(isOpen) => !isOpen && setPersonInView(null)}
      />
      <ImagePreviewDialog
        isOpen={!!previewImage}
        onOpenChange={(isOpen) => { if (!isOpen) { setPreviewImage(null); }}}
        imageUrl={previewImage?.url ?? null}
        imageName={previewImage?.name ?? null}
      />
      {uiConfig.remindersEnabled && task && (
        <ReminderDialog 
          isOpen={isReminderOpen}
          onOpenChange={setIsReminderOpen}
          task={task}
          onSuccess={handleReminderSuccess}
          pinnedTaskIds={pinnedTaskIds}
          onPinToggle={handleTogglePin}
        />
      )}
    </>
  );
}


function TaskDetailSection({ title, people, peopleMap, setPersonInView, isDeveloper }: {
  title: string;
  people?: string[];
  peopleMap: Map<string, Person>;
  setPersonInView: (person: { person: Person, isDeveloper: boolean }) => void;
  isDeveloper: boolean;
}) {
  const uniquePeopleIds = [...new Set(people || [])];
  const assignedPeople = uniquePeopleIds.map(id => peopleMap.get(id)).filter((p): p is Person => !!p);
  
  const handlePersonClick = (person: Person) => {
    const hasContactInfo = person.email || person.phone;
    const hasAdditionalFields = person.additionalFields && person.additionalFields.length > 0;
    if (hasContactInfo || hasAdditionalFields) {
      setPersonInView({ person, isDeveloper });
    }
  };

  return (
    <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h4>
        <div className="flex flex-wrap gap-4">
            {assignedPeople.length > 0 ? (
                assignedPeople.map((person) => (
                  <button 
                    key={`${isDeveloper ? 'dev' : 'test'}-${person.id}`}
                    className="flex items-center gap-2 p-1 -m-1 rounded-md hover:bg-muted/50 transition-colors"
                    onClick={() => handlePersonClick(person)}
                  >
                      <Avatar className="h-7 w-7">
                      <AvatarFallback
                          className="font-semibold text-white text-[10px]"
                          style={{
                          backgroundColor: `#${getAvatarColor(person.name)}`,
                          }}
                      >
                          {getInitials(person.name)}
                      </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                      {person.name}
                      </span>
                  </button>
                ))
            ) : (
            <p className="text-sm text-muted-foreground">
                No {isDeveloper ? 'Developers' : 'Testers'} assigned.
            </p>
            )}
        </div>
    </div>
  )
}

function TimelineSection({ task, fieldLabels }: { task: Task, fieldLabels: Map<string, string>}) {
    const isValidDate = (d: any): d is string | Date => d && !isNaN(new Date(d).getTime());

    const hasDevDates = isValidDate(task.devStartDate) || isValidDate(task.devEndDate);
    const hasQaDates = isValidDate(task.qaStartDate) || isValidDate(task.qaEndDate);
    const hasAnyDeploymentDate = Object.values(task.deploymentDates || {}).some(date => isValidDate(date));

    if (!hasDevDates && !hasQaDates && !hasAnyDeploymentDate) {
      return <p className="text-muted-foreground text-center text-xs py-2">No dates have been set.</p>
    }
    
    return (
      <div className="space-y-2 text-sm">
          {isValidDate(task.devStartDate) && (
              <div className="flex justify-between">
                  <span className="text-muted-foreground">{fieldLabels.get('devStartDate') || 'Dev Start Date'}</span>
                  <span>{format(new Date(task.devStartDate), 'PPP')}</span>
              </div>
          )}
          {isValidDate(task.devEndDate) && (
              <div className="flex justify-between">
                  <span className="text-muted-foreground">{fieldLabels.get('devEndDate') || 'Dev End Date'}</span>
                  <span>{format(new Date(task.devEndDate), 'PPP')}</span>
              </div>
          )}

          {hasDevDates && (hasQaDates || hasAnyDeploymentDate) && <Separator className="my-2"/>}
          
          {isValidDate(task.qaStartDate) && (
              <div className="flex justify-between">
                  <span className="text-muted-foreground">{fieldLabels.get('qaStartDate') || 'QA Start Date'}</span>
                  <span>{format(new Date(task.qaStartDate), 'PPP')}</span>
              </div>
          )}
          {isValidDate(task.qaEndDate) && (
              <div className="flex justify-between">
                  <span className="text-muted-foreground">{fieldLabels.get('qaEndDate') || 'QA End Date'}</span>
                  <span>{format(new Date(task.qaEndDate), 'PPP')}</span>
              </div>
          )}
          
          {hasQaDates && hasAnyDeploymentDate && <Separator className="my-2"/>}

          {task.deploymentDates && Object.entries(task.deploymentDates).map(([env, date]) => {
              if (!isValidDate(date)) return null;
              return (
                  <div key={env} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{env} Deployed</span>
                      <span>{format(new Date(date), 'PPP')}</span>
                  </div>
              )
          })}
      </div>
    );
}
