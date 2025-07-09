
'use client';

import { TaskCard } from '@/components/task-card';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Sparkles } from 'lucide-react';

interface RelatedTasksSectionProps {
  title: string;
  tasks: Task[];
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
}

export function RelatedTasksSection({ title, tasks, onTaskUpdate, uiConfig, developers, testers }: RelatedTasksSectionProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        {title}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onTaskDelete={onTaskUpdate} 
            onTaskUpdate={onTaskUpdate} 
            uiConfig={uiConfig}
            developers={developers}
            testers={testers}
          />
        ))}
      </div>
    </div>
  );
}
