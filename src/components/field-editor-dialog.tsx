
'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { saveField } from '@/lib/data';
import type { FormField as FormFieldType } from '@/lib/types';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { ICONS } from '@/lib/form-config';

const fieldSchema = z.object({
  label: z.string().min(2, { message: 'Field name must be at least 2 characters.' }),
  description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
  type: z.enum(['text', 'textarea', 'date', 'select', 'multiselect', 'attachments', 'deployment', 'pr-links']),
  options: z.array(z.object({ value: z.string().min(1, 'Option cannot be empty') })).optional(),
}).refine(data => {
    if ((data.type === 'select' || data.type === 'multiselect') && (!data.options || data.options.length < 1)) {
        return false;
    }
    return true;
}, {
    message: 'Select and Multiselect types require at least one option.',
    path: ['options'],
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fieldToEdit?: FormFieldType | null;
}

export function FieldEditorDialog({ isOpen, onOpenChange, onSuccess, fieldToEdit }: FieldEditorDialogProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  
  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
  });

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'options'
  });

  const fieldType = form.watch('type');
  const isBuiltInField = fieldToEdit && !fieldToEdit.isCustom;

  useEffect(() => {
    if (isOpen) {
        if (fieldToEdit) {
            form.reset({
                label: fieldToEdit.label,
                description: fieldToEdit.description,
                type: fieldToEdit.type,
                options: fieldToEdit.options?.map(o => ({ value: o })) || []
            });
        } else {
            form.reset({
                label: '',
                description: '',
                type: 'text',
                options: []
            });
        }
    }
  }, [isOpen, fieldToEdit, form]);

  const onSubmit: SubmitHandler<FieldFormData> = (data) => {
    setIsPending(true);
    try {
        const id = fieldToEdit ? fieldToEdit.id : `custom_${Date.now()}`;
        
        const fieldToSave: FormFieldType = {
            ...fieldToEdit, // a null fieldToEdit will be gracefully handled
            id,
            label: data.label,
            description: data.description,
            type: data.type,
            options: data.options?.map(o => o.value),
            icon: fieldToEdit?.icon || 'text',
            isCustom: !fieldToEdit?.isCustom ? false : true,
        };

        if (!fieldToEdit) { // This is a new custom field
            fieldToSave.isCustom = true;
            fieldToSave.defaultValue = data.type === 'multiselect' ? [] : data.type === 'date' ? null : '';
        }
        
        saveField(fieldToSave);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{fieldToEdit ? 'Edit Field' : 'Add New Custom Field'}</DialogTitle>
          <DialogDescription>
            {fieldToEdit ? `Update the properties for "${fieldToEdit.label}".` : `Create a new custom field to use in your forms.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!fieldToEdit}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="textarea">Text Area</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="select">Dropdown (Single-Select)</SelectItem>
                                    <SelectItem value="multiselect">Dropdown (Multi-Select)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>The type cannot be changed after creation.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {(fieldType === 'select' || fieldType === 'multiselect') && (
                    <div className="space-y-4 rounded-md border p-4">
                        <FormLabel>Options</FormLabel>
                        <FormDescription>Add/remove options for the dropdown menu.</FormDescription>
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
                         <Button type="button" variant="outline" size="sm" onClick={() => append({value: ''})}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                        </Button>
                        <FormMessage>{form.formState.errors.options?.message}</FormMessage>
                    </div>
                )}
                
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {fieldToEdit ? 'Save Changes' : 'Create Field'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
