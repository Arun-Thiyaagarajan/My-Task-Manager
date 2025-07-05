
'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/task-form';
import { addTask, getDevelopers, getTesters, getUiConfig } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Task, Person } from '@/lib/types';
import { taskSchema } from '@/lib/validators';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [developersList, setDevelopersList] = useState<Person[]>([]);
  const [testersList, setTestersList] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<Task> | undefined>(undefined);
  
  useEffect(() => {
    const config = getUiConfig();
    document.title = `New Task | ${config.appName || 'My Task Manager'}`;
    setDevelopersList(getDevelopers());
    setTestersList(getTesters());
    
    // This logic stays to handle failed imports from the old implementation
    const failedImportRowString = sessionStorage.getItem('failed_import_row');
    if (failedImportRowString) {
      try {
        const row = JSON.parse(failedImportRowString);
        setInitialData(row as Partial<Task>);

        toast({
            variant: 'warning',
            title: 'Review Required',
            description: 'This form is pre-filled from an import. Please correct any errors and save the task.',
            duration: 5000,
        });

      } catch (error) {
        console.error("Error processing failed import data:", error);
      } finally {
        sessionStorage.removeItem('failed_import_row');
      }
    }

    setIsLoading(false);
  }, []);

  const handleCreateTask = (data: any) => {
    const validationResult = taskSchema.safeParse(data);

    if (!validationResult.success) {
      console.error(validationResult.error.flatten().fieldErrors);
      toast({
        variant: 'destructive',
        title: 'Invalid data',
        description: validationResult.error.flatten().formErrors.join(', ') || 'Please check the form for errors.',
      });
      return;
    }
  
    // Developer and tester creation is handled inside the form's MultiSelect component.

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
        taskDataToCreate.deploymentDates = Object.entries(deploymentDates).reduce((acc, [key, value]) => {
            if (value) {
                acc[key] = (value as Date).toISOString();
            } else {
                acc[key] = null;
            }
            return acc;
        }, {} as { [key: string]: string | null });
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
    return <LoadingSpinner text="Loading form..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            task={initialData}
            onSubmit={handleCreateTask}
            submitButtonText="Create Task"
            developersList={developersList}
            testersList={testersList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
