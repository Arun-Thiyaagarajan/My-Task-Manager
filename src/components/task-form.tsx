
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { createTaskSchema } from '@/lib/validators';
import type { Task, FieldConfig, FieldType, UiConfig, Attachment, Person } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, CalendarIcon, Trash2, PlusCircle, Image, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect, useState, useRef, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MultiSelect } from '@/components/ui/multi-select';
import { Checkbox } from '@/components/ui/checkbox';
import { addDeveloper, getUiConfig, addTester } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useToast } from '@/hooks/use-toast';

type TaskFormData = z.infer<ReturnType<typeof createTaskSchema>>;

interface TaskFormProps {
  task?: Partial<Task>;
  onSubmit: (data: TaskFormData) => void;
  submitButtonText: string;
  developersList: Person[];
  testersList: Person[];
}

const safeParseDate = (d: any): Date | undefined => {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
};

const getInitialTaskData = (task?: Partial<Task>) => {
    if (!task) {
        return {
            title: '',
            description: '',
            status: 'To Do',
            repositories: [],
            developers: [],
            testers: [],
            prLinks: {},
            deploymentStatus: {},
            attachments: [],
            deploymentDates: {},
            customFields: {},
            azureWorkItemId: '',
            summary: null,
        };
    }
    
    const deploymentDatesAsDates: { [key: string]: Date | undefined } = {};
    if (task.deploymentDates) {
        for (const key in task.deploymentDates) {
            deploymentDatesAsDates[key] = safeParseDate(task.deploymentDates[key]);
        }
    }
    
    return {
        ...task,
        devStartDate: safeParseDate(task.devStartDate),
        devEndDate: safeParseDate(task.devEndDate),
        qaStartDate: safeParseDate(task.qaStartDate),
        qaEndDate: safeParseDate(task.qaEndDate),
        deploymentDates: deploymentDatesAsDates,
        attachments: task.attachments || [],
        customFields: task.customFields || {},
        prLinks: task.prLinks || {},
        deploymentStatus: task.deploymentStatus || {},
        developers: task.developers || [],
        testers: task.testers || [],
        azureWorkItemId: task.azureWorkItemId || '',
        summary: task.summary || null,
    }
}

export function TaskForm({ task, onSubmit, submitButtonText, developersList: propDevelopersList, testersList: propTestersList }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [developersList, setDevelopersList] = useState<Person[]>(propDevelopersList);
  const [testersList, setTestersList] = useState<Person[]>(propTestersList);
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { setIsDirty, prompt } = useUnsavedChanges();

  useEffect(() => {
    setUiConfig(getUiConfig());
  }, []);

  const dynamicTaskSchema = useMemo(() => {
    return uiConfig ? createTaskSchema(uiConfig) : createTaskSchema(getUiConfig());
  }, [uiConfig]);

  useEffect(() => {
    setDevelopersList(propDevelopersList);
  }, [propDevelopersList]);

  useEffect(() => {
    setTestersList(propTestersList);
  }, [propTestersList]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(dynamicTaskSchema),
    defaultValues: getInitialTaskData(task),
  });

  const { formState: { isDirty } } = form;
  
  useEffect(() => {
    setIsDirty(isDirty);
    return () => {
      setIsDirty(false);
    };
  }, [isDirty, setIsDirty]);
  
  useEffect(() => {
    const initialData = getInitialTaskData(task);
    if (!initialData.status && uiConfig?.taskStatuses?.length) {
        initialData.status = uiConfig.taskStatuses[0];
    }
    form.reset(initialData);
  }, [task, form.reset, uiConfig]);
  
  const devStartDate = form.watch('devStartDate');
  const qaStartDate = form.watch('qaStartDate');
  
  const { fields: attachments, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control: form.control,
    name: 'attachments',
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
            variant: 'destructive',
            title: 'Image too large',
            description: 'Please upload an image smaller than 2MB.',
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        appendAttachment({
            name: file.name,
            url: dataUri,
            type: 'image',
        });
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (event.target) {
        event.target.value = '';
    }
  };

  const watchedRepositories = form.watch('repositories', []);
  const allConfiguredEnvs = uiConfig?.environments || [];

  const handleCreateDeveloper = (name: string): string | undefined => {
    try {
        const newDev = addDeveloper({ name });
        setDevelopersList(prev => {
            if (prev.some(d => d.id === newDev.id)) return prev;
            return [...prev, newDev];
        });
        return newDev.id;
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Could not add developer',
            description: error.message || 'An unexpected error occurred.'
        });
        return undefined;
    }
  };

  const handleCreateTester = (name: string): string | undefined => {
     try {
        const newTester = addTester({ name });
        setTestersList(prev => {
            if (prev.some(t => t.id === newTester.id)) return prev;
            return [...prev, newTester];
        });
        return newTester.id;
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Could not add tester',
            description: error.message || 'An unexpected error occurred.'
        });
        return undefined;
    }
  };

  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        setIsDirty(false);
        onSubmit(data);
    });
  };

  const getFieldOptions = (field: FieldConfig): {value: string, label: string}[] => {
    let options: {value: string, label: string}[] = [];
    
    if (field.key === 'repositories') {
        options = (uiConfig?.repositoryConfigs || []).map(d => ({ value: d.name, label: d.name }));
    } else if (field.key === 'status') {
      options = (uiConfig?.taskStatuses || []).map(s => ({ value: s, label: s}));
      // Status field should not be sorted alphabetically
      return options;
    } else if(field.type === 'tags') {
        if(field.key === 'developers') {
            options = (developersList || []).map(d => ({ value: d.id, label: d.name }));
        } else if(field.key === 'testers') {
            options = (testersList || []).map(t => ({ value: t.id, label: t.name }));
        } else {
            options = field.options?.map(opt => ({ value: opt.value, label: opt.label })) || [];
        }
    } else {
        options = field.options?.map(opt => ({ value: opt.value, label: opt.label })) || [];
    }

    if (field.sortDirection === 'asc') {
        options.sort((a, b) => a.label.localeCompare(b.label));
    } else if (field.sortDirection === 'desc') {
        options.sort((a, b) => b.label.localeCompare(a.label));
    }
    // No sorting for 'manual' or undefined

    return options;
  }
  
  const renderField = (fieldConfig: FieldConfig) => {
    const { key, type, label, isCustom, isRequired, baseUrl } = fieldConfig;
    const fieldName = isCustom ? `customFields.${key}` : key;

    const renderInput = (fieldType: FieldType, field: any) => {
        switch (fieldType) {
            case 'text':
                return (
                    <div>
                        <Input type="text" placeholder={label} {...field} value={field.value ?? ''} />
                        {baseUrl && <FormDescription className="mt-1">The value will be appended to: {baseUrl}</FormDescription>}
                    </div>
                );
            case 'number':
            case 'url':
                return <Input type={fieldType === 'text' ? 'text' : fieldType} placeholder={label} {...field} value={field.value ?? ''} />;
            case 'textarea':
                return <Textarea placeholder={`Details for ${label}...`} {...field} value={field.value ?? ''} />;
            case 'date':
                const getDisabledDates = () => {
                    if (fieldName === 'devEndDate' && devStartDate) {
                        return { before: devStartDate };
                    }
                    if (fieldName === 'qaEndDate' && qaStartDate) {
                        return { before: qaStartDate };
                    }
                    return undefined;
                };

                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined}
                                onSelect={(date) => {
                                    field.onChange(date);
                                    // If a start date is changed, check if the corresponding end date is still valid.
                                    // If not, clear it to prevent validation errors.
                                    if (fieldName === 'devStartDate') {
                                        const devEndDate = form.getValues('devEndDate');
                                        if (devEndDate && date && devEndDate < date) {
                                            form.setValue('devEndDate', undefined);
                                        }
                                    }
                                    if (fieldName === 'qaStartDate') {
                                        const qaEndDate = form.getValues('qaEndDate');
                                        if (qaEndDate && date && qaEndDate < date) {
                                            form.setValue('qaEndDate', undefined);
                                        }
                                    }
                                }}
                                initialFocus
                                disabled={getDisabledDates()}
                            />
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
                 return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Select ${label}...`}
                    />
                );
            case 'tags':
                const isDeveloperField = key === 'developers';
                const isTesterField = key === 'testers';
                return (
                     <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={getFieldOptions(fieldConfig)}
                        placeholder={`Add ${label}...`}
                        creatable
                        {...(isDeveloperField && { onCreate: handleCreateDeveloper })}
                        {...(isTesterField && { onCreate: handleCreateTester })}
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
                return <Input placeholder={label} {...field} value={field.value ?? ''} />;
        }
    }

    return (
        <FormField
            key={key}
            control={form.control}
            name={fieldName as any}
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

  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));

  const groupedFields = uiConfig.fields
    .filter(f => f.isActive && f.key !== 'comments') // <-- Filter out comments here
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
        
        {groupOrder.map(groupName => {
             // These groups will be handled manually with custom UI
            if (['Attachments', 'Deployment', 'Pull Requests'].includes(groupName)) {
                return null;
            }

            const fieldsInGroup = groupedFields[groupName];
            if (!fieldsInGroup || fieldsInGroup.length === 0) {
                return null;
            }
            
            const gridColsClass = fieldsInGroup.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1';

            return (
                <Card key={groupName} id={groupName === 'Core Details' ? 'task-form-main-card' : undefined}>
                    <CardHeader>
                        <CardTitle>{groupName}</CardTitle>
                    </CardHeader>
                    <CardContent className={cn("grid grid-cols-1 gap-6", gridColsClass)}>
                        {groupedFields[groupName].map(field => renderField(field))}
                    </CardContent>
                </Card>
            )
        })}

        {/* Attachments Card */}
        {uiConfig.fields.find(f => f.key === 'attachments' && f.isActive) && (
            <Card>
                <CardHeader><CardTitle>{fieldLabels.get('attachments') || 'Attachments'}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        {attachments.map((item, index) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 border rounded-md bg-muted/50">
                                {item.type === 'image' ? (
                                    <img src={item.url} alt={item.name} className="h-20 w-20 rounded-md object-cover flex-shrink-0" />
                                ) : (
                                    <div className="h-20 w-20 flex-shrink-0 flex items-center justify-center bg-secondary rounded-md">
                                        <Link2 className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <FormField
                                        control={form.control}
                                        name={`attachments.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-normal">Name</FormLabel>
                                                <FormControl><Input {...field} placeholder="Attachment name" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {item.type === 'link' && (
                                        <FormField
                                            control={form.control}
                                            name={`attachments.${index}.url`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-normal">URL</FormLabel>
                                                    <FormControl><Input {...field} placeholder="https://example.com/file" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeAttachment(index)} className="shrink-0"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>

                    {form.formState.errors.attachments && <FormMessage>{form.formState.errors.attachments.message}</FormMessage>}
                    
                    <div className="flex gap-2 pt-2 border-t">
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAttachment({ name: '', url: '', type: 'link' })}>
                            <Link2 className="h-4 w-4 mr-2" /> Add Link
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                            <Image className="h-4 w-4 mr-2" /> Add Image
                        </Button>
                    </div>

                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                    />
                </CardContent>
            </Card>
        )}

        {/* Deployment Card */}
        {uiConfig.fields.find(f => f.key === 'deploymentStatus' && f.isActive) && (
            <Card>
                <CardHeader><CardTitle>{fieldLabels.get('deploymentStatus') || 'Deployment'}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {allConfiguredEnvs.map(env => (
                        <div key={env} className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-3 border rounded-md">
                            <FormField
                                control={form.control}
                                name={`deploymentStatus.${env}`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value ?? false}
                                                onCheckedChange={field.onChange}
                                                id={`deploy-check-${env}`}
                                            />
                                        </FormControl>
                                        <FormLabel
                                            htmlFor={`deploy-check-${env}`}
                                            className="font-normal capitalize cursor-pointer"
                                        >
                                            Deployed to {env}
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                            {form.watch(`deploymentStatus.${env}`) && env !== 'dev' && (
                                <FormField
                                    control={form.control}
                                    name={`deploymentDates.${env}`}
                                    render={({ field }) => (
                                        <FormItem className="w-full sm:w-auto sm:min-w-[250px]">
                                             <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP") : <span>Deployment Date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        {/* Pull Requests Card */}
        {uiConfig.fields.find(f => f.key === 'prLinks' && f.isActive) && (
            <Card>
                <CardHeader><CardTitle>{fieldLabels.get('prLinks') || 'Pull Requests'}</CardTitle></CardHeader>
                <CardContent>
                    {watchedRepositories && watchedRepositories.length > 0 ? (
                         <Tabs defaultValue={watchedRepositories[0]} className="w-full">
                            <ScrollArea className="w-full whitespace-nowrap">
                                <TabsList>
                                    {watchedRepositories.map(repo => <TabsTrigger key={repo} value={repo}>{repo}</TabsTrigger>)}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>

                            {watchedRepositories.map(repo => (
                                <TabsContent key={repo} value={repo}>
                                    <div className="space-y-4 pt-4">
                                    {allConfiguredEnvs.map(env => (
                                        <FormField
                                            key={`${repo}-${env}`}
                                            control={form.control}
                                            name={`prLinks.${env}.${repo}`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="capitalize">PR IDs for {env}</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value ?? ''} placeholder="e.g. 12345, 67890" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                    </div>
                                </TabsContent>
                            ))}
                         </Tabs>
                    ) : ( <p className="text-sm text-muted-foreground text-center py-4">Assign a repository to add PR links.</p> )}
                </CardContent>
            </Card>
        )}

        <div id="task-form-submit" className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                prompt(() => router.back());
              }}
              disabled={isPending}
            >
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
