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

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
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
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <TaskStatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitMerge className="h-4 w-4 shrink-0" />
          <span>{task.repository}</span>
        </div>
        {task.azureId && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4 shrink-0" />
            <a
              href={task.azureId}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors line-clamp-1"
              onClick={(e) => e.stopPropagation()}
            >
              Azure Work Item
            </a>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/tasks/${task.id}`}>Manage Task</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
