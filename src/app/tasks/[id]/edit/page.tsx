import { getTaskById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { updateTaskAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EditTaskPageProps {
  params: {
    id: string;
  };
}

export default function EditTaskPage({ params }: EditTaskPageProps) {
  const task = getTaskById(params.id);

  if (!task) {
    notFound();
  }
  
  const updateTaskWithId = updateTaskAction.bind(null, task.id);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            task={task}
            action={updateTaskWithId}
            submitButtonText="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
