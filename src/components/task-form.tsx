
'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task, FieldConfig, FieldType, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CalendarIcon, GitPullRequest, Trash2, Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MultiSelect } from './ui/multi-select';
import { Checkbox } from './ui/checkbox';
import { addDeveloper, getUiConfig } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TASK_STATUSES, REPOSITORIES } from '@/lib/constants';
import { LoadingSpinner } from './ui/loading-spinner';

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
            customFields: {},
        };
    }
    
    const deploymentDatesAsDates: { [key: string]: Date | undefined | null } = {};
    if (task.deploymentDates) {
        for (const key in task.deploymentDates) {
            const dateVal = task.deploymentDates[key];
            if(dateVal) {
                deploymentDatesAsDates[key] = new Date(dateVal);
            } else {
                deploymentDatesAsDates[key] = null;
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
        customFields: task.customFields || {},
    }
}

export function TaskForm({ task, onSubmit, submitButtonText, developersList }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);

  useEffect(() => {
    setUiConfig(getUiConfig());
  }, []);

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
  }, [task, form]);

  const handleCreateDeveloper = (name: string) => {
    addDeveloper(name);
  };

  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        onSubmit(data);
    });
  };

  const selectedRepos = form.watch('repositories') || [];
  const allEnvs = uiConfig?.environments || [];
  const deploymentStatus = form.watch('deploymentStatus');
  
  const getFieldOptions = (field: FieldConfig): {value: string, label: string}[] => {
    if (field.key === 'developers') {
        return developersList.map(d => ({ value: d, label: d }));
    }
    if (field.key === 'repositories') {
        return REPOSITORIES.map(d => ({ value: d, label: d }));
    }
    if (field.key === 'status') {
      return TASK_STATUSES.map(s => ({ value: s, label: s}));
    }
    return field.options?.map(opt => ({ value: opt.value, label: opt.label })) || [];
  }
  
  const renderField = (fieldConfig: FieldConfig) => {
    const { key, type, label, isCustom, isRequired } = fieldConfig;
    const fieldName = isCustom ? `customFields.${key}` : key;

    const renderInput = (fieldType: FieldType, field: any) => {
        switch (fieldType) {
            case 'text':
            case 'number':
            case 'url':
                return <Input type={fieldType === 'text' ? 'text' : fieldType} placeholder={label} {...field} />;
            case 'textarea':
                return <Textarea placeholder={`Details for ${label}...`} {...field} />;
            case 'date':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
                );
            case 'select':
                return (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {getFieldOptions(fieldConfig).map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'multiselect':
                return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Select ${label}...`}
                        {...(key === 'developers' && { onCreate: handleCreateDeveloper })}
                    />
                );
            case 'checkbox':
                return (
                    <div className="flex items-center space-x-2 h-10">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} id={fieldName} />
                        <label htmlFor={fieldName} className="text-sm font-normal text-muted-foreground">
                            Enable {label}
                        </label>
                    </div>
                );
            default:
                return <Input placeholder={label} {...field} />;
        }
    }

    // Hide fields that are handled manually in other cards
    if (['prLinks', 'attachments', 'deploymentStatus', 'deploymentDates'].includes(key)) return null;

    return (
        <FormField
            key={key}
            control={form.control}
            name={fieldName as any}
            rules={{ required: isRequired }}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label} {isRequired && '*'}</FormLabel>
                    {renderInput(type, field)}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
  }

  if (!uiConfig) {
      return <LoadingSpinner text="Loading form configuration..." />;
  }

  const groupedFields = uiConfig.fields
    .filter(f => f.isActive)
    .sort((a,b) => a.order - b.order)
    .reduce((acc, field) => {
        const group = field.group || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(field);
        return acc;
    }, {} as Record<string, FieldConfig[]>);
    
  const groupOrder = Object.keys(groupedFields);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        
        {groupOrder.map(groupName => (
            <Card key={groupName}>
                <CardHeader>
                    <CardTitle>{groupName}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedFields[groupName].map(field => renderField(field))}
                </CardContent>
            </Card>
        ))}
        
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
                <CardTitle>Deployments</CardTitle>
                <FormDescription>Select environments and set their deployment dates.</FormDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allEnvs.map(env => (
                        <div key={env} className="flex flex-col gap-3 p-3 border rounded-md bg-muted/20">
                            <FormField
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
                                        <FormLabel htmlFor={`deploy-check-${env}`} className="capitalize font-medium text-sm flex-1 cursor-pointer">
                                            {env}
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                            {deploymentStatus?.[env] && (
                                <FormField
                                    control={form.control}
                                    name={`deploymentDates.${env}`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                          variant={"outline"}
                                                          className={cn(
                                                            "w-full pl-3 text-left font-normal bg-card",
                                                            !field.value && "text-muted-foreground"
                                                          )}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Deployment Date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
                 {allEnvs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No environments configured. Please add environments in the settings page.</p>
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
