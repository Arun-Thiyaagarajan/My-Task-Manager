'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task } from '@/lib/types';
import { REPOSITORIES, TASK_STATUSES, DEVELOPERS, ENVIRONMENTS } from '@/lib/constants';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
      status: task?.status ?? 'To Do',
      repositories: task?.repositories ?? [],
      azureWorkItemId: task?.azureWorkItemId ?? '',
      developers: task?.developers ?? [],
      prLinks: {
        dev: task?.prLinks?.dev?.join('\n') ?? '',
        stage: task?.prLinks?.stage?.join('\n') ?? '',
        production: task?.prLinks?.production?.join('\n') ?? '',
        others: task?.prLinks?.others?.join('\n') ?? '',
      },
      devStartDate: task?.devStartDate ? new Date(task.devStartDate) : undefined,
      devEndDate: task?.devEndDate ? new Date(task.devEndDate) : undefined,
      qaStartDate: task?.qaStartDate ? new Date(task.qaStartDate) : undefined,
      qaEndDate: task?.qaEndDate ? new Date(task.qaEndDate) : undefined,
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
              name="azureWorkItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azure Work Item ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <Card className="p-4">
          <FormField
            control={form.control}
            name="repositories"
            render={() => (
              <FormItem>
                <FormLabel className="text-base">Repositories</FormLabel>
                <FormDescription>Select all applicable repositories for this task.</FormDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {REPOSITORIES.map((repo) => (
                    <FormField
                      key={repo}
                      control={form.control}
                      name="repositories"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(repo)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, repo])
                                  : field.onChange(field.value?.filter((value) => value !== repo))
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{repo}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <Card className="p-4">
            <FormField
              control={form.control}
              name="developers"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base">Developers</FormLabel>
                  <FormDescription>Assign developers to this task.</FormDescription>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    {DEVELOPERS.map((dev) => (
                      <FormField
                        key={dev}
                        control={form.control}
                        name="developers"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(dev)}
                                onCheckedChange={(checked) => {
                                  const currentDevs = field.value ?? [];
                                  return checked
                                    ? field.onChange([...currentDevs, dev])
                                    : field.onChange(currentDevs.filter((value) => value !== dev))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{dev}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </Card>
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced">
                <AccordionTrigger className="text-base">Advanced Details</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Task Dates</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="devStartDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Development Start</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="devEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Development End</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="qaStartDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>QA Start</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="qaEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>QA End</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <Separator />
                    <div>
                         <h4 className="font-medium text-sm text-muted-foreground mb-4">Pull Request Links</h4>
                        <div className="space-y-6">
                            {ENVIRONMENTS.map(env => (
                                <FormField
                                    key={env}
                                    control={form.control}
                                    name={`prLinks.${env}`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="capitalize">{env} PR Links</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                placeholder={`Paste ${env} PR links here, one per line...`}
                                                className="min-h-[80px] font-mono text-xs"
                                                {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>


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
