
'use client';

import { useState, useEffect } from 'react';
import { getTaskById, getDevelopers, updateTask, addDeveloper, getAdminConfig } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task, AdminConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildTaskSchema } from '@/lib/validators';

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [developersList, setDevelopersList] = useState<string[]>([]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      const devs = getDevelopers();
      const config = getAdminConfig();

      setTask(foundTask || null);
      setDevelopersList(devs);
      setAdminConfig(config);
      setIsLoading(false);
      
      if (foundTask) {
        document.title = `Edit: ${foundTask.title} | TaskFlow`;
      } else {
        document.title = 'Task Not Found | TaskFlow';
      }
    }
  }, [taskId]);

  const handleUpdateTask = (data: any) => {
    if (!task || !adminConfig) return;

    const taskSchema = buildTaskSchema(adminConfig);
    const validationResult = taskSchema.safeParse(data);

     if (!validationResult.success) {
      console.error(validationResult.error.flatten().fieldErrors);
      toast({
        variant: 'destructive',
        title: 'Invalid data',
        description: 'Please check the form for errors.',
      });
      return;
    }
    
    if (validationResult.data.developers) {
      const existingDevelopers = getDevelopers();
      validationResult.data.developers.forEach((dev: string) => {
          if (!existingDevelopers.includes(dev)) {
              addDeveloper(dev);
          }
      });
    }
    
    const taskDataToUpdate: Partial<Task> = {};
    for (const key in validationResult.data) {
        if (Object.prototype.hasOwnProperty.call(validationResult.data, key)) {
            const value = validationResult.data[key as keyof typeof validationResult.data];
            if (value instanceof Date) {
                 (taskDataToUpdate as any)[key] = value.toISOString();
            } else {
                 (taskDataToUpdate as any)[key] = value;
            }
        }
    }

    updateTask(task.id, taskDataToUpdate);

    toast({
        variant: 'success',
        title: `Task updated`,
        description: "Your changes have been saved.",
    });

    router.push(`/tasks/${task.id}`);
  };

  if (isLoading || !adminConfig) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-lg font-semibold text-muted-foreground">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center">
         <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Task not found</h1>
            <p className="text-muted-foreground">The task you are looking for does not exist.</p>
            <Button onClick={() => router.push('/')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Home
            </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            task={task}
            onSubmit={handleUpdateTask}
            submitButtonText="Save Changes"
            developersList={developersList}
            adminConfig={adminConfig}
          />
        </CardContent>
      </Card>
    </div>
  );
}
