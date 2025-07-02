
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
import type { Task, UiConfig, Person } from '@/lib/types';
import { EnvironmentStatus } from './environment-status';
import { Badge } from './ui/badge';
import { DeleteTaskButton } from './delete-task-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getInitials, getAvatarColor } from '@/lib/utils';

interface TasksTableProps {
  tasks: Task[];
  onTaskDelete: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
}

export function TasksTable({
  tasks,
  onTaskDelete,
  uiConfig,
  developers,
  testers,
}: TasksTableProps) {
  if (!uiConfig) {
    return null;
  }

  const fieldLabels = new Map(uiConfig.fields.map((f) => [f.key, f.label]));
  const developersById = new Map(developers.map((d) => [d.id, d]));
  const testersById = new Map(testers.map((t) => [t.id, t]));

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{fieldLabels.get('title') || 'Title'}</TableHead>
            <TableHead>{fieldLabels.get('status') || 'Status'}</TableHead>
            <TableHead>{fieldLabels.get('developers') || 'Developers'}</TableHead>
            <TableHead>{fieldLabels.get('testers') || 'Testers'}</TableHead>
            <TableHead>{fieldLabels.get('repositories') || 'Repositories'}</TableHead>
            <TableHead>{fieldLabels.get('deploymentStatus') || 'Deployments'}</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const assignedDevelopers = (task.developers || [])
              .map((id) => developersById.get(id))
              .filter((d): d is Person => !!d);
            const assignedTesters = (task.testers || [])
              .map((id) => testersById.get(id))
              .filter((t): t is Person => !!t);

            return (
              <TableRow key={task.id}>
                <TableCell className="font-medium max-w-xs">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="hover:text-primary transition-colors font-semibold block truncate"
                  >
                    {task.title}
                  </Link>
                  <p className="text-muted-foreground text-sm truncate">
                    {task.description}
                  </p>
                </TableCell>
                <TableCell>
                  <TaskStatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                    {assignedDevelopers.map((dev) => (
                      <TooltipProvider key={dev.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="h-8 w-8 border-2 border-card">
                              <AvatarFallback
                                className="text-xs font-semibold text-white"
                                style={{
                                  backgroundColor: `#${getAvatarColor(dev.name)}`,
                                }}
                              >
                                {getInitials(dev.name)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{dev.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </TableCell>
                 <TableCell>
                  <div className="flex -space-x-2">
                    {assignedTesters.map((tester) => (
                      <TooltipProvider key={tester.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="h-8 w-8 border-2 border-card">
                              <AvatarFallback
                                className="text-xs font-semibold text-white"
                                style={{
                                  backgroundColor: `#${getAvatarColor(tester.name)}`,
                                }}
                              >
                                {getInitials(tester.name)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tester.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(task.repositories || []).map((repo) => (
                      <Badge variant="secondary" key={repo} className="text-xs font-normal">
                        {repo}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <EnvironmentStatus
                    deploymentStatus={task.deploymentStatus}
                    deploymentDates={task.deploymentDates}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/tasks/${task.id}`}>
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <DeleteTaskButton
                      taskId={task.id}
                      onSuccess={onTaskDelete}
                      iconOnly
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
