'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { getTaskById, getUiConfig, updateTask, getDevelopers, getTesters, getTasks, restoreTask, getLogsForTask, addDeveloper, addTester, getActiveCompanyId, getAuthMode, isInitialSyncComplete } from '@/lib/data';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, ListChecks, Paperclip, CheckCircle2, Clock, Box, Check, Code2, ClipboardCheck, Link2, Image, X, Ban, Share2, History, BellRing, MoreVertical, Trash2, Copy, Tag, Download, CalendarIcon, Save, Share } from 'lucide-react';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat, type FormatType } from '@/components/ui/textarea-toolbar';
import { getLinkAlias } from '@/ai/flows/alias-flow';
import { TaskDetailSkeleton } from '@/components/task-detail-skeleton';
import { useFirebase } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { ShareMenu } from '@/components/share-menu';
import { triggerTransfer } from '@/components/file-transfer-indicator';


const isImageUrl = (url: string): boolean => {
  try {
    const path = new URL(url).pathname;
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path);
  } catch {
    return false;
  }
};


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

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);
  
  const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
  const taskId = params.id as string;
  
  const loadData = () => {
    if (taskId) {
      const activeCompanyId = getActiveCompanyId();
      const authMode = getAuthMode();
      
      if (isUserLoading || (authMode === 'authenticate' && (!activeCompanyId || !isInitialSyncComplete(activeCompanyId)))) {
          return;
      }

      const allDevs = getDevelopers();
      const allTesters = getTesters();
      const allTasksData = getTasks();
      const foundTask = getTaskById(taskId);
      const config = getUiConfig();
      
      setTask(foundTask || null);
      if (!isEditingAttachmentsRef.current) {
          setLocalAttachments(foundTask?.attachments || []);
      }
      setUiConfig(config);
      setDevelopers(allDevs);
      setTesters(allTesters);
      setAllTasks(allTasksData);

      if (foundTask) {
        document.title = `${foundTask.title} | ${config.appName || 'My Task Manager'}`;
        setTaskLogs(getLogsForTask(taskId));
      } else {
        document.title = `Task Not Found | ${config.appName || 'My Task Manager'}`;
      }
      
      setIsLoading(false);
      window.dispatchEvent(new Event('navigation-end'));
    }
  }

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('company-changed', loadData);
    window.addEventListener('sync-complete', loadData);
    return () => {
        window.removeEventListener('storage', loadData);
        window.removeEventListener('company-changed', loadData);
        window.removeEventListener('sync-complete', loadData);
    };
  }, [taskId, isUserLoading]);

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
        status: 'uploading',
        progress: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
        const rawDataUri = e.target?.result as string;
        triggerTransfer({ id: transferId, filename: file.name, status: 'uploading', progress: 50 });
        
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
        triggerTransfer({ id: transferId, filename: file.name, status: 'complete', progress: 100 });
        toast({ variant: 'success', title: 'Image optimized and added.'});
    };
    reader.readAsDataURL(file);
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

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isEditingAttachmentsRef.current) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            event.preventDefault();
            handleImageUpload(file);
            break;
          }
        }
        if (items[i].type === 'text/plain') {
            items[i].getAsString(async (pastedText) => {
                try {
                    const url = new URL(pastedText);
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        event.preventDefault();
                        
                        const newAttachment: Attachment = {
                            name: pastedText,
                            url: pastedText,
                            type: 'link',
                            uploadedAt: new Date().toISOString()
                        };
                        const newAttachmentIndex = localAttachments.length;
                        setLocalAttachments(prev => [...prev, newAttachment]);
                        toast({ variant: 'success', title: 'Pasted link added. Generating title...' });

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
                        } catch(e) {
                           console.error('Failed to generate smart title', e);
                        }
                    }
                } catch (_) {
                }
            });
            break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [toast, localAttachments.length]);
  
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
      
      handleReminderSuccess();
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
                  <div className="flex wrap gap-1">
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
    router.push(backLink);
  };

  const handleFormat = (ref: React.RefObject<HTMLTextAreaElement>, type: FormatType) => {
      if (ref.current) {
          applyFormat(type, ref.current);
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
  
  const statusConfig = getStatusConfig(task.status);
  const { Icon, cardClassName, iconColorClassName } = statusConfig;

  const fieldLabels = new Map((uiConfig?.fields || []).map(f => [f.key, f.label]));

  const allConfiguredEnvs = (task.relevantEnvironments || []).map(name => (uiConfig?.environments || []).find(e => e.name === name)).filter((e): e is Environment => !!e);
  
  const customFields = (uiConfig?.fields || []).filter(f => f.isCustom && f.isActive && task.customFields && typeof task.customFields[f.key] !== 'undefined' && task.customFields[f.key] !== null && task.customFields[f.key] !== '');
  
  const assignedDevelopers = (task.developers || []).map(id => developers.find(p => p.id === id)).filter((p): p is Person => !!p);
  const assignedTesters = (task.testers || []).map(id => testers.find(p => p.id === id)).filter((p): p is Person => !!p);

  const azureWorkItemIdFieldConfig = (uiConfig?.fields || []).find(f => f.key === 'azureWorkItemId');
  
  const tagsField = (uiConfig?.fields || []).find(f => f.key === 'tags');
  const repoField = (uiConfig?.fields || []).find(f => f.key === 'repositories');
  
  const tagsOptions = [...new Set([...(tagsField?.options?.map(opt => opt.value) || []), ...(allTasks.flatMap(t => t.tags || []))])].map(t => ({value: t, label: t}));
  const repoOptions = (repoField?.options || uiConfig?.repositoryConfigs || []).map(opt => ({ value: (opt as any).value ?? (opt as any).label, label: (any).label }));
  const developerOptions = developers.map(d => ({value: d.id, label: d.name}));
  const testerOptions = testers.map(t => ({value: t.id, label: t.name}));

  const prField = (uiConfig?.fields || []).find(f => f.key === 'prLinks' && f.isActive);
  const deploymentField = (uiConfig?.fields || []).find(f => f.key === 'deploymentStatus' && f.isActive);
  const attachmentsField = (uiConfig?.fields || []).find(f => f.key === 'attachments' && f.isActive);
  const commentsField = (uiConfig?.fields || []).find(f => f.key === 'comments' && f.isActive);
  const historyField = !isBinned;

  return (
    <>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row justify-between items-center mb-6">
          <Button 
            onClick={handleNavigateBack} 
            variant="ghost" 
            size={isMobile ? "icon" : "default"}
            className={cn(
              "active:scale-95 transition-transform font-medium", 
              isMobile ? "rounded-full" : "pl-1"
            )}
          >
              <ArrowLeft className={cn("h-4 w-4", !isMobile && "mr-2")} />
              {!isMobile && "Back"}
          </Button>
          {isBinned ? (
            <div className="flex gap-2">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size={isMobile ? "icon" : "sm"} className="font-medium">
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
                    <Button variant="outline" size={isMobile ? "icon" : "sm"} className="font-medium">
                        <Share2 className={cn("h-4 w-4", !isMobile && "mr-2")} />
                        {!isMobile && "Share"}
                    </Button>
                </ShareMenu>

                <Button onClick={handleNavigateEdit} variant="outline" size={isMobile ? "icon" : "sm"} className="active:scale-95 transition-transform font-medium">
                    <Pencil className={cn("h-4 w-4", !isMobile && "mr-2")} />
                    {!isMobile && "Edit"}
                </Button>
                <DeleteTaskButton 
                    taskId={task.id} 
                    taskTitle={task.title} 
                    onSuccess={() => router.push('/')} 
                    iconOnly={isMobile}
                    className={cn(isMobile && "h-9 w-9")}
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
          <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">Reminder Note</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300 font-normal">
                    <RichTextViewer text={task.reminder} />
                    {task.reminderExpiresAt && (
                      <span className="block text-xs italic mt-1 text-amber-600 dark:text-amber-400 font-medium">
                        (Expires {formatTimestamp(task.reminderExpiresAt, uiConfig.timeFormat)})
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
          </Alert>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className={cn("relative overflow-hidden group/card", cardClassName)}>
                <Icon className={cn('absolute -bottom-12 -right-12 h-48 w-48 pointer-events-none transition-transform duration-300 ease-in-out', iconColorClassName, task.status !== 'In Progress' && 'group-hover/card:scale-110 group-hover/card:-rotate-6')} />
                <div className="relative z-10 flex flex-col h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 flex items-center gap-2 group/title" onDoubleClick={() => handleStartEditing('title', task.title)}>
                        {editingSection === 'title' ? (
                            <Input 
                                ref={titleInputRef}
                                value={editingValue} 
                                onChange={e => setEditingValue(e.target.value)} 
                                onBlur={() => handleSaveEditing('title', false)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEditing('title', false)}
                                className="text-3xl font-semibold h-auto p-0 border-0 focus-visible:ring-0"
                            />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <CardTitle className="text-3xl font-semibold cursor-pointer tracking-tight">
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
                        {uiConfig?.remindersEnabled && !isBinned && (
                          <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsReminderOpen(true)}>
                                    <BellRing className={cn("h-5 w-5 text-muted-foreground", task.reminder && "text-amber-600 dark:text-amber-400")} />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="font-normal">{task.reminder ? 'Edit Reminder' : 'Set Reminder'}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!isBinned && <FavoriteToggleButton taskId={task.id} isFavorite={!!task.isFavorite} onUpdate={loadData} />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" disabled={isBinned} className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-100">
                              <TaskStatusBadge status={task.status} variant="prominent" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="font-medium">Set Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(uiConfig?.taskStatuses || []).map(s => {
                              const currentStatusConfig = getStatusConfig(s);
                              const { Icon } = currentStatusConfig;
                              return (
                                <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)} className="font-normal">
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
                  <CardContent className="pt-2 flex-grow group/description" onDoubleClick={() => !isBinned && editingSection !== 'description' && handleStartEditing('description', task.description)}>
                    <CardDescription className="mb-4 font-normal">
                        Last updated {formatTimestamp(task.updatedAt, uiConfig.timeFormat)}
                    </CardDescription>
                     {task.summary && (
                      <div className="mb-4 p-3 rounded-md bg-background/50 border border-border/50">
                          <p className="text-sm italic text-muted-foreground leading-relaxed font-normal">{task.summary}</p>
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
                                            className="absolute top-0 right-0 h-7 w-7 text-muted-foreground opacity-0 group-hover/description:opacity-100 transition-opacity"
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
                                  className="min-h-[150px] pb-12 font-normal"
                                  placeholder="Enter a description..."
                                  enableHotkeys
                               />
                               <TextareaToolbar onFormatClick={(type) => handleFormat(descriptionEditorRef, type)} />
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
                                <div className="font-normal text-foreground/90 leading-relaxed">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {deploymentField && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl font-semibold"><CheckCircle2 className="h-5 w-5" />{fieldLabels.get('deploymentStatus') || 'Deployments'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        {allConfiguredEnvs.length > 0 ? (
                          allConfiguredEnvs.map((env: Environment) => {
                            if (!env || !env.name) return null;
                            const isDeployed = task.deploymentStatus?.[env.name] ?? false;
                            return (
                              <div key={env.id} className={cn("flex justify-between items-center p-2 -m-2 rounded-lg transition-colors",!isBinned && 'cursor-pointer hover:bg-muted/50')} onClick={!isBinned ? () => handleToggleDeployment(env.name) : undefined}>
                                <span className="capitalize text-foreground font-medium">{env.name}</span>
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
                {prField && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-xl font-semibold"><GitMerge className="h-5 w-5" />{fieldLabels.get('prLinks') || 'Pull Requests'}</CardTitle>
                      {!isBinned && Array.isArray(task.repositories) && task.repositories.length > 0 && allConfiguredEnvs.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingPrLinks(!isEditingPrLinks)} className="font-medium">
                          {isEditingPrLinks ? 'Done' : (<><Pencil className="h-3 w-3 mr-1.5" /> Edit</>)}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <PrLinksGroup prLinks={task.prLinks} repositories={task.repositories} configuredEnvs={allConfiguredEnvs.map(e => e.name)} repositoryConfigs={uiConfig.repositoryConfigs} onUpdate={handlePrLinksUpdate} isEditing={isEditingPrLinks && !isBinned} />
                    </CardContent>
                  </Card>
                )}
            </div>
            
            {customFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold"><Box className="h-5 w-5" />Other Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customFields.map(field => (
                    <div key={field.key} className="break-words">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">{field.label}</h4>
                        {!isBinned && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1" onClick={() => handleStartEditing(`customFields.${field.key}`, task.customFields?.[field.key])}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-foreground min-w-0 font-normal">
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

            <div className="hidden lg:block space-y-6">
                {commentsField && !isBinned && (
                    <CommentsSection taskId={task.id} comments={task.comments || []} onCommentsUpdate={handleCommentsUpdate} readOnly={isBinned} />
                )}
                {historyField && (
                    <TaskHistory logs={taskLogs} uiConfig={uiConfig} isLoading={isLogsLoading} />
                )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-xl font-semibold">
                    <span className="flex items-center gap-2"><ListChecks className="h-5 w-5" />Task Details</span>
                    {!isBinned && editingSection !== 'details' && (
                        <Button variant="ghost" size="sm" onClick={handleStartEditing.bind(null, 'details', {})} className="font-medium">
                            <Pencil className="h-3 w-3 mr-1.5" /> Edit
                        </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === 'details' ? (
                     <div className="space-y-4">
                         <div>
                            <Label className="font-semibold">{fieldLabels.get('developers') || 'Developers'}</Label>
                            <MultiSelect selected={task.developers || []} onChange={val => handleSaveEditing('developers', false, val)} options={developerOptions} creatable onCreate={handleCreateDeveloper}/>
                        </div>
                        <div>
                            <Label className="font-semibold">{fieldLabels.get('testers') || 'Testers'}</Label>
                            <MultiSelect selected={task.testers || []} onChange={val => handleSaveEditing('testers', false, val)} options={testerOptions} creatable onCreate={handleCreateTester}/>
                        </div>
                        <div>
                            <Label className="font-semibold">{fieldLabels.get('repositories') || 'Repositories'}</Label>
                            <MultiSelect selected={Array.isArray(task.repositories) ? task.repositories : (task.repositories ? [task.repositories] : [])} onChange={val => handleSaveEditing('repositories', false, val)} options={repoOptions} />
                        </div>
                        {azureWorkItemIdFieldConfig?.isActive && (
                            <div>
                                <Label className="font-semibold">{azureWorkItemIdFieldConfig.label || 'Azure DevOps'}</Label>
                                <Input defaultValue={task.azureWorkItemId} onBlur={(e) => handleSaveEditing('azureWorkItemId', false, e.target.value)} placeholder="Enter ID..." className="font-normal"/>
                            </div>
                        )}
                        <Button onClick={() => setEditingSection(null)} className="w-full font-semibold">Done</Button>
                     </div>
                  ) : (
                    <>
                      <TaskDetailSection title={fieldLabels.get('developers') || 'Developers'} people={assignedDevelopers} setPersonInView={setPersonInView} isDeveloper={true} />
                      <Separator />
                      <TaskDetailSection title={fieldLabels.get('testers') || 'Testers'} people={assignedTesters} setPersonInView={setPersonInView} isDeveloper={false} />
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">{fieldLabels.get('repositories') || 'Repositories'}</h4>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(task.repositories) && task.repositories.length > 0) ? (task.repositories || []).map(repo => (
                            <Badge key={repo} variant="repo" style={getRepoBadgeStyle(repo)} className="font-medium">{repo}</Badge>
                          )) : (<p className="text-sm text-muted-foreground font-normal">No repositories assigned.</p>)}
                        </div>
                      </div>
                      {azureWorkItemIdFieldConfig && azureWorkItemIdFieldConfig.isActive && task.azureWorkItemId && (<>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{azureWorkItemIdFieldConfig.label || 'Azure DevOps'}</h4>
                          {azureWorkItemIdFieldConfig.baseUrl ? (
                            <a href={`${azureWorkItemIdFieldConfig.baseUrl}${task.azureWorkItemId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm font-normal">
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
                        <Separator />
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-muted-foreground">{tagsField.label || 'Tags'}</h4>
                                {!isBinned && editingSection !== 'tags' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleStartEditing('tags', task.tags || [])} className="font-medium">
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
                                <div className="flex flex-wrap gap-1">
                                    {(task.tags && task.tags.length > 0) ? (
                                        task.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="font-medium">{tag}</Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground font-normal">No tags assigned.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Important Dates</h4>
                    <TimelineSection task={task} uiConfig={uiConfig} fieldLabels={fieldLabels} onDateUpdate={handleDateUpdate} onDeploymentDateUpdate={handleDeploymentDateUpdate} isBinned={isBinned}/>
                  </div>
                </CardContent>
            </Card>

            {attachmentsField && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                            <Paperclip className="h-5 w-5" />{fieldLabels.get('attachments') || 'Attachments'}
                        </CardTitle>
                        {!isBinned && (
                            <Button variant="ghost" size="sm" onClick={() => {
                                if (isEditingAttachments) {
                                    handleSaveAttachments();
                                } else {
                                    setIsEditingAttachments(true);
                                    isEditingAttachmentsRef.current = true;
                                    setLocalAttachments(task.attachments || []);
                                }
                            }} className="font-medium">
                                {isEditingAttachments ? 'Save' : <><Pencil className="h-3 w-3 mr-1.5" /> Edit</>}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                         {isEditingAttachments ? (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                {localAttachments.map((att, index) => (
                                    <div key={index} className="flex items-start gap-2 group/attachment p-2 -m-2 rounded-md bg-muted/50">
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => handleDeleteAttachment(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                </div>

                                <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground font-normal">
                                    <p>Drop files, or paste an image/link</p>
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <Popover open={isAddLinkPopoverOpen} onOpenChange={setIsAddLinkPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" size="sm" className="font-medium"><Link2 className="h-4 w-4 mr-2" /> Add Link</Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-semibold leading-none">Add Link</h4>
                                                        <p className="text-sm text-muted-foreground font-normal">Enter a name and a valid URL.</p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Input placeholder="Link Name" value={newLink.name} onChange={(e) => setNewLink(p => ({...p, name: e.target.value}))} className="font-normal"/>
                                                        <Input placeholder="https://..." value={newLink.url} onChange={(e) => setNewLink(p => ({...p, url: e.target.value}))} className="font-normal" />
                                                    </div>
                                                    <Button onClick={handleAddLink} className="font-semibold">Add</Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} className="font-medium"><Image className="h-4 w-4 mr-2" /> Add Image</Button>
                                    </div>
                                    <input type="file" id="task-attachment-upload" ref={imageInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
                                </div>
                            </div>
                         ) : (!task.attachments || task.attachments.length === 0) ? (
                            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                                <p className="text-sm font-medium">No attachments yet.</p>
                            </div>
                         ) : (
                             <div className="space-y-3">
                                {task.attachments.map((att, index) => {
                                    const isImage = att.type === 'image' || isImageUrl(att.url);
                                    return (
                                        <div key={index} className="flex items-center justify-between group/attachment p-3 border rounded-xl hover:bg-muted/30 transition-all">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                                                    {isImage ? (
                                                        <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Link2 className="h-5 w-5 text-muted-foreground" />
                                                    )}
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
                                                        className="text-sm font-bold text-foreground truncate hover:text-primary hover:underline transition-colors block text-left w-full"
                                                    >
                                                        {att.name}
                                                    </button>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {att.size && <span className="text-[10px] text-muted-foreground font-medium uppercase">{formatBytes(att.size)}</span>}
                                                        {att.uploadedAt && (
                                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                                                • {format(new Date(att.uploadedAt), 'MMM d')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover/attachment:opacity-100 transition-opacity">
                                                <ShareMenu 
                                                    task={task} 
                                                    uiConfig={uiConfig} 
                                                    developers={developers} 
                                                    testers={testers}
                                                    attachment={att}
                                                >
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                        <Share className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </ShareMenu>
                                                {!isImage && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-full"
                                                        onClick={() => window.open(att.url, '_blank')}
                                                    >
                                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                         )}
                    </CardContent>
                </Card>
            )}
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
    </>
  );
}


function TaskDetailSection({ title, people, setPersonInView, isDeveloper }: {
  title: string;
  people: Person[];
  setPersonInView: (person: { person: Person, isDeveloper: boolean }) => void;
  isDeveloper: boolean;
}) {
  const canOpenPopup = (person: Person): boolean => {
    return !!(person.email || person.phone || (person.additionalFields && person.additionalFields.length > 0));
  };
  
  return (
    <div>
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h4>
        <div className="flex wrap gap-4">
            {people.length > 0 ? (
                people.map((person, index) => (
                  <TooltipProvider key={`${isDeveloper ? 'dev' : 'test'}-${person.id}-${index}`}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <button 
                            className="flex items-center gap-2 p-1 -m-1 rounded-md hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                            onClick={() => setPersonInView({ person, isDeveloper })}
                            disabled={!canOpenPopup(person)}
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
                        </TooltipTrigger>
                        {!canOpenPopup(person) && (
                            <TooltipContent>
                                <p className="font-normal">No contact details available.</p>
                            </TooltipContent>
                        )}
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
      <div className="flex justify-between items-center group">
        <span className="text-muted-foreground font-normal">{label}</span>
        <Popover open={isOpen} onOpenChange={isBinned ? undefined : setIsOpen}>
          <PopoverTrigger asChild disabled={isBinned}>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 font-normal", !dateValue && "text-muted-foreground hover:text-foreground")}
            >
              {dateValue ? format(dateValue, 'PPP') : 'Set Date'}
              <Pencil className="ml-2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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
            <div className="p-2 border-t text-center">
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
        <div className="flex justify-between items-center group">
            <span className="text-muted-foreground capitalize font-normal">{env} Deployed</span>
            <Popover open={isOpen} onOpenChange={isBinned ? undefined : setIsOpen}>
                <PopoverTrigger asChild disabled={isBinned}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 px-2 font-normal", !dateValue && "text-muted-foreground hover:text-foreground")}
                    >
                        {dateValue ? format(dateValue, 'PPP') : 'Set Date'}
                        <Pencil className="ml-2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
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
                     <div className="p-2 border-t text-center">
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
    <div className="space-y-2 text-sm">
      {devStartConfig && <DateField fieldKey="devStartDate" label={devStartConfig.label} />}
      {devEndConfig && <DateField fieldKey="devEndDate" label={devEndConfig.label} />}
      {(devStartConfig || devEndConfig) && (qaStartConfig || qaEndConfig) && <Separator className="my-2" />}
      {qaStartConfig && <DateField fieldKey="qaStartDate" label={qaStartConfig.label} />}
      {qaEndConfig && <DateField fieldKey="qaEndDate" label={qaEndConfig.label} />}

      {(devStartConfig || devEndConfig || qaStartConfig || qaEndConfig) && hasAnyDeploymentDate && <Separator className="my-2"/>}

      {task.deploymentDates && relevantEnvs.map((env: Environment) => (
          <DeploymentDateField key={env.id} env={env.name} date={task.deploymentDates?.[env.name]} />
      ))}
    </div>
  );
}
