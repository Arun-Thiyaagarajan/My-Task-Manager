
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { saveField } from '@/lib/data';
import type { FormField as FormFieldType, AdminConfig } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


const fieldSchema = z.object({
  label: z.string().min(2, { message: 'Field name must be at least 2 characters.' }),
  description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
  type: z.enum(['text', 'textarea', 'date', 'select', 'multiselect', 'tags', 'attachments', 'deployment', 'pr-links']),
  group: z.string().min(1, 'Please enter a group name.'),
  options: z.array(z.object({ value: z.string().min(1, 'Option cannot be empty') })).optional(),
  required: z.boolean().optional(),
}).refine(data => {
    if ((data.type === 'select' || data.type === 'multiselect' || data.type === 'tags') && (!data.options || data.options.length < 1)) {
        return false;
    }
    return true;
}, {
    message: 'Select, Multiselect, and Tags types require at least one option.',
    path: ['options'],
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fieldToEdit?: FormFieldType | null;
  adminConfig: AdminConfig;
}

export function FieldEditorDialog({ isOpen, onOpenChange, onSuccess, fieldToEdit, adminConfig }: FieldEditorDialogProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  
  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
  });

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'options'
  });

  const fieldType = form.watch('type');
  const groupNames = useMemo(() => adminConfig?.groupOrder ? [...new Set(adminConfig.groupOrder)] : [], [adminConfig?.groupOrder]);

  useEffect(() => {
    if (isOpen) {
        if (fieldToEdit) {
            form.reset({
                label: fieldToEdit.label,
                description: fieldToEdit.description,
                type: fieldToEdit.type,
                group: fieldToEdit.group || (fieldToEdit.type === 'tags' ? 'Tagging' : 'Custom Fields'),
                options: fieldToEdit.options?.map(o => ({ value: o })) || [],
                required: fieldToEdit.id === 'title' || adminConfig.fieldConfig[fieldToEdit.id]?.required || false,
            });
        } else {
            form.reset({
                label: '',
                description: '',
                type: 'text',
                group: 'Custom Fields',
                options: [],
                required: false,
            });
        }
    }
  }, [isOpen, fieldToEdit, form, adminConfig]);

  const onSubmit: SubmitHandler<FieldFormData> = (data) => {
    setIsPending(true);
    try {
        const id = fieldToEdit ? fieldToEdit.id : `custom_${Date.now()}`;
        
        const fieldToSave: FormFieldType = {
            ...(fieldToEdit || {}),
            id,
            label: data.label,
            description: data.description,
            type: data.type,
            group: data.group,
            options: (data.type === 'select' || data.type === 'multiselect' || data.type === 'tags') ? data.options?.map(o => o.value) : [],
            icon: fieldToEdit?.icon || 'text',
            isCustom: fieldToEdit ? (fieldToEdit.isCustom ?? false) : true,
        };

        if (!fieldToEdit) { // This is a new custom field
            fieldToSave.isCustom = true;
            fieldToSave.defaultValue = (data.type === 'multiselect' || data.type === 'tags') ? [] : data.type === 'date' ? null : '';
        }
        
        saveField(fieldToSave, data.required || false);
        onSuccess();
        onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{fieldToEdit ? 'Edit Field' : 'Add New Custom Field'}</DialogTitle>
          <DialogDescription>
            {fieldToEdit ? `Update the properties for "${fieldToEdit.label}".` : `Create a new custom field to use in your forms.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
            <Form {...form}>
                <form id="field-editor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="label"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Field Label</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
                                <FormControl><Textarea {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Field Type</FormLabel>
                                <Select 
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        if (!fieldToEdit) {
                                            const newGroup = value === 'tags' ? 'Tagging' : 'Custom Fields';
                                            form.setValue('group', newGroup, { shouldValidate: true });
                                        }
                                    }} 
                                    defaultValue={field.value} 
                                    disabled={!!fieldToEdit}
                                >
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="textarea">Text Area</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="select">Dropdown (Single-Select)</SelectItem>
                                        <SelectItem value="multiselect">Dropdown (Multi-Select)</SelectItem>
                                        <SelectItem value="tags">Tag Selection</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>The type cannot be changed after creation.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="group"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Group</FormLabel>
                                <Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value || "Select a group"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command
                                            filter={(value, search) => value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0}
                                        >
                                            <CommandInput 
                                                placeholder="Search or create group..."
                                                onKeyDown={(e) => {
                                                    if(e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const inputVal = (e.target as HTMLInputElement).value.trim();
                                                        if(inputVal) {
                                                            field.onChange(inputVal);
                                                            setGroupPopoverOpen(false);
                                                        }
                                                    }
                                                }}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    No group found. Press Enter to create.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {groupNames.map((group) => (
                                                        <CommandItem
                                                            value={group}
                                                            key={group}
                                                            onSelect={() => {
                                                                field.onChange(group);
                                                                setGroupPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    group === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {group}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Assign this field to a group. Type and press Enter to create a new one.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(fieldType === 'select' || fieldType === 'multiselect' || fieldType === 'tags') && (
                        <div className="space-y-4 rounded-md border p-4">
                            <FormLabel>Options</FormLabel>
                            <FormDescription>Add/remove options for the dropdown menu.</FormDescription>
                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                <FormField
                                    key={field.id}
                                    control={form.control}
                                    name={`options.${index}.value`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center gap-2">
                                                <FormControl><Input {...field} /></FormControl>
                                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({value: ''})}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                            </Button>
                            <FormMessage>{form.formState.errors.options?.root?.message}</FormMessage>
                        </div>
                    )}
                    <FormField
                        control={form.control}
                        name="required"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Required</FormLabel>
                                    <FormDescription>
                                        Make this field mandatory in the task form.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={fieldToEdit?.id === 'title'}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t -mx-6 px-6 bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" form="field-editor-form" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {fieldToEdit ? 'Save Changes' : 'Create Field'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
