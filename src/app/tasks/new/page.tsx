'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/task-form';
import { addTask, getDevelopers, addDeveloper } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';

type TaskFormData = z.infer<typeof taskSchema>;

const processTaskData = (data: TaskFormData) => {
    const { devStartDate, devEndDate, qaStartDate, qaEndDate, stageDate, productionDate, othersDate, ...rest } = data;

    return {
        ...rest,
        devStartDate: devStartDate?.toISOString(),
        devEndDate: devEndDate?.toISOString(),
        qaStartDate: qaStartDate?.toISOString(),
        qaEndDate: qaEndDate?.toISOString(),
        stageDate: stageDate?.toISOString(),
        productionDate: productionDate?.toISOString(),
        othersDate: othersDate?.toISOString(),
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

export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [developersList, setDevelopersList] = useState<string[]>([]);
  
  useEffect(() => {
    document.title = 'New Task | My Task Manager';
    setDevelopersList(getDevelopers());
  }, []);

  const handleCreateTask = (data: TaskFormData) => {
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
    addTask(taskData);
    
    toast({
        variant: 'success',
        title: `Task created`,
        description: "Your new task has been saved.",
    });

    router.push(`/`);
  };

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
