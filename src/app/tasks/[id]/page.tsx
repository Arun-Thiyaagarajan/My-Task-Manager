
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getUiConfig, updateTask, getDevelopers, getTesters, restoreTask, getLogsForTask, addDeveloper, addTester, getActiveCompanyId, getAuthMode, isInitialSyncComplete, clearExpiredReminders, addLog, getTaskById as getDirectTaskById, getTasks as getDirectTasks } from '@/lib/data';
import { getCachedTaskById as getTaskById, getCachedTasks as getTasks } from '@/lib/cached-data';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, ListChecks, Paperclip, CheckCircle2, Clock, Box, Check, Code2, ClipboardCheck, Link2, Image, X, Ban, Share2, History, BellRing, MoreVertical, Trash2, Copy, Tag, Download, CalendarIcon, Save, Share, RotateCcw } from 'lucide-react';
import { getStatusConfig, TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { PrLinksGroup } from '@/components/pr-links-group';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials, getAvatarColor, getRepoBadgeStyle, formatTimestamp, compressImage, formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import type { Task, FieldConfig, UiConfig, TaskStatus, Person, Attachment, Log, Comment, Environment } from '@/lib/types';
import { CommentsSection } from '@/components/comments-section';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat, type FormatType } from '@/components/ui/textarea-toolbar';
import { getLinkAlias } from '@/ai/flows/alias-flow';
import { TaskDetailSkeleton } from '@/components/task-detail-skeleton';
import { useFirebase } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { ShareMenu } from '@/components/share-menu';
import { triggerTransfer } from '@/components/file-transfer-indicator';
import { Calendar } from '@/components/ui/calendar';
import { StatusIcon, getSortedStatusNames, getStatusDisplayName, getStatusStyles, isStatusValue } from '@/lib/status-config';
import { scheduleStatusUpdate } from '@/lib/status-update';
import { getTaskRepositories, isRepositoryFieldActive, shouldShowPrLinks } from '@/lib/repository-config';
import { TaskPriorityBadge } from '@/components/task-priority-badge';
import { buildDueCompletionUpdate, getDueReminderPresetLabel, getTaskDueBadgeLabel, getTaskDueLabel, getTaskDueToneClassName, hasCompletedDue, hasDueReminder, hasParkedDueReminder, parseTaskDate } from '@/lib/task-planning';
import { TaskPlanningEditor } from '@/components/task-planning-editor';


const isImageUrl = (url: string): boolean => {
  try {
    const path = new URL(url).pathname;
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path);
  } catch {
    return false;
  }
};

const HOME_RETURN_SKELETON_KEY = 'taskflow_show_home_skeleton_once';


export default function TaskPage() {
  const { isUserLoading } = useFirebase();
  const isMobile = useIsMobile();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const [personInView, setPersonInView] = useState<{person: Person, isDeveloper: boolean} | null>(null);
  const [isEditingPrLinks, setIsEditingPrLinks] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string; name: string} | null>(null);
  
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const isEditingAttachmentsRef = useRef(false);
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>([]);
  
  const [isAddLinkPopoverOpen, setIsAddLinkPopoverOpen] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '' });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [relatedTasksTitle, setRelatedTasksTitle] = useState<string>('');
  const [taskLogs, setTaskLogs] = useState<Log[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<any>('');
  const [justUpdatedStatus, setJustUpdatedStatus] = useState<string | null>(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [isPlanningEditorOpen, setIsPlanningEditorOpen] = useState(false);
  const [attachmentsAccordionValue, setAttachmentsAccordionValue] = useState('');
  const [isAttachmentDropActive, setIsAttachmentDropActive] = useState(false);
  const [isRefreshingTaskDetail, setIsRefreshingTaskDetail] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);
  const statusDebounceRef = useRef<number | null>(null);
  const statusRequestRef = useRef(0);
  
  const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
  const taskId = params.id as string;
  const ATTACHMENTS_ACCORDION_STORAGE_KEY = `taskflow_task_attachments_${taskId}`;
  const reminderPreview = useMemo(() => {
    if (!task?.reminder) return '';
    return task.reminder
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/[*_~#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, [task?.reminder]);
  const dueLabel = useMemo(() => getTaskDueLabel(task), [task]);
  const dueBadgeLabel = useMemo(() => getTaskDueBadgeLabel(task), [task]);
  const hasTaskDueReminder = useMemo(() => hasDueReminder(task), [task]);
  const hasTaskDueCompleted = useMemo(() => hasCompletedDue(task), [task]);
  const hasDueReminderAlerted = useMemo(() => {
    const dueReminderDate = parseTaskDate(task?.dueReminderAt);
    if (!dueReminderDate) return false;
    return dueReminderDate.getTime() <= Date.now();
  }, [task?.dueReminderAt]);
  const hasParkedTaskDueReminder = useMemo(() => hasParkedDueReminder(task), [task]);
  const isTaskPastDue = useMemo(() => {
    const dueDate = parseTaskDate(task?.dueAt);
    if (!dueDate || task?.dueCompletedAt) return false;
    return dueDate.getTime() < Date.now();
  }, [task?.dueAt, task?.dueCompletedAt]);
  const shouldAskForDueCompletionTime = useMemo(() => {
    const dueDate = parseTaskDate(task?.dueAt);
    if (!dueDate || task?.dueCompletedAt) return false;
    return dueDate.getTime() < Date.now();
  }, [task?.dueAt, task?.dueCompletedAt]);
  
  const loadData = useCallback(() => {
    if (taskId) {
      clearExpiredReminders();
      const activeCompanyId = getActiveCompanyId();
      const authMode = getAuthMode();
      
      if (isUserLoading || (authMode === 'authenticate' && (!activeCompanyId || !isInitialSyncComplete(activeCompanyId)))) {
          return;
      }

      const allDevs = getDevelopers();
      const allTesters = getTesters();
      const allTasksData = getTasks();
      const foundTask = getTaskById(taskId) || getDirectTaskById(taskId);
      const config = getUiConfig();
      
      setTask(foundTask || null);
      if (!isEditingAttachmentsRef.current) {
          setLocalAttachments(foundTask?.attachments || []);
      }
      setUiConfig(config);
      setDevelopers(allDevs);
      setTesters(allTesters);
      setAllTasks(allTasksData.length > 0 ? allTasksData : getDirectTasks());

      if (foundTask) {
        document.title = `${foundTask.title} | ${config.appName || 'My Task Manager'}`;
        setTaskLogs(getLogsForTask(taskId));
      } else {
        document.title = `Task Not Found | ${config.appName || 'My Task Manager'}`;
      }
      
      setIsLoading(false);
      window.dispatchEvent(new Event('navigation-end'));
    }
  }, [isUserLoading, taskId]);

  const handleRefreshTaskDetail = useCallback(async () => {
    if (isRefreshingTaskDetail) return;

    setIsRefreshingTaskDetail(true);
    window.dispatchEvent(new Event('sync-start'));

    try {
      const completionPromise = new Promise<void>((resolve) => {
        const handleComplete = () => resolve();
        window.addEventListener('taskflow-refresh-finished', handleComplete, { once: true });
      });

      window.dispatchEvent(new Event('taskflow-refresh-request'));
      await Promise.race([
        completionPromise,
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);

      loadData();
      toast({
        variant: 'success',
        title: 'Task refreshed',
        description: 'The latest task details are now in view.',
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsRefreshingTaskDetail(false);
      window.dispatchEvent(new Event('sync-end'));
    }
  }, [isRefreshingTaskDetail, loadData, toast]);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('company-changed', loadData);
    window.addEventListener('sync-complete', loadData);
    window.addEventListener('reminders-expired', loadData);
    const reminderExpiryInterval = window.setInterval(() => {
      loadData();
    }, 30000);
    return () => {
        window.removeEventListener('storage', loadData);
        window.removeEventListener('company-changed', loadData);
        window.removeEventListener('sync-complete', loadData);
        window.removeEventListener('reminders-expired', loadData);
        window.clearInterval(reminderExpiryInterval);
    };
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (statusDebounceRef.current) {
        window.clearTimeout(statusDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!justUpdatedStatus) return;
    const timer = window.setTimeout(() => setJustUpdatedStatus(null), 280);
    return () => window.clearTimeout(timer);
  }, [justUpdatedStatus]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ATTACHMENTS_ACCORDION_STORAGE_KEY);
      setAttachmentsAccordionValue(saved === 'attachments' ? 'attachments' : '');
    } catch {
      setAttachmentsAccordionValue('');
    }
  }, [ATTACHMENTS_ACCORDION_STORAGE_KEY]);

  useEffect(() => {
    if (!task || task.deletedAt) {
      setRelatedTasks([]);
      setRelatedTasksTitle('');
      return;
    }
    
    const allDevs = getDevelopers();
    const tasksForRelated = getTasks().filter(t => t.id !== task.id);
    const strategies: (() => { title: string, tasks: Task[] } | null)[] = [];

    if (task.developers && task.developers.length > 0) {
        const primaryDevId = task.developers[0];
        const primaryDev = allDevs.find(d => d.id === primaryDevId);
        if (primaryDev) {
            strategies.push(() => {
              const related = tasksForRelated.filter(t => t.developers?.includes(primaryDevId));
              return related.length > 0 ? {
                title: `More from ${primaryDev.name}`,
                tasks: related
              } : null;
            });
        }
    }

    if (task.repositories && Array.isArray(task.repositories) && task.repositories.length > 0) {
        const primaryRepo = task.repositories[0];
        strategies.push(() => {
          const related = tasksForRelated.filter(t => {
              const repos = Array.isArray(t.repositories) ? t.repositories : [];
              return repos.includes(primaryRepo);
          });
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
          const related = tasksForRelated.filter(t => {
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
    }
  }, [task]);
  
  useEffect(() => {
    if (editingSection === 'title' && titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
    }
    if (editingSection === 'description' && descriptionEditorRef.current) {
        descriptionEditorRef.current.focus();
    }
  }, [editingSection]);
  
  const handleStartEditing = (section: string, initialValue: any) => {
    if (!task || task.deletedAt) return;
    setEditingSection(section);
    if (section === 'details') {
      setEditingValue({
        developers: task.developers || [],
        testers: task.testers || [],
        repositories: task.repositories || [],
        azureWorkItemId: task.azureWorkItemId || '',
      });
      return;
    }
    setEditingValue(initialValue);
  };
  
  const handleCancelEditing = () => {
    setEditingSection(null);
    setEditingValue('');
  };
  
  const handleSaveEditing = async (key: string, isCustom: boolean, value?: any) => {
    if (!task) return;

    let finalValue = value !== undefined ? value : editingValue;

    if (key === 'title') {
        if (!finalValue || finalValue.trim() === '') {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Title cannot be empty.' });
            return;
        }
        if (finalValue.trim() === task.title) {
            handleCancelEditing();
            return;
        }
    }
    
    if (key === 'description') {
        if (!finalValue || finalValue.trim() === '') {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Description cannot be empty.',
          });
          return;
        }
    }
    
    if (key === 'repositories' && !Array.isArray(finalValue)) {
        finalValue = finalValue ? [finalValue] : [];
    }
    
    let updatePayload: Partial<Task> = {};
    if (isCustom) {
        updatePayload.customFields = { ...task.customFields, [key]: finalValue };
    } else {
        (updatePayload as any)[key] = finalValue;
    }
    
    const updatedTask = updateTask(task.id, updatePayload);
    if (updatedTask) {
        setTask(updatedTask);
        setTaskLogs(getLogsForTask(task.id));
        toast({
            variant: 'success',
            title: 'Field Updated',
            description: 'Your changes have been saved.',
        });
    }
    handleCancelEditing();
  };

  const handleSaveDetailsEditing = async () => {
    if (!task || !editingValue || typeof editingValue !== 'object') return;

    const nextDetails = editingValue as {
      developers?: string[];
      testers?: string[];
      repositories?: string[];
      azureWorkItemId?: string;
    };

    const updatePayload: Partial<Task> = {
      developers: nextDetails.developers || [],
      testers: nextDetails.testers || [],
      repositories: nextDetails.repositories || [],
      azureWorkItemId: nextDetails.azureWorkItemId || '',
    };

    const updatedTask = updateTask(task.id, updatePayload);
    if (updatedTask) {
      setTask(updatedTask);
      setTaskLogs(getLogsForTask(task.id));
      toast({
        variant: 'success',
        title: 'Task Details Updated',
        description: 'Your changes have been saved.',
      });
    }
    handleCancelEditing();
  };

  const handleTogglePin = (taskIdToToggle: string) => {
    const isCurrentlyPinned = pinnedTaskIds.includes(taskIdToToggle);
    let newPinnedIds: string[];

    if (isCurrentlyPinned) {
        newPinnedIds = pinnedTaskIds.filter(id => id !== taskIdToToggle);
    } else {
        newPinnedIds = [...pinnedTaskIds, taskIdToToggle];
    }
    
    setPinnedTaskIds(newPinnedIds);
    localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinnedIds));

    if (task?.reminder) {
        toast({
            title: newPinnedIds.includes(taskIdToToggle) ? 'Reminder Pinned' : 'Reminder Unpinned',
            description: `This reminder will ${newPinnedIds.includes(taskIdToToggle) ? 'now' : 'no longer'} appear on the main page.`,
            duration: 2000,
        });
    }
  };

  const handleCommentsUpdate = (newComments: Comment[]) => {
    if (task) {
      const updatedTask = updateTask(task.id, { comments: newComments });
      if(updatedTask) {
        setTask(updatedTask);
        setTaskLogs(getLogsForTask(task.id));
      }
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task) return;
    if (newStatus === task.status || isStatusSaving && newStatus === justUpdatedStatus) return;

    setIsStatusSaving(true);
    setJustUpdatedStatus(newStatus);

    scheduleStatusUpdate({
        task,
        newStatus,
        debounceRef: statusDebounceRef,
        requestRef: statusRequestRef,
        applyOptimistic: setTask,
        onPersisted: (updatedTask) => {
            setIsStatusSaving(false);
            setTaskLogs(getLogsForTask(updatedTask.id));
            toast({
                variant: 'success',
                title: 'Status Updated',
                description: `Task status changed to "${newStatus}".`,
                duration: 2000,
            });
        },
        onError: () => {
            setIsStatusSaving(false);
            setJustUpdatedStatus(null);
            toast({
                variant: 'destructive',
                title: 'Status Reverted',
                description: 'Could not save the status change.',
            });
        }
    });
  };

  const handleToggleDeployment = (env: string) => {
    if (!task) return;

    const newStatus = !(task.deploymentStatus?.[env] ?? false);

    const updatedTaskData = {
        deploymentStatus: {
            ...task.deploymentStatus,
            [env]: newStatus,
        },
        deploymentDates: {
            ...task.deploymentDates,
            [env]: newStatus ? task.deploymentDates?.[env] || new Date().toISOString() : task.deploymentDates?.[env],
        }
    };
    
    const updatedTaskResult = updateTask(task.id, updatedTaskData);
    if(updatedTaskResult) {
        setTask(updatedTaskResult);
        setTaskLogs(getLogsForTask(task.id));
        setJustUpdatedEnv(env);
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

    const handleSaveAttachments = () => {
        if (!task) return;
        
        const oldAtts = task.attachments || [];
        if (JSON.stringify(oldAtts) === JSON.stringify(localAttachments)) {
            setIsEditingAttachments(false);
            isEditingAttachmentsRef.current = false;
            return;
        }

        const addedCount = localAttachments.filter(na => !oldAtts.some(oa => na.url === oa.url)).length;
        const removedCount = oldAtts.filter(oa => !localAttachments.some(na => na.url === oa.url)).length;
        const renamedCount = localAttachments.filter(na => {
            const old = oldAtts.find(oa => oa.url === na.url);
            return old && old.name !== na.name;
        }).length;

        const updatedTask = updateTask(task.id, { attachments: localAttachments });
        if (updatedTask) {
            setTask(updatedTask);
            setLocalAttachments(updatedTask.attachments || []);
            setTaskLogs(getLogsForTask(task.id));
            
            const parts = [];
            if (addedCount > 0) parts.push(`added ${addedCount}`);
            if (removedCount > 0) parts.push(`removed ${removedCount}`);
            if (renamedCount > 0) parts.push(`renamed ${renamedCount}`);
            
            let desc = 'Your changes have been saved.';
            if (parts.length > 0) {
                desc = parts.join(', ') + ' attachment(s) updated.';
                desc = desc.charAt(0).toUpperCase() + desc.slice(1);
            }

            toast({ 
                variant: 'success', 
                title: 'Attachments Updated',
                description: desc
            });
        }
        setIsEditingAttachments(false);
        isEditingAttachmentsRef.current = false;
    };

  const handleDeleteAttachment = (index: number) => {
      const newAttachments = [...localAttachments];
      newAttachments.splice(index, 1);
      setLocalAttachments(newAttachments);
  };

  const handleImageUpload = (file: File) => {
    const transferId = Math.random().toString(36).substr(2, 9);
    triggerTransfer({
        id: transferId,
        filename: file.name,
        kind: 'upload',
        status: 'uploading',
        progress: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
        const rawDataUri = e.target?.result as string;
        triggerTransfer({ id: transferId, filename: file.name, kind: 'upload', status: 'uploading', progress: 50 });
        
        const optimizedUri = await compressImage(rawDataUri);
        const newAttachment: Attachment = { 
            name: file.name, 
            url: optimizedUri, 
            type: 'image',
            size: file.size,
            uploadedAt: new Date().toISOString(),
            mimeType: file.type
        };
        
        setLocalAttachments(prev => [...prev, newAttachment]);
        triggerTransfer({ id: transferId, filename: file.name, kind: 'upload', status: 'complete', progress: 100 });
        toast({ variant: 'success', title: 'Image optimized and added.'});
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentLinkAdd = async (pastedText: string) => {
      try {
          const url = new URL(pastedText.trim());
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
              return false;
          }

          const newAttachment: Attachment = {
              name: pastedText,
              url: pastedText,
              type: 'link',
              uploadedAt: new Date().toISOString()
          };
          const newAttachmentIndex = localAttachments.length;
          setLocalAttachments(prev => [...prev, newAttachment]);
          toast({ variant: 'success', title: 'Link added.', description: 'Generating a smart title...' });

          try {
            const alias = await getLinkAlias({ url: pastedText });
            setLocalAttachments(current => {
                const updated = [...current];
                if (updated[newAttachmentIndex]) {
                  updated[newAttachmentIndex] = {
                      ...updated[newAttachmentIndex],
                      name: alias.name || pastedText,
                  };
                }
                return updated;
            });
            toast({ variant: 'success', title: 'Smart title generated!'});
          } catch(error) {
             console.error('Failed to generate smart title', error);
          }

          return true;
      } catch {
          return false;
      }
  };

  const handleAddLink = async () => {
      const validationResult = attachmentSchema.safeParse({ ...newLink, type: 'link' });
      if(!validationResult.success) {
          const errors = validationResult.error.flatten().fieldErrors;
          toast({ variant: 'destructive', title: 'Invalid Link', description: errors.url?.[0] || errors.name?.[0] || 'Please check your inputs.' });
          return;
      }
      const newAttachment: Attachment = { ...validationResult.data, type: 'link', uploadedAt: new Date().toISOString() };
      const newAttachmentIndex = localAttachments.length;
      setLocalAttachments(prev => [...prev, newAttachment]);
      
      setNewLink({ name: '', url: '' });
      setIsAddLinkPopoverOpen(false);
      toast({ variant: 'success', title: 'Link added. Generating title...' });
      
      try {
        const alias = await getLinkAlias({ url: newAttachment.url });
        setLocalAttachments(current => {
            const updated = [...current];
            if (updated[newAttachmentIndex]) {
                updated[newAttachmentIndex] = {
                    ...updated[newAttachmentIndex],
                    name: alias.name || updated[newAttachmentIndex].name,
                };
            }
            return updated;
        });
        toast({ variant: 'success', title: 'Smart title generated!'});
      } catch (e) {
        console.error('Could not generate smart title', e);
      }
  }

  const handleAttachmentPaste = async (event: React.ClipboardEvent<HTMLElement>) => {
    if (!isEditingAttachmentsRef.current) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          handleImageUpload(file);
          return;
        }
      }
    }

    const pastedText = event.clipboardData.getData('text/plain').trim();
    if (!pastedText) return;

    event.preventDefault();
    const didAdd = await handleAttachmentLinkAdd(pastedText);
    if (!didAdd) {
      toast({
        variant: 'destructive',
        title: 'Paste a valid link or image',
        description: 'Attachments support pasted images and http/https links here.',
      });
    }
  };

  const handleAttachmentDrop = async (event: React.DragEvent<HTMLElement>) => {
    if (!isEditingAttachmentsRef.current) return;
    event.preventDefault();
    setIsAttachmentDropActive(false);

    const files = Array.from(event.dataTransfer.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      imageFiles.forEach(handleImageUpload);
      return;
    }

    if (files.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file',
        description: 'Attachments currently support dropped images and web links.',
      });
      return;
    }

    const droppedText = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
    if (!droppedText.trim()) return;

    const didAdd = await handleAttachmentLinkAdd(droppedText.trim());
    if (!didAdd) {
      toast({
        variant: 'destructive',
        title: 'Drop a valid link or image',
        description: 'Attachments currently support dropped images and http/https links.',
      });
    }
  };
  
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

  const handleReminderSuccess = (updatedTask?: Task | null) => {
    const nextTask = updatedTask ?? getTaskById(taskId);
    if(nextTask) {
        setTask(nextTask);
        setTaskLogs(getLogsForTask(taskId));
    }
  };

  const handlePlanningSuccess = (updatedTask?: Task | null) => {
    const nextTask = updatedTask ?? getTaskById(taskId);
    if (nextTask) {
      setTask(nextTask);
      setTaskLogs(getLogsForTask(taskId));
    }
  };

  const handleAttachmentsAccordionChange = (value: string) => {
    setAttachmentsAccordionValue(value);
    try {
      window.localStorage.setItem(ATTACHMENTS_ACCORDION_STORAGE_KEY, value);
    } catch {
      // Ignore persistence failures.
    }
  };

  const handlePersonUpdated = (nextPerson: Person | null, deleted = false) => {
    const nextDevelopers = getDevelopers();
    const nextTesters = getTesters();
    setDevelopers(nextDevelopers);
    setTesters(nextTesters);

    if (deleted || !nextPerson) {
      setPersonInView(null);
      return;
    }

    setPersonInView((current) =>
      current
        ? {
            ...current,
            person: nextPerson,
          }
        : null
    );
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
      
      handleReminderSuccess();
  };

  const handleToggleDueCompletion = () => {
    if (!task) return;

    const nextValue = task.dueCompletedAt ? null : new Date().toISOString();
    const updatedTask = updateTask(task.id, buildDueCompletionUpdate(task, nextValue));
    if (updatedTask) {
      setTask(updatedTask);
      setTaskLogs(getLogsForTask(task.id));
      addLog({
        taskId: updatedTask.id,
        message: nextValue
          ? `Marked due completion for "**${updatedTask.title}**" at *${formatTimestamp(nextValue, uiConfig?.timeFormat || '12h')}*.${task.dueReminderAt ? ' The due reminder was safely removed and will come back if you undo this.' : ''}`
          : `Reset due completion for "**${updatedTask.title}**".${updatedTask.dueReminderAt ? ` The due reminder is back for *${formatTimestamp(updatedTask.dueReminderAt, uiConfig?.timeFormat || '12h')}*.` : ''}`,
      });
      toast({
        title: nextValue ? 'Due marked complete' : 'Due completion reset',
        description: nextValue
          ? task.dueReminderAt
            ? `Marked complete at ${formatTimestamp(nextValue, uiConfig?.timeFormat || '12h')}. The due reminder was removed for now.`
            : `Marked complete at ${formatTimestamp(nextValue, uiConfig?.timeFormat || '12h')}.`
          : updatedTask.dueReminderAt
            ? `Due completion was cleared and the reminder is back for ${formatTimestamp(updatedTask.dueReminderAt, uiConfig?.timeFormat || '12h')}.`
            : `Due completion was cleared for "${task.title}".`,
      });
    }
  };
  
  const handleExportJson = () => {
    if (!task || !uiConfig) return;

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
        appName: uiConfig.appName,
        appIcon: uiConfig.appIcon,
        repositoryConfigs: uiConfig.repositoryConfigs,
        developers: developersToExport.map(p => ({ name: p.name, email: p.email, phone: p.phone, additionalFields: p.additionalFields })),
        testers: testersToExport.map(p => ({ name: p.name, email: p.email, phone: p.phone, additionalFields: p.additionalFields })),
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

const handleCopyDescription = () => {
    if (!task || isCopying) return;
    navigator.clipboard.writeText(task.description.trim());
    setIsCopying(true);
    toast({
        variant: 'success',
        title: 'Copied successfully!'
    });
    setTimeout(() => setIsCopying(false), 1500);
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
              return <RichTextViewer text={String(value)} />;
          }
          case 'textarea':
              return <RichTextViewer text={String(value)} />;
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
              ) : <RichTextViewer text={String(value)} />;
          default:
              return <RichTextViewer text={String(value)} />;
      }
  }
  
  const handleCreateDeveloper = (name: string): string | undefined => {
    try {
        const newDev = addDeveloper({ name });
        setDevelopers(prev => [...prev, newDev]);
        return newDev.id;
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to add developer' });
        return undefined;
    }
  };

  const handleCreateTester = (name: string): string | undefined => {
    try {
        const newTester = addTester({ name });
        setTesters(prev => [...prev, newTester]);
        return newTester.id;
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to add tester' });
        return undefined;
    }
  };

  const handleDateUpdate = (key: keyof Task, date: Date | null) => {
    if (!task) return;

    let updatePayload: Partial<Task> = {
        [key]: date ? date.toISOString() : null
    };

    if (date === null) {
      if (key === 'devStartDate') updatePayload['devEndDate'] = null;
      if (key === 'qaStartDate') updatePayload['qaEndDate'] = null;
    }
    
    const updatedTask = updateTask(task.id, updatePayload);
    if (updatedTask) {
        setTask(updatedTask);
        setTaskLogs(getLogsForTask(task.id));
        toast({
            variant: 'success',
            title: 'Date Updated',
            description: `The date for "${fieldLabels.get(key) || key}" has been updated.`
        });
    }
  };
  
  const handleDeploymentDateUpdate = (env: string, date: Date | null) => {
      if (!task) return;

      const newDeploymentDates = { ...task.deploymentDates, [env]: date ? date.toISOString() : null };
      
      const updatedTask = updateTask(task.id, { deploymentDates: newDeploymentDates });
      if (updatedTask) {
          setTask(updatedTask);
          setTaskLogs(getLogsForTask(task.id));
          toast({
              variant: 'success',
              title: 'Deployment Date Updated',
              description: `The deployment date for "${env}" has been updated.`
          });
      }
  };

  const handleNavigateEdit = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push(`/tasks/${task?.id}/edit`);
  };

  const handleNavigateBack = () => {
    window.dispatchEvent(new Event('navigation-start'));
    if (typeof window !== 'undefined' && !isBinned) {
      window.sessionStorage.setItem(HOME_RETURN_SKELETON_KEY, '1');
    }
    router.push(backLink);
  };

  const handleFormat = async (ref: React.RefObject<HTMLTextAreaElement>, type: FormatType) => {
      if (ref.current) {
          await applyFormat(type, ref.current);
      }
  };

  const authMode = getAuthMode();
  const activeCompanyId = getActiveCompanyId();
  const isSyncing = authMode === 'authenticate' && (!activeCompanyId || !isInitialSyncComplete(activeCompanyId));
  const activeSkeletons = isLoading || isUserLoading || isSyncing;

  if (activeSkeletons || !uiConfig) {
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Task not found</h1>
            <p className="text-muted-foreground">The task you are looking for does not exist.</p>
            <Button onClick={() => router.back()} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
            </Button>
        </div>
      </div>
    );
  }
  
  const isBinned = !!task.deletedAt;
  const backLink = isBinned ? '/bin' : `/?${searchParams.toString()}`;
  
  const statusConfig = getStatusConfig(task.status, uiConfig);
  const { cardClassName } = statusConfig;

  const fieldLabels = new Map((uiConfig?.fields || []).map(f => [f.key, f.label]));

  const allConfiguredEnvs = (task.relevantEnvironments || []).map(name => (uiConfig?.environments || []).find(e => e.name === name)).filter((e): e is Environment => !!e);
  
  const customFields = (uiConfig?.fields || []).filter(f => f.isCustom && f.isActive && task.customFields && typeof task.customFields[f.key] !== 'undefined' && task.customFields[f.key] !== null && task.customFields[f.key] !== '');
  
  const assignedDevelopers = (task.developers || []).map(id => developers.find(p => p.id === id)).filter((p): p is Person => !!p);
  const assignedTesters = (task.testers || []).map(id => testers.find(p => p.id === id)).filter((p): p is Person => !!p);

  const azureWorkItemIdFieldConfig = (uiConfig?.fields || []).find(f => f.key === 'azureWorkItemId');
  
  const tagsField = (uiConfig?.fields || []).find(f => f.key === 'tags');
  const repoField = (uiConfig?.fields || []).find(f => f.key === 'repositories');
  const visibleRepositories = getTaskRepositories(task, uiConfig);
  const isRepositorySectionVisible = isRepositoryFieldActive(uiConfig);
  
  const tagsOptions = [...new Set([...(tagsField?.options?.map(opt => opt.value) || []), ...(allTasks.flatMap(t => t.tags || []))])].map(t => ({value: t, label: t}));
  const repoOptions = (repoField?.options || uiConfig?.repositoryConfigs || []).map(opt => ({ 
    value: (opt as any).value ?? (opt as any).name, 
    label: (opt as any).label ?? (opt as any).name 
  }));
  const developerOptions = developers.map(d => ({value: d.id, label: d.name}));
  const testerOptions = testers.map(t => ({value: t.id, label: t.name}));

  const prField = shouldShowPrLinks(uiConfig) ? (uiConfig?.fields || []).find(f => f.key === 'prLinks' && f.isActive) : undefined;
  const deploymentField = (uiConfig?.fields || []).find(f => f.key === 'deploymentStatus' && f.isActive);
  const attachmentsField = (uiConfig?.fields || []).find(f => f.key === 'attachments' && f.isActive);
  const commentsField = (uiConfig?.fields || []).find(f => f.key === 'comments' && f.isActive);
  const historyField = !isBinned;
  const sectionCardClassName = "rounded-[1.35rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]";
  const sectionHeaderClassName = "space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6";
  const sectionTitleClassName = "text-[1.06rem] font-semibold tracking-tight text-foreground";
  const subtleDividerClassName = "bg-border/55";
  const toolbarButtonClassName = "rounded-xl border-border/60 bg-background/92 px-3 font-medium shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow,transform,color] duration-200 hover:border-border/90 hover:bg-background hover:shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] hover:-translate-y-[1px] active:translate-y-0";

  return (
    <>
      <div className="container relative isolate mx-auto overflow-hidden px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-[calc(100%-6rem)] rounded-[2rem] border border-border/30 bg-muted/[0.035]" />

        <div className="mb-7 flex flex-row items-center justify-between sm:mb-8">
          <Button 
            onClick={handleNavigateBack} 
            variant="ghost" 
            size={isMobile ? "icon" : "default"}
            className={cn(
              "text-muted-foreground transition-[background-color,color,transform] duration-200 hover:bg-muted/55 hover:text-foreground active:scale-95", 
              isMobile ? "rounded-xl" : "pl-1.5 pr-3"
            )}
          >
              <ArrowLeft className={cn("h-4 w-4", !isMobile && "mx-2")} />
              {!isMobile && "Back"}
          </Button>
          {isBinned ? (
            <div className="flex gap-2">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size={isMobile ? "icon" : "sm"} className={cn(toolbarButtonClassName, isMobile ? "h-10 w-10" : "h-9")}>
                    <History className={cn("h-4 w-4", !isMobile && "mr-2")} />
                    {!isMobile && "Restore Task"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle className="font-semibold">Restore this task?</AlertDialogTitle>
                    <AlertDialogDescription className="font-normal">
                        This will move the task "{task.title}" back to your active tasks list.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestore} className="font-semibold">Restore</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
          ) : (
            <div className="flex gap-1.5 sm:gap-2">
                <ShareMenu task={task} uiConfig={uiConfig} developers={developers} testers={testers}>
                    <Button
                        variant="outline"
                        size={isMobile ? "icon" : "sm"}
                        className={cn(
                          toolbarButtonClassName,
                          isMobile ? "h-10 w-10" : "h-9"
                        )}
                    >
                        <Share2 className={cn(isMobile ? "h-5 w-5" : "h-4 w-4 mr-2")} />
                        {!isMobile && "Share"}
                    </Button>
                </ShareMenu>
                {uiConfig?.remindersEnabled && !isBinned && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size={isMobile ? "icon" : "sm"}
                                    onClick={() => setIsReminderOpen(true)}
                                    className={cn(
                                      toolbarButtonClassName,
                                      isMobile ? "h-10 w-10" : "h-9",
                                      task.reminder && "border-amber-500/28 bg-amber-500/[0.08] text-amber-700 hover:border-amber-500/40 hover:bg-amber-500/[0.11] dark:text-amber-300"
                                    )}
                                >
                                    <BellRing className={cn(isMobile ? "h-5 w-5" : "h-4 w-4 mr-2")} />
                                    {!isMobile && (task.reminder ? "Note" : "Add Note")}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="font-normal">{task.reminder ? 'Edit Reminder Note' : 'Set Reminder Note'}</p></TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                )}

                <Button
                    type="button"
                    onClick={handleRefreshTaskDetail}
                    variant="outline"
                    size="sm"
                    disabled={isRefreshingTaskDetail}
                    className={cn(
                      toolbarButtonClassName,
                      "hidden h-9 md:inline-flex"
                    )}
                >
                    <RotateCcw className={cn("mr-2 h-4 w-4", isRefreshingTaskDetail && "animate-spin")} />
                    Refresh
                </Button>
                <Button
                    id="task-detail-edit"
                    onClick={handleNavigateEdit}
                    variant="outline"
                    size={isMobile ? "icon" : "sm"}
                    className={cn(
                      toolbarButtonClassName,
                      isMobile ? "h-10 w-10" : "h-9"
                    )}
                >
                    <Pencil className={cn(isMobile ? "h-5 w-5" : "h-4 w-4 mr-2")} />
                    {!isMobile && "Edit"}
                </Button>
                <DeleteTaskButton 
                    taskId={task.id} 
                    taskTitle={task.title} 
                    onSuccess={() => router.push('/')} 
                    iconOnly={isMobile}
                    variant="outline"
                    iconClassName={isMobile ? "h-5 w-5" : undefined}
                    className={cn(
                      "border-destructive/28 bg-background/92 text-destructive shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow,transform,color] duration-200 hover:-translate-y-[1px] hover:border-destructive/45 hover:bg-destructive/[0.08] hover:text-destructive hover:shadow-[0_10px_24px_-18px_rgba(220,38,38,0.45)] active:translate-y-0",
                      isMobile ? "h-10 w-10 rounded-xl" : "rounded-xl px-3"
                    )}
                />
            </div>
          )}
        </div>

        {isBinned && (
          <Alert variant="destructive" className="mb-6 border-yellow-500/50 text-yellow-600 dark:border-yellow-500 [&>svg]:text-yellow-600">
            <Ban className="h-4 w-4" />
            <AlertTitle className="font-semibold">This task is in the Bin</AlertTitle>
            <AlertDescription className="font-normal">
              You are viewing a deleted task. To make changes, you must first restore it.
            </AlertDescription>
          </Alert>
        )}
        
                {task.reminder && (
          <div className="mb-5 md:mb-6">
            <div className="group flex items-center gap-3 rounded-[1.15rem] border border-amber-500/18 bg-amber-500/[0.045] px-3.5 py-3 shadow-[0_1px_2px_rgba(245,158,11,0.05),0_14px_30px_-28px_rgba(245,158,11,0.45)] md:px-4 md:py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/12 dark:text-amber-300">
                <BellRing className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-200/85">
                    Reminder Note
                  </span>
                  {task.reminderExpiresAt && (
                    <span className="rounded-full border border-amber-500/12 bg-amber-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      Expires {formatTimestamp(task.reminderExpiresAt, uiConfig.timeFormat)}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-amber-950/80 dark:text-amber-100/95 md:line-clamp-1">
                  {reminderPreview || 'Reminder added for this task.'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl px-3 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                  onClick={() => setIsReminderOpen(true)}
                >
                  <BellRing className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
                {!isBinned && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove reminder</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle className="font-semibold">Remove Reminder?</AlertDialogTitle>
                              <AlertDialogDescription className="font-normal">
                                  This will permanently remove the reminder note from this task.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRemoveReminder} className="font-semibold bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        )}


        <div id="task-detail-main" className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className={cn("group/card relative overflow-hidden rounded-[1.5rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.009),rgba(255,255,255,0.002))] shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_60px_-38px_rgba(15,23,42,0.3)]", cardClassName)} style={statusConfig.cardStyle}>
                <StatusIcon status={task.status} uiConfig={uiConfig} className={cn('absolute -bottom-12 -right-12 h-48 w-48 pointer-events-none transition-transform duration-300 ease-in-out', !isStatusValue(task.status, 'in_progress', uiConfig) && 'group-hover/card:scale-110 group-hover/card:-rotate-6')} style={statusConfig.backgroundIconStyle} />
                <div className="relative z-10 flex flex-col h-full">
                  <CardHeader className="px-5 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-start gap-2">
                          <TaskPriorityBadge priority={task.priority} />
                          <div className="flex min-w-0 flex-col items-start gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', getTaskDueToneClassName(task))}
                                >
                                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                  {dueLabel}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-[16rem]">
                                <div className="space-y-1 text-xs font-normal">
                                  <p>{dueLabel}</p>
                                  {hasTaskDueReminder ? <p>Due reminder enabled</p> : null}
                                  {task.dueCompletedAt ? <p>Completed at {formatTimestamp(task.dueCompletedAt, uiConfig.timeFormat)}</p> : null}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 group/title" onDoubleClick={() => handleStartEditing('title', task.title)}>
                        {editingSection === 'title' ? (
                            <Input 
                                ref={titleInputRef}
                                value={editingValue} 
                                onChange={e => setEditingValue(e.target.value)} 
                                onBlur={() => handleSaveEditing('title', false)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEditing('title', false)}
                                className="h-auto border-0 p-0 text-[2rem] font-semibold tracking-tight focus-visible:ring-0 sm:text-[2.2rem]"
                            />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <CardTitle className="cursor-pointer text-[2rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.2rem]">
                                    {task.title}
                                </CardTitle>
                                </TooltipTrigger>
                                {!isBinned && (
                                <TooltipContent>
                                    <p className="font-normal">Double-click to edit</p>
                                </TooltipContent>
                                )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!isBinned && <FavoriteToggleButton taskId={task.id} isFavorite={!!task.isFavorite} onUpdate={loadData} />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              disabled={isBinned}
                              className="h-auto rounded-[1rem] p-0.5 transition-all duration-200 hover:bg-background/60 hover:shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100 dark:hover:bg-background/35"
                            >
                              <TaskStatusBadge status={task.status} variant="prominent" uiConfig={uiConfig} className={cn((isStatusSaving || justUpdatedStatus === task.status) && 'animate-status-in', isStatusSaving && 'opacity-90')} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="bottom"
                            align="end"
                            sideOffset={10}
                            collisionPadding={12}
                            className="max-h-[min(24rem,calc(100vh-1.5rem))] w-[min(12.75rem,calc(100vw-0.75rem))] overflow-y-auto no-scrollbar rounded-[1.1rem] border-border/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),rgba(255,255,255,0.01))] p-1.5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.38)]"
                          >
                            <DropdownMenuLabel className="px-2 pt-1 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Set Status</DropdownMenuLabel>
                            <DropdownMenuSeparator className="mx-1 my-1 bg-border/50" />
                            {getSortedStatusNames(uiConfig).map(s => {
                              const currentStatusConfig = getStatusConfig(s, uiConfig);
                              const currentStatusStyles = getStatusStyles(s, uiConfig);
                              const isSelectedStatus = getStatusDisplayName(task.status, uiConfig) === s;
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onSelect={() => handleStatusChange(s)}
                                  className="rounded-[0.9rem] px-2.5 py-2 font-normal transition-[background-color,color] duration-200 hover:bg-white/[0.05] focus:bg-white/[0.05] dark:focus:bg-white/[0.05]"
                                  style={isSelectedStatus ? {
                                    color: currentStatusStyles.defaultStyle.color,
                                  } : undefined}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.75rem]"
                                      style={{
                                        backgroundColor: `color-mix(in srgb, ${String(currentStatusStyles.defaultStyle.color)} 14%, hsl(var(--background)))`,
                                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 18px -16px ${String(currentStatusStyles.defaultStyle.color)}`,
                                      }}
                                    >
                                      <StatusIcon status={s} uiConfig={uiConfig} className={cn("h-3.5 w-3.5", currentStatusConfig.shouldSpin && 'animate-spin')} />
                                    </div>
                                    <span className="text-[0.95rem] font-medium">{s}</span>
                                  </div>
                                  {isSelectedStatus && <Check className="ml-auto h-4 w-4" style={{ color: currentStatusStyles.defaultStyle.color as string }} />}
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="group/description flex-grow px-5 pb-5 pt-1 sm:px-6 sm:pb-6" onDoubleClick={() => !isBinned && editingSection !== 'description' && handleStartEditing('description', task.description)}>
                    <CardDescription className="mb-5 text-[0.95rem] font-normal leading-6 text-muted-foreground/85">
                        Last updated {formatTimestamp(task.updatedAt, uiConfig.timeFormat)}
                    </CardDescription>
                     {task.summary && (
                      <div className="mb-5 rounded-[1rem] border border-border/55 bg-muted/[0.042] p-4">
                          <p className="text-sm italic leading-6 text-muted-foreground">{task.summary}</p>
                      </div>
                    )}
                     <div className={cn("relative", !isBinned && "cursor-pointer")}>
                       {task.description && !isBinned && editingSection !== 'description' && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-8 w-8 rounded-lg text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-200 group-hover/description:opacity-100 hover:bg-muted/60 hover:text-foreground"
                                            onClick={handleCopyDescription}
                                        >
                                            {isCopying ? <Check className="h-4 w-4 text-green-500 animate-in fade-in" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy description</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {editingSection === 'description' ? (
                          <div className="space-y-2">
                             <div className="relative">
                               <Textarea
                                  ref={descriptionEditorRef}
                                  value={editingValue}
                                  onChange={e => setEditingValue(e.target.value)}
                                  className="min-h-[160px] rounded-[1rem] border-border/60 bg-background pb-12 font-normal"
                                  placeholder="Enter a description..."
                                  enableHotkeys
                               />
                               <TextareaToolbar textareaRef={descriptionEditorRef} onFormatClick={(type) => handleFormat(descriptionEditorRef, type)} storageKey="taskflow_editor_toolbar_task_detail" />
                             </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={handleCancelEditing} className="font-medium">Cancel</Button>
                                <Button size="sm" onClick={() => handleSaveEditing('description', false)} className="font-semibold">
                                  Save
                                </Button>
                            </div>
                           </div>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <div className="font-normal leading-7 text-foreground/90">
                                    <RichTextViewer text={task.description} />
                                </div>
                                </TooltipTrigger>
                                {!isBinned && (
                                <TooltipContent>
                                    <p className="font-normal">Double-click to edit</p>
                                </TooltipContent>
                                )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                    </div>
                  </CardContent>
                </div>
            </Card>
            
            <div className={cn("grid grid-cols-1 gap-6", prField && visibleRepositories.length > 0 ? "md:grid-cols-2" : "")}>
                {deploymentField && (
                  <Card id="task-detail-deployment" className={sectionCardClassName}>
                    <CardHeader className={sectionHeaderClassName}>
                      <CardTitle className={cn("flex items-center gap-2", sectionTitleClassName)}><CheckCircle2 className="h-5 w-5 text-primary/80" />{fieldLabels.get('deploymentStatus') || 'Deployments'}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                      <div className="space-y-1.5 text-sm">
                        {allConfiguredEnvs.length > 0 ? (
                          allConfiguredEnvs.map((env: Environment) => {
                            if (!env || !env.name) return null;
                            const isDeployed = task.deploymentStatus?.[env.name] ?? false;
                            return (
                              <div key={env.id} className={cn("flex items-center justify-between rounded-[0.95rem] border border-transparent px-3 py-2.5 transition-[background-color,border-color,box-shadow] duration-200",!isBinned && 'cursor-pointer hover:border-border/80 hover:bg-accent/55 hover:shadow-[0_10px_24px_-24px_rgba(15,23,42,0.16)] dark:hover:border-border/72 dark:hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.014))] dark:hover:shadow-[0_10px_24px_-24px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.03)]')} onClick={!isBinned ? () => handleToggleDeployment(env.name) : undefined}>
                                <span className="capitalize font-medium text-foreground">{env.name}</span>
                                <div onAnimationEnd={() => setJustUpdatedEnv(null)} className={cn('flex items-center gap-2 font-medium', isDeployed ? 'text-green-600 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-500', justUpdatedEnv === env.name && 'animate-status-in')}>
                                  {isDeployed ? (<><CheckCircle2 className="h-4 w-4" /><span>Deployed</span></>) : (<><Clock className="h-4 w-4" /><span>Pending</span></>)}
                                </div>
                              </div>
                            );
                          })
                        ) : (<p className="text-muted-foreground text-center text-xs pt-2 font-normal">No relevant environments selected for this task.</p>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {prField && visibleRepositories.length > 0 && (
                  <Card className={sectionCardClassName}>
                    <CardHeader className={cn(sectionHeaderClassName, "flex-row items-center justify-between space-y-0")}>
                      <CardTitle className={cn("flex items-center gap-2", sectionTitleClassName)}><GitMerge className="h-5 w-5 text-primary/80" />{fieldLabels.get('prLinks') || 'Pull Requests'}</CardTitle>
                      {!isBinned && visibleRepositories.length > 0 && allConfiguredEnvs.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingPrLinks(!isEditingPrLinks)} className="rounded-lg text-muted-foreground hover:bg-muted/55 hover:text-foreground">
                          {isEditingPrLinks ? 'Done' : (<><Pencil className="h-3 w-3 mr-1.5" /> Edit</>)}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                      <PrLinksGroup prLinks={task.prLinks} repositories={visibleRepositories} configuredEnvs={allConfiguredEnvs.map(e => e.name)} repositoryConfigs={uiConfig.repositoryConfigs} onUpdate={handlePrLinksUpdate} isEditing={isEditingPrLinks && !isBinned} />
                    </CardContent>
                  </Card>
                )}
            </div>
            
            {customFields.length > 0 && (
              <Card className={sectionCardClassName}>
                <CardHeader className={sectionHeaderClassName}>
                  <CardTitle className={cn("flex items-center gap-2", sectionTitleClassName)}><Box className="h-5 w-5 text-primary/80" />Other Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  {customFields.map(field => (
                    <div key={field.key} className="break-words rounded-[1rem] border border-border/62 bg-muted/[0.028] px-4 py-3 transition-[border-color,background-color,box-shadow] duration-200 hover:border-border/80 hover:bg-accent/45 hover:shadow-[0_12px_28px_-26px_rgba(15,23,42,0.14)] dark:hover:border-border/78 dark:hover:bg-muted/[0.042] dark:hover:shadow-[0_12px_28px_-26px_rgba(15,23,42,0.22)]">
                      <div className="flex justify-between items-start">
                        <h4 className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{field.label}</h4>
                        {!isBinned && (
                          <Button variant="ghost" size="icon" className=" -mr-2 -mt-1 h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted/55 hover:text-foreground" onClick={() => handleStartEditing(`customFields.${field.key}`, task.customFields?.[field.key])}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="min-w-0 text-sm leading-6 text-foreground">
                        {editingSection === `customFields.${field.key}` ? (
                            field.type === 'textarea' ? (
                                <Textarea
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    onBlur={() => handleSaveEditing(field.key, true)}
                                    autoFocus
                                    className="font-normal"
                                />
                            ) : (
                                <Input
                                    value={editingValue}
                                    onChange={e => setEditingValue(e.target.value)}
                                    onBlur={() => handleSaveEditing(field.key, true)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveEditing(field.key, true)}
                                    autoFocus
                                    className="font-normal"
                                />
                            )
                        ) : (
                            renderCustomFieldValue(field, task.customFields?.[field.key])
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {attachmentsField && (
                <Card className={sectionCardClassName}>
                    <CardHeader className={cn(sectionHeaderClassName, "pb-3")}>
                        <CardTitle className={cn("flex items-center justify-between gap-3", sectionTitleClassName)}>
                          <span className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5 text-primary/80" />
                            {fieldLabels.get('attachments') || 'Attachments'}
                          </span>
                          <div className="flex items-center gap-2">
                            {!isBinned && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                  if (isEditingAttachments) {
                                      handleSaveAttachments();
                                  } else {
                                      setIsEditingAttachments(true);
                                      isEditingAttachmentsRef.current = true;
                                      setLocalAttachments(task.attachments || []);
                                  }
                              }} className="rounded-lg text-muted-foreground hover:bg-muted/55 hover:text-foreground">
                                  {isEditingAttachments ? 'Save' : <><Pencil className="h-3 w-3 mr-1.5" /> Edit</>}
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                      <Accordion type="single" collapsible value={attachmentsAccordionValue} onValueChange={handleAttachmentsAccordionChange} className="w-full">
                        <AccordionItem value="attachments" className="border-none">
                          <AccordionTrigger className="rounded-[1rem] px-0 py-0 text-sm font-medium text-muted-foreground hover:no-underline">
                            <span>
                              {task.attachments?.length ? `${task.attachments.length} attachment${task.attachments.length === 1 ? '' : 's'}` : 'No attachments'}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            {isEditingAttachments ? (
                              <div
                                className="space-y-3"
                                onPaste={handleAttachmentPaste}
                                onDragEnter={() => setIsAttachmentDropActive(true)}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = 'copy';
                                  setIsAttachmentDropActive(true);
                                }}
                                onDragLeave={(event) => {
                                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                    setIsAttachmentDropActive(false);
                                  }
                                }}
                                onDrop={handleAttachmentDrop}
                              >
                                <div className="space-y-2">
                                  {localAttachments.map((att, index) => (
                                    <div key={index} className="group/attachment flex items-start gap-2 rounded-[1rem] border border-border/45 bg-muted/[0.04] p-3">
                                      <div className="flex-1 space-y-1">
                                        <Input
                                          value={att.name}
                                          onChange={(e) => {
                                            const newAtts = [...localAttachments];
                                            newAtts[index].name = e.target.value;
                                            setLocalAttachments(newAtts);
                                          }}
                                          placeholder="Attachment name"
                                          className="h-8 font-normal"
                                        />
                                        {att.type === 'link' && (
                                          <Input
                                            value={att.url}
                                            onChange={(e) => {
                                              const newAtts = [...localAttachments];
                                              newAtts[index].url = e.target.value;
                                              setLocalAttachments(newAtts);
                                            }}
                                            placeholder="https://example.com"
                                            className="h-8 font-normal"
                                          />
                                        )}
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDeleteAttachment(index)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>

                                <div
                                  tabIndex={0}
                                  className={cn(
                                    "rounded-[1rem] border border-dashed border-border/65 bg-muted/[0.032] p-4 text-center text-sm text-muted-foreground font-normal outline-none transition-colors",
                                    isAttachmentDropActive && "border-primary/70 bg-primary/[0.06]"
                                  )}
                                >
                                  <p>Drop images here, or paste an image/link while this section is focused</p>
                                  <div className="mt-2 flex items-center justify-center gap-2">
                                    <Popover open={isAddLinkPopoverOpen} onOpenChange={setIsAddLinkPopoverOpen}>
                                      <PopoverTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" className="font-medium"><Link2 className="mr-2 h-4 w-4" /> Add Link</Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80 rounded-[1rem] border-border/60 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)]">
                                        <div className="grid gap-4">
                                          <div className="space-y-2">
                                            <h4 className="font-semibold leading-none">Add Link</h4>
                                            <p className="text-sm text-muted-foreground font-normal">Enter a name and a valid URL.</p>
                                          </div>
                                          <div className="grid gap-2">
                                            <Input placeholder="Link Name" value={newLink.name} onChange={(e) => setNewLink((p) => ({ ...p, name: e.target.value }))} className="font-normal" />
                                            <Input placeholder="https://..." value={newLink.url} onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))} className="font-normal" />
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <Button variant="ghost" onClick={() => setIsAddLinkPopoverOpen(false)} className="font-medium">Cancel</Button>
                                            <Button onClick={handleAddLink} className="font-semibold">Add</Button>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} className="font-medium"><Image className="mr-2 h-4 w-4" /> Add Image</Button>
                                  </div>
                                  <input
                                    type="file"
                                    id="task-attachment-upload"
                                    ref={imageInputRef}
                                    onChange={(e) => {
                                      Array.from(e.target.files || []).forEach(handleImageUpload);
                                      e.target.value = '';
                                    }}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                  />
                                </div>
                              </div>
                            ) : (!task.attachments || task.attachments.length === 0) ? (
                              <div className="rounded-[1rem] border border-dashed border-border/65 bg-muted/[0.028] py-7 text-center text-muted-foreground">
                                <p className="text-sm font-medium">No attachments yet.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {task.attachments.map((att, index) => {
                                  const isImage = att.type === 'image' || isImageUrl(att.url);
                                  return (
                                    <div key={index} className="group/attachment flex items-center justify-between rounded-[1rem] border border-border/55 bg-background/78 p-3 transition-[background-color,border-color,box-shadow] duration-200 hover:border-border/80 hover:bg-accent/45 hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.15)] dark:hover:bg-muted/[0.045] dark:hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)]">
                                      <div className="min-w-0 flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-border/55 bg-muted/[0.5]">
                                          {isImage ? <img src={att.url} alt={att.name} className="h-full w-full object-cover" /> : <Link2 className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                        <div className="min-w-0">
                                          <button
                                            onClick={() => {
                                              if (isImage) {
                                                setPreviewImage({ url: att.url, name: att.name });
                                              } else {
                                                window.open(att.url, '_blank', 'noopener,noreferrer');
                                              }
                                            }}
                                            className="block w-full truncate text-left text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                                          >
                                            {att.name}
                                          </button>
                                          <div className="mt-0.5 flex items-center gap-2">
                                            {att.size ? <span className="text-[10px] font-medium uppercase text-muted-foreground">{formatBytes(att.size)}</span> : null}
                                            {att.uploadedAt ? (
                                              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                                                • {format(new Date(att.uploadedAt), 'MMM d')}
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/attachment:opacity-100">
                                        <ShareMenu task={task} uiConfig={uiConfig} developers={developers} testers={testers} attachment={att}>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/60">
                                            <Share className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        </ShareMenu>
                                        {!isImage && (
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/60" onClick={() => window.open(att.url, '_blank')}>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                </Card>
            )}

            <div className="hidden lg:block space-y-6">
                {commentsField && !isBinned && (
                    <CommentsSection taskId={task.id} comments={task.comments || []} onCommentsUpdate={handleCommentsUpdate} readOnly={isBinned} />
                )}
                {historyField && (
                    <TaskHistory logs={taskLogs} uiConfig={uiConfig} isLoading={isLogsLoading} />
                )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Card className={cn('order-2 h-fit', sectionCardClassName)}>
              <CardHeader className={cn(sectionHeaderClassName, 'pb-4')}>
                <CardTitle className={cn('flex items-center justify-between gap-3', sectionTitleClassName)}>
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Planning
                  </span>
                  {!isBinned && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPlanningEditorOpen(true)}
                      className="rounded-lg text-muted-foreground hover:bg-muted/55 hover:text-foreground"
                    >
                      <Pencil className="mr-1.5 h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <div className="rounded-[1.1rem] border border-border/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.35)]">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Priority</p>
                  <div className="mt-1">
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-border/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.35)]">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Due Date</p>
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn('inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-sm font-medium', getTaskDueToneClassName(task))}>
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="max-w-[min(46vw,14rem)] truncate sm:max-w-[19rem]">{dueBadgeLabel}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-[18rem]">
                          <div className="space-y-1 text-xs font-normal">
                            <p>{dueLabel}</p>
                            {task.dueAt && !hasTaskDueCompleted ? <p>{formatTimestamp(task.dueAt, uiConfig.timeFormat)}</p> : null}
                            {task.dueCompletedAt ? <p>Completed at {formatTimestamp(task.dueCompletedAt, uiConfig.timeFormat)}</p> : null}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      {task.dueCompletedAt ? (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {task.dueAt ? (
                            <p className="truncate">
                              <span className="font-medium text-foreground/75">Due:</span>{' '}
                              {formatTimestamp(task.dueAt, uiConfig.timeFormat)}
                            </p>
                          ) : null}
                          <p className="truncate">
                            <span className="font-medium text-foreground/75">Completed:</span>{' '}
                            {formatTimestamp(task.dueCompletedAt, uiConfig.timeFormat)}
                          </p>
                        </div>
                      ) : task.dueAt ? (
                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/75">Due:</span>{' '}
                          {formatTimestamp(task.dueAt, uiConfig.timeFormat)}
                        </p>
                      ) : null}
                    </div>
                    {!isBinned ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!hasTaskDueCompleted && shouldAskForDueCompletionTime}
                              onClick={hasTaskDueCompleted || !shouldAskForDueCompletionTime ? handleToggleDueCompletion : undefined}
                              className={cn(
                                'h-11 w-11 rounded-2xl border',
                                hasTaskDueCompleted
                                  ? 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 hover:bg-emerald-500/[0.12] dark:text-emerald-300'
                                  : shouldAskForDueCompletionTime
                                    ? 'border-border/60 bg-background/60 text-muted-foreground/55 opacity-100'
                                    : 'border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                              )}
                            >
                              {hasTaskDueCompleted ? <RotateCcw className="h-4.5 w-4.5" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-normal">
                            {hasTaskDueCompleted
                              ? 'Undo due completion'
                              : shouldAskForDueCompletionTime
                                ? 'Set the actual completion time from Planning edit'
                                : 'Mark due complete'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-border/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.35)]">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Due Reminder</p>
                  {hasTaskDueReminder && task.dueReminderAt ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'mt-1 inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-sm font-medium',
                              hasDueReminderAlerted
                                ? 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
                                : 'border-primary/18 bg-primary/[0.06] text-primary'
                            )}
                          >
                            <BellRing className="mr-2 h-4 w-4 shrink-0" />
                            <span className="max-w-[min(40vw,12rem)] truncate sm:max-w-[16rem]">
                              {hasDueReminderAlerted
                                ? 'Alerted'
                                : task.dueReminderPreset
                                  ? getDueReminderPresetLabel(task.dueReminderPreset)
                                  : 'Scheduled'}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-[18rem]">
                          <div className="space-y-1 text-xs font-normal">
                            <p>
                              {hasDueReminderAlerted
                                ? 'Alerted'
                                : task.dueReminderPreset
                                  ? getDueReminderPresetLabel(task.dueReminderPreset)
                                  : 'Scheduled'}
                            </p>
                            <p>{hasDueReminderAlerted ? 'Alerted at ' : 'Alerts at '}{formatTimestamp(task.dueReminderAt, uiConfig.timeFormat)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {hasDueReminderAlerted ? 'Alerted at ' : 'Alerts at '}
                        {formatTimestamp(task.dueReminderAt, uiConfig.timeFormat)}
                      </p>
                    </>
                  ) : hasParkedTaskDueReminder ? (
                    <>
                      <div className="mt-1 inline-flex items-center rounded-full border border-border/60 bg-muted/[0.3] px-3 py-1.5 text-sm font-medium text-muted-foreground">
                        <BellRing className="mr-2 h-4 w-4" />
                        Removed after completion
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Undo due completion to restore the reminder.
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-normal text-muted-foreground">No due-date reminder scheduled.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={cn("order-1 h-fit", sectionCardClassName)}>
                <CardHeader className={cn(sectionHeaderClassName, "pb-4")}>
                  <CardTitle className={cn("flex items-center justify-between", sectionTitleClassName)}>
                    <span className="flex items-center gap-2"><ListChecks className="h-5 w-5" />Task Details</span>
                    {!isBinned && editingSection !== 'details' && (
                        <Button variant="ghost" size="sm" onClick={handleStartEditing.bind(null, 'details', {})} className="rounded-lg text-muted-foreground hover:bg-muted/55 hover:text-foreground">
                            <Pencil className="h-3 w-3 mr-1.5" /> Edit
                        </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  {editingSection === 'details' ? (
                     <div className="space-y-4">
                         <div>
                            <Label className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{fieldLabels.get('developers') || 'Developers'}</Label>
                            <MultiSelect
                              selected={editingValue?.developers || []}
                              onChange={val => setEditingValue((prev: any) => ({ ...(prev || {}), developers: val }))}
                              options={developerOptions}
                              creatable
                              onCreate={handleCreateDeveloper}
                            />
                        </div>
                        <div>
                            <Label className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{fieldLabels.get('testers') || 'Testers'}</Label>
                            <MultiSelect
                              selected={editingValue?.testers || []}
                              onChange={val => setEditingValue((prev: any) => ({ ...(prev || {}), testers: val }))}
                              options={testerOptions}
                              creatable
                              onCreate={handleCreateTester}
                            />
                        </div>
                        {isRepositorySectionVisible && (
                          <div>
                              <Label className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{fieldLabels.get('repositories') || 'Repositories'}</Label>
                              <MultiSelect
                                selected={editingValue?.repositories || []}
                                onChange={val => setEditingValue((prev: any) => ({ ...(prev || {}), repositories: val }))}
                                options={repoOptions}
                              />
                          </div>
                        )}
                        {azureWorkItemIdFieldConfig?.isActive && (
                            <div>
                                <Label className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{azureWorkItemIdFieldConfig.label || 'Azure DevOps'}</Label>
                                <Input
                                  value={editingValue?.azureWorkItemId || ''}
                                  onChange={(e) => setEditingValue((prev: any) => ({ ...(prev || {}), azureWorkItemId: e.target.value }))}
                                  placeholder="Enter ID..."
                                  className="font-normal"
                                />
                            </div>
                        )}
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={handleCancelEditing} className="flex-1 font-medium">Cancel</Button>
                          <Button onClick={handleSaveDetailsEditing} className="flex-1 font-semibold">Done</Button>
                        </div>
                     </div>
                  ) : (
                    <>
                      <TaskDetailSection title={fieldLabels.get('developers') || 'Developers'} people={assignedDevelopers} setPersonInView={setPersonInView} isDeveloper={true} />
                      <Separator className={subtleDividerClassName} />
                      <TaskDetailSection title={fieldLabels.get('testers') || 'Testers'} people={assignedTesters} setPersonInView={setPersonInView} isDeveloper={false} />
                      {isRepositorySectionVisible && (
                        <>
                          <Separator className={subtleDividerClassName} />
                          <div>
                            <h4 className="mb-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{fieldLabels.get('repositories') || 'Repositories'}</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {visibleRepositories.length > 0 ? visibleRepositories.map(repo => (
                                <Badge key={repo} variant="repo" style={getRepoBadgeStyle(repo)} className="rounded-full px-2.5 py-1 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">{repo}</Badge>
                              )) : (<p className="text-sm text-muted-foreground font-normal">No repositories assigned.</p>)}
                            </div>
                          </div>
                        </>
                      )}
                      {azureWorkItemIdFieldConfig && azureWorkItemIdFieldConfig.isActive && task.azureWorkItemId && (<>
                        <Separator className={subtleDividerClassName} />
                        <div>
                          <h4 className="mb-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{azureWorkItemIdFieldConfig.label || 'Azure DevOps'}</h4>
                          {azureWorkItemIdFieldConfig.baseUrl ? (
                            <a href={`${azureWorkItemIdFieldConfig.baseUrl}${task.azureWorkItemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary/90 transition-colors hover:text-primary hover:underline">
                              <ExternalLink className="h-4 w-4" />
                              <span>Work Item #{task.azureWorkItemId}</span>
                            </a>
                          ) : (<span className="text-sm text-foreground font-normal">{task.azureWorkItemId}</span>)}
                        </div>
                      </>)}
                    </>
                  )}
                  
                  {tagsField && tagsField.isActive && (
                    <>
                        <Separator className={subtleDividerClassName} />
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{tagsField.label || 'Tags'}</h4>
                                {!isBinned && editingSection !== 'tags' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleStartEditing('tags', task.tags || [])} className="rounded-lg text-muted-foreground hover:bg-muted/55 hover:text-foreground">
                                        <Pencil className="h-3 w-3 mr-1.5" /> Edit
                                    </Button>
                                )}
                            </div>
                            {editingSection === 'tags' ? (
                                <>
                                  <MultiSelect
                                      selected={editingValue}
                                      onChange={setEditingValue}
                                      options={tagsOptions}
                                      placeholder="Add or create tags..."
                                      creatable
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancelEditing} className="font-medium">Cancel</Button>
                                    <Button size="sm" onClick={() => handleSaveEditing('tags', false)} className="font-semibold">Save</Button>
                                  </div>
                                </>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {(task.tags && task.tags.length > 0) ? (
                                        task.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="rounded-full border border-border/40 bg-muted/[0.6] px-2.5 py-1 font-medium text-foreground/85">{tag}</Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground font-normal">No tags assigned.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                  )}
                  <Separator className={subtleDividerClassName} />
                  <div>
                    <h4 className="mb-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Important Dates</h4>
                    <TimelineSection task={task} uiConfig={uiConfig} fieldLabels={fieldLabels} onDateUpdate={handleDateUpdate} onDeploymentDateUpdate={handleDeploymentDateUpdate} isBinned={isBinned}/>
                  </div>
                </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="lg:hidden mt-8 space-y-6">
            {commentsField && !isBinned && (
                <CommentsSection taskId={task.id} comments={task.comments || []} onCommentsUpdate={handleCommentsUpdate} readOnly={isBinned} />
            )}
            {historyField && (
                <TaskHistory logs={taskLogs} uiConfig={uiConfig} isLoading={isLogsLoading} />
            )}
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
        onPersonUpdated={handlePersonUpdated}
      />
      <ImagePreviewDialog
        isOpen={!!previewImage}
        onOpenChange={(isOpen) => { if (!isOpen) { setPreviewImage(null); }}}
        imageUrl={previewImage?.url ?? null}
        imageName={previewImage?.name ?? null}
      />
      {uiConfig?.remindersEnabled && task && (
        <ReminderDialog 
          isOpen={isReminderOpen}
          onOpenChange={setIsReminderOpen}
          task={task}
          onSuccess={handleReminderSuccess}
          pinnedTaskIds={pinnedTaskIds}
          onPinToggle={handleTogglePin}
        />
      )}
      {task && (
        <TaskPlanningEditor
          open={isPlanningEditorOpen}
          onOpenChange={setIsPlanningEditorOpen}
          task={task}
          onSuccess={handlePlanningSuccess}
        />
      )}
    </>
  );
}


function TaskDetailSection({ title, people, setPersonInView, isDeveloper }: {
  title: string;
  people: Person[];
  setPersonInView: (person: { person: Person, isDeveloper: boolean }) => void;
  isDeveloper: boolean;
}) {
  return (
    <div className="space-y-3">
        <h4 className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{title}</h4>
        <div className="flex flex-wrap gap-2.5">
            {people.length > 0 ? (
                people.map((person, index) => (
                  <TooltipProvider key={`${isDeveloper ? 'dev' : 'test'}-${person.id}-${index}`}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <button 
                            className="flex items-center gap-2 rounded-[0.95rem] border border-transparent px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-200 hover:border-border/80 hover:bg-accent/55 hover:shadow-[0_10px_24px_-24px_rgba(15,23,42,0.16)] dark:hover:border-border/70 dark:hover:bg-muted/[0.06] dark:hover:shadow-[0_10px_24px_-24px_rgba(15,23,42,0.22)]"
                            onClick={() => {
                              const latestPerson =
                                (isDeveloper ? getDevelopers() : getTesters()).find((entry) => entry.id === person.id) || person;
                              setPersonInView({ person: latestPerson, isDeveloper });
                            }}
                        >
                            <Avatar className="h-8 w-8 ring-1 ring-border/35">
                            <AvatarFallback
                                className="text-[10px] font-semibold text-white"
                                style={{
                                backgroundColor: `#${getAvatarColor(person.name)}`,
                                }}
                            >
                                {getInitials(person.name)}
                            </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground/92">
                            {person.name}
                            </span>
                        </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-normal">View and edit person details.</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))
            ) : (
            <p className="text-sm text-muted-foreground font-normal">
                No {title.toLowerCase()} assigned.
            </p>
            )}
        </div>
    </div>
  )
}

function TimelineSection({
  task,
  uiConfig,
  fieldLabels,
  onDateUpdate,
  onDeploymentDateUpdate,
  isBinned,
}: {
  task: Task;
  uiConfig: UiConfig;
  fieldLabels: Map<string, string>;
  onDateUpdate: (key: keyof Task, date: Date | null) => void;
  onDeploymentDateUpdate: (env: string, date: Date | null) => void;
  isBinned: boolean;
}) {
  const isValidDate = (d: any): d is string | Date => d && !isNaN(new Date(d).getTime());

  const DateField = ({ fieldKey, label }: { fieldKey: keyof Task, label: string }) => {
    const dateValue = task[fieldKey] ? new Date(task[fieldKey] as string) : null;
    const [isOpen, setIsOpen] = useState(false);

    const getDisabledDates = () => {
        if (fieldKey === 'devEndDate' && task.devStartDate) {
            return { before: new Date(task.devStartDate) };
        }
        if (fieldKey === 'qaEndDate' && task.qaStartDate) {
            return { before: new Date(task.qaStartDate) };
        }
        return undefined;
    };

    return (
      <div className="group flex items-center justify-between rounded-[0.95rem] border border-transparent px-2.5 py-2 transition-[background-color,border-color] duration-200 hover:border-border/78 hover:bg-accent/50 dark:hover:border-border/62 dark:hover:bg-muted/[0.05]">
        <span className="font-normal text-muted-foreground">{label}</span>
        <Popover open={isOpen} onOpenChange={isBinned ? undefined : setIsOpen}>
          <PopoverTrigger asChild disabled={isBinned}>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 rounded-lg px-2.5 font-normal text-foreground/85 hover:bg-muted/55", !dateValue && "text-muted-foreground hover:text-foreground")}
            >
              {dateValue ? format(dateValue, 'PPP') : 'Set Date'}
              <Pencil className="ml-2 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-[1rem] border-border/60 p-0 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)]" align="end">
            <Calendar
              mode="single"
              selected={dateValue || undefined}
              onSelect={(date) => {
                onDateUpdate(fieldKey, date || null);
                setIsOpen(false);
              }}
              defaultMonth={dateValue || undefined}
              initialFocus
              disabled={getDisabledDates()}
            />
            <div className="border-t border-border/55 p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="w-full font-medium"
                onClick={() => {
                  onDateUpdate(fieldKey, null);
                  setIsOpen(false);
                }}
              >
                Clear Date
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };
  
  const DeploymentDateField = ({ env, date }: { env: string, date: string | null | undefined }) => {
      const dateValue = date ? new Date(date) : null;
      const [isOpen, setIsOpen] = useState(false);
      
      const isDeployed = task.deploymentStatus?.[env];
      if (!isDeployed) return null;

      return (
        <div className="group flex items-center justify-between rounded-[0.95rem] border border-transparent px-2.5 py-2 transition-[background-color,border-color] duration-200 hover:border-border/78 hover:bg-accent/50 dark:hover:border-border/62 dark:hover:bg-muted/[0.05]">
            <span className="capitalize font-normal text-muted-foreground">{env} Deployed</span>
            <Popover open={isOpen} onOpenChange={isBinned ? undefined : setIsOpen}>
                <PopoverTrigger asChild disabled={isBinned}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 rounded-lg px-2.5 font-normal text-foreground/85 hover:bg-muted/55", !dateValue && "text-muted-foreground hover:text-foreground")}
                    >
                        {dateValue ? format(dateValue, 'PPP') : 'Set Date'}
                        <Pencil className="ml-2 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-[1rem] border-border/60 p-0 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)]" align="end">
                    <Calendar
                        mode="single"
                        selected={dateValue || undefined}
                        onSelect={(d) => {
                            onDeploymentDateUpdate(env, d || null);
                            setIsOpen(false);
                        }}
                        defaultMonth={dateValue || undefined}
                        initialFocus
                    />
                     <div className="border-t border-border/55 p-2 text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full font-medium"
                            onClick={() => {
                                onDeploymentDateUpdate(env, null);
                                setIsOpen(false);
                            }}
                        >
                            Clear Date
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
      );
  };

  const hasAnyDeploymentDate = Object.values(task.deploymentDates || {}).some(date => isValidDate(date));

  const devStartConfig = (uiConfig?.fields || []).find(f => f.key === 'devStartDate' && f.isActive);
  const devEndConfig = (uiConfig?.fields || []).find(f => f.key === 'devEndDate' && f.isActive);
  const qaStartConfig = (uiConfig?.fields || []).find(f => f.key === 'qaStartDate' && f.isActive);
  const qaEndConfig = (uiConfig?.fields || []).find(f => f.key === 'qaEndDate' && f.isActive);

  if (!devStartConfig && !devEndConfig && !qaStartConfig && !qaEndConfig && !hasAnyDeploymentDate) {
    return <p className="text-muted-foreground text-center text-xs py-2 font-normal">No date fields are active.</p>
  }
  
  const relevantEnvs = (task.relevantEnvironments || []).map(name => (uiConfig?.environments || []).find(e => e.name === name)).filter((e): e is Environment => !!e);


  return (
    <div className="space-y-1.5 text-sm">
      {devStartConfig && <DateField fieldKey="devStartDate" label={devStartConfig.label} />}
      {devEndConfig && <DateField fieldKey="devEndDate" label={devEndConfig.label} />}
      {(devStartConfig || devEndConfig) && (qaStartConfig || qaEndConfig) && <Separator className="my-1.5 bg-border/50" />}
      {qaStartConfig && <DateField fieldKey="qaStartDate" label={qaStartConfig.label} />}
      {qaEndConfig && <DateField fieldKey="qaEndDate" label={qaEndConfig.label} />}

      {(devStartConfig || devEndConfig || qaStartConfig || qaEndConfig) && hasAnyDeploymentDate && <Separator className="my-1.5 bg-border/50"/>}

      {task.deploymentDates && relevantEnvs.map((env: Environment) => (
          <DeploymentDateField key={env.id} env={env.name} date={task.deploymentDates?.[env.name]} />
      ))}
    </div>
  );
}
