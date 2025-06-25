import type { TaskStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const statusColors: Record<TaskStatus, string> = {
    'To Do': 'bg-gray-400 hover:bg-gray-400/90',
    'In Progress': 'bg-blue-500 hover:bg-blue-500/90',
    'Code Review': 'bg-purple-500 hover:bg-purple-500/90',
    'QA': 'bg-yellow-500 hover:bg-yellow-500/90 text-black',
    'Done': 'bg-green-500 hover:bg-green-500/90',
  };

  return (
    <Badge className={cn('text-white', statusColors[status])}>
      {status}
    </Badge>
  );
}
