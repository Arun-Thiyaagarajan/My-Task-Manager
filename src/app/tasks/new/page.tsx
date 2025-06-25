import { TaskForm } from '@/components/task-form';
import { createTaskAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewTaskPage() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            action={createTaskAction}
            submitButtonText="Create Task"
          />
        </CardContent>
      </Card>
    </div>
  );
}
