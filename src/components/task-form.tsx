'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task } from '@/lib/types';
import { REPOSITORIES, TASK_STATUSES } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task;
  action: (data: TaskFormData) => Promise<any>;
  submitButtonText: string;
}

export function TaskForm({ task, action, submitButtonText }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'Not Started',
      repository: task?.repository ?? 'Other',
      azureId: task?.azureId ?? '',
    },
  });

  const onSubmit = (data: TaskFormData) => {
    startTransition(async () => {
      try {
        await action(data);
        toast({
            title: `Task ${task ? 'updated' : 'created'}`,
            description: "Your changes have been saved.",
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Something went wrong',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="E.g. Fix login button" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the task in detail..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repository"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repository</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a repository" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {REPOSITORIES.map((repo) => (
                      <SelectItem key={repo} value={repo}>
                        {repo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="azureId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Azure Work Item URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://dev.azure.com/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}
