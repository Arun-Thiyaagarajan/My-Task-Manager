
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { ArrowRight } from 'lucide-react';
import type { Task } from '@/lib/types';
import { EnvironmentStatus } from './environment-status';
import { Badge } from './ui/badge';
import { DeleteTaskButton } from './delete-task-button';

interface TasksTableProps {
  tasks: Task[];
  onTaskDelete: () => void;
}

export function TasksTable({ tasks, onTaskDelete }: TasksTableProps) {
  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Repositories</TableHead>
            <TableHead>Deployments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">
                <Link href={`/tasks/${task.id}`} className="hover:text-primary transition-colors">
                  {task.title}
                </Link>
              </TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(task.repositories || []).map(repo => (
                    <Badge variant="secondary" key={repo} className="text-xs font-normal">{repo}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <EnvironmentStatus deploymentStatus={task.deploymentStatus} othersEnvironmentName={task.othersEnvironmentName} size="sm" />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/tasks/${task.id}`}>
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteTaskButton taskId={task.id} onSuccess={onTaskDelete} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
