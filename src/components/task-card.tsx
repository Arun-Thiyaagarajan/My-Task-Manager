

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Task, TaskStatus, UiConfig, Person } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStatusConfig, TaskStatusBadge } from './task-status-badge';
import { GitMerge, ExternalLink, Check, Code2, ClipboardCheck, Share2, BellRing } from 'lucide-react';
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
import { summarizeText } from '@/ai/flows/summarize-flow';
import { Skeleton } from './ui/skeleton';
import { EnvironmentStatus } from './environment-status';
import { Checkbox } from './ui/checkbox';
import { FavoriteToggleButton } from './favorite-toggle';
import { ReminderDialog } from './reminder-dialog';
import { ShareMenu } from './share-menu';

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
}

export function TaskCard({ task: initialTask, onTaskDelete, onTaskUpdate, uiConfig, developers, testers, selectedTaskIds, setSelectedTaskIds, isSelectMode, pinnedTaskIds, onPinToggle }: TaskCardProps) {
  const [task, setTask] = useState(initialTask);
  const { toast } = useToast();
  const [taskStatuses, setTaskStatuses] = useState<string[]>([]);
  const [personInView, setPersonInView] = useState<{person: Person, isDeveloper: boolean} | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  
  const isSelectable = selectedTaskIds !== undefined && setSelectedTaskIds !== undefined;
  const isSelected = isSelectable && (selectedTaskIds || []).includes(task.id);
  
  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
      if (uiConfig?.taskStatuses) {
          setTaskStatuses(uiConfig.taskStatuses);
      }
  }, [uiConfig]);

  useEffect(() => {
    const summarize = async () => {
      if (task.description && !task.summary && !isSummarizing) {
        setIsSummarizing(true);
        try {
          const result = await summarizeText({ textToSummarize: task.description });
          const updatedTask = updateTask(task.id, { summary: result.summary });
          if (updatedTask) {
            setTask(updatedTask);
            onTaskUpdate();
          }
        } catch (error) {
          console.error("Failed to summarize:", error);
        } finally {
          setIsSummarizing(false);
        }
      }
    };

    summarize();
  }, [task.id, task.description, task.summary, isSummarizing, onTaskUpdate]);

  const handleStatusChange = (newStatus: TaskStatus) => {
    const updatedTask = updateTask(task.id, { status: newStatus });
    if (updatedTask) {
      setTask(updatedTask);
      onTaskUpdate();
      toast({
        variant: 'success',
        title: 'Status Updated',
        description: `Task status changed to "${newStatus}".`,
        duration: 3000,
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

    const newDeploymentStatus = { ...(task.deploymentStatus || {}) };
    const newDeploymentDates = { ...(task.deploymentDates || {}) };

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

  const fieldLabels = new Map(uiConfig?.fields.map(f => [f.key, f.label]));
  const developersLabel = fieldLabels.get('developers') || 'Developers';
  const testersLabel = fieldLabels.get('testers') || 'Testers';

  const azureFieldConfig = uiConfig?.fields.find(f => f.key === 'azureWorkItemId' && f.isActive);
  const azureWorkItemUrl = task.azureWorkItemId && azureFieldConfig?.baseUrl
    ? `${azureFieldConfig.baseUrl}${task.azureWorkItemId}`
    : null;
    
  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t]));

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

  const statusConfig = getStatusConfig(task.status);
  const { Icon, cardClassName, iconColorClassName } = statusConfig;

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (isSelectMode) {
            handleSelectionChange();
          }
        }}
        className={cn(
          "h-full rounded-lg transition-all",
          isSelectMode && "cursor-pointer",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <Card
          className={cn(
            "flex flex-col h-full transition-all duration-300 relative overflow-hidden group/card rounded-lg",
            cardClassName,
            !isSelectMode && "hover:shadow-xl hover:-translate-y-1"
          )}
        >
          {isSelectable && isSelectMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleSelectionChange}
              className="absolute top-3 left-3 z-20 h-5 w-5 bg-background/80"
              aria-label={`Select task ${task.title}`}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Icon className={cn(
            "absolute -bottom-8 -right-8 h-36 w-36 pointer-events-none transition-transform duration-300 ease-in-out",
            iconColorClassName,
            task.status !== 'In Progress' && 'group-hover/card:scale-110 group-hover/card:-rotate-6'
          )} />
          <div className="flex flex-col flex-grow z-10">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-grow min-w-0 flex items-center gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="flex-grow min-w-0 cursor-pointer group/title"
                          onClick={(e) => {
                            if (isSelectMode) {
                              e.preventDefault();
                            }
                          }}
                        >
                            <CardTitle className="text-base font-semibold leading-snug line-clamp-2 text-foreground group-hover/card:text-primary transition-colors">
                              {task.title}
                            </CardTitle>
                        </Link>
                        
                        {uiConfig?.remindersEnabled && (
                            <div className="flex-shrink-0">
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setIsReminderOpen(true);
                                          }}
                                      >
                                          <BellRing className={cn("h-4 w-4 text-muted-foreground", task.reminder && "text-amber-600 dark:text-amber-400")} />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{task.reminder ? 'Edit Reminder' : 'Set Reminder'}</p>
                                  </TooltipContent>
                              </Tooltip>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" onClick={e => e.stopPropagation()}>
                              <TaskStatusBadge status={task.status} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {taskStatuses.map(s => {
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
            <CardContent className="flex-grow flex flex-col p-4 pt-2">
              <div className="relative mb-3 text-sm text-muted-foreground min-h-[40px]">
                {isSummarizing || (task.description && !task.summary) ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : (
                  <p className={cn("line-clamp-2", task.summary && "italic")}>
                    {task.summary || task.description}
                  </p>
                )}
              </div>
              <div className="flex-grow space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <GitMerge className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {(task.repositories || []).map((repo) => (
                      <Badge 
                        variant="repo" 
                        key={repo} 
                        className="text-xs"
                        style={getRepoBadgeStyle(repo)}
                      >
                        {repo}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {azureFieldConfig?.isActive && task.azureWorkItemId && (
                  <a 
                      href={azureWorkItemUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={cn(
                          "flex items-center gap-2 text-sm text-muted-foreground transition-colors",
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
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Deployments
                </p>
                <EnvironmentStatus
                  deploymentStatus={task.deploymentStatus}
                  deploymentDates={task.deploymentDates}
                  configuredEnvs={uiConfig?.environments || []}
                  size="sm"
                  interactive={true}
                  onToggle={handleToggleDeployment}
                  justUpdatedEnv={justUpdatedEnv}
                  onAnimationEnd={() => setJustUpdatedEnv(null)}
                />
              </div>
            </CardContent>
          </div>
          <CardFooter className="flex items-center justify-between p-4 border-t border-black/5 dark:border-white/5 z-10">
            <div className="flex flex-1 min-w-0 items-center gap-4">
              <div className="flex items-center gap-2">
                  {hasDevelopers && (
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                          <TooltipTrigger asChild><Code2 className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p>{developersLabel}</p></TooltipContent>
                      </Tooltip>
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
                                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                                >
                                  <Avatar className="h-7 w-7 border-2 border-background cursor-pointer">
                                    <AvatarFallback 
                                      className="text-xs font-semibold text-white"
                                      style={{ backgroundColor: `#${getAvatarColor(dev.name)}` }}
                                    >
                                      {getInitials(dev.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p>{dev.name}</p></TooltipContent>
                            </Tooltip>
                          ))}
                          {hiddenDevelopersCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                                  <span className="text-xs font-medium text-muted-foreground">+{hiddenDevelopersCount}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm p-1 space-y-1">
                                    <p className="font-semibold">More {developersLabel}:</p>
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
                      <Tooltip>
                          <TooltipTrigger asChild><ClipboardCheck className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p>{testersLabel}</p></TooltipContent>
                      </Tooltip>
                      <div className="flex -space-x-2">
                          {visibleTesters.map((tester) => (
                            <Tooltip key={tester.id}>
                              <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setPersonInView({ person: tester, isDeveloper: false });
                                    }}
                                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                                >
                                  <Avatar className="h-7 w-7 border-2 border-background cursor-pointer">
                                    <AvatarFallback 
                                      className="text-xs font-semibold text-white"
                                      style={{ backgroundColor: `#${getAvatarColor(tester.name)}` }}
                                    >
                                      {getInitials(tester.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p>{tester.name}</p></TooltipContent>
                            </Tooltip>
                          ))}
                          {hiddenTestersCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                                    <span className="text-xs font-medium text-muted-foreground">+{hiddenTestersCount}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm p-1 space-y-1">
                                    <p className="font-semibold">More {testersLabel}:</p>
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
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <FavoriteToggleButton
                    taskId={task.id}
                    isFavorite={!!task.isFavorite}
                    onUpdate={onTaskUpdate}
                />
                
                <ShareMenu task={task} uiConfig={uiConfig!} developers={developers} testers={testers}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
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
}
