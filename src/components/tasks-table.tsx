'use client';

import React, { useState, useEffect, memo, useRef } from 'react';
import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge, getStatusConfig } from '@/components/task-status-badge';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
} from 'lucide-react';
import type { Task, UiConfig, Person, TaskStatus, Environment } from '@/lib/types';
import { Badge } from './ui/badge';
import { DeleteTaskButton } from './delete-task-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getInitials, getAvatarColor, cn, getRepoBadgeStyle } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { updateTask } from '@/lib/data';
import { PersonProfileCard } from './person-profile-card';
import { Checkbox } from './ui/checkbox';
import { EnvironmentStatus } from './environment-status';
import { TaskTableRowSkeleton } from './task-card-skeleton';
import { Skeleton } from './ui/skeleton';
import { StatusIcon, getOrderedTaskStatusGroups, getSortedStatusNames, getStatusDisplayName, getStatusStyles, isStatusValue } from '@/lib/status-config';
import { scheduleStatusUpdate } from '@/lib/status-update';
import { getTaskRepositories, isRepositoryFieldActive } from '@/lib/repository-config';
import { TaskPriorityBadge } from './task-priority-badge';
import { getTaskDueLabel, getTaskDueToneClassName, hasDueReminder, hasReminderNote } from '@/lib/task-planning';

interface TasksTableRowProps {
  task: Task;
  onTaskUpdate: () => void;
  uiConfig: UiConfig;
  developersById: Map<string, Person>;
  testersById: Map<string, Person>;
  onAvatarClick: (person: Person, isDeveloper: boolean) => void;
  isSelected: boolean;
  onToggleSelection: (taskId: string, checked: boolean) => void;
  isSelectMode: boolean;
  currentQueryString: string;
  enterIndex?: number;
}

const TasksTableRow = memo(function TasksTableRow({
  task: initialTask,
  onTaskUpdate,
  uiConfig,
  developersById,
  testersById,
  onAvatarClick,
  isSelected,
  onToggleSelection,
  isSelectMode,
  currentQueryString,
  enterIndex = 0,
}: TasksTableRowProps) {
  const [task, setTask] = useState(initialTask);
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const [justUpdatedStatus, setJustUpdatedStatus] = useState<string | null>(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const statusDebounceRef = useRef<number | null>(null);
  const statusRequestRef = useRef(0);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

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

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === task.status || isStatusSaving && newStatus === justUpdatedStatus) return;

    setIsStatusSaving(true);
    setJustUpdatedStatus(newStatus);

    scheduleStatusUpdate({
      task,
      newStatus,
      debounceRef: statusDebounceRef,
      requestRef: statusRequestRef,
      applyOptimistic: setTask,
      onPersisted: () => {
        setIsStatusSaving(false);
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
      },
    });
  };

  const handleToggleDeployment = (env: string) => {
    const newStatus = !(task.deploymentStatus?.[env] ?? false);
  
    const updatedTaskData = {
      deploymentStatus: { ...task.deploymentStatus, [env]: newStatus },
      deploymentDates: {
        ...task.deploymentDates,
        [env]: newStatus ? task.deploymentDates?.[env] || new Date().toISOString() : task.deploymentDates?.[env],
      },
    };
    
    const updatedTask = updateTask(task.id, updatedTaskData);
  
    if (updatedTask) {
      setTask(updatedTask);
      setJustUpdatedEnv(env);
      onTaskUpdate();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update deployment status.',
      });
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (isOpening) return;

    if (isSelectMode) {
      onToggleSelection(task.id, !isSelected);
      return;
    }

    const target = e.target as HTMLElement;
    // Prevent navigation if clicking interactive elements
    if (target.closest('button') || target.closest('.dropdown-trigger') || target.closest('[role="menuitem"]')) {
        return;
    }

    // Standard browser behaviors for new tabs
    if (e.metaKey || e.ctrlKey || e.button === 1) return;

    e.preventDefault();
    setIsOpening(true);
    window.dispatchEvent(new Event('navigation-start'));
    router.push(`/tasks/${task.id}?${currentQueryString}`);
  };

  const assignedDevelopers = (task.developers || [])
    .map((id) => developersById.get(id))
    .filter((d): d is Person => !!d);
  const assignedTesters = (task.testers || [])
    .map((id) => testersById.get(id))
    .filter((t): t is Person => !!t);

  const statusConfig = getStatusConfig(task.status, uiConfig);
  
  const allRelevantEnvs = (uiConfig?.environments || []).filter(e => (task.relevantEnvironments || ['dev','stage','production']).includes(e.name));
  const visibleRepositories = getTaskRepositories(task, uiConfig);
  const visibleRepoBadges = visibleRepositories.slice(0, 2);
  const hiddenRepositories = visibleRepositories.slice(2);
  const dueLabel = getTaskDueLabel(task);

  return (
    <TableRow 
        key={task.id} 
        className={cn(
            "group/row relative animate-in fade-in slide-in-from-top-2 transition-opacity duration-300", 
            isOpening && "opacity-60 pointer-events-none"
        )} 
        style={{ animationDelay: `${Math.min(enterIndex, 6) * 28}ms` }}
        data-state={isSelected ? 'selected' : undefined}
        onClick={handleRowClick}
    >
       {isSelectMode && (
         <TableCell>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelection(task.id, !!checked)}
              aria-label={`Select task ${task.title}`}
            />
        </TableCell>
       )}
      <TableCell className="font-medium max-w-xs relative overflow-hidden align-top">
        <StatusIcon status={task.status} uiConfig={uiConfig} className={cn(
          "absolute -bottom-8 -left-8 h-24 w-24 pointer-events-none transition-transform duration-300 ease-in-out z-0",
          !isStatusValue(task.status, 'in_progress', uiConfig) && 'group-hover/row:scale-110 group-hover/row:rotate-6'
        )} style={statusConfig.backgroundIconStyle} />
        <div className="relative z-10">
            <a
              href={`/tasks/${task.id}?${currentQueryString}`}
              className="font-semibold block truncate group/title"
              onClick={(e) => {
                if (isSelectMode || isOpening) {
                  e.preventDefault();
                }
              }}
            >
              <span className="group-hover/title:text-primary transition-colors">{task.title}</span>
            </a>
            <p className="text-muted-foreground text-sm truncate mt-1 font-normal">
              {task.summary || task.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <TaskPriorityBadge priority={task.priority} compact />
              <Badge
                variant="outline"
                className={cn('max-w-full rounded-full border px-2 py-0.5 text-[10px] font-medium', getTaskDueToneClassName(task))}
              >
                <CalendarClock className="mr-1 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{dueLabel}</span>
              </Badge>
              {hasReminderNote(task) ? (
                <Badge variant="outline" className="rounded-full border-border/60 bg-muted/[0.28] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <BellRing className="mr-1 h-3.5 w-3.5" />
                  Note
                </Badge>
              ) : null}
              {hasDueReminder(task) ? (
                <Badge variant="outline" className="rounded-full border-primary/18 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  Due
                </Badge>
              ) : null}
            </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={isOpening}
              className="h-auto rounded-2xl p-0.5 transition-all duration-200 hover:bg-background/60 hover:shadow-[0_10px_24px_-22px_rgba(15,23,42,0.85)] focus-visible:ring-0 focus-visible:ring-offset-0 dark:hover:bg-background/35"
            >
              <TaskStatusBadge status={task.status} uiConfig={uiConfig} className={cn((isStatusSaving || justUpdatedStatus === task.status) && 'animate-status-in', isStatusSaving && 'opacity-90')} />
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
            {getSortedStatusNames(uiConfig).map((s) => {
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
      </TableCell>
      <TableCell className="align-top">
        <div className="flex -space-x-2">
          {assignedDevelopers.map((dev) => (
            <Tooltip key={dev.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onAvatarClick(dev, true); }}
                  disabled={isOpening}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full disabled:cursor-not-allowed"
                >
                  <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{
                        backgroundColor: `#${getAvatarColor(dev.name)}`,
                      }}
                    >
                      {getInitials(dev.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-normal">{dev.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex -space-x-2">
          {assignedTesters.map((tester) => (
            <Tooltip key={tester.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onAvatarClick(tester, false); }}
                  disabled={isOpening}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full disabled:cursor-not-allowed"
                >
                  <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{
                        backgroundColor: `#${getAvatarColor(tester.name)}`,
                      }}
                    >
                      {getInitials(tester.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-normal">{tester.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TableCell>
      {isRepositoryFieldActive(uiConfig) && (
        <TableCell className="align-top">
          <div className="flex flex-wrap gap-1">
            {visibleRepoBadges.map((repo) => (
              <Badge
                variant="repo"
                key={repo}
                className="text-xs font-medium"
                style={getRepoBadgeStyle(repo)}
              >
                {repo}
              </Badge>
            ))}
            {hiddenRepositories.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="cursor-default rounded-full border-border/50 bg-muted/[0.35] text-xs font-medium text-muted-foreground"
                  >
                    +{hiddenRepositories.length} more
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-[20rem]">
                  <div className="flex flex-wrap gap-1.5 p-0.5">
                    {hiddenRepositories.map((repo) => (
                      <Badge
                        variant="repo"
                        key={`hidden-${repo}`}
                        className="text-xs font-medium"
                        style={getRepoBadgeStyle(repo)}
                      >
                        {repo}
                      </Badge>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>
      )}
      <TableCell className="align-top">
        <EnvironmentStatus
          deploymentStatus={task.deploymentStatus}
          deploymentDates={task.deploymentDates}
          configuredEnvs={allRelevantEnvs}
          size="sm"
          interactive={!isOpening}
          onToggle={handleToggleDeployment}
          justUpdatedEnv={justUpdatedEnv}
          onAnimationEnd={() => setJustUpdatedEnv(null)}
        />
      </TableCell>
      <TableCell className="align-top text-right">
        <div className="flex items-center justify-end gap-2">
            <Button asChild variant="ghost" size="sm" disabled={isOpening} className="font-medium min-w-[80px] justify-center">
                <a href={`/tasks/${task.id}?${currentQueryString}`} onClick={handleRowClick}>
                {isOpening ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
                </a>
            </Button>
            <DeleteTaskButton taskId={task.id} taskTitle={task.title} onSuccess={onTaskUpdate} iconOnly className="h-8 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );
});

export const TasksTable = memo(function TasksTable({
  tasks,
  onTaskDelete,
  uiConfig,
  developers,
  testers,
  selectedTaskIds,
  setSelectedTaskIds,
  isSelectMode,
  openGroups,
  setOpenGroups,
  currentQueryString,
  favoritesOnly,
  isLoading
}: {
  tasks: Task[];
  onTaskDelete: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
  selectedTaskIds: string[];
  setSelectedTaskIds: (ids: string[]) => void;
  isSelectMode: boolean;
  openGroups: string[];
  setOpenGroups: (ids: string[]) => void;
  currentQueryString: string;
  favoritesOnly?: boolean;
  isLoading?: boolean;
}) {
  const PAGE_SIZE = 7;
  const getShowMoreLabel = React.useCallback((count: number) => {
    if (count <= 1) return 'Show 1 more';
    return `Show ${count} more`;
  }, []);
  const [personInView, setPersonInView] = useState<{
    person: Person;
    isDeveloper: boolean;
  } | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [loadingGroupKey, setLoadingGroupKey] = useState<string | null>(null);
  const [loadingBatchCount, setLoadingBatchCount] = useState(0);
  const expandTimerRef = useRef<number | null>(null);

  const groups = React.useMemo(
    () => getOrderedTaskStatusGroups(tasks, uiConfig, favoritesOnly),
    [tasks, uiConfig, favoritesOnly]
  );

  useEffect(() => {
    setVisibleCounts((current) => {
      const next: Record<string, number> = {};
      groups.forEach(({ key, tasks: tasksInGroup }) => {
        const existing = current[key] ?? PAGE_SIZE;
        next[key] = Math.min(Math.max(existing, PAGE_SIZE), tasksInGroup.length);
      });
      return next;
    });
  }, [groups]);

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) {
        window.clearTimeout(expandTimerRef.current);
      }
    };
  }, []);

  const fieldLabels = new Map((uiConfig?.fields || []).map((f) => [f.key, f.label]));
  const developersLabel = fieldLabels.get('developers') || 'Developers';
  const testersLabel = fieldLabels.get('testers') || 'Testers';

  const developersById = new Map(developers.map((d) => [d.id, d]));
  const testersById = new Map(testers.map((t) => [t.id, t.name]).map(([id, name]) => [id, { id, name } as Person]));

  const handleAvatarClick = (person: Person, isDeveloper: boolean) => {
    setPersonInView({ person, isDeveloper });
  };
  
  const handleToggleSelection = (taskId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedTaskIds, taskId]
      : selectedTaskIds.filter(id => id !== taskId);
    setSelectedTaskIds(newSelected);
  };
  
  const showRepositoryColumn = isRepositoryFieldActive(uiConfig);
  const colSpan = isSelectMode ? (showRepositoryColumn ? 8 : 7) : (showRepositoryColumn ? 7 : 6);
  
  const firstGroupTitle = groups[0]?.title || (favoritesOnly ? 'Favorite Tasks' : 'Tasks');

  const renderTaskRows = (tasksToRender: Task[], groupKey?: string) => {
    if (isLoading) {
        return Array.from({ length: 5 }).map((_, i) => (
            <TaskTableRowSkeleton key={`skeleton-row-${i}`} isSelectMode={isSelectMode} showRepositoryColumn={showRepositoryColumn} />
        ));
    }
    if (!uiConfig) return null;
    return tasksToRender.map((task, index) => (
      <TasksTableRow
        key={groupKey ? `${groupKey}-${task.id}` : task.id}
        task={task}
        onTaskUpdate={onTaskDelete}
        uiConfig={uiConfig}
        developersById={developersById}
        testersById={testersById}
        onAvatarClick={handleAvatarClick}
        isSelected={selectedTaskIds.includes(task.id)}
        onToggleSelection={handleToggleSelection}
        isSelectMode={isSelectMode}
        currentQueryString={currentQueryString}
        enterIndex={index}
      />
    ));
  };

  const handleShowMore = (groupKey: string, totalCount: number) => {
    if (loadingGroupKey) return;

    const currentlyVisible = visibleCounts[groupKey] ?? PAGE_SIZE;
    const nextBatch = Math.min(PAGE_SIZE, totalCount - currentlyVisible);
    if (nextBatch <= 0) return;

    setLoadingGroupKey(groupKey);
    setLoadingBatchCount(nextBatch);

    expandTimerRef.current = window.setTimeout(() => {
      setVisibleCounts((current) => ({
        ...current,
        [groupKey]: Math.min((current[groupKey] ?? PAGE_SIZE) + PAGE_SIZE, totalCount),
      }));
      setLoadingGroupKey(null);
      setLoadingBatchCount(0);
      expandTimerRef.current = null;
    }, 280);
  };

  const handleShowFewer = (groupKey: string, totalCount: number) => {
    if (loadingGroupKey === groupKey) return;

    setVisibleCounts((current) => ({
      ...current,
      [groupKey]: Math.min(PAGE_SIZE, totalCount),
    }));
  };
  
  if (isLoading) {
      return (
        <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        {isSelectMode && <TableHead className="w-[50px]"></TableHead>}
                        <TableHead className="font-semibold">{fieldLabels.get('title') || 'Title'}</TableHead>
                        <TableHead className="font-semibold">{fieldLabels.get('status') || 'Status'}</TableHead>
                        <TableHead className="font-semibold">{developersLabel}</TableHead>
                        <TableHead className="font-semibold">{testersLabel}</TableHead>
                        {showRepositoryColumn && <TableHead className="font-semibold">{fieldLabels.get('repositories') || 'Repositories'}</TableHead>}
                        <TableHead className="font-semibold">{fieldLabels.get('deploymentStatus') || 'Deployments'}</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="bg-muted/30 border-b">
                        <TableCell colSpan={colSpan} className="py-3 px-4">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-foreground tracking-tight">{firstGroupTitle}</span>
                                <Skeleton className="h-5 w-8 rounded-full" />
                            </div>
                        </TableCell>
                    </TableRow>
                    {renderTaskRows([])}
                </TableBody>
            </Table>
        </div>
      );
  }

  if (!uiConfig) {
    return null;
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
             {isSelectMode && (
                <TableHead className="w-[50px]"></TableHead>
             )}
            <TableHead className="font-semibold">{fieldLabels.get('title') || 'Title'}</TableHead>
            <TableHead className="font-semibold">{fieldLabels.get('status') || 'Status'}</TableHead>
            <TableHead className="font-semibold">{developersLabel}</TableHead>
            <TableHead className="font-semibold">{testersLabel}</TableHead>
            {showRepositoryColumn && (
              <TableHead className="font-semibold">
                {fieldLabels.get('repositories') || 'Repositories'}
              </TableHead>
            )}
            <TableHead className="font-semibold">
              {fieldLabels.get('deploymentStatus') || 'Deployments'}
            </TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        {groups.map(({ key, title, tasks: tasksInGroup }) => {
            const isOpen = openGroups.includes(key);
            const visibleCount = visibleCounts[key] ?? Math.min(PAGE_SIZE, tasksInGroup.length);
            const visibleTasks = tasksInGroup.slice(0, visibleCount);
            const remainingCount = tasksInGroup.length - visibleTasks.length;
            const canShowFewer = visibleCount > Math.min(PAGE_SIZE, tasksInGroup.length);
            return (
              <React.Fragment key={key}>
                <TableBody>
                <TableRow 
                  className="bg-muted/30 hover:bg-muted/50 cursor-pointer border-b"
                  onClick={() => {
                    const newOpenGroups = isOpen ? openGroups.filter(g => g !== key) : [...openGroups, key];
                    setOpenGroups(newOpenGroups);
                  }}
                >
                  <TableCell colSpan={colSpan} className="py-3 px-4">
                      <div className="flex items-center justify-between">
                          <span className="flex items-center gap-3 font-semibold text-foreground tracking-tight">
                              {title}
                              <Badge className="shrink-0 bg-border text-foreground font-semibold">{tasksInGroup.length}</Badge>
                              {loadingGroupKey === key ? (
                                <span className="inline-flex items-center text-xs font-medium text-primary">
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  Loading more
                                </span>
                              ) : null}
                          </span>
                          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out", isOpen && "rotate-180")} />
                      </div>
                  </TableCell>
                </TableRow>
                </TableBody>
                {isOpen ? (
                  <TableBody className="overflow-hidden animate-accordion-down">
                    {renderTaskRows(visibleTasks, key)}
                    {(remainingCount > 0 || canShowFewer) && loadingGroupKey !== key ? (
                      <TableRow className="animate-in fade-in slide-in-from-top-2 border-b bg-background/70 duration-300">
                        <TableCell colSpan={colSpan} className="px-4 py-4">
                          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-background/65 px-4 py-5 text-center transition-all duration-300 hover:border-primary/30 hover:bg-background">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {remainingCount > 0 ? getShowMoreLabel(Math.min(PAGE_SIZE, remainingCount)) : 'Showing expanded tasks'}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {remainingCount > 0
                                  ? `${remainingCount} more in this status group.`
                                  : 'Collapse back to the first 7 tasks any time.'}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {canShowFewer ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleShowFewer(key, tasksInGroup.length);
                                  }}
                                  className="rounded-xl px-4 text-muted-foreground hover:text-foreground"
                                >
                                  Show fewer
                                </Button>
                              ) : null}
                              {remainingCount > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleShowMore(key, tasksInGroup.length);
                                  }}
                                  className="rounded-xl px-4 shadow-sm"
                                >
                                  <ChevronDown className="mr-2 h-4 w-4" />
                                  {getShowMoreLabel(Math.min(PAGE_SIZE, remainingCount))}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {loadingGroupKey === key
                      ? Array.from({ length: loadingBatchCount }).map((_, index) => (
                          <TaskTableRowSkeleton
                            key={`${key}-loading-${index}`}
                            isSelectMode={isSelectMode}
                            showRepositoryColumn={showRepositoryColumn}
                          />
                        ))
                      : null}
                  </TableBody>
                ) : null}
              </React.Fragment>
          )})}
      </Table>
      <PersonProfileCard
        person={personInView?.person ?? null}
        isDeveloper={personInView?.isDeveloper ?? true}
        typeLabel={personInView?.isDeveloper ? developersLabel : testersLabel}
        isOpen={!!personInView}
        onOpenChange={(isOpen) => !isOpen && setPersonInView(null)}
      />
    </div>
  );
});
