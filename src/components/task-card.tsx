import Link from 'next/link';
import type { Task } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { TaskStatusBadge } from './task-status-badge';
import { GitMerge, ExternalLink } from 'lucide-react';
import { EnvironmentStatus } from './environment-status';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DeleteTaskButton } from './delete-task-button';

interface TaskCardProps {
  task: Task;
  onTaskDelete: () => void;
}

export function TaskCard({ task, onTaskDelete }: TaskCardProps) {
  const azureWorkItemUrl = task.azureWorkItemId 
    ? `https://dev.azure.com/ideaelan/Infinity/_workitems/edit/${task.azureWorkItemId}` 
    : null;

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            <Link href={`/tasks/${task.id}`} className="hover:text-primary transition-colors">
              {task.title}
            </Link>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <TaskStatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitMerge className="h-4 w-4 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {task.repositories.map(repo => <Badge variant="secondary" key={repo} className="text-xs">{repo}</Badge>)}
          </div>
        </div>
        
        <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Deployments</p>
            <EnvironmentStatus deploymentStatus={task.deploymentStatus} othersEnvironmentName={task.othersEnvironmentName} size="sm" />
        </div>
        
        {task.developers && task.developers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Assignees</p>
            <div className="flex -space-x-2">
              <TooltipProvider>
                {task.developers.map(dev => (
                  <Tooltip key={dev}>
                    <TooltipTrigger>
                      <Avatar className="h-6 w-6 border-2 border-card">
                        <AvatarImage src={`https://placehold.co/40x40/${getAvatarColor(dev)}/ffffff.png?text=${getInitials(dev)}`} />
                        <AvatarFallback>{getInitials(dev)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{dev}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        )}

        {azureWorkItemUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4 shrink-0" />
            <a
              href={azureWorkItemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors line-clamp-1"
              onClick={(e) => e.stopPropagation()}
            >
              Azure ID: {task.azureWorkItemId}
            </a>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/tasks/${task.id}`}>Manage Task</Link>
        </Button>
        <DeleteTaskButton taskId={task.id} onSuccess={onTaskDelete} />
      </CardFooter>
    </Card>
  );
}
