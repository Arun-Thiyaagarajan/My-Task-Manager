'use client';

import { useState, useEffect, memo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Task, TaskStatus, UiConfig, Person, Environment } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { getStatusConfig, TaskStatusBadge } from './task-status-badge';
import { GitMerge, ExternalLink, Check, Code2, ClipboardCheck, Share2, BellRing, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getInitials, getAvatarColor, cn, getRepoBadgeStyle } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteTaskButton } from './delete-task-button';
import { updateTask } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PersonProfileCard } from './person-profile-card';
import { Skeleton } from './ui/skeleton';
import { EnvironmentStatus } from './environment-status';
import { Checkbox } from './ui/checkbox';
import { FavoriteToggleButton } from './favorite-toggle';
import { ReminderDialog } from './reminder-dialog';
import { ShareMenu } from './share-menu';
import { StatusIcon, getSortedStatusNames, getStatusDisplayName, getStatusStyles, isStatusValue } from '@/lib/status-config';
import { scheduleStatusUpdate } from '@/lib/status-update';
import { getTaskRepositories } from '@/lib/repository-config';

interface TaskCardProps {
  task: Task;
  onTaskDelete: () => void;
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
  selectedTaskIds?: string[];
  setSelectedTaskIds?: (ids: string[]) => void;
  isSelectMode?: boolean;
  pinnedTaskIds: string[];
  onPinToggle: (taskId: string) => void;
  currentQueryString: string;
}

export const TaskCard = memo(function TaskCard({ task: initialTask, onTaskDelete, onTaskUpdate, uiConfig, developers, testers, selectedTaskIds, setSelectedTaskIds, isSelectMode, pinnedTaskIds, onPinToggle, currentQueryString }: TaskCardProps) {
  const [task, setTask] = useState(initialTask);
  const { toast } = useToast();
  const router = useRouter();
  const [taskStatuses, setTaskStatuses] = useState<string[]>([]);
  const [personInView, setPersonInView] = useState<{person: Person, isDeveloper: boolean} | null>(null);
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const [justUpdatedStatus, setJustUpdatedStatus] = useState<string | null>(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const statusDebounceRef = useRef<number | null>(null);
  const statusRequestRef = useRef(0);
  
  const isSelectable = selectedTaskIds !== undefined && setSelectedTaskIds !== undefined;
  const isSelected = isSelectable && (selectedTaskIds || []).includes(task.id);
  
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

  useEffect(() => {
      if (uiConfig) {
          setTaskStatuses(getSortedStatusNames(uiConfig));
      }
  }, [uiConfig]);

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
    if (!task) return;

    const newStatus = !(task.deploymentStatus?.[env] ?? false);
    const updatedTaskData: Partial<Task> = {
        deploymentStatus: {
            ...task.deploymentStatus,
            [env]: newStatus,
        },
    };
  
    const updatedTaskResult = updateTask(task.id, updatedTaskData);
  
    if(updatedTaskResult) {
      setTask(updatedTaskResult);
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
  
  const handleSelectionChange = () => {
    if (!isSelectable) return;
    const newSelected = isSelected
      ? (selectedTaskIds || []).filter(id => id !== task.id)
      : [...(selectedTaskIds || []), task.id];
    setSelectedTaskIds(newSelected);
  };

  const handleOpenTask = (e: React.MouseEvent) => {
    if (isOpening) return;

    // Selection mode logic
    if (isSelectMode) {
      handleSelectionChange();
      return;
    }
    
    const target = e.target as HTMLElement;
    // Don't trigger card opening if clicking actions, buttons, or specialized triggers
    if (target.closest('button') || target.closest('.dropdown-trigger') || target.closest('[role="menuitem"]')) {
        return;
    }

    // Allow standard browser behaviors for links (middle click, cmd+click)
    if (e.metaKey || e.ctrlKey || e.button === 1) return;

    e.preventDefault();
    setIsOpening(true);
    window.dispatchEvent(new Event('navigation-start'));
    router.push(`/tasks/${task.id}?${currentQueryString}`);
  };

  const fieldLabels = new Map((uiConfig?.fields || []).map(f => [f.key, f.label]));
  const developersLabel = fieldLabels.get('developers') || 'Developers';
  const testersLabel = fieldLabels.get('testers') || 'Testers';

  const azureFieldConfig = (uiConfig?.fields || []).find(f => f.key === 'azureWorkItemId' && f.isActive);
  const azureWorkItemUrl = task.azureWorkItemId && azureFieldConfig?.baseUrl
    ? `${azureFieldConfig.baseUrl}${task.azureWorkItemId}`
    : null;
    
  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t.name]).map(([id, name]) => [id, { id, name } as Person]));

  const assignedDevelopers = (task.developers || []).map(id => developersById.get(id)).filter((d): d is Person => !!d);
  const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter((t): t is Person => !!t);

  const hasDevelopers = assignedDevelopers.length > 0;
  const hasTesters = assignedTesters.length > 0;
  
  const MAX_VISIBLE_AVATARS = 2;
  
  const visibleDevelopers = assignedDevelopers.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenDevelopersCount = assignedDevelopers.length - MAX_VISIBLE_AVATARS;
  const hiddenDevelopers = assignedDevelopers.slice(MAX_VISIBLE_AVATARS);

  const visibleTesters = assignedTesters.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenTestersCount = assignedTesters.length - MAX_VISIBLE_AVATARS;
  const hiddenTesters = assignedTesters.slice(MAX_VISIBLE_AVATARS);

  const showMoreOptions = assignedDevelopers.length > 2 || assignedTesters.length > 2;

  const statusConfig = getStatusConfig(task.status, uiConfig);
  const { cardClassName } = statusConfig;

  const allRelevantEnvs = (uiConfig?.environments || []).filter(e => (task.relevantEnvironments || ['dev','stage','production']).includes(e.name));
  const visibleRepositories = getTaskRepositories(task, uiConfig);

  return (
    <>
      <div
        id={`task-card-${task.id}`}
        onClick={handleOpenTask}
        className="relative h-full cursor-pointer rounded-xl transition-all"
      >
        <Card
          className={cn(
            "group/card relative flex h-full flex-col overflow-hidden rounded-xl border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] transition-all duration-300",
            cardClassName,
            !isSelectMode && !isOpening && "hover:-translate-y-1 hover:shadow-[0_24px_52px_-34px_rgba(15,23,42,0.7)]",
            isSelected && "selected-card",
            isOpening && "opacity-80"
          )}
          style={statusConfig.cardStyle}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))] opacity-60" />
          {isOpening && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Opening</span>
                </div>
            </div>
          )}

          {isSelectable && isSelectMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleSelectionChange}
              className="absolute left-3 top-3 z-20 h-5 w-5 bg-background/80"
              aria-label={`Select task ${task.title}`}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <StatusIcon status={task.status} uiConfig={uiConfig} className={cn(
            "absolute -bottom-8 -right-8 h-36 w-36 pointer-events-none transition-transform duration-300 ease-in-out",
            !isStatusValue(task.status, 'in_progress', uiConfig) && 'group-hover/card:scale-110 group-hover/card:-rotate-6'
          )} style={statusConfig.backgroundIconStyle} />
          <div className="flex flex-col flex-grow z-10">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-grow min-w-0 flex items-center gap-2">
                        <Link
                          href={`/tasks/${task.id}?${currentQueryString}`}
                          className="flex-grow min-w-0 group/title"
                          onClick={(e) => {
                            if (isSelectMode || isOpening) {
                              e.preventDefault();
                            }
                          }}
                        >
                            <CardTitle className="line-clamp-2 text-base font-medium leading-snug text-foreground transition-colors group-hover/card:text-primary">
                              {task.title}
                            </CardTitle>
                        </Link>
                        
                        {uiConfig?.remindersEnabled && (
                            <div className="flex-shrink-0" id={`task-card-reminder-btn-${task.id}`}>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          disabled={isOpening}
                                          className="h-7 w-7 rounded-full bg-background/20 transition-colors hover:bg-background/50"
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setIsReminderOpen(true);
                                          }}
                                      >
                                          <BellRing className={cn("h-4 w-4 text-muted-foreground", task.reminder && "text-amber-600 dark:text-amber-400")} />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p className="font-normal">{task.reminder ? 'Edit Reminder' : 'Set Reminder'}</p>
                                  </TooltipContent>
                              </Tooltip>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              disabled={isOpening}
                              className="h-auto rounded-2xl bg-background/10 p-0.5 transition-all duration-200 hover:bg-background/45 hover:shadow-[0_10px_24px_-22px_rgba(15,23,42,0.85)] focus-visible:ring-0 focus-visible:ring-offset-0 dark:hover:bg-background/35"
                              onClick={e => e.stopPropagation()}
                            >
                              <TaskStatusBadge status={task.status} uiConfig={uiConfig} className={cn((isStatusSaving || justUpdatedStatus === task.status) && 'animate-status-in', isStatusSaving && 'opacity-90')} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="bottom"
                            align="end"
                            sideOffset={10}
                            collisionPadding={12}
                            onClick={e => e.stopPropagation()}
                            className="max-h-[min(24rem,calc(100vh-1.5rem))] w-[min(12.75rem,calc(100vw-0.75rem))] overflow-y-auto no-scrollbar rounded-[1.2rem] border-border/50 bg-background/95 p-1 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.5)] backdrop-blur-xl"
                          >
                            <DropdownMenuLabel className="px-2 pt-1 pb-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Set Status</DropdownMenuLabel>
                            <DropdownMenuSeparator className="mx-1 my-1 bg-border/50" />
                            {(taskStatuses || []).map(s => {
                              const currentStatusConfig = getStatusConfig(s, uiConfig);
                              const currentStatusStyles = getStatusStyles(s, uiConfig);
                              const isSelectedStatus = getStatusDisplayName(task.status, uiConfig) === s;
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onSelect={() => handleStatusChange(s)}
                                  className="rounded-lg px-2 py-1.5 font-normal focus:bg-transparent dark:focus:bg-transparent"
                                  style={isSelectedStatus ? {
                                    backgroundColor: currentStatusStyles.defaultStyle.backgroundColor,
                                    color: currentStatusStyles.defaultStyle.color,
                                  } : undefined}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[0.75rem]"
                                      style={{
                                        backgroundColor: `color-mix(in srgb, ${String(currentStatusStyles.defaultStyle.color)} 18%, rgba(15,23,42,0.38))`,
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
            <CardContent className="flex flex-grow flex-col p-4 pt-2">
              <div className="relative mb-3 min-h-[40px] text-sm text-muted-foreground">
                <p className="line-clamp-2 leading-relaxed font-normal">
                  {task.summary || task.description}
                </p>
              </div>
              <div className="flex-grow space-y-3">
                {visibleRepositories.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <GitMerge className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {visibleRepositories.map((repo) => (
                        <Badge 
                          variant="repo" 
                          key={repo} 
                          className="max-w-full truncate text-[10px] font-medium uppercase tracking-wider"
                          style={getRepoBadgeStyle(repo)}
                        >
                          {repo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {azureFieldConfig?.isActive && task.azureWorkItemId && (
                  <a 
                      href={azureWorkItemUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={cn(
                          "flex items-center gap-2 text-sm font-normal text-muted-foreground transition-colors",
                          azureWorkItemUrl ? "hover:text-primary" : "pointer-events-none"
                      )}
                      onClick={(e) => {
                          if (!azureWorkItemUrl) e.preventDefault();
                          e.stopPropagation();
                      }}
                    >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span
                      role={azureWorkItemUrl ? "link" : "text"}
                      aria-label={`View Azure Work Item ${task.azureWorkItemId}`}
                      className="line-clamp-1"
                    >
                      {azureFieldConfig.label}: {task.azureWorkItemId}
                    </span>
                  </a>
                )}
              </div>
              
              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deployments
                </p>
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
              </div>
            </CardContent>
          </div>
          <CardFooter className="z-10 flex items-center justify-between border-t border-black/5 p-4 dark:border-white/5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  {hasDevelopers && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Tooltip>
                            <TooltipTrigger asChild><Code2 className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent><p className="font-normal">{developersLabel}</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center -space-x-2">
                          {visibleDevelopers.map((dev) => (
                            <Tooltip key={dev.id}>
                              <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setPersonInView({ person: dev, isDeveloper: true });
                                    }}
                                    disabled={isOpening}
                                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full disabled:cursor-not-allowed"
                                >
                                  <Avatar className="h-7 w-7 cursor-pointer border-2 border-background">
                                    <AvatarFallback 
                                      className="text-[10px] font-medium text-white"
                                      style={{ backgroundColor: `#${getAvatarColor(dev.name)}` }}
                                    >
                                      {getInitials(dev.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p className="font-normal">{dev.name}</p></TooltipContent>
                            </Tooltip>
                          ))}
                          {hiddenDevelopersCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="relative z-[2] h-7 w-7 border-2 border-background">
                                  <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">+{hiddenDevelopersCount}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm p-1 space-y-1 font-normal">
                                    <p className="font-medium">More {developersLabel}:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        {hiddenDevelopers.map(dev => <li key={dev.id}>{dev.name}</li>)}
                                    </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                    </div>
                  )}

                  {hasTesters && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Tooltip>
                            <TooltipTrigger asChild><ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent><p className="font-normal">{testersLabel}</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex -space-x-2">
                          {visibleTesters.map((tester) => (
                            <Tooltip key={tester.id}>
                              <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPersonInView({ person: tester, isDeveloper: false }); }}
                                    disabled={isOpening}
                                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full disabled:cursor-not-allowed"
                                >
                                  <Avatar className="h-7 w-7 cursor-pointer border-2 border-background">
                                    <AvatarFallback
                                      className="text-[10px] font-medium text-white"
                                      style={{ backgroundColor: `#${getAvatarColor(tester.name)}` }}
                                    >
                                      {getInitials(tester.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p className="font-normal">{tester.name}</p></TooltipContent>
                            </Tooltip>
                          ))}
                          {hiddenTestersCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="relative z-[2] h-7 w-7 border-2 border-background">
                                  <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">+{hiddenTestersCount}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm p-1 space-y-1 font-normal">
                                    <p className="font-medium">More {testersLabel}:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        {hiddenTesters.map(tester => <li key={tester.id}>{tester.name}</li>)}
                                    </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                    </div>
                  )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <FavoriteToggleButton
                taskId={task.id}
                isFavorite={!!task.isFavorite}
                onUpdate={onTaskUpdate}
              />
              {showMoreOptions ? (
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isOpening} className="h-8 w-8 rounded-full bg-background/20 hover:bg-background/50">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                    <DropdownMenuLabel className="font-medium">Actions</DropdownMenuLabel>
                    <ShareMenu 
                      task={task} 
                      uiConfig={uiConfig!} 
                      developers={developers} 
                      testers={testers}
                      asSubmenu
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      <span className="font-normal">Share</span>
                    </ShareMenu>
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <DeleteTaskButton
                        taskId={task.id}
                        taskTitle={task.title}
                        onSuccess={onTaskDelete}
                      >
                        <div className="flex items-center font-normal">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </div>
                      </DeleteTaskButton>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <ShareMenu task={task} uiConfig={uiConfig!} developers={developers} testers={testers}>
                    <Button variant="ghost" size="icon" disabled={isOpening} className="h-8 w-8 rounded-full bg-background/20 hover:bg-background/50" onClick={e => e.stopPropagation()}>
                      <Share2 className="h-4 w-4" />
                      <span className="sr-only">Share Task</span>
                    </Button>
                  </ShareMenu>
                  <DeleteTaskButton
                    taskId={task.id}
                    taskTitle={task.title}
                    onSuccess={onTaskDelete}
                    iconOnly
                    className="h-8 w-8"
                  />
                </>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
      <PersonProfileCard
        person={personInView?.person ?? null}
        isDeveloper={personInView?.isDeveloper ?? true}
        typeLabel={personInView?.isDeveloper ? developersLabel : testersLabel}
        isOpen={!!personInView}
        onOpenChange={(isOpen) => !isOpen && setPersonInView(null)}
      />
      {uiConfig?.remindersEnabled && task && (
        <ReminderDialog
          isOpen={isReminderOpen}
          onOpenChange={setIsReminderOpen}
          task={task}
          onSuccess={() => {
            onTaskUpdate();
            const updated = updateTask(task.id, {});
            if (updated) setTask(updated);
          }}
          pinnedTaskIds={pinnedTaskIds || []}
          onPinToggle={onPinToggle}
        />
      )}
    </>
  );
});
