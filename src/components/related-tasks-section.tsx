'use client';

import { TaskCard } from '@/components/task-card';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Sparkles, GripVertical } from 'lucide-react';

interface RelatedTasksSectionProps {
  title: string;
  tasks: Task[];
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
  draggable?: boolean;
  pinnedTaskIds: string[];
  onPinToggle: (taskId: string) => void;
}

export function RelatedTasksSection({ title, tasks, onTaskUpdate, uiConfig, developers, testers, draggable = false, pinnedTaskIds, onPinToggle }: RelatedTasksSectionProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {title}
        </h2>
        {draggable && <GripVertical className="drag-handle h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onTaskDelete={onTaskUpdate} 
            onTaskUpdate={onTaskUpdate} 
            uiConfig={uiConfig}
            developers={developers}
            testers={testers}
            pinnedTaskIds={pinnedTaskIds}
            onPinToggle={onPinToggle}
          />
        ))}
      </div>
    </div>
  );
}
