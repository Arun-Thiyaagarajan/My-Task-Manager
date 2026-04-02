'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  CalendarRange,
  Copy,
  LayoutTemplate,
  MonitorSmartphone,
  PencilLine,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { deleteTaskTemplate, getDeletedTaskTemplates, getTaskTemplates, getUiConfig, permanentlyDeleteTaskTemplate, restoreTaskTemplate } from '@/lib/data';
import type { TaskTemplate } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { cn } from '@/lib/utils';

type TemplateView = 'active' | 'bin';
type CreationFilter = 'all' | 'today' | 'last7' | 'last30' | 'thisYear';

const CREATION_FILTERS: Array<{ value: CreationFilter; label: string }> = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisYear', label: 'This Year' },
];

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
  const [uiConfigVersion, setUiConfigVersion] = useState(0);

  const refreshTemplates = () => {
    setTemplates(getTaskTemplates());
    setDeletedTemplates(getDeletedTaskTemplates());
  };

  useEffect(() => {
    const config = getUiConfig();
    document.title = `Templates | ${config.appName || 'My Task Manager'}`;
    if (typeof window !== 'undefined') {
      const nextView = new URLSearchParams(window.location.search).get('view') === 'bin' ? 'bin' : 'active';
      setView(nextView);
    }
    refreshTemplates();
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));

    const syncTemplates = () => refreshTemplates();
    const syncUi = () => setUiConfigVersion(version => version + 1);
    window.addEventListener('storage', syncTemplates);
    window.addEventListener('company-changed', syncTemplates);
    window.addEventListener('sync-complete', syncTemplates);
    window.addEventListener('config-changed', syncUi);

    return () => {
      window.removeEventListener('storage', syncTemplates);
      window.removeEventListener('company-changed', syncTemplates);
      window.removeEventListener('sync-complete', syncTemplates);
      window.removeEventListener('config-changed', syncUi);
    };
  }, []);

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

  if (isLoading) {
    return <LoadingSpinner text="Loading templates..." />;
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

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="h-10 rounded-full px-4 text-sm font-semibold">
              {activeCount} Active
            </Badge>
            <Badge variant="outline" className="h-10 rounded-full px-4 text-sm font-semibold">
              {binCount} In Bin
            </Badge>
            <Button onClick={() => handleNavigate('/tasks/templates/new')} className="h-11 rounded-2xl px-5 shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-background/95 via-background/88 to-muted/[0.08] shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
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

              <div className="flex min-w-0 flex-col gap-3 xl:flex-1 xl:flex-row xl:items-center xl:justify-end">
                <div className="relative min-w-0 xl:w-auto xl:min-w-[18rem] xl:max-w-[28rem] xl:flex-[1.15_1_22rem]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder={view === 'active' ? 'Search templates, statuses, tags, repos...' : 'Search bin for a template to restore...'}
                    className="h-11 w-full rounded-2xl border-border/70 bg-[#171d28] pl-11 pr-4 text-foreground placeholder:text-muted-foreground/75 shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.025)] transition-[border-color,box-shadow,background-color,width] hover:border-border/90 hover:bg-[#192131] focus-visible:bg-[#1b2436]"
                  />
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-[0_1_auto] xl:justify-end">
                  <div className="flex h-10 items-center gap-2 rounded-2xl border border-border/60 bg-background/72 px-3 text-xs font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <CalendarRange className="h-4 w-4" />
                    Creation Date
                  </div>
                  {CREATION_FILTERS.map(filter => (
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
                </div>
              </div>
            </div>

            {(searchQuery || creationFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
            )}
          </CardContent>
        </Card>

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
          <div className="grid gap-3.5 xl:grid-cols-2 2xl:grid-cols-3">
            {filteredTemplates.map(templateItem => (
              <Card
                key={templateItem.id}
                className="overflow-hidden border-border/60 bg-gradient-to-br from-background/95 via-background/90 to-muted/[0.06] shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
              >
                <CardContent className="space-y-3.5 p-4 sm:p-[1.125rem]">
                  <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
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

                      <div className="space-y-1">
                        <h2 className="min-w-0 text-[1.35rem] font-semibold tracking-tight text-foreground">
                          <span className="block truncate">{templateItem.name}</span>
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

                    <div className="grid min-w-0 gap-2 rounded-[1.1rem] border border-border/40 bg-background/58 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] xl:min-w-[14rem]">
                      <div className="space-y-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Activity</p>
                        <div className="grid gap-1.5 text-[13px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="uppercase tracking-[0.12em] text-[10px] text-muted-foreground/65">Created</span>
                            <span className="truncate font-medium text-foreground/88">{templateItem.createdLabel}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="uppercase tracking-[0.12em] text-[10px] text-muted-foreground/65">Updated</span>
                            <span className="truncate font-medium text-foreground/88">{templateItem.lastUpdatedLabel}</span>
                          </div>
                          {templateItem.deletedLabel ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="uppercase tracking-[0.12em] text-[10px] text-muted-foreground/65">Deleted</span>
                              <span className="truncate font-medium text-foreground/88">{templateItem.deletedLabel}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-2.5">
                    {view === 'active' ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigate(`/tasks/templates/${templateItem.id}/edit`)}
                          className="h-9 rounded-xl px-3 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigate(`/tasks/new?template=${templateItem.id}`)}
                          className="h-9 rounded-xl border-border/60 bg-background/92 px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Use
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 rounded-xl px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Move to Bin
                            </Button>
                          </AlertDialogTrigger>
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
                        </AlertDialog>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleRestoreTemplate(templateItem.id)}
                          className="h-9 rounded-xl px-4"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore Template
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 rounded-xl px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </Button>
                          </AlertDialogTrigger>
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
                        </AlertDialog>
                      </>
                    )}
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
