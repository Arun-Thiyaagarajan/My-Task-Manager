'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { createTaskSchema } from '@/lib/validators';
import type { Task, FieldConfig, FieldType, UiConfig, Attachment, Person, Environment, TaskTemplate } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
    Loader2, 
    CalendarIcon, 
    Trash2, 
    PlusCircle, 
    Image, 
    Link2, 
    HelpCircle, 
    Layout, 
    Users, 
    Calendar as CalendarIconLucide, 
    Paperclip, 
    Rocket, 
    GitMerge, 
    ChevronRight, 
    PanelLeft, 
    PanelRight, 
    CircleDot, 
    Save, 
    ArrowLeft, 
    AlertTriangle,
    History,
    RotateCcw,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, compressImage } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { MultiSelect } from '@/components/ui/multi-select';
import { Checkbox } from '@/components/ui/checkbox';
import { addDeveloper, getUiConfig, addTester, updateTask, checkUniqueness } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { TextareaToolbar, applyFormat, type FormatType } from '@/components/ui/textarea-toolbar';
import { getLinkAlias } from '@/ai/flows/alias-flow';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { getSortedStatusOptions, getStatusDisplayName } from '@/lib/status-config';
import { isRepositoryFieldActive, shouldShowPrLinks } from '@/lib/repository-config';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';


type TaskFormData = z.infer<ReturnType<typeof createTaskSchema>>;

interface TaskFormProps {
  task?: Partial<Task>;
  allTasks?: Task[];
  onSubmit: (data: TaskFormData) => void;
  submitButtonText: string;
  formTitle: string;
  developersList: Person[];
  testersList: Person[];
  taskTemplates?: TaskTemplate[];
  onSaveTaskTemplate?: (template: { name: string; description?: string; taskData: Partial<Task> }) => TaskTemplate;
  onDeleteTaskTemplate?: (id: string) => boolean;
  showTemplateTools?: boolean;
  topContent?: React.ReactNode;
  validationMode?: 'task' | 'template';
  draftStorageKey?: string;
  initialSelectedTemplateId?: string;
  editorToolbarStorageKey?: string;
}

const safeParseDate = (d: any): Date | undefined => {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
};

const normalizePrLinks = (prLinks?: TaskFormData['prLinks']): Task['prLinks'] | undefined => {
    if (!prLinks) return undefined;

    const normalized: NonNullable<Task['prLinks']> = {};
    Object.entries(prLinks).forEach(([environment, repositories]) => {
        if (!repositories) return;

        const cleanRepositories = Object.fromEntries(
            Object.entries(repositories).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
        );

        if (Object.keys(cleanRepositories).length > 0) {
            normalized[environment] = cleanRepositories;
        }
    });

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const getInitialTaskData = (task?: Partial<Task>, uiConfig?: UiConfig | null) => {
    const defaults: any = {
        title: '',
        description: '',
        status: uiConfig?.taskStatuses?.[0] || 'To Do',
        repositories: [],
        developers: [],
        testers: [],
        tags: [],
        prLinks: {},
        deploymentStatus: {},
        relevantEnvironments: ['dev', 'stage', 'production'],
        attachments: [],
        deploymentDates: {},
        customFields: {},
        azureWorkItemId: '',
        summary: null,
    };

    if (uiConfig) {
        uiConfig.fields.forEach(f => {
            if (f.defaultValue !== undefined && f.defaultValue !== null && f.defaultValue !== '') {
                let val = f.defaultValue;
                if (f.type === 'date') val = safeParseDate(val);

                if (f.isCustom) {
                    const finalVal = (f.type === 'tags' || f.type === 'multiselect')
                        ? (Array.isArray(val) ? val : (val ? [val] : []))
                        : val;
                    defaults.customFields = { ...defaults.customFields, [f.key]: finalVal };
                } else if (f.key === 'developers' || f.key === 'testers' || f.key === 'tags' || f.type === 'multiselect') {
                    defaults[f.key] = Array.isArray(val) ? val : (val ? [val] : []);
                } else {
                    defaults[f.key] = val;
                }
            }
        });
    }

    if (!task) {
        return defaults;
    }
    
    const deploymentDatesAsDates: { [key: string]: Date | undefined } = {};
    if (task.deploymentDates) {
        for (const key in task.deploymentDates) {
            deploymentDatesAsDates[key] = safeParseDate(task.deploymentDates[key]);
        }
    }
    
    return {
        ...defaults,
        ...task,
        title: task.title ?? defaults.title,
        description: task.description ?? defaults.description,
        status: getStatusDisplayName(task.status || defaults.status, uiConfig),
        devStartDate: safeParseDate(task.devStartDate),
        devEndDate: safeParseDate(task.devEndDate),
        qaStartDate: safeParseDate(task.qaStartDate),
        qaEndDate: safeParseDate(task.qaEndDate),
        deploymentDates: deploymentDatesAsDates,
        attachments: task.attachments || [],
        customFields: { ...defaults.customFields, ...(task.customFields || {}) },
        prLinks: task.prLinks || {},
        deploymentStatus: task.deploymentStatus || {},
        relevantEnvironments: task.relevantEnvironments && task.relevantEnvironments.length > 0 ? task.relevantEnvironments : defaults.relevantEnvironments,
        developers: task.developers || defaults.developers,
        testers: task.testers || defaults.testers,
        tags: task.tags || defaults.tags,
        azureWorkItemId: task.azureWorkItemId || defaults.azureWorkItemId,
        summary: task.summary ?? defaults.summary,
    }
}

export function TaskForm({ task, allTasks, onSubmit, submitButtonText, formTitle, developersList: propDevelopersList, testersList: propTestersList, taskTemplates = [], onSaveTaskTemplate, onDeleteTaskTemplate, showTemplateTools = true, topContent, validationMode = 'task', draftStorageKey, initialSelectedTemplateId, editorToolbarStorageKey }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [developersList, setDevelopersList] = useState<Person[]>(propDevelopersList);
  const [testersList, setTestersList] = useState<Person[]>(propTestersList);
  const { toast } = useToast();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jumpNavViewportRef = useRef<HTMLDivElement>(null);
  const jumpNavItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [commandKey, setCommandKey] = useState('Ctrl');
  const [activeId, setActiveId] = useState<string>('');
  
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [uniquenessViolation, setUniquenessViolation] = useState<{ fieldLabel: string; value: string; fieldKey: string } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateNameError, setTemplateNameError] = useState<string | null>(null);
  
  // Draft State
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftData, setDraftData] = useState<{ data: any; updatedAt: string } | null>(null);
  const DRAFT_PREFIX = 'taskflow_draft_';
  const draftKey = draftStorageKey || (task?.id ? `${DRAFT_PREFIX}${task.id}` : `${DRAFT_PREFIX}new`);
  const skipDraftAutosaveRef = useRef(false);

  const isJumpingRef = useRef(false);
  const jumpTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const SCROLL_THRESHOLD = 140; 
  const premiumFieldClassName = "border-border/65 bg-background/95 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/35 focus-visible:ring-offset-0";
  const premiumFieldErrorClassName = "border-destructive/55 focus-visible:border-destructive/45 focus-visible:ring-1 focus-visible:ring-destructive/30";
  const premiumSurfaceFocusClassName = "border-border/65 bg-background/95 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-border/90 focus-within:border-primary/40 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/35 focus-within:ring-offset-0";
  const premiumOutlineButtonClassName = "border-border/65 bg-background/95 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-border/90 focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/35 focus-visible:ring-offset-0";
  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
  };
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        setCommandKey(isMac ? '⌘' : 'Ctrl');
        
        const savedPos = localStorage.getItem('taskflow_form_sidebar_pos');
        if (savedPos === 'left' || savedPos === 'right') {
            setSidebarPosition(savedPos);
        }
    }
  }, []);

  const toggleSidebarPosition = () => {
      const newPos = sidebarPosition === 'left' ? 'right' : 'left';
      setSidebarPosition(newPos);
      localStorage.setItem('taskflow_form_sidebar_pos', newPos);
  };

  const { setIsDirty, prompt } = useUnsavedChanges();

  useEffect(() => {
    setUiConfig(getUiConfig());
  }, []);

  const dynamicTaskSchema = useMemo(() => {
    const schemaOptions = { enforceRequiredFields: validationMode === 'task' };
    return uiConfig ? createTaskSchema(uiConfig, schemaOptions) : createTaskSchema(getUiConfig(), schemaOptions);
  }, [uiConfig, validationMode]);

  useEffect(() => {
    setDevelopersList(propDevelopersList);
  }, [propDevelopersList]);

  useEffect(() => {
    setTestersList(propTestersList);
  }, [propTestersList]);

  useEffect(() => {
    if (selectedTemplateId === 'blank') return;
    if (taskTemplates.some(templateItem => templateItem.id === selectedTemplateId)) return;
    setSelectedTemplateId('blank');
  }, [selectedTemplateId, taskTemplates]);

  useEffect(() => {
    if (!initialSelectedTemplateId) {
      setSelectedTemplateId('blank');
      return;
    }

    if (taskTemplates.some(templateItem => templateItem.id === initialSelectedTemplateId)) {
      setSelectedTemplateId(initialSelectedTemplateId);
    }
  }, [initialSelectedTemplateId, taskTemplates]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(dynamicTaskSchema),
    defaultValues: getInitialTaskData(task, getUiConfig()),
  });

  const { formState: { isDirty, errors } } = form;
  
  useEffect(() => {
    setIsDirty(isDirty);
    return () => {
      setIsDirty(false);
    };
  }, [isDirty, setIsDirty]);
  
  useEffect(() => {
    const currentUiConfig = getUiConfig();
    const initialData = getInitialTaskData(task, currentUiConfig);
    initialData.status = getStatusDisplayName(initialData.status || currentUiConfig?.taskStatuses?.[0] || 'To Do', currentUiConfig);
    form.reset(initialData);
    form.clearErrors();

    // Check for existing draft on mount
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
        try {
            const parsed = JSON.parse(savedDraft);
            const actualData = parsed.data || parsed;
            // Only show prompt if the draft actually contains data different from current
            if (JSON.stringify(actualData) !== JSON.stringify(initialData)) {
                setDraftData(parsed);
                setShowDraftPrompt(true);
            }
        } catch (e) {
            console.error("Failed to load draft:", e);
        }
    }
  }, [task, form.reset, uiConfig, draftKey]);

  // Auto-save draft logic
  const watchedValues = form.watch();
  useEffect(() => {
    if (skipDraftAutosaveRef.current) return;
    if (!isDirty) return;
    
    const timer = setTimeout(() => {
        if (skipDraftAutosaveRef.current) return;
        localStorage.setItem(draftKey, JSON.stringify({
            data: watchedValues,
            updatedAt: new Date().toISOString()
        }));
    }, 1500);

    return () => clearTimeout(timer);
  }, [watchedValues, isDirty, draftKey]);

  const restoreDraft = () => {
    if (!draftData) return;
    
    skipDraftAutosaveRef.current = true;
    const restored = { ...(draftData.data || draftData) };
    restored.devStartDate = safeParseDate(restored.devStartDate);
    restored.devEndDate = safeParseDate(restored.devEndDate);
    restored.qaStartDate = safeParseDate(restored.qaStartDate);
    restored.qaEndDate = safeParseDate(restored.qaEndDate);
    
    if (restored.deploymentDates) {
        const dates: any = {};
        for (const k in restored.deploymentDates) {
            dates[k] = safeParseDate(restored.deploymentDates[k]);
        }
        restored.deploymentDates = dates;
    }
    
    form.reset(restored);
    setShowDraftPrompt(false);
    setDraftData(null);
    window.setTimeout(() => {
      skipDraftAutosaveRef.current = false;
    }, 0);
    toast({ 
        variant: 'default', 
        title: 'Draft Restored', 
        description: 'Your previous unsaved changes have been loaded.' 
    });
  };

  const discardDraft = () => {
    skipDraftAutosaveRef.current = true;
    localStorage.removeItem(draftKey);
    setShowDraftPrompt(false);
    setDraftData(null);
    window.setTimeout(() => {
      skipDraftAutosaveRef.current = false;
    }, 0);
    toast({ title: 'Draft discarded' });
  };
  
  const devStartDate = form.watch('devStartDate');
  const qaStartDate = form.watch('qaStartDate');
  const canClearForm = !task?.id;
  
  const { fields: attachments, append: appendAttachment, remove: removeAttachment, update: updateAttachment } = useFieldArray({
    control: form.control,
    name: 'attachments',
  });

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const rawDataUri = e.target?.result as string;
        const optimizedUri = await compressImage(rawDataUri);
        appendAttachment({
            name: file.name,
            url: optimizedUri,
            type: 'image',
        });
        toast({ variant: 'success', title: 'Image optimized and added.' });
    };
    reader.readAsDataURL(file);
  };
  
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
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
                };
                const newAttachmentIndex = attachments.length;
                appendAttachment(newAttachment);
                toast({ variant: 'success', title: 'Link added. Generating title...' });

                try {
                  const alias = await getLinkAlias({ url: pastedText });
                  updateAttachment(newAttachmentIndex, {
                    ...newAttachment,
                    name: alias.name || pastedText,
                  });
                   toast({ variant: 'success', title: 'Smart title generated!' });
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
  }, [appendAttachment, toast, updateAttachment, attachments.length]);

  const watchedRepositories = form.watch('repositories', []);
  const watchedRelevantEnvs = form.watch('relevantEnvironments', []);
  const allConfiguredEnvs = uiConfig?.environments || [];
  const activeEnvs = allConfiguredEnvs.filter(env => env && env.name && watchedRelevantEnvs?.includes(env.name));
  const isRepositoryFieldVisible = isRepositoryFieldActive(uiConfig);
  const showPrLinksSection = shouldShowPrLinks(uiConfig);

  const handleCreateDeveloper = (name: string): string | undefined => {
    try {
        const newDev = addDeveloper({ name });
        setDevelopersList(prev => {
            if (prev.some(d => d.id === newDev.id)) return prev;
            return [...prev, newDev];
        });
        return newDev.id;
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Could not add developer',
            description: error.message || 'An unexpected error occurred.'
        });
        return undefined;
    }
  };

  const handleCreateTester = (name: string): string | undefined => {
     try {
        const newTester = addTester({ name });
        setTestersList(prev => {
            if (prev.some(t => t.id === newTester.id)) return prev;
            return [...prev, newTester];
        });
        return newTester.id;
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Could not add tester',
            description: error.message || 'An unexpected error occurred.'
        });
        return undefined;
    }
  };
  
  const onInvalid = (errors: any) => {
      const fieldLabels = new Map((uiConfig?.fields || []).map(f => [f.key, f.label]));
      const errorFields = Object.keys(errors);

      const getLabel = (fieldName: string) => {
          if (fieldName === 'customFields' && errors.customFields) {
              const customErrorKey = Object.keys(errors.customFields)[0];
              const customFieldConfig = (uiConfig?.fields || []).find(f => f.key === customErrorKey);
              return customFieldConfig?.label || customErrorKey;
          }
           if (fieldName === 'deploymentStatus') {
            return fieldLabels.get(fieldName) || 'Deployment Status';
          }
          return fieldLabels.get(fieldName) || fieldName;
      };

      const errorMessages = errorFields.map(getLabel);
      
      if (errorMessages.length > 0) {
        toast({
            variant: 'destructive',
            duration: 5000,
            title: 'Missing Required Fields',
            description: (
                <div className="flex flex-col gap-1 font-normal">
                    <p className="font-medium text-sm">Please fill out the following fields:</p>
                    <ul className="list-disc list-inside mt-1 text-xs">
                        {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                </div>
            )
        });
      }
  };

  const normalizeTaskFormData = (data: TaskFormData): Partial<Task> => ({
    ...data,
    reminderExpiresAt: data.reminderExpiresAt ? data.reminderExpiresAt.toISOString() : null,
    prLinks: normalizePrLinks(data.prLinks),
    devStartDate: data.devStartDate ? data.devStartDate.toISOString() : null,
    devEndDate: data.devEndDate ? data.devEndDate.toISOString() : null,
    qaStartDate: data.qaStartDate ? data.qaStartDate.toISOString() : null,
    qaEndDate: data.qaEndDate ? data.qaEndDate.toISOString() : null,
    deploymentDates: data.deploymentDates
        ? Object.fromEntries(
            Object.entries(data.deploymentDates).map(([key, value]) => [key, value ? value.toISOString() : null])
          )
        : {},
  });

  const handleFormSubmit = (data: TaskFormData) => {
    const normalizedData = normalizeTaskFormData(data);
    const shouldCheckUniqueness = validationMode === 'task';
    const uniqueness = shouldCheckUniqueness ? checkUniqueness(normalizedData, task?.id) : { isUnique: true };
    if (!uniqueness.isUnique) {
        const fieldKey = uiConfig?.fields.find(f => f.label === uniqueness.fieldLabel)?.key || 'title';
        setUniquenessViolation({ 
            fieldLabel: uniqueness.fieldLabel!, 
            value: uniqueness.value!, 
            fieldKey 
        });
        toast({
            variant: 'destructive',
            title: 'Duplicate Detected',
            description: `The field "${uniqueness.fieldLabel}" must be unique. A task with this value already exists.`
        });
        scrollToId(`field-container-${fieldKey}`);
        return;
    }

    startTransition(() => {
        skipDraftAutosaveRef.current = true;
        setIsDirty(false);
        localStorage.removeItem(draftKey);
        setDraftData(null);
        setShowDraftPrompt(false);
        onSubmit(normalizedData as TaskFormData);
    });
  };
  
   const handleCancel = useCallback(() => {
    prompt(() => router.back());
  }, [prompt, router]);

  const handleClearForm = useCallback(() => {
    if (!uiConfig) return;

    form.reset(getInitialTaskData(undefined, uiConfig));
    form.clearErrors();
    skipDraftAutosaveRef.current = true;
    localStorage.removeItem(draftKey);
    setShowDraftPrompt(false);
    setDraftData(null);
    setUniquenessViolation(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toast({
      title: 'Form cleared',
      description: 'All fields have been reset to their default values.',
    });
    setSelectedTemplateId('blank');
    window.setTimeout(() => {
      skipDraftAutosaveRef.current = false;
    }, 0);
  }, [uiConfig, form, draftKey, toast]);

  const canUseTemplates = showTemplateTools && !task?.id;
  const canManageTemplates = canUseTemplates && !!onSaveTaskTemplate && !isMobile;
  const selectedTemplate = useMemo(
    () => taskTemplates.find(templateItem => templateItem.id === selectedTemplateId) || null,
    [taskTemplates, selectedTemplateId]
  );

  const resetDraftForTemplateAction = useCallback(() => {
    skipDraftAutosaveRef.current = true;
    localStorage.removeItem(draftKey);
    setShowDraftPrompt(false);
    setDraftData(null);
    setUniquenessViolation(null);
    window.setTimeout(() => {
      skipDraftAutosaveRef.current = false;
    }, 0);
  }, [draftKey]);

  const applyTemplate = useCallback((templateId: string) => {
    if (!uiConfig) return;

    if (templateId === 'blank') {
      handleClearForm();
      return;
    }

    const templateToApply = taskTemplates.find(item => item.id === templateId);
    if (!templateToApply) return;

    resetDraftForTemplateAction();
    form.reset(getInitialTaskData(templateToApply.taskData, uiConfig));
    form.clearErrors();
    setSelectedTemplateId(templateId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
      title: 'Template applied',
      description: `"${templateToApply.name}" filled the form.`,
    });
  }, [form, handleClearForm, resetDraftForTemplateAction, taskTemplates, toast, uiConfig]);

  const handleOpenTemplateDialog = useCallback(() => {
    if (isMobile) return;
    const currentTitle = form.getValues('title')?.trim();
    setTemplateName(currentTitle ? `${currentTitle} Template` : '');
    setTemplateDescription('');
    setTemplateNameError(null);
    setIsTemplateDialogOpen(true);
  }, [form, isMobile]);

  const handleSaveCurrentAsTemplate = useCallback(() => {
    if (!onSaveTaskTemplate || isMobile) return;

    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setTemplateNameError('Template name is required.');
      toast({
        variant: 'destructive',
        title: 'Template name required',
        description: 'Give this template a name before saving it.',
      });
      return;
    }

    const normalizedTemplateName = trimmedName.replace(/\s+/g, ' ').toLowerCase();
    const hasDuplicateName = taskTemplates.some(
      (templateItem) => templateItem.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedTemplateName
    );
    if (hasDuplicateName) {
      setTemplateNameError('A template with this name already exists.');
      toast({
        variant: 'destructive',
        title: 'Duplicate template name',
        description: 'Choose a unique template name before saving.',
      });
      return;
    }

    try {
      const createdTemplate = onSaveTaskTemplate({
        name: trimmedName,
        description: templateDescription.trim(),
        taskData: normalizeTaskFormData(form.getValues()),
      });

      setSelectedTemplateId(createdTemplate.id);
      setIsTemplateDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateNameError(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save template',
        description: error instanceof Error ? error.message : 'Something went wrong while saving the template.',
      });
    }
  }, [form, isMobile, onSaveTaskTemplate, templateDescription, templateName, toast]);

  const handleDeleteSelectedTemplate = useCallback(() => {
    if (!selectedTemplate || !onDeleteTaskTemplate) return;

    const deleted = onDeleteTaskTemplate(selectedTemplate.id);
    if (!deleted) return;
    setSelectedTemplateId('blank');
  }, [onDeleteTaskTemplate, selectedTemplate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            form.handleSubmit(handleFormSubmit, onInvalid)();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
        }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [form, handleFormSubmit, onInvalid, handleCancel]);

  const getFieldOptions = (field: FieldConfig): {value: string, label: string}[] => {
    let options: {value: string, label: string}[] = [];
    
    if (field.key === 'repositories') {
        if (!isRepositoryFieldVisible) return [];
        options = (uiConfig?.repositoryConfigs || []).map(rc => ({ value: rc.name, label: rc.name }));
    } else if (field.key === 'status') {
      options = getSortedStatusOptions(uiConfig).map(option => ({ value: option.value, label: option.label }));
      return options;
    } else if (field.key === 'relevantEnvironments') {
        options = (uiConfig?.environments || []).map(e => ({ value: e.name, label: e.name }));
    } else if(field.key === 'developers') {
        options = (developersList || []).map(d => ({ value: d.id, label: d.name }));
    } else if(field.key === 'testers') {
        options = (testersList || []).map(t => ({ value: t.id, label: t.name }));
    } else if (field.type === 'tags') {
        const predefined = field.options?.map(opt => ({ value: opt.value, label: opt.label })) || [];
        const dynamic = [...new Set((allTasks || []).flatMap(t => t.tags || []))].map(t => ({value: t, label: t}));
        const combined = [...predefined];
        dynamic.forEach(d => {
            if (!combined.some(p => p.value === d.value)) {
                combined.push(d);
            }
        });
        options = combined;
    } else {
        options = field.options?.map(opt => ({ value: opt.value, label: opt.label })) || [];
    }

    if (field.sortDirection === 'asc') {
        options.sort((a, b) => a.label.localeCompare(b.label));
    } else if (field.sortDirection === 'desc') {
        options.sort((a, b) => b.label.localeCompare(a.label));
    }

    return options;
  }
  
  const handleFormat = (ref: React.RefObject<HTMLTextAreaElement>, type: FormatType) => {
      if (ref.current) {
          applyFormat(type, ref.current);
      }
  };
  
  const renderField = (fieldConfig: FieldConfig) => {
    const { key, type, label, isCustom, isRequired, baseUrl } = fieldConfig;
    if (key === 'repositories' && !isRepositoryFieldVisible) {
        return null;
    }
    const fieldName = isCustom ? `customFields.${key}` : key;
    
    const hasError = !!(isCustom ? errors.customFields?.[key] : errors[key as keyof typeof errors]);
    const hasUniquenessViolation = uniquenessViolation?.fieldKey === key;

    const renderInput = (fieldType: FieldType, field: any) => {
        switch (fieldType) {
            case 'text':
                return (
                    <div className="w-full">
                        <Input 
                            type="text" 
                            placeholder={label} 
                            {...field} 
                            value={field.value ?? ''} 
                            className={cn(
                                "font-normal",
                                premiumFieldClassName,
                                hasUniquenessViolation && premiumFieldErrorClassName
                            )}
                            onChange={(e) => {
                                field.onChange(e);
                                if (hasUniquenessViolation) setUniquenessViolation(null);
                            }}
                        />
                        {baseUrl && <p className="text-[0.7rem] text-muted-foreground mt-1 break-all leading-tight font-medium">The value will be appended to: {baseUrl}</p>}
                    </div>
                );
            case 'number':
            case 'url':
                return <Input type={fieldType} placeholder={label} {...field} value={field.value ?? ''} className={cn("font-normal", premiumFieldClassName)} />;
            case 'textarea': {
                 const ref = key === 'description' ? descriptionRef : null;
                 return (
                    <div className="relative w-full">
                        <Textarea {...field} value={field.value ?? ''} ref={ref ?? undefined} className={cn("pb-12 font-normal", premiumFieldClassName)} enableHotkeys/>
                        {ref ? <TextareaToolbar onFormatClick={(type) => handleFormat(ref, type)} storageKey={editorToolbarStorageKey} /> : null}
                    </div>
                 )
            }
            case 'date':
                const getDisabledDates = () => {
                    if (fieldName === 'devEndDate' && devStartDate) {
                        return { before: devStartDate };
                    }
                    if (fieldName === 'qaStartDate' && qaStartDate) {
                        return { before: qaStartDate };
                    }
                    return undefined;
                };

                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal shadow-sm", premiumOutlineButtonClassName, !field.value && "text-muted-foreground")}>
                                    {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined}
                                onSelect={(date) => {
                                    field.onChange(date);
                                    if (fieldName === 'devStartDate') {
                                        const devEndDate = form.getValues('devEndDate');
                                        if (devEndDate && date && devEndDate < date) {
                                            form.setValue('devEndDate', undefined);
                                        }
                                    }
                                    if (fieldName === 'qaStartDate') {
                                        const qaEndDate = form.getValues('qaEndDate');
                                        if (qaEndDate && date && qaEndDate < date) {
                                            form.setValue('qaEndDate', undefined);
                                        }
                                    }
                                }}
                                defaultMonth={field.value ?? new Date()}
                                initialFocus
                                disabled={getDisabledDates()}
                            />
                        </PopoverContent>
                    </Popover>
                );
            case 'select':
                return (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                            <SelectTrigger className={cn("font-normal shadow-sm", premiumOutlineButtonClassName)}>
                                <SelectValue placeholder={`Select ${label}`} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {getFieldOptions(fieldConfig).map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="font-normal">{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'multiselect':
                 return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Select ${label}...`}
                        className={cn("font-normal", premiumSurfaceFocusClassName)}
                    />
                );
            case 'tags':
                const isDeveloperField = key === 'developers';
                const isTesterField = key === 'testers';
                const isGeneralTagField = key === 'tags';
                return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Add ${label}...`}
                        creatable
                        className={cn("font-normal", premiumSurfaceFocusClassName)}
                        {...(isDeveloperField && { onCreate: handleCreateDeveloper })}
                        {...(isTesterField && { onCreate: handleCreateTester })}
                        {...(isGeneralTagField && { onCreate: (value) => value })}
                    />
                );
            case 'checkbox':
                return (
                    <div className="flex items-center space-x-2 h-10">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} id={fieldName} />
                        <label htmlFor={fieldName} className="text-sm font-normal text-muted-foreground cursor-pointer">
                            Enable {label}
                        </label>
                    </div>
                );
            default:
                return <Input placeholder={label} {...field} value={field.value ?? ''} className={cn("font-normal", premiumFieldClassName)} />;
        }
    }

    return (
        <FormField
            key={key}
            control={form.control}
            name={fieldName as any}
            render={({ field }) => (
                <FormItem id={`field-container-${key}`} className="scroll-mt-32 max-w-full">
                    <FormLabel error={hasError || hasUniquenessViolation} className="font-medium">{label} {validationMode === 'task' && isRequired && <span className="text-destructive font-semibold">*</span>}</FormLabel>
                    <FormControl className="w-full">
                        {renderInput(type, field)}
                    </FormControl>
                    {hasUniquenessViolation && (
                        <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Value must be unique
                        </p>
                    )}
                </FormItem>
            )}
        />
    )
  }

  const fieldLabels = useMemo(() => new Map((uiConfig?.fields || []).map(f => [f.key, f.label])), [uiConfig]);
  const deploymentFieldConfig = (uiConfig?.fields || []).find(f => f.key === 'deploymentStatus');
  const relevantEnvsFieldConfig = (uiConfig?.fields || []).find(f => f.key === 'relevantEnvironments');

  const groupedFields = useMemo(() => {
    return (uiConfig?.fields || [])
      .filter(f => f.isActive && f.key !== 'comments' && (f.key !== 'repositories' || isRepositoryFieldVisible))
      .sort((a,b) => a.order - b.order)
      .reduce((acc, field) => {
          const group = field.group || 'Other';
          if (!acc[group]) acc[group] = [];
          acc[group].push(field);
          return acc;
      }, {} as Record<string, FieldConfig[]>);
  }, [uiConfig]);
    
  const groupOrder = useMemo(() => {
    return Object.keys(groupedFields).sort((a, b) => {
        const aFields = groupedFields[a];
        const bFields = groupedFields[b];
        const aMinOrder = Math.min(...aFields.map(f => f.order));
        const bMinOrder = Math.min(...bFields.map(f => f.order));
        return aMinOrder - bMinOrder;
    });
  }, [groupedFields]);

  const navigableSections = useMemo(() => {
    if (!uiConfig) return [];
    const sections: { id: string; label: string; icon: any; fields: { id: string; label: string }[] }[] = [];
    
    groupOrder.forEach(groupName => {
        if (!['Attachments', 'Deployment', 'Pull Requests'].includes(groupName)) {
            let icon = Layout;
            if (groupName === 'Core Details') icon = Layout;
            else if (groupName === 'Assignment & Tracking') icon = Users;
            else if (groupName === 'Dates') icon = CalendarIconLucide;
            
            sections.push({ 
                id: groupName.toLowerCase().replace(/\s+/g, '-'), 
                label: groupName,
                icon,
                fields: (groupedFields[groupName] || []).map(f => ({ id: `field-container-${f.key}`, label: f.label }))
            });
        }
    });

    if ((uiConfig?.fields || []).find(f => f.key === 'attachments' && f.isActive)) {
        sections.push({ 
            id: 'attachments', 
            label: fieldLabels.get('attachments') || 'Attachments', 
            icon: Paperclip,
            fields: []
        });
    }
    if (deploymentFieldConfig && deploymentFieldConfig.isActive) {
        sections.push({ 
            id: 'deployment', 
            label: fieldLabels.get('deploymentStatus') || 'Deployment', 
            icon: Rocket,
            fields: []
        });
    }
    if (showPrLinksSection) {
        sections.push({ 
            id: 'pull-requests', 
            label: fieldLabels.get('prLinks') || 'Pull Requests', 
            icon: GitMerge, 
            fields: []
        });
    }

    return sections;
  }, [groupOrder, uiConfig, fieldLabels, deploymentFieldConfig, groupedFields, showPrLinksSection]);

  useEffect(() => {
    if (!uiConfig || navigableSections.length === 0) return;

    const handleScroll = () => {
        if (isJumpingRef.current) return;

        const scrollPosition = window.scrollY + SCROLL_THRESHOLD + 20; 
        const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
        
        if (isAtBottom && navigableSections.length > 0) {
            const lastSection = navigableSections[navigableSections.length - 1];
            const lastField = lastSection.fields.length > 0 ? lastSection.fields[lastSection.fields.length - 1] : null;
            setActiveId(lastField ? lastField.id : lastSection.id);
            return;
        }

        let foundActiveId = '';
        const allTargets: { id: string, top: number }[] = [];

        navigableSections.forEach(section => {
            const sectionEl = document.getElementById(section.id);
            if (sectionEl) {
                const rect = sectionEl.getBoundingClientRect();
                allTargets.push({ id: section.id, top: rect.top + window.scrollY });
            }
            section.fields.forEach(field => {
                const fieldEl = document.getElementById(field.id);
                if (fieldEl) {
                    const rect = fieldEl.getBoundingClientRect();
                    allTargets.push({ id: field.id, top: rect.top + window.scrollY });
                }
            });
        });

        allTargets.sort((a, b) => a.top - b.top);

        for (let i = 0; i < allTargets.length; i++) {
            if (scrollPosition >= allTargets[i].top) {
                foundActiveId = allTargets[i].id;
            } else {
                break;
            }
        }

        if (foundActiveId && foundActiveId !== activeId) {
            setActiveId(foundActiveId);
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigableSections, uiConfig, activeId]);

  useEffect(() => {
    if (!activeId || isMobile) return;

    const activeNavItem = jumpNavItemRefs.current[activeId];
    const viewport = jumpNavViewportRef.current;
    if (!activeNavItem || !viewport) return;

    requestAnimationFrame(() => {
      activeNavItem.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: isJumpingRef.current ? 'smooth' : 'auto',
      });
    });
  }, [activeId, isMobile]);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        isJumpingRef.current = true;
        if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
        
        setActiveId(id);

        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - SCROLL_THRESHOLD;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        jumpTimeoutRef.current = setTimeout(() => {
            isJumpingRef.current = false;
        }, 800);
    }
  };

  if (!uiConfig) {
      return <LoadingSpinner text="Loading form configuration..." />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit, onInvalid)}>
        {/* MOBILE HEADER */}
        <div className="lg:hidden -mx-4 px-4 bg-background border-b h-14 flex items-center justify-between mb-2 animate-in fade-in duration-300">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-9 px-3 font-medium hover:bg-primary/10 hover:text-primary transition-all rounded-full flex items-center gap-1.5 active:scale-95"
            >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
            </Button>
            <div className="flex items-center gap-2 pl-3 min-w-0">
                {canClearForm && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearForm}
                        disabled={isPending}
                        className="h-8 rounded-full px-3 text-xs font-medium shadow-sm"
                    >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Clear
                    </Button>
                )}
                <h2 className="text-lg font-semibold tracking-tight truncate">{formTitle}</h2>
            </div>
        </div>

        {/* MOBILE DRAFT RESTORE DRAWER */}
        {isMobile && showDraftPrompt && (
            <div className="lg:hidden fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl border-none bg-background overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    <CardHeader className="pt-8 pb-4 text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <History className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight">Unsaved Draft Found</CardTitle>
                        <CardDescription className="text-sm font-medium">You have unsaved changes from last time.</CardDescription>
                        {draftData?.updatedAt && (
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-2">
                                Last edited {formatDistanceToNow(new Date(draftData.updatedAt), { addSuffix: true })}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="px-6 pb-8 flex flex-col gap-3">
                        <Button type="button" onClick={restoreDraft} size="lg" className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20">
                            Restore Draft
                        </Button>
                        <Button type="button" onClick={discardDraft} variant="secondary" className="w-full h-12 rounded-2xl font-bold text-base bg-muted text-foreground hover:bg-muted/80">
                            Discard Changes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )}

        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Save task template</DialogTitle>
                    <DialogDescription>
                        Save the current form values as a reusable starting point for future tasks.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <FormLabel>Template name</FormLabel>
                        <Input
                            value={templateName}
                            onChange={(event) => {
                                setTemplateName(event.target.value);
                                if (templateNameError) {
                                    setTemplateNameError(null);
                                }
                            }}
                            placeholder="Release regression template"
                            className={cn("h-11", templateNameError && "border-destructive/60 focus-visible:ring-destructive/30")}
                        />
                        {templateNameError && (
                            <p className="text-xs font-medium text-destructive">{templateNameError}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <FormLabel>Description</FormLabel>
                        <Textarea
                            value={templateDescription}
                            onChange={(event) => setTemplateDescription(event.target.value)}
                            placeholder="Optional note about when to use this template"
                            className="min-h-[110px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSaveCurrentAsTemplate}>
                        Save template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* DESKTOP ACTION BAR - Fixed at bottom */}
        <div className={cn(
            "hidden lg:block z-[60] bg-background/95 backdrop-blur-md border-t fixed bottom-0 left-0 right-0 transition-all duration-300 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.05)]"
        )}>
            <div className="container mx-auto flex h-20 items-center justify-center px-4 sm:px-6 lg:px-8">
                 <div className="flex items-center justify-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isPending}
                        className="h-10 px-6 font-normal"
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={isPending} 
                        id="task-form-submit"
                        className="h-10 px-8 font-medium shadow-sm"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitButtonText}
                    </Button>
                    
                    <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
                                  <HelpCircle className="h-5 w-5" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-normal">
                              <div className="text-sm p-1">
                                <div className="grid grid-cols-[auto_1fr] items-center gap-x-2">
                                  <div className="text-right">Save:</div>
                                  <div><kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">{commandKey}</kbd> + <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">S</kbd></div>
                                </div>
                                <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 mt-1">
                                  <div className="text-right">Cancel:</div>
                                  <div><kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">Esc</kbd></div>
                                </div>
                              </div>
                          </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>

        {/* MOBILE FLOATING SAVE BUTTON - Fixed above bottom navbar */}
        <div className="lg:hidden fixed bottom-24 right-6 z-[60] animate-in zoom-in-50 duration-500">
            <Button
                type="submit"
                disabled={isPending}
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl transition-all active:scale-90",
                    isDirty ? "shadow-primary/40 bg-primary" : "shadow-black/20"
                )}
            >
                {isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <Save className="h-6 w-6" />
                )}
                <span className="sr-only">Save Task</span>
            </Button>
        </div>

        {/* FORM CONTENT */}
        <div id="task-form-main-card" className={cn(
            "relative flex flex-col gap-8 overflow-visible px-4 pb-32 pt-2 lg:items-start lg:px-0 lg:pb-32 lg:pt-0",
            sidebarPosition === 'left' ? "lg:flex-row" : "lg:flex-row-reverse"
        )}>
            {/* Desktop Navigation Sidebar */}
            <aside className="hidden w-72 shrink-0 self-start lg:block">
                <div
                    className={cn(
                        "fixed top-24 bottom-24 z-40 flex w-72 flex-col space-y-1 rounded-[1.75rem] border border-border/60 bg-background/92 px-3 py-4 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-300",
                        sidebarPosition === 'left'
                            ? "left-[max(1rem,calc((100vw-1280px)/2+2rem))]"
                            : "right-[max(1rem,calc((100vw-1280px)/2+2rem))]"
                    )}
                >
                    <div className="mb-4 flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                            Jump to Section
                        </h3>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        type="button" 
                                        className="h-8 w-8 rounded-md border bg-background text-muted-foreground hover:text-primary transition-all flex items-center justify-center shadow-sm"
                                        onClick={toggleSidebarPosition}
                                    >
                                        {sidebarPosition === 'left' ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="font-normal">
                                    <p>Move to {sidebarPosition === 'left' ? 'right' : 'left'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <ScrollArea className="min-h-0 flex-1 pr-2" viewportRef={jumpNavViewportRef}>
                        <nav className="flex flex-col gap-1 pb-10">
                            {navigableSections.map((section) => {
                                const Icon = section.icon;
                                const isSectionActive = activeId === section.id || section.fields.some(f => f.id === activeId);
                                return (
                                    <div key={section.id} className="space-y-1">
                                        <button
                                            key={section.id}
                                            ref={(node) => {
                                                jumpNavItemRefs.current[section.id] = node;
                                            }}
                                            type="button"
                                            onClick={() => scrollToId(section.id)}
                                            className={cn(
                                                "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-all group",
                                                isSectionActive 
                                                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20" 
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <Icon className={cn("h-4 w-4 shrink-0", isSectionActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground")} />
                                            <span className="truncate">{section.label}</span>
                                            {isSectionActive && <ChevronRight className="h-3 w-3 ml-auto text-primary" />}
                                        </button>
                                        
                                        {section.fields.length > 0 && (
                                            <div className="ml-7 border-l-2 border-muted pl-2 flex flex-col gap-0.5">
                                                {section.fields.map(field => {
                                                    const isFieldActive = activeId === field.id;
                                                    return (
                                                        <button
                                                            key={field.id}
                                                            ref={(node) => {
                                                                jumpNavItemRefs.current[field.id] = node;
                                                            }}
                                                            type="button"
                                                            onClick={() => scrollToId(field.id)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors text-left",
                                                                isFieldActive 
                                                                    ? "text-primary font-semibold bg-primary/5" 
                                                                    : "text-muted-foreground font-normal hover:text-foreground hover:bg-muted/50"
                                                                )}
                                                            >
                                                                <CircleDot className={cn("h-2.5 w-2.5 shrink-0", isFieldActive ? "text-primary" : "text-transparent")} />
                                                                <span className="truncate">{field.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </nav>
                        </ScrollArea>
                    </div>
                </aside>

            <div className="flex-1 space-y-6 max-w-full">
                {/* Desktop-only Page Title */}
                <div className="hidden lg:flex items-center justify-between gap-4 mb-2 px-6">
                    <h1 className="text-2xl font-semibold tracking-tight">{formTitle}</h1>
                    {canClearForm && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClearForm}
                            disabled={isPending}
                            className="h-10 rounded-full px-5 font-medium shadow-sm bg-background/80"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Clear Form
                        </Button>
                    )}
                </div>

                {canUseTemplates && (
                    <div className="px-4 lg:px-6">
                        <Card className="border-border/60 bg-background/90 shadow-sm">
                            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold tracking-tight">Task templates</h3>
                                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                                                {taskTemplates.length}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Save reusable task setups and apply them without changing normal task behavior.
                                        </p>
                                    </div>
                                    <div className="hidden lg:flex min-w-[20rem] max-w-[24rem] flex-col items-stretch gap-2 rounded-[1.6rem] border border-border/50 bg-muted/[0.18] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleOpenTemplateDialog}
                                            className="h-11 justify-start rounded-[1.15rem] border border-border/60 bg-background/80 px-4 text-[15px] font-semibold text-foreground shadow-sm transition-all hover:bg-background hover:shadow-md"
                                        >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                                                <PlusCircle className="h-4 w-4" />
                                            </span>
                                            <span className="ml-3">Save current as template</span>
                                        </Button>
                                        {selectedTemplate && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteSelectedTemplate}
                                                className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-destructive/90 transition-colors hover:bg-destructive/8 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span>Delete template</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                    <div className="min-w-0 flex-1">
                                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                            <SelectTrigger className={cn("h-11 w-full rounded-2xl", premiumFieldClassName)}>
                                                <SelectValue placeholder="Choose a template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="blank">Blank task</SelectItem>
                                                {taskTemplates.map(templateItem => (
                                                    <SelectItem key={templateItem.id} value={templateItem.id}>
                                                        {templateItem.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => applyTemplate(selectedTemplateId)}
                                        className="h-11 rounded-2xl px-5"
                                    >
                                        Apply template
                                    </Button>
                                </div>

                                {selectedTemplate?.description && (
                                    <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {topContent ? (
                    <div className="px-4 lg:px-6">
                        {topContent}
                    </div>
                ) : null}

                {/* Desktop Draft Prompt */}
                {!isMobile && showDraftPrompt && (
                    <div className="px-6">
                        <Alert className="bg-primary/5 border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-500 shadow-xl shadow-primary/5">
                            <History className="h-5 w-5 text-primary" />
                            <div className="flex-1 flex items-center justify-between ml-2">
                                <div className="space-y-0.5">
                                    <AlertTitle className="font-bold text-primary text-sm">Resume Editing?</AlertTitle>
                                    <AlertDescription className="text-xs font-medium text-muted-foreground">
                                        We found an unsaved draft from your last visit. Would you like to restore it?
                                    </AlertDescription>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button type="button" variant="ghost" size="sm" onClick={discardDraft} className="h-8 text-[10px] font-black uppercase hover:bg-destructive/10 hover:text-destructive transition-all">Discard</Button>
                                    <Button type="button" variant="outline" size="sm" onClick={restoreDraft} className="h-8 text-[10px] font-black uppercase border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 shadow-sm">Restore Draft</Button>
                                </div>
                            </div>
                        </Alert>
                    </div>
                )}

                {uniquenessViolation && (
                    <div className="px-6">
                        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl animate-in slide-in-from-top-2 duration-500">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertTitle className="font-bold">Duplicate Value Conflict</AlertTitle>
                            <AlertDescription className="text-sm font-medium leading-relaxed">
                                The value "<strong>{uniquenessViolation.value}</strong>" for field "<strong>{uniquenessViolation.fieldLabel}</strong>" is already in use by another active task. 
                                Please use a unique value to continue.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {groupOrder.map(groupName => {
                    if (['Attachments', 'Deployment', 'Pull Requests'].includes(groupName)) {
                        return null;
                    }

                    const fieldsInGroup = groupedFields[groupName];
                    if (!fieldsInGroup || fieldsInGroup.length === 0) {
                        return null;
                    }
                    
                    const gridColsClass = fieldsInGroup.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1';
                    const sectionId = groupName.toLowerCase().replace(/\s+/g, '-');

                    return (
                        <Card key={groupName} id={sectionId} className="scroll-mt-32 transition-all duration-300 max-w-full overflow-hidden border-none lg:border shadow-xl lg:shadow-md bg-card">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight uppercase tracking-wide">
                                    {groupName === 'Core Details' && <Layout className="h-5 w-5 text-primary" />}
                                    {groupName === 'Assignment & Tracking' && <Users className="h-5 w-5 text-primary" />}
                                    {groupName === 'Dates' && <CalendarIconLucide className="h-5 w-5 text-primary" />}
                                    {groupName}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className={cn("grid grid-cols-1 gap-6", gridColsClass)}>
                                {(groupedFields[groupName] || []).map(field => <div key={field.id} className="max-w-full overflow-hidden">{renderField(field)}</div>)}
                            </CardContent>
                        </Card>
                    )
                })}

                {(uiConfig?.fields || []).find(f => f.key === 'attachments' && f.isActive) && (
                    <Card id="attachments" className="scroll-mt-32 transition-all duration-300 border-none lg:border shadow-xl lg:shadow-md bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight uppercase tracking-wide">
                                <Paperclip className="h-5 w-5 text-primary" />
                                {fieldLabels.get('attachments') || 'Attachments'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                {attachments.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-xl bg-muted/20 shadow-sm transition-colors hover:bg-muted/30">
                                        {item.type === 'image' ? (
                                            <img src={item.url} alt={item.name} className="h-20 w-20 rounded-lg object-cover flex-shrink-0 border shadow-sm" />
                                        ) : (
                                            <div className="h-20 w-20 flex-shrink-0 flex items-center justify-center bg-secondary rounded-lg border shadow-sm">
                                                <Link2 className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-2">
                                            <FormField
                                                control={form.control}
                                                name={`attachments.${index}.name`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Name</FormLabel>
                                                        <FormControl><Input {...field} value={field.value ?? ""} placeholder="Attachment name" className={cn("h-9 font-normal", premiumFieldClassName)} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            {item.type === 'link' && (
                                                <FormField
                                                    control={form.control}
                                                    name={`attachments.${index}.url`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">URL</FormLabel>
                                                            <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://example.com/file" className={cn("h-9 font-normal", premiumFieldClassName)} /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <Button type="button" variant="destructive" size="icon" onClick={() => removeAttachment(index)} className="shrink-0 rounded-full shadow-sm"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                {(attachments.length || 0) === 0 && (
                                     <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-muted/10">
                                        <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                                        <p className="text-sm font-medium text-muted-foreground">Drop files, or paste an image/link</p>
                                     </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={() => appendAttachment({ name: '', url: '', type: 'link' })} className="font-medium shadow-sm rounded-lg h-9">
                                    <Link2 className="h-4 w-4 mr-2" /> Add Link
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} className="font-medium shadow-sm rounded-lg h-9">
                                    <Image className="h-4 w-4 mr-2" /> Add Image
                                </Button>
                            </div>

                            <input
                                type="file"
                                min="0"
                                ref={imageInputRef}
                                onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                                className="hidden"
                                accept="image/*"
                            />
                        </CardContent>
                    </Card>
                )}

                {deploymentFieldConfig && deploymentFieldConfig.isActive && (
                    <Card id="deployment" className="scroll-mt-32 transition-all duration-300 border-none lg:border shadow-xl lg:shadow-md bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight uppercase tracking-wide">
                                <Rocket className="h-5 w-5 text-primary" />
                                {fieldLabels.get('deploymentStatus') || 'Deployment'}
                                {deploymentFieldConfig.isRequired && <span className="text-destructive font-bold ml-1">*</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {relevantEnvsFieldConfig && relevantEnvsFieldConfig.isActive && renderField(relevantEnvsFieldConfig)}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                {activeEnvs.length > 0 ? activeEnvs.map(env => (
                                    <div key={env.id} className="flex flex-col gap-3 p-4 border rounded-2xl bg-muted/5 shadow-sm transition-all hover:border-primary/20">
                                        <FormField
                                            control={form.control}
                                            name={`deploymentStatus.${env.name}`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value ?? false}
                                                            onCheckedChange={field.onChange}
                                                            id={`deploy-check-${env.id}`}
                                                        />
                                                    </FormControl>
                                                    <FormLabel
                                                        htmlFor={`deploy-check-${env.id}`}
                                                        className="font-semibold text-sm capitalize cursor-pointer tracking-tight"
                                                    >
                                                        Deployed to {env.name}
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        {form.watch(`deploymentStatus.${env.name}`) && (
                                            <FormField
                                                control={form.control}
                                                name={`deploymentDates.${env.name}`}
                                                render={({ field }) => (
                                                    <FormItem className="w-full">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant={"outline"} className={cn("w-full h-10 pl-3 text-left font-normal shadow-sm", premiumOutlineButtonClassName, !field.value && "text-muted-foreground")}>
                                                                        {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP") : <span>Deployment Date</span>}
                                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <Calendar mode="single" selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined} onSelect={field.onChange} defaultMonth={field.value ?? new Date()} initialFocus />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                )) : <p className="text-sm font-normal text-muted-foreground text-center py-8 bg-muted/10 rounded-2xl border-2 border-dashed">Select relevant environments to see deployment options.</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {showPrLinksSection && (
                    <Card id="pull-requests" className="scroll-mt-32 transition-all duration-300 border-none lg:border shadow-xl lg:shadow-md bg-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight uppercase tracking-wide">
                                <GitMerge className="h-5 w-5 text-primary" />
                                {fieldLabels.get('prLinks') || 'Pull Requests'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {watchedRepositories && watchedRepositories.length > 0 ? (
                                <Tabs defaultValue={watchedRepositories[0]} className="w-full">
                                    <ScrollArea className="w-full whitespace-nowrap border-b">
                                        <TabsList className="bg-transparent h-12 p-0 gap-6">
                                            {watchedRepositories.map(repo => (
                                                <TabsTrigger 
                                                    key={repo} 
                                                    value={repo} 
                                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-1 font-semibold text-sm transition-all"
                                                >
                                                    {repo}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>

                                    {watchedRepositories.map(repo => (
                                        <TabsContent key={repo} value={repo}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                                            {activeEnvs.length > 0 ? activeEnvs.map(env => (
                                                <FormField
                                                    key={`${repo}-${env.id}`}
                                                    control={form.control}
                                                    name={`prLinks.${env.name}.${repo}`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="capitalize font-medium text-xs tracking-wide">{env.name} PR IDs</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} value={field.value ?? ''} placeholder="e.g. 12345, 67890" className={cn("font-normal shadow-sm", premiumFieldClassName)} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            )) : <p className="col-span-full text-sm font-normal text-muted-foreground text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed">Select relevant environments to add PR links.</p>}
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            ) : ( <p className="text-sm font-normal text-muted-foreground text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed">Assign a repository to add PR links.</p> )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </form>
    </Form>
  );
}
