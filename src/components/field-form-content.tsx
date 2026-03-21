'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, X, Info, Users, ClipboardCheck } from 'lucide-react';
import type { FieldConfig, FieldOption, FieldType, RepositoryConfig } from '@/lib/types';
import { FIELD_TYPES } from '@/lib/constants';
import * as React from 'react';
import { getUiConfig, getTasks, updateTask, addLog, getDevelopers, getTesters } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';

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
  isActive: z.boolean(),
  options: z.array(fieldOptionSchema).optional(),
  baseUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  sortDirection: z.enum(['asc', 'desc', 'manual']).optional(),
  defaultValue: z.any().optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldFormContentProps {
  field: FieldConfig | null;
  repositoryConfigs?: RepositoryConfig[];
  onSave: (field: FieldConfig, repoConfigs?: RepositoryConfig[]) => void;
  onCancel: () => void;
}

export function FieldFormContent({ field, repositoryConfigs, onSave, onCancel }: FieldFormContentProps) {
  const isCreating = field === null;

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field?.label || '',
      type: field?.type || 'text',
      group: field?.group || 'Custom',
      isRequired: field?.isRequired || false,
      isActive: field?.isActive ?? true,
      options: field?.options || [],
      baseUrl: field?.baseUrl || '',
      sortDirection: field?.sortDirection || 'manual',
      defaultValue: field?.defaultValue || ( (field?.key === 'developers' || field?.key === 'testers') ? [] : undefined),
    },
  });

  const { fields: options, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'options',
  });
  
  const isRequiredValue = form.watch('isRequired');
  React.useEffect(() => {
    if (isRequiredValue) {
      form.setValue('isActive', true);
    }
  }, [isRequiredValue, form]);

  const selectedType = form.watch('type');
  const showOptions = selectedType === 'select' || selectedType === 'multiselect' || selectedType === 'tags';
  const isSortableField = showOptions && (!field || field.key !== 'status');
  
  const [allGroups, setAllGroups] = React.useState<string[]>([]);
  const [isGroupPopoverOpen, setIsGroupPopoverOpen] = React.useState(false);
  const [groupSearch, setGroupSearch] = React.useState('');
  
  const [localRepoConfigs, setLocalRepoConfigs] = React.useState<RepositoryConfig[]>([]);
  const [newTag, setNewTag] = React.useState('');
  const [allTags, setAllTags] = React.useState<FieldOption[]>([]);

  const isRepoField = field?.key === 'repositories';
  const isTagsField = field?.key === 'tags';
  const isDevelopersField = field?.key === 'developers';
  const isTestersField = field?.key === 'testers';
  const fieldHasManagedOptions = field?.key === 'status' || field?.key === 'developers' || field?.key === 'testers';
  const showCustomOptionsUI = showOptions && !isRepoField && !fieldHasManagedOptions;

  const unchangeableRequiredKeys = ['title', 'description', 'status', 'repositories', 'developers'];
  const isRequiredToggleDisabled = field !== null && !field.isCustom && unchangeableRequiredKeys.includes(field.key);
  
  const protectedDevDateFields = ['devStartDate', 'devEndDate'];
  const isProtectedDevDate = field !== null && protectedDevDateFields.includes(field.key);
  const isActiveToggleDisabled = isRequiredValue || (field !== null && field.isRequired) || isProtectedDevDate;

  React.useEffect(() => {
    const config = getUiConfig();
    const uniqueGroups = [...new Set(config.fields.map(f => f.group).filter(Boolean))].sort();
    setAllGroups(uniqueGroups);

    if(isRepoField) {
      setLocalRepoConfigs(repositoryConfigs || []);
    }

    if (isTagsField) {
        const allTasks = getTasks();
        const dynamicTags = [...new Set(allTasks.flatMap(t => t.tags || []))];
        const predefinedOptions = field?.options || [];
        
        const combinedTags = [...predefinedOptions];
        dynamicTags.forEach(dynamicTag => {
            if (!combinedTags.some(t => t.value === dynamicTag)) {
                combinedTags.push({ id: `option_dynamic_${dynamicTag}`, value: dynamicTag, label: dynamicTag });
            }
        });

        combinedTags.sort((a,b) => a.label.localeCompare(b.label));
        setAllTags(combinedTags);
    }
  }, [field, isRepoField, isTagsField, repositoryConfigs]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !options.some(opt => opt.value.toLowerCase() === trimmedTag.toLowerCase())) {
        const newOption = { id: `option_${crypto.randomUUID()}`, label: trimmedTag, value: trimmedTag };
        append(newOption);
        setAllTags(prev => {
            const filtered = prev.filter(t => t.value.toLowerCase() !== trimmedTag.toLowerCase());
            return [...filtered, newOption].sort((a,b) => a.label.localeCompare(b.label));
        });
        setNewTag('');
    }
  };

  const handleRepoChange = (index: number, fieldName: 'name' | 'baseUrl', value: string) => {
    setLocalRepoConfigs(prev => {
        const newConfigs = [...prev];
        newConfigs[index] = { ...newConfigs[index], [fieldName]: value };
        return newConfigs;
    });
  };

  const onSubmit = (data: FieldFormData) => {
    const finalField: FieldConfig = {
      ...(field || {
        id: `field_custom_${crypto.randomUUID()}`,
        key: '',
        order: 0,
        isCustom: true,
      }),
      ...data,
      sortDirection: data.sortDirection || 'manual',
    };
    onSave(finalField, isRepoField ? localRepoConfigs : undefined);
  };

  const defaultPersonOptions = React.useMemo(() => {
      if (isDevelopersField) {
          return getDevelopers().map(d => ({ value: d.id, label: d.name }));
      }
      if (isTestersField) {
          return getTesters().map(t => ({ value: t.id, label: t.name }));
      }
      return [];
  }, [isDevelopersField, isTestersField]);

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure the properties for this task field. Standard fields have limited modification options.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    name="type"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Field Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!isCreating}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {FIELD_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                            <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                                {field.value || "Select group..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-64">
                            <Command>
                                <CommandInput placeholder="Search or create..." value={groupSearch} onValueChange={setGroupSearch} />
                                <CommandList>
                                    <CommandEmpty>No results.</CommandEmpty>
                                    <CommandGroup>
                                        {allGroups.map((groupName) => (
                                            <CommandItem key={groupName} onSelect={() => { form.setValue("group", groupName); setIsGroupPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", groupName === field.value ? "opacity-100" : "opacity-0")} />
                                                {groupName}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="flex items-center gap-x-6">
                     <FormField
                        control={form.control}
                        name="isRequired"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 pt-2">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isRequiredToggleDisabled} /></FormControl>
                            <Label className="cursor-pointer font-semibold">Required</Label>
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 pt-2">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isActiveToggleDisabled} /></FormControl>
                            <Label className="cursor-pointer font-semibold">Active</Label>
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            {(isDevelopersField || isTestersField) && (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem className="pt-4 border-t space-y-3">
                            <div className="flex items-center gap-2">
                                {isDevelopersField ? <Users className="h-4 w-4 text-primary" /> : <ClipboardCheck className="h-4 w-4 text-primary" />}
                                <FormLabel className="font-bold tracking-tight">Default {isDevelopersField ? 'Developers' : 'Testers'}</FormLabel>
                            </div>
                            <FormDescription className="text-[10px] leading-relaxed uppercase font-black tracking-widest text-muted-foreground/60">
                                Pre-selected for new tasks
                            </FormDescription>
                            <FormControl>
                                <MultiSelect
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    options={defaultPersonOptions}
                                    placeholder={`Select default ${isDevelopersField ? 'developers' : 'testers'}...`}
                                    className="bg-background"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {showCustomOptionsUI && !isTagsField && (
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-bold">Options</h4>
                    {options.map((option, index) => (
                        <div key={option.id} className="flex items-end gap-2 p-3 border rounded-xl bg-muted/20">
                            <Input {...form.register(`options.${index}.label`)} placeholder="Label" className="h-9" />
                            <Input {...form.register(`options.${index}.value`)} placeholder="Value" className="h-9 font-mono text-xs" />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="shrink-0 h-9 w-9 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({id: `option_${crypto.randomUUID()}`, label: '', value: ''})} className="w-full h-10 border-dashed rounded-xl font-bold">
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                </div>
            )}

            {isTagsField && (
                 <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-bold">Tag Management</h4>
                    <div className="flex gap-2">
                        <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="New predefined tag" onKeyDown={e => {if (e.key === 'Enter') { e.preventDefault(); handleAddTag();}}} />
                        <Button type="button" onClick={handleAddTag} disabled={!newTag.trim()} className="shrink-0"><PlusCircle className="h-4 w-4 mr-2" /> Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {allTags.map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="pl-3 pr-1 py-1 h-8 text-sm gap-2">
                                {tag.label}
                                <button type="button" className="h-6 w-6 rounded-full hover:bg-destructive hover:text-white flex items-center justify-center transition-colors" onClick={() => remove(options.findIndex(o => o.value === tag.value))}>
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-6 border-t mt-auto">
                <Button type="submit" className="flex-1 rounded-xl h-12 font-bold shadow-lg">Save Changes</Button>
                <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-medium" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    </Form>
  );
}
