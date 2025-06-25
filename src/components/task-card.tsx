
'use client';

import { useRouter } from 'next/navigation';
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
import { EnvironmentStatus } from './environment-status';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DeleteTaskButton } from './delete-task-button';

interface TaskCardProps {
  task: Task;
  onTaskDelete: () => void;
}

export function TaskCard({ task, onTaskDelete }: TaskCardProps) {
  const router = useRouter();

  const azureWorkItemUrl = task.azureWorkItemId
    ? `https://dev.azure.com/ideaelan/Infinity/_workitems/edit/${task.azureWorkItemId}`
    : null;

  const handleNavigate = () => {
    router.push(`/tasks/${task.id}`);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className="flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card hover:border-primary"
      onClick={handleNavigate}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-3">
            {task.title}
          </CardTitle>
          <div className="flex-shrink-0">
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <a
                href={azureWorkItemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors line-clamp-1"
                onClick={handleActionClick}
              >
                Azure ID: {task.azureWorkItemId}
              </a>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Deployments
          </p>
          <EnvironmentStatus
            deploymentStatus={task.deploymentStatus}
            size="sm"
          />
        </div>
      </CardContent>
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
        <div onClick={handleActionClick}>
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
