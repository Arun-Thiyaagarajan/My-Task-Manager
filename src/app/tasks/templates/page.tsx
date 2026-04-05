'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  CalendarRange,
  CheckSquare,
  ChevronDown,
  Copy,
  Download,
  LayoutTemplate,
  MonitorSmartphone,
  PencilLine,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DATA_KEY, buildTaskTemplatesExportPayload, deleteTaskTemplate, getActiveCompanyId, getAuthMode, getDeletedTaskTemplates, getTaskTemplates, getUiConfig, importTaskTemplatesFromJson, isInitialSyncComplete, permanentlyDeleteTaskTemplate, restoreTaskTemplate } from '@/lib/data';
import type { TaskTemplate } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { TaskTemplatesPageSkeleton } from '@/components/task-template-skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { triggerTransfer } from '@/components/file-transfer-indicator';

type TemplateView = 'active' | 'bin';
type CreationFilter = 'all' | 'today' | 'last7' | 'last30' | 'thisYear';

const CREATION_FILTERS: Array<{ value: CreationFilter; label: string }> = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisYear', label: 'This Year' },
];
const INLINE_CREATION_FILTERS = CREATION_FILTERS.slice(0, 2);
const OVERFLOW_CREATION_FILTERS = CREATION_FILTERS.slice(2);

function getTemplatePresetCount(template: TaskTemplate) {
  return Object.entries(template.taskData || {}).reduce((count, [, value]) => {
    if (value === undefined || value === null || value === '') return count;
    if (Array.isArray(value) && value.length === 0) return count;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return count;
    return count + 1;
  }, 0);
}

function matchesCreationFilter(dateValue: string, filter: CreationFilter) {
  if (filter === 'all') return true;

  const createdAt = new Date(dateValue);
  if (Number.isNaN(createdAt.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'today') {
    return createdAt >= startOfToday;
  }

  if (filter === 'last7') {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 6);
    return createdAt >= start;
  }

  if (filter === 'last30') {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 29);
    return createdAt >= start;
  }

  const startOfThisYear = new Date(now.getFullYear(), 0, 1);
  return createdAt >= startOfThisYear;
}

function getSearchTokens(template: TaskTemplate) {
  return [
    template.name,
    template.description,
    template.taskData.title,
    template.taskData.description,
    template.taskData.status,
    template.createdAt,
    ...(template.taskData.tags || []),
    ...(template.taskData.repositories || []),
    ...(template.taskData.developers || []),
    ...(template.taskData.testers || []),
    ...(template.taskData.relevantEnvironments || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

type TemplateActionButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  variant?: 'ghost' | 'outline' | 'default';
  destructive?: boolean;
  className?: string;
  compact?: boolean;
};

function TemplateActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost',
  destructive = false,
  className,
  compact = false,
}: TemplateActionButtonProps) {
  const button = (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'h-10 shrink-0 rounded-xl text-muted-foreground transition-[padding,width,color,background-color,border-color,box-shadow] duration-200',
        compact ? 'w-10 justify-center px-0' : 'w-auto justify-start px-3.5',
        variant === 'outline' && 'border-border/60 bg-background/92 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        variant === 'ghost' && 'hover:bg-muted/60 hover:text-foreground',
        destructive && 'hover:bg-destructive/10 hover:text-destructive',
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact ? <span className="ml-2 whitespace-nowrap text-sm font-medium">{label}</span> : null}
    </Button>
  );

  if (!compact) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="rounded-xl border-border/70 bg-popover/95 px-3 py-2 backdrop-blur-xl">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type TemplateActionItem = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: 'ghost' | 'outline' | 'default';
  destructive?: boolean;
  onClick?: () => void;
  dialog?: React.ReactNode;
  className?: string;
};

function TemplateActionRow({
  items,
  forceCompact = false,
}: {
  items: TemplateActionItem[];
  forceCompact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const updateLayoutMode = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const requiredWidth = measureRef.current?.scrollWidth ?? 0;
      if (!containerWidth || !requiredWidth) return;
      setCompact(forceCompact || requiredWidth > containerWidth + 4);
    };

    updateLayoutMode();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            updateLayoutMode();
          })
        : null;

    if (resizeObserver) {
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      if (measureRef.current) resizeObserver.observe(measureRef.current);
    } else {
      window.addEventListener('resize', updateLayoutMode);
    }

    return () => {
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', updateLayoutMode);
    };
  }, [forceCompact, items]);

  const renderAction = (item: TemplateActionItem, isCompact: boolean) => {
    const button = (
      <TemplateActionButton
        icon={item.icon}
        label={item.label}
        onClick={item.onClick}
        variant={item.variant}
        destructive={item.destructive}
        className={item.className}
        compact={isCompact}
      />
    );

    if (!item.dialog) return button;

    return (
      <AlertDialog key={item.key}>
        <AlertDialogTrigger asChild>
          <span>{button}</span>
        </AlertDialogTrigger>
        {item.dialog}
      </AlertDialog>
    );
  };

  return (
    <div className="relative min-w-0">
      <div ref={containerRef} className="flex min-w-0 items-center justify-end gap-1.5 pb-1 sm:gap-2">
        {items.map(item => (
          <div key={item.key} className="shrink-0">
            {renderAction(item, forceCompact || compact)}
          </div>
        ))}
      </div>
      <div ref={measureRef} className="pointer-events-none absolute left-0 top-0 -z-10 flex opacity-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {items.map(item => (
            <div key={item.key} className="shrink-0">
              <TemplateActionButton
                icon={item.icon}
                label={item.label}
                onClick={item.onClick}
                variant={item.variant}
                destructive={item.destructive}
                className={item.className}
                compact={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TaskTemplatesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [deletedTemplates, setDeletedTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [creationFilter, setCreationFilter] = useState<CreationFilter>('all');
  const [view, setView] = useState<TemplateView>('active');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [uiConfigVersion, setUiConfigVersion] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tutorialOpenedSelectModeRef = useRef(false);

  const refreshTemplates = useCallback(() => {
    const authMode = getAuthMode();
    const activeCompanyId = getActiveCompanyId();
    const shouldWaitForCloudData =
      authMode === 'authenticate' && (!activeCompanyId || !isInitialSyncComplete(activeCompanyId));

    if (shouldWaitForCloudData) {
      setIsLoading(true);
      return;
    }

    setTemplates(getTaskTemplates());
    setDeletedTemplates(getDeletedTaskTemplates());
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  useEffect(() => {
    const config = getUiConfig();
    document.title = `Templates | ${config.appName || 'My Task Manager'}`;
    if (typeof window !== 'undefined') {
      const nextView = new URLSearchParams(window.location.search).get('view') === 'bin' ? 'bin' : 'active';
      setView(nextView);
    }
    refreshTemplates();

    const syncTemplates = () => refreshTemplates();
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== DATA_KEY) return;
      refreshTemplates();
    };
    const syncUi = () => setUiConfigVersion(version => version + 1);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('company-changed', syncTemplates);
    window.addEventListener('sync-complete', syncTemplates);
    window.addEventListener('config-changed', syncUi);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('company-changed', syncTemplates);
      window.removeEventListener('sync-complete', syncTemplates);
      window.removeEventListener('config-changed', syncUi);
    };
  }, [refreshTemplates]);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSkeleton(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const uiConfig = useMemo(() => getUiConfig(), [uiConfigVersion]);

  const activeCount = templates.length;
  const binCount = deletedTemplates.length;
  const currentTemplates = view === 'active' ? templates : deletedTemplates;

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return currentTemplates
      .filter(template => matchesCreationFilter(template.createdAt, creationFilter))
      .filter(template => {
        if (!normalizedQuery) return true;
        return getSearchTokens(template).includes(normalizedQuery);
      })
      .map(template => ({
        ...template,
        presetCount: getTemplatePresetCount(template),
        lastUpdatedLabel: formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true }),
        createdLabel: formatDistanceToNow(new Date(template.createdAt), { addSuffix: true }),
        deletedLabel: template.deletedAt ? formatDistanceToNow(new Date(template.deletedAt), { addSuffix: true }) : null,
      }));
  }, [creationFilter, currentTemplates, searchQuery]);

  const exportTemplatesAsJson = useCallback((templatesToExport: TaskTemplate[], exportLabel: string) => {
    const payload = buildTaskTemplatesExportPayload(templatesToExport);
    const safeAppName = (payload.appName || 'My_Task_Manager').replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_');
    const normalizedLabel = exportLabel.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_');
    const fileName = `${safeAppName}_${normalizedLabel}.json`;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;

    triggerTransfer({
      id: `template-export-${Date.now()}`,
      filename: fileName,
      kind: 'export',
      status: 'complete',
      progress: 100,
    });

    const link = document.createElement('a');
    link.href = jsonString;
    link.download = fileName;
    link.click();
  }, []);

  const handleMoveToBin = (templateId: string) => {
    const deleted = deleteTaskTemplate(templateId);
    if (!deleted) {
      toast({
        variant: 'destructive',
        title: 'Template not found',
        description: 'This template could not be moved to bin.',
      });
      return;
    }

    refreshTemplates();
    toast({
      title: 'Moved to Bin',
      description: 'The template can be restored later from the bin.',
    });
  };

  const handleRestoreTemplate = (templateId: string) => {
    try {
      const restored = restoreTaskTemplate(templateId);
      if (!restored) {
        toast({
          variant: 'destructive',
          title: 'Template not found',
          description: 'This template could not be restored.',
        });
        return;
      }

      refreshTemplates();
      setView('active');
      toast({
        title: 'Template restored',
        description: 'The template is back in your active collection.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unable to restore template',
        description: error instanceof Error ? error.message : 'Please rename or remove the conflicting active template first.',
      });
    }
  };

  const handlePermanentDeleteTemplate = (templateId: string) => {
    const deleted = permanentlyDeleteTaskTemplate(templateId);
    if (!deleted) {
      toast({
        variant: 'destructive',
        title: 'Template not found',
        description: 'This template could not be deleted permanently.',
      });
      return;
    }

    refreshTemplates();
    toast({
      title: 'Template deleted permanently',
      description: 'The template was removed from the bin and cannot be restored.',
    });
  };

  const handleNavigate = (href: string) => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push(href);
  };

  const handleExportTemplates = () => {
    const activeTemplates = getTaskTemplates();
    exportTemplatesAsJson(activeTemplates, 'Task_Templates');

    toast({
      variant: 'success',
      title: 'Templates exported',
      description: `${activeTemplates.length} template${activeTemplates.length === 1 ? '' : 's'} downloaded as JSON.`,
    });
  };

  const handleSingleTemplateExport = useCallback((template: TaskTemplate) => {
    exportTemplatesAsJson([template], `Template_${template.name}`);
    toast({
      variant: 'success',
      title: 'Template exported',
      description: `"${template.name}" was downloaded as JSON.`,
    });
  }, [exportTemplatesAsJson, toast]);

  const handleToggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => !prev);
    setSelectedTemplateIds([]);
  }, []);

  const handleToggleSelectAll = useCallback((checked: boolean | 'indeterminate') => {
    setSelectedTemplateIds(checked === true ? filteredTemplates.map(template => template.id) : []);
  }, [filteredTemplates]);

  const handleTemplateSelection = useCallback((templateId: string, checked: boolean | 'indeterminate') => {
    setSelectedTemplateIds(current =>
      checked === true ? Array.from(new Set([...current, templateId])) : current.filter(id => id !== templateId)
    );
  }, []);

  const handleToggleTemplateCardSelection = useCallback((templateId: string) => {
    setSelectedTemplateIds(current =>
      current.includes(templateId) ? current.filter(id => id !== templateId) : [...current, templateId]
    );
  }, []);

  const handleBulkExportSelected = useCallback(() => {
    const selectedTemplates = currentTemplates.filter(template => selectedTemplateIds.includes(template.id));
    if (selectedTemplates.length === 0) {
      toast({
        variant: 'warning',
        title: 'No templates selected',
        description: 'Choose one or more templates to export.',
      });
      return;
    }

    exportTemplatesAsJson(
      selectedTemplates,
      selectedTemplates.length === 1 ? `Template_${selectedTemplates[0].name}` : `Selected_Templates_${selectedTemplates.length}`
    );

    toast({
      variant: 'success',
      title: 'Templates exported',
      description: `${selectedTemplates.length} selected template${selectedTemplates.length === 1 ? '' : 's'} downloaded as JSON.`,
    });
  }, [currentTemplates, exportTemplatesAsJson, selectedTemplateIds, toast]);

  const handleBulkDeleteSelected = useCallback(() => {
    const selectedCount = selectedTemplateIds.length;
    if (selectedCount === 0) {
      toast({
        variant: 'warning',
        title: 'No templates selected',
        description: 'Choose one or more templates first.',
      });
      return;
    }

    if (view === 'active') {
      selectedTemplateIds.forEach(templateId => {
        deleteTaskTemplate(templateId);
      });

      refreshTemplates();
      setSelectedTemplateIds([]);
      setIsSelectMode(false);
      toast({
        title: 'Templates moved to Bin',
        description: `${selectedCount} template${selectedCount === 1 ? '' : 's'} can be restored later from the bin.`,
      });
      return;
    }

    selectedTemplateIds.forEach(templateId => {
      permanentlyDeleteTaskTemplate(templateId);
    });

    refreshTemplates();
    setSelectedTemplateIds([]);
    setIsSelectMode(false);
    toast({
      title: 'Templates deleted permanently',
      description: `${selectedCount} template${selectedCount === 1 ? '' : 's'} were removed from the bin.`,
    });
  }, [refreshTemplates, selectedTemplateIds, toast, view]);

  const handleBulkRestoreSelected = useCallback(() => {
    const selectedCount = selectedTemplateIds.length;
    if (selectedCount === 0) {
      toast({
        variant: 'warning',
        title: 'No templates selected',
        description: 'Choose one or more templates first.',
      });
      return;
    }

    let restoredCount = 0;

    try {
      selectedTemplateIds.forEach(templateId => {
        const restored = restoreTaskTemplate(templateId);
        if (restored) restoredCount += 1;
      });

      refreshTemplates();
      setSelectedTemplateIds([]);
      setIsSelectMode(false);
      setView('active');
      toast({
        variant: 'success',
        title: 'Templates restored',
        description: `${restoredCount} template${restoredCount === 1 ? '' : 's'} were moved back to active templates.`,
      });
    } catch (error) {
      refreshTemplates();
      toast({
        variant: 'destructive',
        title: 'Unable to restore templates',
        description: error instanceof Error ? error.message : 'Please rename or remove the conflicting active template first.',
      });
    }
  }, [refreshTemplates, selectedTemplateIds, toast]);

  useEffect(() => {
    setSelectedTemplateIds(current => current.filter(id => currentTemplates.some(template => template.id === id)));
  }, [currentTemplates]);

  useEffect(() => {
    setSelectedTemplateIds([]);
    setIsSelectMode(false);
  }, [view]);

  useEffect(() => {
    const tutorialBulkSelectors = new Set([
      '#templates-select-multiple-trigger',
      '#select-all-templates',
      '#templates-bulk-export',
      '#templates-bulk-delete',
    ]);

    const handleTutorialStepHighlighted = (event: Event) => {
      const selector = (event as CustomEvent<{ selector?: string }>).detail?.selector;
      const shouldShowBulkBar = !!selector && tutorialBulkSelectors.has(selector);

      if (shouldShowBulkBar && !isSelectMode) {
        tutorialOpenedSelectModeRef.current = true;
        setIsSelectMode(true);
        setSelectedTemplateIds([]);
        return;
      }

      if (!shouldShowBulkBar && tutorialOpenedSelectModeRef.current) {
        tutorialOpenedSelectModeRef.current = false;
        setIsSelectMode(false);
        setSelectedTemplateIds([]);
      }
    };

    const handleTutorialClosed = () => {
      if (!tutorialOpenedSelectModeRef.current) return;
      tutorialOpenedSelectModeRef.current = false;
      setIsSelectMode(false);
      setSelectedTemplateIds([]);
    };

    window.addEventListener('tutorial-step-highlighted', handleTutorialStepHighlighted as EventListener);
    window.addEventListener('tutorial-closed', handleTutorialClosed);

    return () => {
      window.removeEventListener('tutorial-step-highlighted', handleTutorialStepHighlighted as EventListener);
      window.removeEventListener('tutorial-closed', handleTutorialClosed);
    };
  }, [isSelectMode]);

  const handleTemplateCardClick = useCallback(
    (templateId: string, event: React.MouseEvent<HTMLElement>) => {
      if (!isSelectMode) return;

      const target = event.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }

      handleToggleTemplateCardSelection(templateId);
    },
    [handleToggleTemplateCardSelection, isSelectMode]
  );

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please choose a valid .json template export.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const transferId = `template-import-${Date.now()}`;
    triggerTransfer({
      id: transferId,
      filename: file.name,
      kind: 'import',
      status: 'preparing',
      progress: 0,
    });

    const reader = new FileReader();
    reader.onload = async loadEvent => {
      try {
        const text = loadEvent.target?.result as string;
        const parsedJson = JSON.parse(text);
        triggerTransfer({
          id: transferId,
          filename: file.name,
          kind: 'import',
          status: 'uploading',
          progress: 35,
        });

        const result = await importTaskTemplatesFromJson(parsedJson);

        triggerTransfer({
          id: transferId,
          filename: file.name,
          kind: 'import',
          status: 'complete',
          progress: 100,
        });

        refreshTemplates();
        setView('active');

        if (result.importedCount === 0 && result.skippedDuplicates.length > 0) {
          toast({
            variant: 'warning',
            title: 'No new templates imported',
            description: 'Every template in that file already exists in this workspace.',
          });
        } else if (result.skippedDuplicates.length > 0) {
          toast({
            variant: 'success',
            title: 'Templates imported',
            description: `Imported ${result.importedCount} template${result.importedCount === 1 ? '' : 's'}. Skipped ${result.skippedDuplicates.length} duplicate name${result.skippedDuplicates.length === 1 ? '' : 's'}.`,
          });
        } else {
          toast({
            variant: 'success',
            title: 'Templates imported',
            description: `Imported ${result.importedCount} template${result.importedCount === 1 ? '' : 's'}.`,
          });
        }
      } catch (error) {
        triggerTransfer({
          id: transferId,
          filename: file.name,
          kind: 'import',
          status: 'error',
          progress: 0,
          error: 'Import failed',
        });
        toast({
          variant: 'destructive',
          title: 'Import failed',
          description: error instanceof Error ? error.message : 'The selected template file could not be imported.',
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      triggerTransfer({
        id: transferId,
        filename: file.name,
        kind: 'import',
        status: 'error',
        progress: 0,
        error: 'Read failed',
      });
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'Unable to read the selected file.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  if (isLoading) {
    return showSkeleton ? <TaskTemplatesPageSkeleton /> : <LoadingSpinner text="Loading templates..." />;
  }

  if (isMobile) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MonitorSmartphone className="h-6 w-6" />
            </div>
            <CardTitle>Template management is desktop only</CardTitle>
            <CardDescription>
              Use desktop to organize templates. You can still apply saved templates from task creation on mobile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => handleNavigate('/')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emptyTitle = view === 'active' ? 'No templates yet' : 'Bin is empty';
  const emptyDescription =
    view === 'active'
      ? 'Create your first preset so recurring task setups can be reused in a couple of clicks.'
      : 'Deleted templates land here so you can restore them anytime.';
  const noResultsTitle = view === 'active' ? 'No templates match these filters' : 'No bin items match these filters';
  const hiddenDateFilterLabel = OVERFLOW_CREATION_FILTERS.find(filter => filter.value === creationFilter)?.label;
  const clearTemplateFilters = () => {
    setSearchQuery('');
    setCreationFilter('all');
  };
  const selectionBarContent = (
    <Card className="overflow-hidden border-primary/30 bg-[linear-gradient(180deg,hsl(var(--background)/0.96),hsl(var(--card)/0.92))] shadow-[0_22px_60px_-34px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.94))] dark:shadow-[0_22px_60px_-34px_rgba(0,0,0,0.62)]">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-white/[0.02] dark:shadow-none">
            <Checkbox
              id="select-all-templates"
              checked={filteredTemplates.length > 0 && selectedTemplateIds.length === filteredTemplates.length}
              onCheckedChange={handleToggleSelectAll}
              className="h-5 w-5"
            />
            <Label htmlFor="select-all-templates" className="cursor-pointer whitespace-nowrap text-sm font-semibold text-foreground">
              {selectedTemplateIds.length > 0 ? `${selectedTemplateIds.length} Selected` : 'Select All'}
            </Label>
          </div>

          <div
            className={cn(
              'ml-auto flex w-full flex-wrap items-center justify-end gap-2 transition-opacity duration-300',
              selectedTemplateIds.length > 0 ? 'opacity-100' : 'pointer-events-none opacity-40'
            )}
          >
            {view === 'bin' ? (
              <Button
                type="button"
                size="sm"
                onClick={handleBulkRestoreSelected}
                className="h-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 font-medium text-emerald-700 shadow-[0_12px_28px_-22px_rgba(16,185,129,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500/[0.12] dark:text-emerald-300"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </Button>
            ) : null}
            <Button
              id="templates-bulk-export"
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBulkExportSelected}
              className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background"
            >
              <Download className="mr-2 h-4 w-4 text-primary" />
              Export JSON
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  id="templates-bulk-delete"
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-10 rounded-2xl px-4 font-semibold shadow-[0_14px_30px_-22px_rgba(220,38,38,0.55)] transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {view === 'active' ? 'Move to Bin' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {view === 'active' ? 'Move selected templates to Bin?' : 'Delete selected templates permanently?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {view === 'active'
                      ? `You are about to move ${selectedTemplateIds.length} template${selectedTemplateIds.length === 1 ? '' : 's'} to the bin. You can restore them later.`
                      : `You are about to permanently delete ${selectedTemplateIds.length} template${selectedTemplateIds.length === 1 ? '' : 's'} from the bin. This cannot be undone.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDeleteSelected}
                    className="rounded-xl bg-destructive hover:bg-destructive/90"
                  >
                    {view === 'active' ? 'Move to Bin' : 'Delete Permanently'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div id="templates-page" className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <LayoutTemplate className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">Workspace Templates</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.6rem]">Manage templates</h1>
            <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
              Search, sort, restore, and reuse reusable task presets from one focused desktop workspace.
            </p>
          </div>
          <div id="templates-actions" className="flex min-w-0 flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <Badge variant="secondary" className="h-10 rounded-full px-4 text-sm font-semibold">
                {activeCount} Active
              </Badge>
              <Badge variant="outline" className="h-10 rounded-full px-4 text-sm font-semibold">
                {binCount} In Bin
              </Badge>
            </div>
            <div className="flex min-w-0 flex-nowrap items-center gap-3 self-start xl:self-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleImportButtonClick}
                className="h-11 shrink-0 rounded-2xl border-border/60 bg-background/92 px-4 shadow-sm xl:px-5"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleExportTemplates}
                disabled={activeCount === 0}
                className="h-11 shrink-0 rounded-2xl border-border/60 bg-background/92 px-4 shadow-sm xl:px-5"
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button
                onClick={() => handleNavigate('/tasks/templates/new')}
                className="h-11 shrink-0 rounded-2xl px-4 shadow-sm xl:px-5"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFileChange} />

        <Card id="templates-filters" className="overflow-hidden border-border/60 bg-gradient-to-br from-background/95 via-background/88 to-muted/[0.08] shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap xl:justify-between">
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant={view === 'active' ? 'default' : 'outline'}
                  onClick={() => setView('active')}
                  className={cn('h-10 rounded-2xl px-4', view === 'active' && 'shadow-sm')}
                >
                  Active Templates
                  <Badge variant="secondary" className="ml-2 h-6 rounded-full px-2 text-[11px]">
                    {activeCount}
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant={view === 'bin' ? 'default' : 'outline'}
                  onClick={() => setView('bin')}
                  className={cn('h-10 rounded-2xl px-4', view === 'bin' && 'shadow-sm')}
                >
                  Bin
                  <Badge variant="secondary" className="ml-2 h-6 rounded-full px-2 text-[11px]">
                    {binCount}
                  </Badge>
                </Button>
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 xl:flex-nowrap xl:justify-end">
                <div className="relative min-w-0 flex-[1_1_18rem] xl:max-w-[28rem]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder={view === 'active' ? 'Search templates, statuses, tags, repos...' : 'Search bin for a template to restore...'}
                    className="h-11 w-full rounded-2xl border-border/70 bg-background/92 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/75 shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.45)] transition-[border-color,box-shadow,background-color,width] hover:border-border/90 hover:bg-background focus-visible:bg-background dark:bg-[#171d28] dark:shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.025)] dark:hover:bg-[#192131] dark:focus-visible:bg-[#1b2436]"
                  />
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                  <div className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-background/72 px-3 text-xs font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <CalendarRange className="h-4 w-4" />
                    Creation Date
                  </div>
                  {INLINE_CREATION_FILTERS.map(filter => (
                    <Button
                      key={filter.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreationFilter(filter.value)}
                      className={cn(
                        'h-10 rounded-2xl px-3 text-xs font-semibold text-muted-foreground',
                        creationFilter === filter.value && 'bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      {filter.label}
                    </Button>
                  ))}
                  {OVERFLOW_CREATION_FILTERS.map(filter => (
                    <Button
                      key={filter.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreationFilter(filter.value)}
                      className={cn(
                        'hidden h-10 rounded-2xl px-3 text-xs font-semibold text-muted-foreground',
                        creationFilter === filter.value && 'bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      {filter.label}
                    </Button>
                  ))}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-10 rounded-2xl px-3 text-xs font-semibold text-muted-foreground',
                          hiddenDateFilterLabel && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                        )}
                      >
                        {hiddenDateFilterLabel || 'More Dates'}
                        <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={10}
                      className="w-[min(18rem,calc(100vw-2rem))] rounded-3xl border-border/60 bg-background/95 p-2 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl"
                    >
                      <DropdownMenuLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                        More Date Filters
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="mx-2 my-2 bg-border/60" />
                      {OVERFLOW_CREATION_FILTERS.map(filter => (
                        <DropdownMenuItem
                          key={filter.value}
                          onSelect={() => setCreationFilter(filter.value)}
                          className={cn(
                            'group rounded-2xl px-3 py-3 text-sm font-medium focus:bg-primary/8 dark:focus:bg-primary/12',
                            creationFilter === filter.value && 'bg-primary/8 text-primary'
                          )}
                        >
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <span>{filter.label}</span>
                            {creationFilter === filter.value ? (
                              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                                Active
                              </Badge>
                            ) : null}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {currentTemplates.length > 0 ? (
                  <Button
                    id="templates-select-multiple-trigger"
                    type="button"
                    variant={isSelectMode ? 'secondary' : 'outline'}
                    onClick={handleToggleSelectMode}
                    className={cn(
                      'h-10 shrink-0 rounded-2xl px-4 text-xs font-medium shadow-sm transition-all',
                      isSelectMode ? 'border-primary/20 bg-primary/10 text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {isSelectMode ? (
                      <>
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                        Select multiple
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>

            {(searchQuery || creationFilter !== 'all') && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/72 px-3 py-2.5 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Showing {filteredTemplates.length} result{filteredTemplates.length === 1 ? '' : 's'}.</span>
                  {searchQuery ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Search: {searchQuery}
                    </Badge>
                  ) : null}
                  {creationFilter !== 'all' ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      Date: {CREATION_FILTERS.find(filter => filter.value === creationFilter)?.label}
                    </Badge>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearTemplateFilters}
                  className="h-8 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isSelectMode && filteredTemplates.length > 0 ? selectionBarContent : null}

        {currentTemplates.length === 0 ? (
          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight">{emptyTitle}</h2>
                <p className="max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
              </div>
              {view === 'active' ? (
                <Button onClick={() => handleNavigate('/tasks/templates/new')} className="mt-2 rounded-xl px-5">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create your first template
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-border/60 bg-background/80 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight">{noResultsTitle}</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Adjust the search or creation date filter to broaden the result set.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div id="templates-grid" className="grid gap-3.5 xl:grid-cols-3">
            {filteredTemplates.map(templateItem => (
              <Card
                key={templateItem.id}
                onClick={event => handleTemplateCardClick(templateItem.id, event)}
                className={cn(
                  'relative overflow-hidden border-border/60 bg-gradient-to-br from-background/95 via-background/90 to-muted/[0.06] shadow-sm transition-all duration-200 hover:border-border hover:shadow-md',
                  isSelectMode && 'cursor-pointer',
                  selectedTemplateIds.includes(templateItem.id) && 'border-primary/50 shadow-[0_18px_44px_-30px_hsl(var(--primary)/0.35)]'
                )}
              >
                {isSelectMode ? (
                  <Checkbox
                    id={`template-select-floating-${templateItem.id}`}
                    checked={selectedTemplateIds.includes(templateItem.id)}
                    onCheckedChange={checked => handleTemplateSelection(templateItem.id, checked)}
                    className="absolute left-4 top-4 z-20 h-5 w-5 bg-background/80"
                    aria-label={`Select template ${templateItem.name}`}
                    onClick={event => event.stopPropagation()}
                  />
                ) : null}
                <CardContent className="space-y-3.5 p-4 sm:p-[1.125rem]">
                  <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="space-y-1">
                        <h2 className={cn('min-w-0 text-[1.35rem] font-semibold tracking-tight text-foreground', isSelectMode && 'pl-8')}>
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              if (isSelectMode) {
                                handleToggleTemplateCardSelection(templateItem.id);
                                return;
                              }
                              handleNavigate(`/tasks/templates/${templateItem.id}/edit`);
                            }}
                            className="block truncate text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
                          >
                            {templateItem.name}
                          </button>
                        </h2>
                        <p className="line-clamp-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
                          {templateItem.description?.trim() || 'No description added for this template yet.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {templateItem.taskData.status ? (
                          <TaskStatusBadge
                            status={templateItem.taskData.status}
                            uiConfig={uiConfig}
                            className="max-w-full rounded-full px-2.5 py-1 text-[11px]"
                          />
                        ) : null}
                        {templateItem.taskData.tags?.length ? (
                          <Badge variant="secondary" className="rounded-full border border-border/40 bg-muted/[0.34] px-2.5 py-1 text-[11px] font-medium text-foreground/90">
                            {templateItem.taskData.tags.length} tag{templateItem.taskData.tags.length === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                        {templateItem.taskData.repositories?.length ? (
                          <Badge variant="secondary" className="rounded-full border border-border/40 bg-muted/[0.34] px-2.5 py-1 text-[11px] font-medium text-foreground/90">
                            {templateItem.taskData.repositories.length} repo{templateItem.taskData.repositories.length === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                        {templateItem.taskData.relevantEnvironments?.length ? (
                          <Badge variant="secondary" className="rounded-full border border-border/40 bg-muted/[0.34] px-2.5 py-1 text-[11px] font-medium text-foreground/90">
                            {templateItem.taskData.relevantEnvironments.length} env{templateItem.taskData.relevantEnvironments.length === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-start justify-start gap-2 xl:max-w-[14rem] xl:justify-end">
                      <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/85">
                        {view === 'active' ? 'Template' : 'Template In Bin'}
                      </span>
                      <Badge variant="outline" className="shrink-0 rounded-full border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground/85">
                        {templateItem.presetCount} preset{templateItem.presetCount === 1 ? '' : 's'}
                      </Badge>
                      {view === 'bin' ? (
                        <Badge className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10">
                          In Bin
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-border/50 pt-2.5">
                    {view === 'bin' ? (
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] text-muted-foreground/78">
                        {templateItem.deletedLabel ? (
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 uppercase tracking-[0.16em] text-[10px] text-muted-foreground/58">Moved to Bin</span>
                            <span className="truncate font-medium text-foreground/78">{templateItem.deletedLabel}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div />
                    )}
                    <TemplateActionRow
                      forceCompact={view === 'bin'}
                      items={
                        view === 'active'
                          ? [
                              {
                                key: 'edit',
                                icon: PencilLine,
                                label: 'Edit',
                                onClick: () => handleNavigate(`/tasks/templates/${templateItem.id}/edit`),
                              },
                              {
                                key: 'export',
                                icon: Download,
                                label: 'Export',
                                variant: 'outline',
                                onClick: () => handleSingleTemplateExport(templateItem),
                              },
                              {
                                key: 'use',
                                icon: Copy,
                                label: 'Use',
                                variant: 'outline',
                                onClick: () => handleNavigate(`/tasks/new?template=${templateItem.id}`),
                              },
                              {
                                key: 'delete',
                                icon: Trash2,
                                label: 'Move to Bin',
                                destructive: true,
                                dialog: (
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Move template to Bin?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <strong>{templateItem.name}</strong> will be removed from the active list, but you can still restore it from the template bin later.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleMoveToBin(templateItem.id)}
                                        className="rounded-xl bg-destructive hover:bg-destructive/90"
                                      >
                                        Move to Bin
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                ),
                              },
                            ]
                          : [
                              {
                                key: 'export',
                                icon: Download,
                                label: 'Export',
                                variant: 'outline',
                                onClick: () => handleSingleTemplateExport(templateItem),
                              },
                              {
                                key: 'restore',
                                icon: RotateCcw,
                                label: 'Restore',
                                variant: 'ghost',
                                onClick: () => handleRestoreTemplate(templateItem.id),
                                className: 'text-foreground hover:text-foreground',
                              },
                              {
                                key: 'delete',
                                icon: Trash2,
                                label: 'Delete Permanently',
                                destructive: true,
                                dialog: (
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete template permanently?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <strong>{templateItem.name}</strong> will be removed forever from the bin. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handlePermanentDeleteTemplate(templateItem.id)}
                                        className="rounded-xl bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete Permanently
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                ),
                              },
                            ]
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
