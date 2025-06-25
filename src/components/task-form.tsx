
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task, Environment } from '@/lib/types';
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
import { Loader2, CalendarIcon, GitPullRequest, Trash2, Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MultiSelect } from './ui/multi-select';
import { Checkbox } from './ui/checkbox';
import { addDeveloper } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from '@/lib/constants';

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: TaskFormData) => void;
  submitButtonText: string;
  developersList: string[];
}

const getInitialTaskData = (task?: Task) => {
    if (!task) {
        return {
            title: '',
            description: '',
            status: 'To Do',
            repositories: [],
            developers: [],
            prLinks: {},
            deploymentStatus: {},
            attachments: [],
            deploymentDates: {},
        };
    }
    
    return {
        ...task,
        devStartDate: task.devStartDate ? new Date(task.devStartDate) : undefined,
        devEndDate: task.devEndDate ? new Date(task.devEndDate) : undefined,
        qaStartDate: task.qaStartDate ? new Date(task.qaStartDate) : undefined,
        qaEndDate: task.qaEndDate ? new Date(task.qaEndDate) : undefined,
        deploymentDates: {
            dev: task.deploymentDates?.dev ? new Date(task.deploymentDates.dev) : undefined,
            stage: task.deploymentDates?.stage ? new Date(task.deploymentDates.stage) : undefined,
            production: task.deploymentDates?.production ? new Date(task.deploymentDates.production) : undefined,
            others: task.deploymentDates?.others ? new Date(task.deploymentDates.others) : undefined,
        },
        attachments: task.attachments || [],
    }
}

export function TaskForm({ task, onSubmit, submitButtonText, developersList }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: getInitialTaskData(task),
  });
  
  const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control: form.control,
    name: 'attachments',
  });

  useEffect(() => {
    form.reset(getInitialTaskData(task));
  }, [task, form]);

  const handleCreateDeveloper = (name: string) => {
    addDeveloper(name);
    // Note: In a real app, you might want to refresh the developersList state
  };

  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        onSubmit(data);
    });
  };

  const selectedRepos = form.watch('repositories') || [];
  const deploymentStatus = form.watch('deploymentStatus');

  const dateFields = [
    { name: 'devStartDate', label: 'Dev Start Date'},
    { name: 'devEndDate', label: 'Dev End Date'},
    { name: 'qaStartDate', label: 'QA Start Date'},
    { name: 'qaEndDate', label: 'QA End Date'},
  ] as const;

  const deploymentDateFields = [
    { name: 'deploymentDates.stage', label: 'Stage Deployment Date', condition: deploymentStatus?.stage },
    { name: 'deploymentDates.production', label: 'Production Deployment Date', condition: deploymentStatus?.production },
    { name: 'deploymentDates.others', label: 'Others Deployment Date', condition: deploymentStatus?.others },
  ] as const;


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        <Card>
            <CardHeader>
                <CardTitle>Core Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title *</FormLabel>
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
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Describe the task in detail..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Assignment & Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="developers"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Developers</FormLabel>
                        <FormControl>
                            <MultiSelect
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            options={developersList.map(dev => ({ value: dev, label: dev }))}
                            placeholder="Select developers..."
                            onCreate={handleCreateDeveloper}
                            />
                        </FormControl>
                        <FormDescription>Assign one or more developers to this task.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="repositories"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Repositories</FormLabel>
                        <FormControl>
                            <MultiSelect
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            options={REPOSITORIES.map(repo => ({ value: repo, label: repo }))}
                            placeholder="Select repositories..."
                            />
                        </FormControl>
                         <FormDescription>Which code repositories are affected?</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="azureWorkItemId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Azure Work Item ID</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 12345" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Pull Request Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {selectedRepos.length > 0 ? ENVIRONMENTS.map(env => (
                   <div key={env}>
                       <h4 className="font-medium text-sm capitalize mb-2">{env} PRs</h4>
                        <div className="space-y-2">
                            {selectedRepos.map(repo => (
                                <FormField
                                    key={`${env}-${repo}`}
                                    control={form.control}
                                    name={`prLinks.${env}.${repo}` as any}
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <GitPullRequest className="h-4 w-4 text-muted-foreground"/>
                                            <FormLabel className="w-32 shrink-0">{repo}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="PR ID(s), comma separated" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                   </div>
               )) : (
                <p className="text-sm text-muted-foreground text-center py-4">Select at least one repository to add PR links.</p>
               )}
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attachmentFields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
                  <FormField
                    control={form.control}
                    name={`attachments.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attachment Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Design Mockup" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`attachments.${index}.url`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attachment URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeAttachment(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove Attachment</span>
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => appendAttachment({ name: '', url: '', type: 'link' })}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Add Attachment
            </Button>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Deployment Status</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {ENVIRONMENTS.map(env => (
                        <FormField
                            key={env}
                            control={form.control}
                            name={`deploymentStatus.${env}`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            id={`deploy-check-${env}`}
                                        />
                                    </FormControl>
                                    <FormLabel htmlFor={`deploy-check-${env}`} className="capitalize font-normal">
                                        {env}
                                    </FormLabel>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                 {form.watch('deploymentStatus.others') && (
                    <FormField
                        control={form.control}
                        name="othersEnvironmentName"
                        render={({ field }) => (
                            <FormItem className="mt-4">
                            <FormLabel>Other Environment Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. UAT" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dateFields.map(dateField => (
                        <FormField
                            key={dateField.name}
                            control={form.control}
                            name={dateField.name}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{dateField.label}</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? format(field.value, "PPP") : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value as Date}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                
                {deploymentDateFields.some(f => f.condition) && (
                    <>
                        <div className="pt-4 mt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground">Deployment Dates</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {deploymentDateFields.filter(f => f.condition).map(dateField => (
                                <FormField
                                    key={dateField.name}
                                    control={form.control}
                                    name={dateField.name}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>{dateField.label}</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                        >
                                                        {field.value ? format(field.value as Date, "PPP") : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value as Date}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4 border-t">
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
