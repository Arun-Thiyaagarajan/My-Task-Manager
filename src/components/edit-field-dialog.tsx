
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
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import type { FieldConfig, FieldOption, FieldType } from '@/lib/types';
import { FIELD_TYPES } from '@/lib/constants';
import * as React from 'react';
import { getUiConfig } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


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
  
  const [allGroups, setAllGroups] = React.useState<string[]>([]);
  const [isGroupPopoverOpen, setIsGroupPopoverOpen] = React.useState(false);
  const [groupSearch, setGroupSearch] = React.useState('');

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
        setGroupSearch('');
    }
    onOpenChange(open);
  }
  
  React.useEffect(() => {
    if (isOpen) {
        const config = getUiConfig();
        const uniqueGroups = [...new Set(config.fields.map(f => f.group).filter(Boolean))].sort();
        setAllGroups(uniqueGroups);

        form.reset({
          label: field?.label || '',
          type: field?.type || 'text',
          group: field?.group || 'Custom',
          isRequired: field?.isRequired || false,
          options: field?.options || [],
        });
        setGroupSearch(field?.group || '');
    }
  }, [field, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isCreating ? 'Create New Field' : `Edit "${field?.label}"`}</DialogTitle>
          <DialogDescription>
            Configure the properties for this field. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
            <Form {...form}>
                <form id="edit-field-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Field Label</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
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
                                <Select onValueChange={field.onChange} value={field.value} disabled={!isCreating}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {FIELD_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                {!isCreating && <p className="text-xs text-muted-foreground mt-1">Field type cannot be changed after creation.</p>}
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="group"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Group Name</FormLabel>
                                <Popover open={isGroupPopoverOpen} onOpenChange={setIsGroupPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isGroupPopoverOpen}
                                        className="w-full justify-between"
                                    >
                                        {field.value || "Select or create group..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                    <Command>
                                        <CommandInput 
                                            placeholder="Search or create..." 
                                            value={groupSearch}
                                            onValueChange={setGroupSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No results.</CommandEmpty>
                                            <CommandGroup>
                                                {allGroups.map((groupName) => (
                                                    <CommandItem
                                                        value={groupName}
                                                        key={groupName}
                                                        onSelect={() => {
                                                            form.setValue("group", groupName);
                                                            setGroupSearch(groupName);
                                                            setIsGroupPopoverOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                groupName === field.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {groupName}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            {groupSearch.trim() && !allGroups.some(g => g.toLowerCase() === groupSearch.trim().toLowerCase()) && (
                                                <CommandGroup>
                                                    <CommandItem
                                                        value={groupSearch}
                                                        onSelect={() => {
                                                            const newGroup = groupSearch.trim();
                                                            form.setValue("group", newGroup);
                                                            setAllGroups(prev => [...prev, newGroup].sort());
                                                            setIsGroupPopoverOpen(false);
                                                            setGroupSearch(newGroup);
                                                        }}
                                                        className="text-primary hover:!text-primary"
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Create "{groupSearch.trim()}"
                                                    </CommandItem>
                                                </CommandGroup>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isRequired"
                            render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 pb-1.5">
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <Label htmlFor="isRequired" className="cursor-pointer">
                                    Is Required?
                                </Label>
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    {showOptions && (
                        <div className="space-y-3 pt-4 border-t">
                            <h4 className="font-medium">Options</h4>
                            {options.map((option, index) => (
                                <div key={option.id} className="flex items-end gap-2 p-3 border rounded-md bg-muted/50">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`options.${index}.label`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel className="text-xs">Label</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g. High Priority" />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`options.${index}.value`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel className="text-xs">Value</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g. high_priority" />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="shrink-0"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                             {form.formState.errors.options && <p className="text-sm text-destructive mt-1">{form.formState.errors.options.message}</p>}
                            <Button type="button" variant="outline" size="sm" onClick={() => append({id: `option_${Date.now()}`, label: '', value: ''})}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Option
                            </Button>
                        </div>
                    )}
                </form>
            </Form>
        </div>
        <DialogFooter className="shrink-0 pt-4 border-t">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="edit-field-form">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
