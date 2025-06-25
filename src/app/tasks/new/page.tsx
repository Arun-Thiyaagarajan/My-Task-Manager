
'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/task-form';
import { addTask, getDevelopers, addDeveloper, getAdminConfig, getFields } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { AdminConfig, Task, FormField } from '@/lib/types';
import { buildTaskSchema } from '@/lib/validators';
import { Loader2 } from 'lucide-react';


export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [developersList, setDevelopersList] = useState<string[]>([]);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [allFields, setAllFields] = useState<Record<string, FormField> | null>(null);
  
  useEffect(() => {
    document.title = 'New Task | TaskFlow';
    const config = getAdminConfig();
    const fields = getFields();
    
    setDevelopersList(getDevelopers());
    setAdminConfig(config);
    setAllFields(fields);
  }, []);

  const handleCreateTask = (data: any) => {
    if (!adminConfig || !allFields) return;

    const taskSchema = buildTaskSchema(adminConfig, allFields);
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

    const taskDataToCreate: Partial<Task> = {};
    for (const key in validationResult.data) {
        if (Object.prototype.hasOwnProperty.call(validationResult.data, key)) {
            const value = validationResult.data[key as keyof typeof validationResult.data];
            if (value instanceof Date) {
                 (taskDataToCreate as any)[key] = value.toISOString();
            } else if (value !== undefined && value !== null) {
                 (taskDataToCreate as any)[key] = value;
            }
        }
    }

    addTask(taskDataToCreate);
    
    toast({
        variant: 'success',
        title: `Task created`,
        description: "Your new task has been saved.",
    });

    router.push(`/`);
  };

  if (!adminConfig || !allFields) {
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
            adminConfig={adminConfig}
            allFields={allFields}
          />
        </CardContent>
      </Card>
    </div>
  );
}
