
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
  PauseCircle,
} from 'lucide-react';

interface TaskStatusBadgeProps extends React.ComponentPropsWithoutRef<typeof Badge> {
  status: TaskStatus;
  variant?: 'default' | 'prominent';
}

type StatusConfig = {
  Icon: React.ComponentType<{ className?: string }>;
  isCustom: boolean;
  className?: string;
  prominentClassName?: string;
  cardClassName?: string;
  iconColorClassName?: string;
};

const coreStatusConfig: Record<string, StatusConfig> = {
  'To Do': {
    Icon: Circle, isCustom: false,
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700',
    prominentClassName: 'border-transparent bg-slate-500 text-slate-50 hover:bg-slate-500/80 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-600/80',
    iconColorClassName: 'text-gray-400/20 dark:text-gray-500/15',
  },
  'In Progress': {
    Icon: Loader2, isCustom: false,
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80 dark:hover:bg-blue-900/60',
    prominentClassName: 'border-transparent bg-blue-600 text-blue-50 hover:bg-blue-600/80 dark:bg-blue-700 dark:text-blue-100 dark:hover:bg-blue-700/80',
    iconColorClassName: 'text-blue-500/20 dark:text-blue-500/15',
  },
  'Code Review': {
    Icon: GitPullRequest, isCustom: false,
    className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/80 dark:hover:bg-purple-900/60',
    prominentClassName: 'border-transparent bg-purple-600 text-purple-50 hover:bg-purple-600/80 dark:bg-purple-700 dark:text-purple-100 dark:hover:bg-purple-700/80',
    iconColorClassName: 'text-purple-500/20 dark:text-purple-500/15',
  },
  'QA': {
    Icon: Bug, isCustom: false,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80 dark:hover:bg-yellow-900/60',
    prominentClassName: 'border-transparent bg-amber-500 text-white hover:bg-amber-500/80 dark:bg-amber-600 dark:hover:bg-amber-600/80',
    iconColorClassName: 'text-yellow-500/20 dark:text-yellow-500/15',
  },
  'Hold': {
    Icon: PauseCircle, isCustom: false,
    className: 'bg-zinc-200 text-zinc-900 border-zinc-300 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700',
    prominentClassName: 'border-transparent bg-zinc-600 text-zinc-50 hover:bg-zinc-600/90 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-700/90',
    cardClassName: 'bg-zinc-200/70 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700/80 hover:border-zinc-400/80 dark:hover:border-zinc-600',
    iconColorClassName: 'text-zinc-500/25 dark:text-zinc-600/25',
  },
  'Done': {
    Icon: CheckCircle2, isCustom: false,
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80 dark:hover:bg-green-900/60',
    prominentClassName: 'border-transparent bg-green-600 text-green-50 hover:bg-green-600/80 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-700/80',
    iconColorClassName: 'text-green-500/20 dark:text-green-500/15',
  },
};

export function getStatusConfig(status: TaskStatus): StatusConfig {
  return coreStatusConfig[status] || coreStatusConfig['To Do'];
}

export const TaskStatusBadge = React.forwardRef<
  React.ElementRef<typeof Badge>,
  TaskStatusBadgeProps
>(({ status, className, variant = 'default', ...props }, ref) => {
  if (!status) return null;

  const config = getStatusConfig(status);
  const { Icon } = config;
  const configClassName = variant === 'prominent' ? config.prominentClassName : config.className;
  
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
