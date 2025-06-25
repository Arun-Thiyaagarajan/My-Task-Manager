
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { buildTaskSchema } from '@/lib/validators';
import type { Task, AdminConfig, FormField } from '@/lib/types';
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
  FormField as HookFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, CalendarIcon, PlusCircle, Trash2, Link2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MultiSelect } from './ui/multi-select';
import { Checkbox } from './ui/checkbox';
import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { ENVIRONMENTS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cloneDeep } from 'lodash';
import { addFieldOption } from '@/lib/data';


type TaskFormData = z.infer<ReturnType<typeof buildTaskSchema>>;

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: any) => void;
  submitButtonText: string;
  developersList: string[];
  adminConfig: AdminConfig;
  allFields: Record<string, FormField>;
}

const getInitialTaskData = (allFields: Record<string, FormField>, task?: Task) => {
    const defaultData: any = {};
    Object.values(allFields).forEach(field => {
        const taskValue = task?.[field.id as keyof Task];
        if (task && taskValue !== undefined) {
            if (field.type === 'date' && taskValue) {
                defaultData[field.id] = new Date(taskValue as string);
            } else {
                defaultData[field.id] = taskValue;
            }
        } else {
            defaultData[field.id] = field.defaultValue;
        }
    });
     // Set default repository if creating a new task and it's not already set
    if (!task && allFields.repositories && allFields.repositories.defaultValue) {
        defaultData.repositories = allFields.repositories.defaultValue;
    }
    return defaultData;
}

export function TaskForm({ task, onSubmit, submitButtonText, developersList, adminConfig, allFields }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [internalAllFields, setInternalAllFields] = useState(allFields);
  const [allDevelopers, setAllDevelopers] = useState<string[]>(developersList);
  
  const taskSchema = useMemo(() => buildTaskSchema(adminConfig, internalAllFields), [adminConfig, internalAllFields]);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: getInitialTaskData(allFields, task),
  });

  useEffect(() => {
    form.reset(getInitialTaskData(allFields, task));
  }, [task, allFields, form]);
  
  useEffect(() => {
    setAllDevelopers(developersList);
  }, [developersList]);

  useEffect(() => {
      setInternalAllFields(allFields);
  }, [allFields]);

  const handleCreateTag = (fieldId: string, value: string) => {
    if (addFieldOption(fieldId, value)) {
        const newFields = cloneDeep(internalAllFields);
        if (!newFields[fieldId].options) {
            newFields[fieldId].options = [];
        }
        newFields[fieldId].options!.push(value);
        setInternalAllFields(newFields);
    }
  };

  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        onSubmit(data);
    });
  };

  const renderField = (fieldId: string) => {
    const fieldDef = internalAllFields[fieldId];
    if (!fieldDef) return null;
    
    const isVisible = adminConfig.fieldConfig[fieldId]?.visible;
    if (!isVisible) return null;
    
    const isRequired = adminConfig.fieldConfig[fieldId]?.required;
    const label = `${fieldDef.label}${isRequired ? ' *' : ''}`;

    switch (fieldDef.type) {
      case 'text':
        return (
          <HookFormField
            control={form.control}
            name={fieldId}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input placeholder={fieldDef.placeholder} {...field} value={field.value ?? ''}/>
                </FormControl>
                {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <HookFormField
            control={form.control}
            name={fieldId}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={fieldDef.placeholder}
                    className="min-h-[120px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'select':
        return (
           <HookFormField
            control={form.control}
            name={fieldId}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={fieldDef.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fieldDef.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'multiselect':
      case 'tags':
         let options: { value: string; label: string; }[] = [];
         if (fieldDef.id === 'developers') {
             options = allDevelopers.map(opt => ({ value: opt, label: opt }));
         } else {
             options = (fieldDef.options ?? []).map(opt => ({ value: opt, label: opt }));
         }
         
         const canCreate = fieldDef.id === 'developers' || fieldDef.type === 'tags';

         return (
            <HookFormField
                control={form.control}
                name={fieldId}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <MultiSelect
                            selected={field.value ?? []}
                            onChange={field.onChange}
                            options={options}
                            placeholder={fieldDef.placeholder}
                            onCreate={canCreate ? (value) => {
                                if(fieldDef.id === 'developers') {
                                    setAllDevelopers((prev) => [...new Set([...prev, value])]);
                                } else { // 'tags' type
                                    handleCreateTag(fieldId, value);
                                }
                            } : undefined}
                        />
                    </FormControl>
                    {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
                    <FormMessage />
                </FormItem>
                )}
            />
         );
      
      case 'date':
        const watchedDate = form.watch(fieldDef.disablePastDatesFrom as any);
        return (
            <HookFormField
                control={form.control}
                name={fieldId}
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>{label}</FormLabel>
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
                                    format(new Date(field.value), "PPP")
                                ) : (
                                    <span>{fieldDef.placeholder}</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    (watchedDate && date < new Date(watchedDate)) ||
                                    date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )

      case 'attachments':
        return <AttachmentsField form={form} label={label} />;

      case 'deployment':
        return <DeploymentField form={form} label={label} />;
        
      case 'pr-links':
        return <PrLinksField form={form} label={label} />;

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        
        <div className="space-y-6">
            {adminConfig.formLayout.map(fieldId => (
                <React.Fragment key={fieldId}>
                    {renderField(fieldId)}
                </React.Fragment>
            ))}
        </div>

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


function AttachmentsField({ form, label }: { form: any, label: string }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "attachments"
    });
    return (
         <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{label}</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', url: '', type: 'link' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Attachment
                </Button>
            </div>
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start border p-4 rounded-md relative">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow w-full">
                            <HookFormField
                                control={form.control}
                                name={`attachments.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Design Mockup" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <HookFormField
                                control={form.control}
                                name={`attachments.${index}.url`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <HookFormField
                                control={form.control}
                                name={`attachments.${index}.type`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="link">
                                                  <div className="flex items-center"><Link2 className="mr-2 h-4 w-4" /> Web Link</div>
                                                </SelectItem>
                                                <SelectItem value="file">
                                                  <div className="flex items-center"><FileText className="mr-2 h-4 w-4" /> File Link</div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="md:absolute md:top-2 md:right-2 mt-4 md:mt-0 shrink-0"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Remove attachment</span>
                        </Button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No attachments added.</p>
                )}
            </div>
        </Card>
    )
}

function DeploymentField({ form, label }: { form: any, label: string }) {
    const isOthersDeployed = form.watch('deploymentStatus.others');
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {ENVIRONMENTS.map(env => (
                    <React.Fragment key={env}>
                        <HookFormField
                        control={form.control}
                        name={`deploymentStatus.${env}`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="capitalize font-normal">
                                Deployed to {env}
                                </FormLabel>
                            </div>
                            </FormItem>
                        )}
                        />
                        {env === 'others' && isOthersDeployed && (
                        <div className="pl-4 pb-2 -mt-2">
                            <HookFormField
                            control={form.control}
                            name="othersEnvironmentName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Environment Name <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. UAT, Demo" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        )}
                    </React.Fragment>
                ))}
            </CardContent>
        </Card>
    )
}

function PrLinksField({ form, label }: { form: any, label: string }) {
    const selectedRepos = form.watch('repositories');
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                {selectedRepos && selectedRepos.length > 0 ? (
                <Tabs defaultValue={selectedRepos[0]} className="w-full">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <TabsList>
                            {selectedRepos.map((repo:string) => (
                            <TabsTrigger key={repo} value={repo}>
                                {repo}
                            </TabsTrigger>
                            ))}
                        </TabsList>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    {selectedRepos.map((repo:string) => (
                        <TabsContent key={repo} value={repo}>
                            <div className="space-y-4 pt-4 border-t">
                            {ENVIRONMENTS.map((env) => (
                                <HookFormField
                                    key={`${repo}-${env}`}
                                    control={form.control}
                                    name={`prLinks.${env}.${repo}`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="capitalize">{env}</FormLabel>
                                        <FormControl>
                                        <Input
                                            placeholder="e.g. 19703, 19704"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value ?? '')}
                                            value={field.value ?? ''}
                                        />
                                        </FormControl>
                                        <FormDescription>Comma-separated PR IDs for {env}.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
                ) : (
                <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                    Select at least one repository to add PR links.
                </div>
                )}
            </CardContent>
        </Card>
    );
}
