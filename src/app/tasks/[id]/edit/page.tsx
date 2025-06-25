'use client';

import { useState, useEffect } from 'react';
import { getTaskById, getDevelopers, updateTask, addDeveloper } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task, Environment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TaskFormData = z.infer<typeof taskSchema>;

const parsePrLinks = (links: string | undefined): string[] => {
  if (!links) return [];
  return links.split(',').map(l => l.trim()).filter(Boolean);
};

const processTaskData = (data: TaskFormData) => {
    const { prLinks, devStartDate, devEndDate, qaStartDate, qaEndDate, ...rest } = data;
    const processedPrLinks = Object.fromEntries(
        Object.entries(prLinks).map(([env, links]) => [env, parsePrLinks(links)])
    ) as { [key in Environment]?: string[] };
    
    return {
        ...rest,
        prLinks: processedPrLinks,
        devStartDate: devStartDate?.toISOString(),
        devEndDate: devEndDate?.toISOString(),
        qaStartDate: qaStartDate?.toISOString(),
        qaEndDate: qaEndDate?.toISOString(),
    };
}

const handleNewDevelopers = (developers: string[]) => {
    const existingDevelopers = getDevelopers();
    developers.forEach(dev => {
        if (!existingDevelopers.includes(dev)) {
            addDeveloper(dev);
        }
    });
}

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [developersList, setDevelopersList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      const devs = getDevelopers();
      setTask(foundTask || null);
      setDevelopersList(devs);
      setIsLoading(false);
    }
  }, [taskId]);

  const handleUpdateTask = (data: TaskFormData) => {
    if (!task) return;

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
      handleNewDevelopers(validationResult.data.developers);
    }
    
    const taskData = processTaskData(validationResult.data);
    updateTask(task.id, taskData);

    toast({
        title: `Task updated`,
        description: "Your changes have been saved.",
    });

    router.push(`/`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-2xl font-bold">Task not found</h1>
        <p className="text-muted-foreground">The task you are looking for does not exist.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Home</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-3xl">
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
