
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task, FieldConfig, FieldType, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MultiSelect } from '@/components/ui/multi-select';
import { Checkbox } from '@/components/ui/checkbox';
import { addDeveloper, getUiConfig } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TASK_STATUSES, REPOSITORIES } from '@/lib/constants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  
  useEffect(() => {
    const defaultValues = getInitialTaskData(task);
    form.reset(defaultValues);
  }, [task, form]);

  const handleCreateDeveloper = (name: string) => {
    addDeveloper(name);
    // You might want to update developersList here as well
  };

  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        onSubmit(data);
    });
  };

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
    if(field.type === 'tags') {
      return []; // Return empty array, user creates options
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
                            <SelectTrigger>
                                <SelectValue placeholder={`Select ${label}`} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {getFieldOptions(fieldConfig).map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'multiselect':
                 const creatable = key === 'developers';
                 return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Select ${label}...`}
                        creatable={creatable}
                        {...(creatable && { onCreate: handleCreateDeveloper })}
                    />
                );
            case 'tags':
                return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Add ${label}...`}
                        creatable
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

    // Hide fields that are handled manually elsewhere or removed from form
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
                    <FormControl>
                        {renderInput(type, field)}
                    </FormControl>
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
    
  const groupOrder = Object.keys(groupedFields).sort((a, b) => {
      const aFields = groupedFields[a];
      const bFields = groupedFields[b];
      const aMinOrder = Math.min(...aFields.map(f => f.order));
      const bMinOrder = Math.min(...bFields.map(f => f.order));
      return aMinOrder - bMinOrder;
  });

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
