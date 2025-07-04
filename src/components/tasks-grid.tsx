
import { TaskCard } from '@/components/task-card';
import type { Task, UiConfig, Person } from '@/lib/types';

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
}

export function TasksGrid({ tasks, onTaskDelete, onTaskUpdate, uiConfig, developers, testers, selectedTaskIds, setSelectedTaskIds, isSelectMode }: TasksGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tasks.map(task => (
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
}
