import * as React from "react"
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

interface TaskStatusBadgeProps extends React.ComponentPropsWithoutRef<typeof Badge> {
  status: TaskStatus;
}

export const statusConfig: Record<
  TaskStatus,
  {
    Icon: React.ComponentType<{ className?: string }>;
    className: string;
    cardClassName: string;
    iconColorClassName: string;
  }
> = {
  'To Do': {
    Icon: Circle,
    className:
      'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700',
    cardClassName: 'bg-gray-100/60 dark:bg-gray-500/10 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
    iconColorClassName: 'text-gray-400/20 dark:text-gray-500/15'
  },
  'In Progress': {
    Icon: Loader2,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80 dark:hover:bg-blue-900/60',
    cardClassName: 'bg-blue-100/50 dark:bg-blue-500/10 border-blue-200/80 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
    iconColorClassName: 'text-blue-500/20 dark:text-blue-500/15'
  },
  'Code Review': {
    Icon: GitPullRequest,
    className:
      'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/80 dark:hover:bg-purple-900/60',
    cardClassName: 'bg-purple-100/50 dark:bg-purple-500/10 border-purple-200/80 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
    iconColorClassName: 'text-purple-500/20 dark:text-purple-500/15'
  },
  QA: {
    Icon: Bug,
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80 dark:hover:bg-yellow-900/60',
    cardClassName: 'bg-yellow-100/50 dark:bg-yellow-500/10 border-yellow-200/80 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700',
    iconColorClassName: 'text-yellow-500/20 dark:text-yellow-500/15'
  },
  Done: {
    Icon: CheckCircle2,
    className:
      'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80 dark:hover:bg-green-900/60',
    cardClassName: 'bg-green-100/50 dark:bg-green-500/10 border-green-200/80 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
    iconColorClassName: 'text-green-500/20 dark:text-green-500/15'
  },
};


export const TaskStatusBadge = React.forwardRef<
  React.ElementRef<typeof Badge>,
  TaskStatusBadgeProps
>(({ status, className, ...props }, ref) => {
  const { Icon, className: configClassName } = statusConfig[status];

  return (
    <Badge
      ref={ref}
      variant="outline"
      className={cn('gap-1.5 font-medium capitalize', configClassName, className)}
      {...props}
    >
      <Icon className={cn("h-3 w-3", status === 'In Progress' && 'animate-spin')} />
      <span>{status}</span>
    </Badge>
  );
});
TaskStatusBadge.displayName = 'TaskStatusBadge';
