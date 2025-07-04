
import { TaskCard } from '@/components/task-card';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Separator } from './ui/separator';

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
  const priorityStatuses = ['To Do', 'In Progress', 'QA'];
  const priorityTasks = tasks.filter(task => priorityStatuses.includes(task.status));
  const otherTasks = tasks.filter(task => !priorityStatuses.includes(task.status));

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

  return (
    <div className="space-y-6">
      {priorityTasks.length > 0 && renderGrid(priorityTasks)}
      
      {priorityTasks.length > 0 && otherTasks.length > 0 && (
        <Separator />
      )}

      {otherTasks.length > 0 && renderGrid(otherTasks)}
    </div>
  );
}
