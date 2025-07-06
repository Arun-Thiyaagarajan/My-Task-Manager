
import React from 'react';
import { TaskCard } from '@/components/task-card';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

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
}

export function TasksGrid({ tasks, onTaskDelete, onTaskUpdate, uiConfig, developers, testers, selectedTaskIds, setSelectedTaskIds, isSelectMode, openGroups, setOpenGroups }: TasksGridProps) {
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
    if (priorityTasks.length === 0) return null;
    const allStatuses = new Set(priorityTasks.map(t => t.status));
    if (allStatuses.size === 1) {
      return `${[...allStatuses][0]} Tasks`;
    }
    return "Active Tasks";
  }

  const priorityTitle = getPriorityTitle();

  const renderGrid = (tasksToRender: Task[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tasksToRender.map(task => (
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
        />
      ))}
    </div>
  );

  const groups: { key: string, title: string, tasks: Task[] }[] = [];

  if (priorityTasks.length > 0) {
    groups.push({ key: 'priority', title: priorityTitle!, tasks: priorityTasks });
  }
  if (completedTasks.length > 0) {
    groups.push({ key: 'completed', title: 'Completed Tasks', tasks: completedTasks });
  }
  if (otherTasks.length > 0) {
    groups.push({ key: 'other', title: 'Other Tasks', tasks: otherTasks });
  }
  if (holdTasks.length > 0) {
    groups.push({ key: 'hold', title: 'On Hold Tasks', tasks: holdTasks });
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
            <AccordionTrigger className="text-xl font-semibold tracking-tight text-foreground hover:no-underline rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 data-[state=open]:text-primary [&>svg]:text-primary">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
                {renderGrid(tasksInGroup)}
            </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
