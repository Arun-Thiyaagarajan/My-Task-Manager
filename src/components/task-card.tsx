
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Task } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TaskStatusBadge } from './task-status-badge';
import { GitMerge, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteTaskButton } from './delete-task-button';
import { getUiConfig, updateTask } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

interface TaskCardProps {
  task: Task;
  onTaskDelete: () => void;
  onTaskUpdate: () => void;
}

const getEnvInfo = (env: string) => {
  switch (env) {
    case 'dev':
      return {
        deployedColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80',
        pendingColor: 'border-dashed text-blue-600/80 border-blue-400/50 dark:text-blue-400/70 dark:border-blue-500/30 bg-background hover:bg-blue-500/5',
        label: 'Development',
      };
    case 'stage':
      return {
        deployedColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700/80',
        pendingColor: 'border-dashed text-amber-600/80 border-amber-400/50 dark:text-amber-400/70 dark:border-amber-500/30 bg-background hover:bg-amber-500/5',
        label: 'Staging',
      };
    case 'production':
      return {
        deployedColor: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80',
        pendingColor: 'border-dashed text-green-600/80 border-green-400/50 dark:text-green-400/70 dark:border-green-500/30 bg-background hover:bg-green-500/5',
        label: 'Production',
      };
    default:
      return {
        deployedColor: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/80',
        pendingColor: 'border-dashed text-gray-500 border-gray-300 dark:text-gray-400 dark:border-gray-600 bg-background hover:bg-gray-500/5',
        label: env,
      };
  }
};

export function TaskCard({ task: initialTask, onTaskDelete, onTaskUpdate }: TaskCardProps) {
  const [task, setTask] = useState(initialTask);
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const { toast } = useToast();
  const [configuredEnvs, setConfiguredEnvs] = useState<string[]>([]);
  
  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
      const uiConfig = getUiConfig();
      if (uiConfig?.environments) {
          setConfiguredEnvs(uiConfig.environments);
      }
  }, []);

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

  const azureWorkItemUrl = task.azureWorkItemId
    ? `https://dev.azure.com/ideaelan/Infinity/_workitems/edit/${task.azureWorkItemId}`
    : null;

  return (
    <Card
      className="flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card hover:border-primary group"
    >
      <div className="flex flex-col flex-grow">
        <CardHeader className="p-4 pb-2">
           <Link href={`/tasks/${task.id}`} className="flex-grow cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold leading-snug line-clamp-3 group-hover:text-primary">
                  {task.title}
                </CardTitle>
                <div className="flex-shrink-0">
                  <TaskStatusBadge status={task.status} />
                </div>
              </div>
          </Link>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col p-4 pt-2">
          <div className="flex-grow space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <GitMerge className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {(task.repositories || []).map((repo) => (
                  <Badge variant="secondary" key={repo} className="text-xs">
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
                    <TooltipProvider key={env} delayDuration={100}>
                        <Tooltip>
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
                    </TooltipProvider>
                  );
                })}
              </div>
          </div>
        </CardContent>
      </div>
      <CardFooter className="flex items-center justify-between p-4 border-t">
        <div className="flex items-center gap-2">
          {task.developers && task.developers.length > 0 ? (
            <div className="flex -space-x-2">
                <TooltipProvider>
                  {task.developers.map((dev) => (
                    <Tooltip key={dev}>
                      <TooltipTrigger>
                        <Avatar className="h-7 w-7 border-2 border-card">
                          <AvatarFallback 
                            className="text-xs font-semibold text-white"
                            style={{ backgroundColor: `#${getAvatarColor(dev)}` }}
                          >
                            {getInitials(dev)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{dev}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
            </div>
          ) : (
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
  );
}
