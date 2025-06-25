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

interface TasksTableProps {
  tasks: Task[];
}

export function TasksTable({ tasks }: TasksTableProps) {
  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Repository</TableHead>
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
              <TableCell>{task.repository}</TableCell>
              <TableCell>
                <EnvironmentStatus prLinks={task.prLinks} size="sm" />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/tasks/${task.id}`}>
                    View
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
