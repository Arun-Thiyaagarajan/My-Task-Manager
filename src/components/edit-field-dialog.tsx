
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { FieldConfig, FieldOption, FieldType } from '@/lib/types';
import { FIELD_TYPES } from '@/lib/constants';

const fieldOptionSchema = z.object({
    id: z.string(),
    label: z.string().min(1, "Label is required"),
    value: z.string().min(1, "Value is required"),
});

const fieldSchema = z.object({
  label: z.string().min(2, { message: 'Label must be at least 2 characters.' }),
  type: z.enum(FIELD_TYPES.map(t => t.value) as [FieldType, ...FieldType[]]),
  group: z.string().min(2, { message: 'Group must be at least 2 characters.' }),
  isRequired: z.boolean(),
  options: z.array(fieldOptionSchema).optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface EditFieldDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: FieldConfig) => void;
  field: FieldConfig | null;
}

export function EditFieldDialog({ isOpen, onOpenChange, onSave, field }: EditFieldDialogProps) {
  const isCreating = field === null;

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field?.label || '',
      type: field?.type || 'text',
      group: field?.group || 'Custom',
      isRequired: field?.isRequired || false,
      options: field?.options || [],
    },
  });

  const { fields: options, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const selectedType = form.watch('type');
  const showOptions = selectedType === 'select' || selectedType === 'multiselect';

  const onSubmit = (data: FieldFormData) => {
    const finalField: FieldConfig = {
      ...(field || {
        id: `field_custom_${Date.now()}`,
        key: '', // Key will be generated in parent
        order: 0, // Order will be set in parent
        isCustom: true,
        isActive: false, // New fields start as inactive
      }),
      ...data,
    };
    onSave(finalField);
    onOpenChange(false);
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
        form.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Create New Field' : `Edit "${field?.label}"`}</DialogTitle>
          <DialogDescription>
            Configure the properties for this field. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="label">Field Label</Label>
                    <Input id="label" {...form.register('label')} />
                    {form.formState.errors.label && <p className="text-sm text-destructive mt-1">{form.formState.errors.label.message}</p>}
                </div>
                <div>
                    <Label htmlFor="type">Field Type</Label>
                    <Select value={form.getValues('type')} onValueChange={(v) => form.setValue('type', v as FieldType)} disabled={!isCreating}>
                        <SelectTrigger id="type">
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            {FIELD_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {!isCreating && <p className="text-xs text-muted-foreground mt-1">Field type cannot be changed after creation.</p>}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="group">Group Name</Label>
                    <Input id="group" {...form.register('group')} />
                    {form.formState.errors.group && <p className="text-sm text-destructive mt-1">{form.formState.errors.group.message}</p>}
                </div>
                <div className="flex items-center space-x-2 pt-6">
                    <Switch id="isRequired" checked={form.watch('isRequired')} onCheckedChange={(c) => form.setValue('isRequired', c)} />
                    <Label htmlFor="isRequired">Is Required?</Label>
                </div>
            </div>
            
            {showOptions && (
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium">Options</h4>
                    {options.map((option, index) => (
                        <div key={option.id} className="flex items-end gap-2 p-2 border rounded-md">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Label</Label>
                                    <Input {...form.register(`options.${index}.label`)} placeholder="e.g. High Priority" />
                                </div>
                                 <div>
                                    <Label>Value</Label>
                                    <Input {...form.register(`options.${index}.value`)} placeholder="e.g. high_priority" />
                                </div>
                            </div>
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                     <Button type="button" variant="outline" size="sm" onClick={() => append({id: `option_${Date.now()}`, label: '', value: ''})}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                </div>
            )}

          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
