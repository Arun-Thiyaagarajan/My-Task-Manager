
import * as React from "react"
import type { TaskStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn, getStatusStyle } from '@/lib/utils';
import {
  Circle,
  Loader2,
  GitPullRequest,
  Bug,
  CheckCircle2,
  Tag
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
  listClassName?: string;
  titleBgClassName?: string;
};

const coreStatusConfig: Record<string, StatusConfig> = {
  'To Do': {
    Icon: Circle, isCustom: false,
    className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700',
    prominentClassName: 'border-transparent bg-slate-500 text-slate-50 hover:bg-slate-500/80 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-600/80',
    cardClassName: 'bg-gray-100/60 dark:bg-gray-500/10 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
    iconColorClassName: 'text-gray-400/20 dark:text-gray-500/15',
    listClassName: 'border-l-4 border-slate-500 dark:border-slate-600',
    titleBgClassName: 'bg-gray-200/50 dark:bg-gray-500/20'
  },
  'In Progress': {
    Icon: Loader2, isCustom: false,
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/80 dark:hover:bg-blue-900/60',
    prominentClassName: 'border-transparent bg-blue-600 text-blue-50 hover:bg-blue-600/80 dark:bg-blue-700 dark:text-blue-100 dark:hover:bg-blue-700/80',
    cardClassName: 'bg-blue-100/50 dark:bg-blue-500/10 border-blue-200/80 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
    iconColorClassName: 'text-blue-500/20 dark:text-blue-500/15',
    listClassName: 'border-l-4 border-blue-600 dark:border-blue-700',
    titleBgClassName: 'bg-blue-200/50 dark:bg-blue-500/20'
  },
  'Code Review': {
    Icon: GitPullRequest, isCustom: false,
    className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/80 dark:hover:bg-purple-900/60',
    prominentClassName: 'border-transparent bg-purple-600 text-purple-50 hover:bg-purple-600/80 dark:bg-purple-700 dark:text-purple-100 dark:hover:bg-purple-700/80',
    cardClassName: 'bg-purple-100/50 dark:bg-purple-500/10 border-purple-200/80 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
    iconColorClassName: 'text-purple-500/20 dark:text-purple-500/15',
    listClassName: 'border-l-4 border-purple-600 dark:border-purple-700',
    titleBgClassName: 'bg-purple-200/50 dark:bg-purple-500/20'
  },
  'QA': {
    Icon: Bug, isCustom: false,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/80 dark:hover:bg-yellow-900/60',
    prominentClassName: 'border-transparent bg-amber-500 text-white hover:bg-amber-500/80 dark:bg-amber-600 dark:hover:bg-amber-600/80',
    cardClassName: 'bg-yellow-100/50 dark:bg-yellow-500/10 border-yellow-200/80 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700',
    iconColorClassName: 'text-yellow-500/20 dark:text-yellow-500/15',
    listClassName: 'border-l-4 border-amber-500 dark:border-amber-600',
    titleBgClassName: 'bg-yellow-200/50 dark:bg-yellow-500/20'
  },
  'Done': {
    Icon: CheckCircle2, isCustom: false,
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/80 dark:hover:bg-green-900/60',
    prominentClassName: 'border-transparent bg-green-600 text-green-50 hover:bg-green-600/80 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-700/80',
    cardClassName: 'bg-green-100/50 dark:bg-green-500/10 border-green-200/80 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
    iconColorClassName: 'text-green-500/20 dark:text-green-500/15',
    listClassName: 'border-l-4 border-green-600 dark:border-green-700',
    titleBgClassName: 'bg-green-200/50 dark:bg-green-500/20'
  },
};

const customStatusConfig: StatusConfig = {
    Icon: Tag, isCustom: true,
    className: 'bg-[var(--status-badge-bg)] text-[var(--status-badge-text)] border-[var(--status-badge-border)] hover:opacity-80 dark:bg-[var(--dark-status-badge-bg)] dark:text-[var(--dark-status-badge-text)] dark:border-[var(--dark-status-badge-border)]',
    prominentClassName: 'border-transparent bg-[var(--status-badge-prominent-bg)] text-[var(--status-badge-prominent-text)] hover:opacity-80',
    cardClassName: 'bg-[var(--status-card-bg)] dark:bg-[var(--dark-status-card-bg)] border-[var(--status-card-border)] dark:border-[var(--dark-status-card-border)] hover:border-[var(--status-card-border-hover)] dark:hover:border-[var(--dark-status-card-border-hover)]',
    iconColorClassName: 'text-[var(--status-icon-color)] dark:text-[var(--dark-status-icon-color)]',
    listClassName: 'border-l-4 border-[var(--status-list-border)] dark:border-[var(--dark-status-list-border)]',
    titleBgClassName: 'bg-[var(--status-title-bg)] dark:bg-[var(--dark-status-title-bg)]'
};

export function getStatusConfig(status: TaskStatus): StatusConfig {
  return coreStatusConfig[status] || customStatusConfig;
}

export const TaskStatusBadge = React.forwardRef<
  React.ElementRef<typeof Badge>,
  TaskStatusBadgeProps
>(({ status, className, variant = 'default', ...props }, ref) => {
  if (!status) return null;

  const config = getStatusConfig(status);
  const { Icon } = config;
  const customStyle = config.isCustom ? getStatusStyle(status) : {};
  const configClassName = variant === 'prominent' ? config.prominentClassName : config.className;
  
  return (
    <Badge
      ref={ref}
      variant="outline"
      className={cn('gap-1.5 font-medium capitalize', configClassName, className)}
      style={customStyle}
      {...props}
    >
      <Icon className={cn("h-3 w-3", status === 'In Progress' && 'animate-spin')} />
      <span>{status}</span>
    </Badge>
  );
});
TaskStatusBadge.displayName = 'TaskStatusBadge';
