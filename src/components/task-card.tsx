
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
import { statusConfig, TaskStatusBadge } from './task-status-badge';
import { GitMerge, ExternalLink, Check, Code2, ClipboardCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getInitials, getAvatarColor, cn, getRepoBadgeStyle } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { TASK_STATUSES } from '@/lib/constants';
import { Separator } from './ui/separator';
import { PersonProfileCard } from './person-profile-card';
import { summarizeText } from '@/ai/flows/summarize-flow';
import { Skeleton } from './ui/skeleton';

interface TaskCardProps {
  task: Task;
  onTaskDelete: () => void;
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
}

const getEnvInfo = (env: string) => {
  switch (env) {
    case 'dev':
      return {
        deployedColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80',
        pendingColor: 'border-dashed text-blue-600/80 border-blue-400/50 dark:text-blue-400/70 dark:border-blue-500/30 bg-transparent hover:bg-blue-500/5',
        label: 'Development',
      };
    case 'stage':
      return {
        deployedColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700/80',
        pendingColor: 'border-dashed text-amber-600/80 border-amber-400/50 dark:text-amber-400/70 dark:border-amber-500/30 bg-transparent hover:bg-amber-500/5',
        label: 'Staging',
      };
    case 'production':
      return {
        deployedColor: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80',
        pendingColor: 'border-dashed text-green-600/80 border-green-400/50 dark:text-green-400/70 dark:border-green-500/30 bg-transparent hover:bg-green-500/5',
        label: 'Production',
      };
    default:
      return {
        deployedColor: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/80',
        pendingColor: 'border-dashed text-gray-500 border-gray-300 dark:text-gray-400 dark:border-gray-600 bg-transparent hover:bg-gray-500/5',
        label: env,
      };
  }
};

export function TaskCard({ task: initialTask, onTaskDelete, onTaskUpdate, uiConfig, developers, testers }: TaskCardProps) {
  const [task, setTask] = useState(initialTask);
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const { toast } = useToast();
  const [configuredEnvs, setConfiguredEnvs] = useState<string[]>([]);
  const [personInView, setPersonInView] = useState<{person: Person, type: 'Developer' | 'Tester'} | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
      if (uiConfig?.environments) {
          setConfiguredEnvs(uiConfig.environments);
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
          // Do not show toast for this, as it could be noisy
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

  const handleToggleDeployment = (e: React.MouseEvent, env: string) => {
    e.stopPropagation();
    e.preventDefault();

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

    const updatedTask = updateTask(task.id, updatedTaskData);
    if (updatedTask) {
      setTask(updatedTask);
      setJustUpdatedEnv(env);
      onTaskUpdate();
      toast({
        variant: 'success',
        title: 'Deployment Status Updated',
        description: `Status for ${env} set to ${newIsDeployed ? 'Deployed' : 'Pending'}.`,
        duration: 3000,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update deployment status.',
      });
    }
  };

  const fieldLabels = new Map(uiConfig?.fields.map(f => [f.key, f.label]));
  const developersLabel = fieldLabels.get('developers') || 'Developers';
  const testersLabel = fieldLabels.get('testers') || 'Testers';

  const azureWorkItemUrl = task.azureWorkItemId
    ? `https://dev.azure.com/ideaelan/Infinity/_workitems/edit/${task.azureWorkItemId}`
    : null;
    
  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t]));

  const assignedDevelopers = (task.developers || []).map(id => developersById.get(id)).filter((d): d is Person => !!d);
  const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter((t): t is Person => !!t);

  const hasDevelopers = assignedDevelopers.length > 0;
  const hasTesters = assignedTesters.length > 0;

  const { Icon, cardClassName, iconColorClassName } = statusConfig[task.status];

  return (
    <>
      <TooltipProvider delayDuration={100}>
        <Card
          className={cn(
            "flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group/card rounded-lg",
            cardClassName
          )}
        >
          <Icon className={cn(
            "absolute -bottom-8 -right-8 h-36 w-36 pointer-events-none transition-transform duration-300 ease-in-out group-hover/card:scale-110 group-hover/card:-rotate-6",
            iconColorClassName,
            task.status === 'In Progress' && 'animate-spin'
          )} />
          <div className="flex flex-col flex-grow z-10">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <Link href={`/tasks/${task.id}`} className="flex-grow cursor-pointer">
                        <CardTitle className="text-base font-semibold leading-snug line-clamp-3 text-foreground group-hover/card:text-primary">
                        {task.title}
                        </CardTitle>
                    </Link>
                    <div className="flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0">
                              <TaskStatusBadge status={task.status} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {TASK_STATUSES.map(s => {
                              const { Icon } = statusConfig[s];
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
                {azureWorkItemUrl && (
                  <a 
                      href={azureWorkItemUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span
                      role="link"
                      aria-label={`View Azure Work Item ${task.azureWorkItemId}`}
                      className="line-clamp-1"
                    >
                      Azure ID: {task.azureWorkItemId}
                    </span>
                  </a>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Deployments
                </p>
                <div className="flex flex-wrap items-center gap-1.5" onAnimationEnd={() => setJustUpdatedEnv(null)}>
                    {configuredEnvs.map(env => {
                      const envInfo = getEnvInfo(env);
                      const isSelected = task.deploymentStatus?.[env] ?? false;
                      const hasDate = task.deploymentDates && task.deploymentDates[env];
                      const isDeployed = isSelected && (env === 'dev' || !!hasDate);

                      return (
                        <Tooltip key={env}>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    onClick={(e) => handleToggleDeployment(e, env)}
                                    className={cn(
                                        'capitalize font-medium transition-colors cursor-pointer',
                                        isDeployed ? envInfo.deployedColor : envInfo.pendingColor,
                                        'px-1.5 py-0 text-[10px] h-4',
                                        justUpdatedEnv === env && 'animate-status-in'
                                    )}
                                >
                                    {env}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="capitalize">{envInfo.label}: {isDeployed ? "Deployed" : "Pending"}</p>
                            </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="flex items-center justify-between p-4 border-t border-black/5 dark:border-white/5 z-10">
            <div className="flex items-center gap-3">
                {hasDevelopers && (
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild><Code2 className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p>{developersLabel}</p></TooltipContent>
                    </Tooltip>
                    <div className="flex -space-x-2">
                        {assignedDevelopers.map((dev) => (
                          <Tooltip key={dev.id}>
                            <TooltipTrigger asChild>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPersonInView({ person: dev, type: 'Developer' });
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
                    </div>
                  </div>
                )}

                {hasDevelopers && hasTesters && (
                  <Separator orientation="vertical" className="h-5" />
                )}

                {hasTesters && (
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild><ClipboardCheck className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent><p>{testersLabel}</p></TooltipContent>
                    </Tooltip>
                    <div className="flex -space-x-2">
                        {assignedTesters.map((tester) => (
                          <Tooltip key={tester.id}>
                            <TooltipTrigger asChild>
                               <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setPersonInView({ person: tester, type: 'Tester' });
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
                    </div>
                  </div>
                )}
                
                {!hasDevelopers && !hasTesters && (
                  <div className="text-xs text-muted-foreground italic">No assignees</div>
                )}
            </div>
            <div>
              <DeleteTaskButton
                taskId={task.id}
                onSuccess={onTaskDelete}
                iconOnly
              />
            </div>
          </CardFooter>
        </Card>
      </TooltipProvider>
      <PersonProfileCard
        person={personInView?.person ?? null}
        type={personInView?.type ?? 'Developer'}
        isOpen={!!personInView}
        onOpenChange={(isOpen) => !isOpen && setPersonInView(null)}
      />
    </>
  );
}
