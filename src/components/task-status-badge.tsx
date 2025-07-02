import type { TaskStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Circle,
  Loader2,
  GitPullRequest,
  Bug,
  CheckCircle2,
} from 'lucide-react';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export const statusConfig: Record<
  TaskStatus,
  { icon: React.ReactNode; className: string }
> = {
  'To Do': {
    icon: <Circle className="h-3 w-3" />,
    className:
      'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700',
  },
  'In Progress': {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80 dark:hover:bg-blue-900/60',
  },
  'Code Review': {
    icon: <GitPullRequest className="h-3 w-3" />,
    className:
      'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/80 dark:hover:bg-purple-900/60',
  },
  QA: {
    icon: <Bug className="h-3 w-3" />,
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80 dark:hover:bg-yellow-900/60',
  },
  Done: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80 dark:hover:bg-green-900/60',
  },
};


export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-medium capitalize', config.className, className)}
    >
      {config.icon}
      <span>{status}</span>
    </Badge>
  );
}
