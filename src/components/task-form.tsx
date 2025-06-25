
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task } from '@/lib/types';
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
import { Loader2, CalendarIcon, GitPullRequest, Trash2, Paperclip, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
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
  task?: Partial<Task>;
  onSubmit: (data: TaskFormData) => void;
  submitButtonText: string;
  developersList: string[];
}

const getInitialTaskData = (task?: Partial<Task>) => {
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
    
    // Ensure deployment dates are Date objects if they exist
    const deploymentDatesAsDates: { [key: string]: Date | undefined } = {};
    if (task.deploymentDates) {
        for (const key in task.deploymentDates) {
            const dateVal = task.deploymentDates[key];
            if(dateVal) {
                deploymentDatesAsDates[key] = new Date(dateVal);
            }
        }
    }
    
    return {
        ...task,
        devStartDate: task.devStartDate ? new Date(task.devStartDate) : undefined,
        devEndDate: task.devEndDate ? new Date(task.devEndDate) : undefined,
        qaStartDate: task.qaStartDate ? new Date(task.qaStartDate) : undefined,
        qaEndDate: task.qaEndDate ? new Date(task.qaEndDate) : undefined,
        deploymentDates: deploymentDatesAsDates,
        attachments: task.attachments || [],
    }
}

export function TaskForm({ task, onSubmit, submitButtonText, developersList }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [customEnvironments, setCustomEnvironments] = useState<string[]>([]);
  const [newEnvName, setNewEnvName] = useState('');

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: getInitialTaskData(task),
  });
  
  const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control: form.control,
    name: 'attachments',
  });
  
  useEffect(() => {
    const defaultValues = getInitialTaskData(task);
    form.reset(defaultValues);
    const allEnvs = Object.keys(defaultValues.deploymentStatus || {});
    const custom = allEnvs.filter(env => !ENVIRONMENTS.includes(env as any));
    setCustomEnvironments(custom);
  }, [task, form]);

  const handleCreateDeveloper = (name: string) => {
    addDeveloper(name);
  };

  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        onSubmit(data);
    });
  };
  
  const handleAddCustomEnv = () => {
    const trimmedName = newEnvName.trim();
    if (trimmedName && !ENVIRONMENTS.includes(trimmedName as any) && !customEnvironments.includes(trimmedName)) {
        setCustomEnvironments([...customEnvironments, trimmedName]);
        setNewEnvName('');
    }
  }

  const handleRemoveCustomEnv = (envToRemove: string) => {
    setCustomEnvironments(customEnvironments.filter(env => env !== envToRemove));
    form.unregister(`deploymentStatus.${envToRemove}`);
    form.unregister(`deploymentDates.${envToRemove}`);
    form.unregister(`prLinks.${envToRemove}`);
  };

  const selectedRepos = form.watch('repositories') || [];
  const deploymentStatus = form.watch('deploymentStatus') || {};
  const allEnvs = [...ENVIRONMENTS, ...customEnvironments];

  const dateFields = [
    { name: 'devStartDate', label: 'Dev Start Date'},
    { name: 'devEndDate', label: 'Dev End Date'},
    { name: 'qaStartDate', label: 'QA Start Date'},
    { name: 'qaEndDate', label: 'QA End Date'},
  ] as const;

  const deploymentDateFields = allEnvs
    .filter(env => env !== 'dev' && deploymentStatus[env])
    .map(env => ({
      name: `deploymentDates.${env}`,
      label: `${env.charAt(0).toUpperCase() + env.slice(1)} Deployment Date`,
    })) as { name: `deploymentDates.${string}`; label: string }[];

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
               {selectedRepos.length > 0 ? allEnvs.map(env => (
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
            <CardContent className="space-y-4">
                <div className="space-y-3">
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
                    {customEnvironments.map((env) => (
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
                                    <FormLabel htmlFor={`deploy-check-${env}`} className="capitalize font-normal flex-1">
                                        {env}
                                    </FormLabel>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCustomEnv(env)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                 <div className="flex items-center gap-2 pt-4 border-t mt-4">
                    <Input 
                        placeholder="New environment name..." 
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEnv(); }}}
                    />
                    <Button type="button" onClick={handleAddCustomEnv}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add
                    </Button>
                </div>
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
                                                selected={field.value as Date | undefined}
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
                
                {deploymentDateFields.length > 0 && (
                    <>
                        <div className="pt-4 mt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground">Deployment Dates</h4>
                             { form.formState.errors.deploymentDates && <p className="text-sm font-medium text-destructive">{form.formState.errors.deploymentDates.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {deploymentDateFields.map(dateField => (
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
                                                        selected={field.value as Date | undefined}
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
