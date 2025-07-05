
'use client';

import React, { useState, useEffect } from 'react';
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
import { TaskStatusBadge, getStatusConfig } from '@/components/task-status-badge';
import {
  ArrowRight,
  Check,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { Task, UiConfig, Person, TaskStatus } from '@/lib/types';
import { Badge } from './ui/badge';
import { DeleteTaskButton } from './delete-task-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getInitials, getAvatarColor, cn, getRepoBadgeStyle, getEnvInfo } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { updateTask } from '@/lib/data';
import { PersonProfileCard } from './person-profile-card';
import { Checkbox } from './ui/checkbox';

interface TasksTableRowProps {
  task: Task;
  onTaskUpdate: () => void;
  uiConfig: UiConfig;
  developersById: Map<string, Person>;
  testersById: Map<string, Person>;
  onAvatarClick: (person: Person, type: 'Developer' | 'Tester') => void;
  isSelected: boolean;
  onToggleSelection: (taskId: string, checked: boolean) => void;
  isSelectMode: boolean;
}

function TasksTableRow({
  task: initialTask,
  onTaskUpdate,
  uiConfig,
  developersById,
  testersById,
  onAvatarClick,
  isSelected,
  onToggleSelection,
  isSelectMode,
}: TasksTableRowProps) {
  const [task, setTask] = useState(initialTask);
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const handleStatusChange = (newStatus: TaskStatus) => {
    const updatedTask = updateTask(task.id, { status: newStatus });
    if (updatedTask) {
      setTask(updatedTask);
      onTaskUpdate();
      toast({
        variant: 'success',
        title: 'Status Updated',
        description: `Task status changed to "${newStatus}".`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task status.',
      });
    }
  };

  const handleToggleDeployment = (env: string) => {
    const isSelected = task.deploymentStatus?.[env] ?? false;
    const hasDate = task.deploymentDates && task.deploymentDates[env];
    const isDeployed = isSelected && (env === 'dev' || !!hasDate);
    const newIsDeployed = !isDeployed;

    const newDeploymentStatus = { ...task.deploymentStatus };
    const newDeploymentDates = { ...task.deploymentDates };

    if (newIsDeployed) {
      newDeploymentStatus[env] = true;
      if (env !== 'dev') {
        newDeploymentDates[env] = new Date().toISOString();
      }
    } else {
      newDeploymentStatus[env] = false;
      newDeploymentDates[env] = null;
    }

    const updatedTaskData = {
      deploymentStatus: newDeploymentStatus,
      deploymentDates: newDeploymentDates,
    };
    const updatedTask = updateTask(task.id, updatedTaskData);
    if (updatedTask) {
      setTask(updatedTask);
      setJustUpdatedEnv(env);
      onTaskUpdate();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update deployment status.',
      });
    }
  };

  const assignedDevelopers = (task.developers || [])
    .map((id) => developersById.get(id))
    .filter((d): d is Person => !!d);
  const assignedTesters = (task.testers || [])
    .map((id) => testersById.get(id))
    .filter((t): t is Person => !!t);

  const statusConfig = getStatusConfig(task.status);
  const { Icon, iconColorClassName } = statusConfig;

  return (
    <TableRow key={task.id} className="group/row" data-state={isSelected ? 'selected' : undefined}>
       {isSelectMode && (
         <TableCell>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelection(task.id, !!checked)}
              aria-label={`Select task ${task.title}`}
            />
        </TableCell>
       )}
      <TableCell className="font-medium max-w-xs relative overflow-hidden align-top">
        <Icon className={cn(
          "absolute -bottom-8 -left-8 h-24 w-24 pointer-events-none transition-transform duration-300 ease-in-out z-0",
          iconColorClassName,
          task.status !== 'In Progress' && 'group-hover/row:scale-110 group-hover/row:rotate-6'
        )} />
        <div className="relative z-10">
            <Link
              href={`/tasks/${task.id}`}
              className="font-semibold block truncate group/title"
            >
              <span className="group-hover/title:text-primary transition-colors">{task.title}</span>
            </Link>
            <p className="text-muted-foreground text-sm truncate mt-1">
              {task.summary || task.description}
            </p>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <TaskStatusBadge status={task.status} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Set Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {uiConfig.taskStatuses.map((s) => {
              const currentStatusConfig = getStatusConfig(s);
              const { Icon } = currentStatusConfig;
              return (
                <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3 w-3", s === 'In Progress' && 'animate-spin')} />
                    <span>{s}</span>
                  </div>
                  {task.status === s && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex -space-x-2">
          {assignedDevelopers.map((dev) => (
            <Tooltip key={dev.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAvatarClick(dev, 'Developer')}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                >
                  <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{
                        backgroundColor: `#${getAvatarColor(dev.name)}`,
                      }}
                    >
                      {getInitials(dev.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{dev.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex -space-x-2">
          {assignedTesters.map((tester) => (
            <Tooltip key={tester.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAvatarClick(tester, 'Tester')}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                >
                  <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{
                        backgroundColor: `#${getAvatarColor(tester.name)}`,
                      }}
                    >
                      {getInitials(tester.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tester.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-wrap gap-1">
          {(task.repositories || []).map((repo) => (
            <Badge
              variant="repo"
              key={repo}
              className="text-xs font-normal"
              style={getRepoBadgeStyle(repo)}
            >
              {repo}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div
          className="flex flex-wrap items-center gap-1.5"
          onAnimationEnd={() => setJustUpdatedEnv(null)}
        >
          {(uiConfig.environments || []).map((env) => {
            const envInfo = getEnvInfo(env);
            const isSelected = task.deploymentStatus?.[env] ?? false;
            const hasDate = task.deploymentDates && task.deploymentDates[env];
            const isDeployed = isSelected && (env === 'dev' || !!hasDate);

            return (
              <Tooltip key={env}>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    onClick={() => handleToggleDeployment(env)}
                    className={cn(
                      'capitalize font-medium transition-colors cursor-pointer',
                      isDeployed
                        ? envInfo.deployedColor
                        : envInfo.pendingColor,
                      'px-1.5 py-0 text-[10px] h-4',
                      justUpdatedEnv === env && 'animate-status-in'
                    )}
                  >
                    {env}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="capitalize flex items-center gap-1.5">
                    {isDeployed ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-yellow-500" />
                    )}
                    {env}: {isDeployed ? 'Deployed' : 'Pending'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/tasks/${task.id}`}>
              View
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <DeleteTaskButton taskId={task.id} taskTitle={task.title} onSuccess={onTaskUpdate} iconOnly />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TasksTable({
  tasks,
  onTaskDelete,
  uiConfig,
  developers,
  testers,
  selectedTaskIds,
  setSelectedTaskIds,
  isSelectMode,
}: {
  tasks: Task[];
  onTaskDelete: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
  selectedTaskIds: string[];
  setSelectedTaskIds: (ids: string[]) => void;
  isSelectMode: boolean;
}) {
  const [personInView, setPersonInView] = useState<{
    person: Person;
    type: 'Developer' | 'Tester';
  } | null>(null);

  if (!uiConfig) {
    return null;
  }
  
  const priorityStatuses = ['To Do', 'In Progress', 'Code Review', 'QA'];
  
  const priorityTasks = tasks.filter(task => priorityStatuses.includes(task.status));
  const completedTasks = tasks.filter(task => task.status === 'Done');
  const holdTasks = tasks.filter(task => task.status === 'Hold');
  const otherTasks = tasks.filter(task => 
    !priorityStatuses.includes(task.status) && 
    task.status !== 'Done' && 
    task.status !== 'Hold'
  );

  const fieldLabels = new Map(uiConfig.fields.map((f) => [f.key, f.label]));
  const developersById = new Map(developers.map((d) => [d.id, d]));
  const testersById = new Map(testers.map((t) => [t.id, t]));

  const handleAvatarClick = (person: Person, type: 'Developer' | 'Tester') => {
    setPersonInView({ person, type });
  };
  
  const handleToggleAll = (checked: boolean | 'indeterminate') => {
    setSelectedTaskIds(checked === true ? tasks.map(t => t.id) : []);
  };
  
  const handleToggleSelection = (taskId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedTaskIds, taskId]
      : selectedTaskIds.filter(id => id !== taskId);
    setSelectedTaskIds(newSelected);
  };
  
  const numSelected = selectedTaskIds.length;
  const numTasks = tasks.length;
  const colSpan = isSelectMode ? 8 : 7;
  
  const getPriorityTitle = () => {
    if (priorityTasks.length === 0) return null;
    const allStatuses = new Set(priorityTasks.map(t => t.status));
    if (allStatuses.size === 1) {
      return `${[...allStatuses][0]} Tasks`;
    }
    return "Active Tasks";
  }
  const priorityTitle = getPriorityTitle();

  const renderTaskRows = (tasksToRender: Task[]) => {
    return tasksToRender.map((task) => (
      <TasksTableRow
        key={task.id}
        task={task}
        onTaskUpdate={onTaskDelete}
        uiConfig={uiConfig}
        developersById={developersById}
        testersById={testersById}
        onAvatarClick={handleAvatarClick}
        isSelected={selectedTaskIds.includes(task.id)}
        onToggleSelection={handleToggleSelection}
        isSelectMode={isSelectMode}
      />
    ));
  };
  
  const groups: { key: string, title: string, tasks: Task[] }[] = [];

  if (priorityTasks.length > 0) groups.push({ key: 'priority', title: priorityTitle!, tasks: priorityTasks });
  if (completedTasks.length > 0) groups.push({ key: 'completed', title: 'Completed Tasks', tasks: completedTasks });
  if (otherTasks.length > 0) groups.push({ key: 'other', title: 'Other Tasks', tasks: otherTasks });
  if (holdTasks.length > 0) groups.push({ key: 'hold', title: 'On Hold Tasks', tasks: holdTasks });

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
             {isSelectMode && (
                <TableHead className="w-[50px]">
                    <Checkbox
                    checked={numTasks > 0 && numSelected === numTasks ? true : (numSelected > 0 ? 'indeterminate' : false)}
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all"
                    />
                </TableHead>
             )}
            <TableHead>{fieldLabels.get('title') || 'Title'}</TableHead>
            <TableHead>{fieldLabels.get('status') || 'Status'}</TableHead>
            <TableHead>Developers</TableHead>
            <TableHead>Testers</TableHead>
            <TableHead>
              {fieldLabels.get('repositories') || 'Repositories'}
            </TableHead>
            <TableHead>
              {fieldLabels.get('deploymentStatus') || 'Deployments'}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
           {groups.map(({ key, title, tasks: tasksInGroup }, index) => (
            <React.Fragment key={key}>
              {index > 0 && (
                <TableRow className="hover:bg-transparent data-[state=selected]:bg-transparent">
                  <TableCell colSpan={colSpan} className="p-0 h-4">
                    <div className="border-t border-dashed w-full h-full"></div>
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableCell colSpan={colSpan} className="py-2 px-4 font-semibold text-muted-foreground">
                  {title}
                </TableCell>
              </TableRow>
              {renderTaskRows(tasksInGroup)}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      <PersonProfileCard
        person={personInView?.person ?? null}
        type={personInView?.type ?? 'Developer'}
        isOpen={!!personInView}
        onOpenChange={(isOpen) => !isOpen && setPersonInView(null)}
      />
    </div>
  );
}
