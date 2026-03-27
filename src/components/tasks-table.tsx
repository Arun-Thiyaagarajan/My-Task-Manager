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
  Check,
  CheckCircle2,
  ChevronDown,
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
import { StatusIcon, getSortedStatusNames, getStatusDisplayName, isStatusValue, getStatusId } from '@/lib/status-config';
import { scheduleStatusUpdate } from '@/lib/status-update';

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
  currentQueryString
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
      deploymentDates: { ...task.deploymentDates },
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

  return (
    <TableRow 
        key={task.id} 
        className={cn(
            "group/row relative transition-opacity duration-300", 
            isOpening && "opacity-60 pointer-events-none"
        )} 
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
        </div>
      </TableCell>
      <TableCell className="align-top">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={isOpening}
              className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <TaskStatusBadge status={task.status} uiConfig={uiConfig} className={cn((isStatusSaving || justUpdatedStatus === task.status) && 'animate-status-in', isStatusSaving && 'opacity-90')} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-medium">Set Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {getSortedStatusNames(uiConfig).map((s) => {
              const currentStatusConfig = getStatusConfig(s, uiConfig);
              return (
                <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)} className="font-normal">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={s} uiConfig={uiConfig} className={cn("h-3 w-3", currentStatusConfig.shouldSpin && 'animate-spin')} />
                    <span>{s}</span>
                  </div>
                  {getStatusDisplayName(task.status, uiConfig) === s && <Check className="ml-auto h-4 w-4" />}
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
      <TableCell className="align-top">
        <div className="flex flex-wrap gap-1">
          {(task.repositories || []).map((repo) => (
            <Badge
              variant="repo"
              key={repo}
              className="text-xs font-medium"
              style={getRepoBadgeStyle(repo)}
            >
              {repo}
            </Badge>
          ))}
        </div>
      </TableCell>
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
  const [personInView, setPersonInView] = useState<{
    person: Person;
    isDeveloper: boolean;
  } | null>(null);

  const priorityStatusIds = ['todo', 'in_progress', 'code_review', 'qa'];
  
  const priorityTasks = tasks.filter(task => priorityStatusIds.includes(getStatusId(task.status, uiConfig)));
  const completedTasks = tasks.filter(task => getStatusId(task.status, uiConfig) === 'done');
  const holdTasks = tasks.filter(task => getStatusId(task.status, uiConfig) === 'hold');
  const otherTasks = tasks.filter(task => 
    !priorityStatusIds.includes(getStatusId(task.status, uiConfig)) && 
    getStatusId(task.status, uiConfig) !== 'done' && 
    getStatusId(task.status, uiConfig) !== 'hold'
  );

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
  
  const colSpan = isSelectMode ? 8 : 7;
  
  const getPriorityTitle = () => {
    const allStatuses = new Set(priorityTasks.map(t => t.status));
    let baseTitle = "Active Tasks";
    
    if (allStatuses.size === 1 && !isLoading) {
      baseTitle = `${[...allStatuses][0]} Tasks`;
    }
    
    return favoritesOnly ? `Favorite ${baseTitle}` : baseTitle;
  }
  const priorityTitle = getPriorityTitle() || 'Tasks';

  const renderTaskRows = (tasksToRender: Task[]) => {
    if (isLoading) {
        return Array.from({ length: 5 }).map((_, i) => (
            <TaskTableRowSkeleton key={`skeleton-row-${i}`} isSelectMode={isSelectMode} />
        ));
    }
    if (!uiConfig) return null;
    return tasksToRender.map((task) => (
      <TasksTableRow
        key={task.id}
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
      />
    ));
  };
  
  const groups: { key: string, title: string, tasks: Task[] }[] = [];

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
                        <TableHead className="font-semibold">{fieldLabels.get('repositories') || 'Repositories'}</TableHead>
                        <TableHead className="font-semibold">{fieldLabels.get('deploymentStatus') || 'Deployments'}</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="bg-muted/30 border-b">
                        <TableCell colSpan={colSpan} className="py-3 px-4">
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-foreground tracking-tight">{priorityTitle}</span>
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

  if (priorityTasks.length > 0) groups.push({ key: 'priority', title: priorityTitle!, tasks: priorityTasks });
  if (completedTasks.length > 0) groups.push({ key: 'completed', title: favoritesOnly ? 'Favorite Completed Tasks' : 'Completed Tasks', tasks: completedTasks });
  if (otherTasks.length > 0) groups.push({ key: 'other', title: favoritesOnly ? 'Favorite Other Tasks' : 'Other Tasks', tasks: otherTasks });
  if (holdTasks.length > 0) groups.push({ key: 'hold', title: favoritesOnly ? 'Favorite On Hold Tasks' : 'On Hold Tasks', tasks: holdTasks });

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
            <TableHead className="font-semibold">
              {fieldLabels.get('repositories') || 'Repositories'}
            </TableHead>
            <TableHead className="font-semibold">
              {fieldLabels.get('deploymentStatus') || 'Deployments'}
            </TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
           {groups.map(({ key, title, tasks: tasksInGroup }) => {
            const isOpen = openGroups.includes(key);
            return (
              <React.Fragment key={key}>
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
                          </span>
                          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out", isOpen && "rotate-180")} />
                      </div>
                  </TableCell>
                </TableRow>
                {isOpen && renderTaskRows(tasksInGroup)}
              </React.Fragment>
          )})}
        </TableBody>
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
