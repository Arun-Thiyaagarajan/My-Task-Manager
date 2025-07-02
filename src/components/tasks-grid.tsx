
import { TaskCard } from '@/components/task-card';
import type { Task, UiConfig } from '@/lib/types';

interface TasksGridProps {
  tasks: Task[];
  onTaskDelete: () => void;
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
}

export function TasksGrid({ tasks, onTaskDelete, onTaskUpdate, uiConfig }: TasksGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onTaskDelete={onTaskDelete} onTaskUpdate={onTaskUpdate} uiConfig={uiConfig} />
      ))}
    </div>
  );
}
