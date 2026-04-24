'use client';

import { Flag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTaskPriorityBadgeClassName, getTaskPriorityLabel } from '@/lib/task-planning';

export function TaskPriorityBadge({
  priority,
  className,
  compact = false,
}: {
  priority?: string | null;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border px-2.5 py-1 font-medium',
        compact ? 'h-6 text-[10px]' : 'text-[11px]',
        getTaskPriorityBadgeClassName(priority),
        className
      )}
    >
      <Flag className={cn('mr-1.5 shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {getTaskPriorityLabel(priority)}
    </Badge>
  );
}
