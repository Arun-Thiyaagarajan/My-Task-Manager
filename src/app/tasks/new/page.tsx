
'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/task-form';
import { addTask, getDevelopers, addDeveloper } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Task, Environment } from '@/lib/types';
import { taskSchema } from '@/lib/validators';
import { Loader2 } from 'lucide-react';


export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [developersList, setDevelopersList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    document.title = 'New Task | TaskFlow';
    setDevelopersList(getDevelopers());
    setIsLoading(false);
  }, []);

  const handleCreateTask = (data: any) => {
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

    const { deploymentDates, devStartDate, devEndDate, qaStartDate, qaEndDate, ...otherData } = validationResult.data;

    const taskDataToCreate: Partial<Task> = {
        ...otherData,
        devStartDate: devStartDate ? devStartDate.toISOString() : null,
        devEndDate: devEndDate ? devEndDate.toISOString() : null,
        qaStartDate: qaStartDate ? qaStartDate.toISOString() : null,
        qaEndDate: qaEndDate ? qaEndDate.toISOString() : null,
        deploymentDates: {}
    };

    if (deploymentDates) {
        taskDataToCreate.deploymentDates = {
            dev: deploymentDates.dev?.toISOString() || null,
            stage: deploymentDates.stage?.toISOString() || null,
            production: deploymentDates.production?.toISOString() || null,
            others: deploymentDates.others?.toISOString() || null,
        };
    }

    addTask(taskDataToCreate);
    
    toast({
        variant: 'success',
        title: `Task created`,
        description: "Your new task has been saved.",
    });

    router.push(`/`);
  };

  if (isLoading) {
    return (
       <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-lg font-semibold text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            onSubmit={handleCreateTask}
            submitButtonText="Create Task"
            developersList={developersList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
