import React, { memo } from 'react';
import { TaskCard } from '@/components/task-card';
import { TaskCardSkeleton } from '@/components/task-card-skeleton';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';

interface TasksGridProps {
  tasks: Task[];
  onTaskDelete: () => void;
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
  selectedTaskIds: string[];
  setSelectedTaskIds: (ids: string[]) => void;
  isSelectMode: boolean;
  openGroups: string[];
  setOpenGroups: (groups: string[]) => void;
  pinnedTaskIds: string[];
  onPinToggle: (taskId: string) => void;
  currentQueryString: string;
  favoritesOnly?: boolean;
  isLoading?: boolean;
}

export const TasksGrid = memo(function TasksGrid({ 
  tasks, 
  onTaskDelete, 
  onTaskUpdate, 
  uiConfig, 
  developers, 
  testers, 
  selectedTaskIds, 
  setSelectedTaskIds, 
  isSelectMode, 
  openGroups, 
  setOpenGroups, 
  pinnedTaskIds, 
  onPinToggle, 
  currentQueryString,
  favoritesOnly,
  isLoading
}: TasksGridProps) {
  const priorityStatuses = ['To Do', 'In Progress', 'Code Review', 'QA'];
  
  const priorityTasks = tasks.filter(task => priorityStatuses.includes(task.status));
  const completedTasks = tasks.filter(task => task.status === 'Done');
  const holdTasks = tasks.filter(task => task.status === 'Hold');
  const otherTasks = tasks.filter(task => 
    !priorityStatuses.includes(task.status) && 
    task.status !== 'Done' && 
    task.status !== 'Hold'
  );

  const getPriorityTitle = () => {
    if (priorityTasks.length === 0 && !isLoading) return null;
    const allStatuses = new Set(priorityTasks.map(t => t.status));
    let baseTitle = "Active Tasks";
    
    if (allStatuses.size === 1) {
      baseTitle = `${[...allStatuses][0]} Tasks`;
    }
    
    return favoritesOnly ? `Favorite ${baseTitle}` : baseTitle;
  }

  const priorityTitle = getPriorityTitle() || 'Tasks';

  const renderGrid = (tasksToRender: Task[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
              <TaskCardSkeleton key={`skeleton-${i}`} />
          ))
      ) : (
          tasksToRender.map(task => (
            <TaskCard 
                key={task.id}
                task={task} 
                onTaskDelete={onTaskDelete} 
                onTaskUpdate={onTaskUpdate} 
                uiConfig={uiConfig}
                developers={developers}
                testers={testers}
                selectedTaskIds={selectedTaskIds}
                setSelectedTaskIds={setSelectedTaskIds}
                isSelectMode={isSelectMode}
                pinnedTaskIds={pinnedTaskIds}
                onPinToggle={onPinToggle}
                currentQueryString={currentQueryString}
            />
          ))
      )}
    </div>
  );

  const groups: { key: string, title: string, tasks: Task[] }[] = [];

  // In loading state, we just show one group with skeletons
  if (isLoading) {
      return (
        <div className="space-y-4 px-4 py-3">
            <h2 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-3">
                {priorityTitle}
                <Skeleton className="h-5 w-8 rounded-full" />
            </h2>
            {renderGrid([])}
        </div>
      );
  }

  if (priorityTasks.length > 0) {
    groups.push({ key: 'priority', title: priorityTitle!, tasks: priorityTasks });
  }
  if (completedTasks.length > 0) {
    groups.push({ key: 'completed', title: favoritesOnly ? 'Favorite Completed Tasks' : 'Completed Tasks', tasks: completedTasks });
  }
  if (otherTasks.length > 0) {
    groups.push({ key: 'other', title: favoritesOnly ? 'Favorite Other Tasks' : 'Other Tasks', tasks: otherTasks });
  }
  if (holdTasks.length > 0) {
    groups.push({ key: 'hold', title: favoritesOnly ? 'Favorite On Hold Tasks' : 'On Hold Tasks', tasks: holdTasks });
  }

  return (
    <Accordion
      type="multiple"
      className="w-full space-y-2"
      value={openGroups}
      onValueChange={setOpenGroups}
    >
      {groups.map(({ key, title, tasks: tasksInGroup }) => (
        <AccordionItem key={key} value={key} className="border-none">
            <AccordionTrigger className="text-xl font-semibold tracking-tight text-foreground hover:no-underline rounded-lg px-4 py-3 hover:bg-muted/50 data-[state=open]:[&>svg]:text-primary">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                    <Badge className="shrink-0 bg-border text-foreground">{tasksInGroup.length}</Badge>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
                {renderGrid(tasksInGroup)}
            </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
});
