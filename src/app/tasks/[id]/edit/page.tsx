

'use client';

import { useState, useEffect } from 'react';
import { getTaskById, getDevelopers, updateTask, getTesters, getUiConfig, getTasks } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task, Person } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createTaskSchema } from '@/lib/validators';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [developersList, setDevelopersList] = useState<Person[]>([]);
  const [testersList, setTestersList] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      const allTasksData = getTasks();
      const devs = getDevelopers();
      const testers = getTesters();
      const config = getUiConfig();

      setTask(foundTask || null);
      setAllTasks(allTasksData);
      setDevelopersList(devs);
      setTestersList(testers);
      setIsLoading(false);
      
      if (foundTask) {
        document.title = `Edit: ${foundTask.title} | ${config.appName || 'My Task Manager'}`;
      } else {
        document.title = `Task Not Found | ${config.appName || 'My Task Manager'}`;
      }
    }
  }, [taskId]);

  const handleUpdateTask = (data: any) => {
    if (!task) return;

    const validationSchema = createTaskSchema(getUiConfig());
    const validationResult = validationSchema.safeParse(data);

     if (!validationResult.success) {
      console.error(validationResult.error.flatten().fieldErrors);
      toast({
        variant: 'destructive',
        title: 'Invalid data',
        description: validationResult.error.flatten().formErrors.join(', ') || 'Please check the form for errors.',
      });
      return;
    }
    
    // Developer and tester creation is now handled inside the form's MultiSelect component.
    
    const { deploymentDates, devStartDate, devEndDate, qaStartDate, qaEndDate, ...otherData } = validationResult.data;

    const taskDataToUpdate: Partial<Task> = {
        ...otherData,
        devStartDate: devStartDate ? devStartDate.toISOString() : null,
        devEndDate: devEndDate ? devEndDate.toISOString() : null,
        qaStartDate: qaStartDate ? qaStartDate.toISOString() : null,
        qaEndDate: qaEndDate ? qaEndDate.toISOString() : null,
        deploymentDates: {}
    };

    if (taskDataToUpdate.description !== task.description) {
      taskDataToUpdate.summary = null;
    }

    if (deploymentDates) {
        taskDataToUpdate.deploymentDates = Object.entries(deploymentDates).reduce((acc, [key, value]) => {
            if (value) {
                acc[key] = (value as Date).toISOString();
            } else {
                acc[key] = null;
            }
            return acc;
        }, {} as { [key: string]: string | null });
    }

    updateTask(task.id, taskDataToUpdate);

    toast({
        variant: 'success',
        title: `Task updated`,
        description: "Your changes have been saved.",
    });

    router.push(`/tasks/${task.id}`);
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading task..." />;
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
            allTasks={allTasks}
            onSubmit={handleUpdateTask}
            submitButtonText="Save Changes"
            developersList={developersList}
            testersList={testersList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
