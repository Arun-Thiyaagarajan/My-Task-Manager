
'use client';

import { useForm, useFieldArray, Control } from 'react-hook-form';
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
import { Loader2, CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MultiSelect } from './ui/multi-select';
import { Checkbox } from './ui/checkbox';
import * as React from 'react';
import { Card, CardContent } from './ui/card';
import { cloneDeep } from 'lodash';
import { addFieldOption } from '@/lib/data';
import { Separator } from './ui/separator';


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
    if (!task && allFields.repositories && allFields.repositories.defaultValue) {
        defaultData.repositories = allFields.repositories.defaultValue;
    }
    return defaultData;
}

const RenderField = ({ fieldId, control, allFields, adminConfig, allDevelopers, handleCreateTag }: {
    fieldId: string;
    control: Control<TaskFormData>;
    allFields: Record<string, FormField>;
    adminConfig: AdminConfig;
    allDevelopers: string[];
    handleCreateTag: (fieldId: string, value: string) => void;
}) => {
    const fieldDef = allFields[fieldId];
    if (!fieldDef) return null;
    
    const isRequired = adminConfig.fieldConfig[fieldId]?.required;
    const label = `${fieldDef.label}${isRequired ? ' *' : ''}`;

    switch (fieldDef.type) {
      case 'text':
        return (
          <HookFormField
            control={control}
            name={fieldId as any}
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
            control={control}
            name={fieldId as any}
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
                {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'select':
        return (
           <HookFormField
            control={control}
            name={fieldId as any}
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
                {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
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
                control={control}
                name={fieldId as any}
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
                                    // This part is tricky with nested state. Assuming developers is not a child field.
                                } else {
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
        return (
            <HookFormField
                control={control}
                name={fieldId as any}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
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
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        {fieldDef.description && <FormDescription>{fieldDef.description}</FormDescription>}
                        <FormMessage />
                    </FormItem>
                )}
            />
        )
      default:
        return null;
    }
  };

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

  const watchedValues = form.watch();

  const dependencyMap = useMemo(() => {
    const map: Record<string, { parentId: string; optionValue: string }[]> = {};
    for (const field of Object.values(allFields)) {
      if (field.conditionalLogic) {
        for (const [optionValue, childIds] of Object.entries(field.conditionalLogic)) {
          for (const childId of childIds) {
            if (!map[childId]) map[childId] = [];
            map[childId].push({ parentId: field.id, optionValue });
          }
        }
      }
    }
    return map;
  }, [allFields]);

  const visibleFields = useMemo(() => {
    const baseVisible = new Set(adminConfig.formLayout);
    const allConditionalChildren = new Set(Object.keys(dependencyMap));

    allConditionalChildren.forEach(childId => baseVisible.delete(childId));
    
    for (const childId in dependencyMap) {
        const parents = dependencyMap[childId];
        for (const { parentId, optionValue } of parents) {
            const parentValue = watchedValues[parentId];
            if (
                (Array.isArray(parentValue) && parentValue.includes(optionValue)) ||
                (typeof parentValue === 'string' && parentValue === optionValue)
            ) {
                baseVisible.add(childId);
                break;
            }
        }
    }

    const allPossibleFields = [...new Set([...adminConfig.formLayout, ...allConditionalChildren])];
    return allPossibleFields.filter(id => baseVisible.has(id));

  }, [watchedValues, adminConfig.formLayout, dependencyMap]);

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

  const renderGroupField = (fieldDef: FormField) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: fieldDef.id as any,
    });

    const isRequired = adminConfig.fieldConfig[fieldDef.id]?.required;
    const label = `${fieldDef.label}${isRequired ? ' *' : ''}`;

    if (fieldDef.isRepeatable) {
      return (
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-lg font-semibold">{label}</h3>
          {fieldDef.description && <p className="text-sm text-muted-foreground -mt-3 mb-4">{fieldDef.description}</p>}
          <div className="space-y-4">
            {fields.map((item, index) => (
              <Card key={item.id} className="p-4 relative bg-muted/30">
                <CardContent className="p-0 space-y-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
                        {fieldDef.childFieldIds?.map(childId => (
                            <HookFormField
                                key={childId}
                                control={form.control}
                                name={`${fieldDef.id}.${index}.${childId}` as any}
                                render={({ field }) => <RenderField {... {
                                    fieldId: childId,
                                    control: form.control,
                                    allFields: internalAllFields,
                                    adminConfig,
                                    allDevelopers,
                                    handleCreateTag,
                                    ...field
                                }} />}
                            />
                        ))}
                    </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({})}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add {fieldDef.label}
          </Button>
        </div>
      )
    }

    // Non-repeatable group
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-lg font-semibold">{label}</h3>
        {fieldDef.description && <p className="text-sm text-muted-foreground -mt-3 mb-4">{fieldDef.description}</p>}
         <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
            {fieldDef.childFieldIds?.map(childId => (
                 <HookFormField
                    key={childId}
                    control={form.control}
                    name={`${fieldDef.id}.${childId}` as any}
                    render={({ field }) => <RenderField {... {
                        fieldId: childId,
                        control: form.control,
                        allFields: internalAllFields,
                        adminConfig,
                        allDevelopers,
                        handleCreateTag,
                        ...field
                    }} />}
                />
            ))}
        </div>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleFields.map(fieldId => {
                const fieldDef = internalAllFields[fieldId];
                if (!fieldDef) return null;

                const isFullWidth = ['textarea', 'group'].includes(fieldDef.type);
                
                if (fieldDef.type === 'group') {
                    return (
                        <div key={fieldId} className="md:col-span-2 lg:col-span-3">
                            {renderGroupField(fieldDef)}
                        </div>
                    )
                }

                return (
                    <div 
                        key={fieldId} 
                        className={cn(
                            isFullWidth ? 'md:col-span-2 lg:col-span-3' : 'col-span-1'
                        )}
                    >
                       <RenderField 
                          fieldId={fieldId} 
                          control={form.control}
                          allFields={internalAllFields}
                          adminConfig={adminConfig}
                          allDevelopers={allDevelopers}
                          handleCreateTag={handleCreateTag}
                        />
                    </div>
                );
            })}
        </div>

        <Separator />

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
