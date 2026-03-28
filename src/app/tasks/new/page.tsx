'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/task-form';
import { addTask, getDevelopers, getTesters, getUiConfig, getTasks } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Task, Person } from '@/lib/types';
import { createTaskSchema } from '@/lib/validators';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { generateSummarySafely } from '@/ai/flows/summary-flow';

const normalizePrLinks = (prLinks: any): Task['prLinks'] | undefined => {
  if (!prLinks) return undefined;

  const normalized: NonNullable<Task['prLinks']> = {};
  Object.entries(prLinks).forEach(([environment, repositories]) => {
    if (!repositories || typeof repositories !== 'object') return;

    const cleanRepositories = Object.fromEntries(
      Object.entries(repositories).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    );

    if (Object.keys(cleanRepositories).length > 0) {
      normalized[environment] = cleanRepositories;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [developersList, setDevelopersList] = useState<Person[]>([]);
  const [testersList, setTestersList] = useState<Person[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<Task> | undefined>(undefined);
  
  useEffect(() => {
    const config = getUiConfig();
    document.title = `New Task | ${config.appName || 'My Task Manager'}`;
    setDevelopersList(getDevelopers());
    setTestersList(getTesters());
    setAllTasks(getTasks());
    
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
    // Notify global loader that navigation and initial data loading is complete
    window.dispatchEvent(new Event('navigation-end'));
  }, [toast]);

  const handleCreateTask = async (data: any) => {
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
  
    const { deploymentDates, devStartDate, devEndDate, qaStartDate, qaEndDate, ...otherData } = validationResult.data;

	    const taskDataToCreate: Partial<Task> = {
	        ...otherData,
	        reminderExpiresAt: otherData.reminderExpiresAt ? otherData.reminderExpiresAt.toISOString() : null,
	        prLinks: normalizePrLinks(otherData.prLinks),
	        devStartDate: devStartDate ? devStartDate.toISOString() : new Date().toISOString(),
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
    
    let summaryGenerationFailed = false;

    if (taskDataToCreate.description && taskDataToCreate.description.length > 200) {
      const summaryResult = await generateSummarySafely({ text: taskDataToCreate.description });

      if (summaryResult.ok) {
        taskDataToCreate.summary = summaryResult.summary;
      } else {
        summaryGenerationFailed = true;
        taskDataToCreate.summary = null;
        console.error('Failed to generate summary:', summaryResult.error ?? summaryResult.reason);
      }
    }

    const newTask = addTask(taskDataToCreate);
    
    toast({
        variant: 'success',
        title: `Task created`,
        description: "Your new task has been saved.",
    });

    if (summaryGenerationFailed) {
      toast({
        variant: 'warning',
        title: 'Task saved without AI summary',
        description: 'The description summary could not be generated right now. Your task was still saved successfully.',
      });
    }

    router.push(`/tasks/${newTask.id}`);
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading form..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="border-none lg:border lg:shadow-sm">
        <CardContent className="p-0 lg:p-6">
          <TaskForm
            task={initialData}
            allTasks={allTasks}
            onSubmit={handleCreateTask}
            submitButtonText="Create Task"
            formTitle="Create a New Task"
            developersList={developersList}
            testersList={testersList}
          />
        </CardContent>
      </Card>
    </div>
  );
}
