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
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, X, Users, ClipboardCheck, Info, AlertTriangle, CalendarIcon, Layout, Type, ListChecks } from 'lucide-react';
import type { FieldConfig, FieldOption, FieldType, RepositoryConfig, Task } from '@/lib/types';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';


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
  isUnique: z.boolean(),
  isActive: z.boolean(),
  options: z.array(fieldOptionSchema).optional(),
  baseUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  sortDirection: z.enum(['asc', 'desc', 'manual']).optional(),
  defaultValue: z.any().optional(),
}).refine(data => {
  if (data.type === 'url' && data.defaultValue && data.defaultValue !== '') {
    try {
      new URL(data.defaultValue);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "Default value must be a valid URL.",
  path: ["defaultValue"]
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface EditFieldDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: FieldConfig, repoConfigs?: RepositoryConfig[]) => void;
  field: FieldConfig | null;
  existingFields: FieldConfig[];
  repositoryConfigs?: RepositoryConfig[];
}

export function EditFieldDialog({ isOpen, onOpenChange, onSave, field, existingFields, repositoryConfigs }: EditFieldDialogProps) {
  const isCreating = field === null;
  const { toast } = useToast();
  const getDefaultValueFallback = React.useCallback(
    (fieldType?: FieldType, fieldKey?: string) => {
      if (fieldKey === 'repositories' || fieldType === 'tags' || fieldType === 'multiselect') {
        return [];
      }
      return '';
    },
    []
  );
  
  // Robust Unique Field Count (using local session fields passed from parent)
  const otherUniqueCount = React.useMemo(() => {
      return existingFields.filter(f => f.isActive && f.isUnique && f.id !== field?.id).length;
  }, [existingFields, field]);

  const uniqueLimitReached = otherUniqueCount >= 3;

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field?.label || '',
      type: field?.type || 'text',
      group: field?.group || 'Custom',
      isRequired: field?.isRequired || false,
      isUnique: field?.isUnique || false,
      isActive: field?.isActive ?? true, 
      options: field?.options || [],
      baseUrl: field?.baseUrl || '',
      sortDirection: field?.sortDirection || 'manual',
      defaultValue: field?.defaultValue ?? getDefaultValueFallback(field?.type, field?.key),
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
  
  const fieldHasManagedOptions =
    field?.key === 'status' ||
    field?.key === 'developers' ||
    field?.key === 'testers';
  const showCustomOptionsUI = showOptions && !isRepoField && !fieldHasManagedOptions;

  const unchangeableRequiredKeys = ['title', 'description', 'status', 'repositories', 'developers'];
  const isRequiredToggleDisabled = field !== null && !field.isCustom && unchangeableRequiredKeys.includes(field.key);
  
  const protectedDevDateFields = ['devStartDate', 'devEndDate'];
  const isProtectedDevDate = field !== null && protectedDevDateFields.includes(field.key);
  const isActiveToggleDisabled = isRequiredValue || (field !== null && field.isRequired) || isProtectedDevDate;

  // Real-time unique toggle restriction
  const isUniqueValue = form.watch('isUnique');
  const uniqueToggleDisabled = uniqueLimitReached && !isUniqueValue;

  const handleRepoChange = (index: number, fieldName: 'name' | 'baseUrl', value: string) => {
    setLocalRepoConfigs(prev => {
        const newConfigs = [...prev];
        newConfigs[index] = { ...newConfigs[index], [fieldName]: value };
        return newConfigs;
    });
  };

  const handleAddRepo = () => {
    setLocalRepoConfigs(prev => [...prev, { id: `repo_${crypto.randomUUID()}`, name: 'New-Repo', baseUrl: 'https://github.com/org/repo/pull/' }]);
  };

  const handleDeleteRepo = (id: string) => {
    setLocalRepoConfigs(prev => prev.filter(r => r.id !== id));
  };
  
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
  
  const handleDeleteTag = (tagToDelete: FieldOption) => {
    const optionIndex = options.findIndex(opt => opt.value === tagToDelete.value);
    if (optionIndex > -1) {
        remove(optionIndex);
    }
    
    setAllTags(prev => prev.filter(t => t.value !== tagToDelete.value));

    const allTasks = getTasks();
    let updatedCount = 0;
    allTasks.forEach(task => {
        if (task.tags?.includes(tagToDelete.value)) {
            updateTask(task.id, { tags: task.tags.filter(t => t !== tagToDelete.value) }, true);
            updatedCount++;
        }
    });
    
    if (updatedCount > 0) {
        addLog({ message: `Bulk removed tag "**${tagToDelete.value}**" from ${updatedCount} task(s).` });
    }
  };


  const onSubmit = (data: FieldFormData) => {
    // FINAL STRICT SAVE-TIME VALIDATION
    if (data.isActive && data.isUnique) {
        const currentOtherUniqueCount = existingFields.filter(f => f.isActive && f.isUnique && f.id !== field?.id).length;
        if (currentOtherUniqueCount >= 3) {
            toast({
                variant: 'destructive',
                title: 'Constraint Blocked',
                description: 'You can only have up to 3 unique fields across your workspace to avoid data conflicts.'
            });
            return;
        }
    }

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
    onOpenChange(false);
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
        form.reset();
        setGroupSearch('');
        setNewTag('');
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
          isUnique: field?.isUnique || false,
          isActive: field?.isActive ?? true,
          options: field?.options || [],
          baseUrl: field?.baseUrl || '',
          sortDirection: field?.sortDirection || 'manual',
          defaultValue: field?.defaultValue ?? getDefaultValueFallback(field?.type, field?.key),
        });
        setGroupSearch(field?.group || '');

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
            replace(predefinedOptions);
        }
    }
  }, [field, form, isOpen, repositoryConfigs, isRepoField, isTagsField, replace, isDevelopersField, isTestersField, getDefaultValueFallback]);

  const defaultPersonOptions = React.useMemo(() => {
      if (isDevelopersField) {
          return getDevelopers().map(d => ({ value: d.id, label: d.name }));
      }
      if (isTestersField) {
          return getTesters().map(t => ({ value: t.id, label: t.name }));
      }
      return [];
  }, [isDevelopersField, isTestersField]);

  const repositoryOptions = React.useMemo(() => {
      return localRepoConfigs.map(repo => ({ value: repo.name, label: repo.name }));
  }, [localRepoConfigs]);

  const renderDefaultValueInput = (type: FieldType) => {
    const currentOptions = form.watch('options') || [];
    
    switch (type) {
        case 'text':
        case 'url':
        case 'number':
            return (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} type={type === 'number' ? 'number' : 'text'} className="h-10 bg-background" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        case 'textarea':
            return (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea {...field} value={field.value ?? ""} className="min-h-[80px] bg-background" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        case 'checkbox':
            return (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div className="flex items-center gap-3 h-10 px-1">
                                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{field.value ? 'Enabled by default' : 'Disabled by default'}</span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        case 'date':
            return (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 bg-background", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a fixed date</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value ? new Date(field.value) : undefined}
                                        onSelect={(date) => field.onChange(date?.toISOString())}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        case 'select':
            return (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-10 bg-background">
                                        <SelectValue placeholder="Select default option" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {currentOptions.map(opt => (
                                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        case 'multiselect':
        case 'tags':
            return (
                <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                        <FormItem>
                            <MultiSelect
                                selected={Array.isArray(field.value) ? field.value : []}
                                onChange={field.onChange}
                                options={
                                    (isDevelopersField || isTestersField) 
                                        ? defaultPersonOptions 
                                        : isRepoField
                                            ? repositoryOptions
                                        : isTagsField 
                                            ? allTags.map(o => ({ value: o.value, label: o.label })) 
                                            : currentOptions.map(o => ({ value: o.value, label: o.label }))
                                }
                                placeholder="Select default values..."
                                className="bg-background"
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        default:
            return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 mb-2">
          <DialogTitle className="text-xl sm:text-2xl">{isCreating ? 'Create New Field' : `Edit "${field?.label}"`}</DialogTitle>
          <DialogDescription className="text-sm">
            Configure the properties for this field. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto -mx-2 px-2 sm:-mx-6 sm:px-6 custom-scrollbar">
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
                                    <Input {...field} value={field.value ?? ""} />
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
                                {!isCreating && <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">Field type cannot be changed after creation.</p>}
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
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
                                        className="w-full justify-between font-normal"
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && groupSearch.trim() && !allGroups.some(g => g.toLowerCase() === groupSearch.trim().toLowerCase())) {
                                                    e.preventDefault();
                                                    const newGroup = groupSearch.trim();
                                                    form.setValue("group", newGroup);
                                                    setAllGroups(prev => [...prev, newGroup].sort());
                                                    setIsGroupPopoverOpen(false);
                                                    setGroupSearch(newGroup);
                                                }
                                            }}
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
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                             <FormField
                                control={form.control}
                                name="isRequired"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Switch
                                            id={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isRequiredToggleDisabled}
                                        />
                                    </FormControl>
                                    <Label htmlFor={field.name} className="cursor-pointer font-semibold whitespace-nowrap">
                                        Required
                                    </Label>
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isUnique"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Switch
                                            id={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={uniqueToggleDisabled}
                                        />
                                    </FormControl>
                                    <Label htmlFor={field.name} className={cn("cursor-pointer font-semibold flex items-center gap-1.5 whitespace-nowrap", uniqueToggleDisabled && "opacity-50 cursor-not-allowed")}>
                                        Unique
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3 w-3 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent className="text-xs font-normal">
                                                    {uniqueToggleDisabled 
                                                        ? "Maximum of 3 unique fields allowed" 
                                                        : "Values in this field must be unique across active tasks"}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </Label>
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Switch
                                            id={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isActiveToggleDisabled}
                                        />
                                    </FormControl>
                                    <Label htmlFor={field.name} className="cursor-pointer font-semibold whitespace-nowrap">
                                        Active
                                    </Label>
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>

                     {selectedType === 'text' && (
                        <FormField
                            control={form.control}
                            name="baseUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Base URL (Optional)</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ""} placeholder="e.g. https://example.com/items/" className="font-mono text-xs" />
                                </FormControl>
                                <FormDescription className="text-[10px]">If provided, the field value will be appended to this URL to create a link.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     )}

                    {/* DEFAULT VALUE SECTION */}
                    {selectedType !== 'object' && (
                        <div className="pt-4 border-t space-y-3">
                            <div className="flex items-center gap-2">
                                <ListChecks className="h-4 w-4 text-primary" />
                                <Label className="font-bold tracking-tight">Default Value</Label>
                            </div>
                            <FormDescription className="text-xs leading-relaxed">
                                This value will be automatically filled when creating a new task.
                            </FormDescription>
                            {renderDefaultValueInput(selectedType)}
                        </div>
                    )}
                     
                    {isSortableField && (
                        <FormField
                            control={form.control}
                            name="sortDirection"
                            render={({ field }) => (
                                <FormItem className="pt-4 border-t">
                                    <FormLabel>Option Sorting</FormLabel>
                                    <FormDescription className="text-xs">Set the display order for options in dropdowns.</FormDescription>
                                    <Select onValueChange={field.onChange} value={field.value} >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select sorting order" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual Order</SelectItem>
                                            <SelectItem value="asc">Alphabetical (A-Z)</SelectItem>
                                            <SelectItem value="desc">Alphabetical (Z-A)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    
                    {isTagsField && (
                         <div className="space-y-3 pt-4 border-t">
                            <h4 className="font-bold tracking-tight">Tag Management</h4>
                            <FormDescription className="text-xs leading-relaxed">Predefined tags are saved with this field's configuration. Deleting a tag here will remove it from all tasks.</FormDescription>
                            <div className="flex gap-2">
                                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="New predefined tag name" onKeyDown={e => {if (e.key === 'Enter') { e.preventDefault(); handleAddTag();}}} />
                                <Button type="button" onClick={handleAddTag} disabled={!newTag.trim()} className="shrink-0"><PlusCircle className="h-4 w-4 mr-2" /> Add</Button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                {allTags.map((tag) => {
                                    const isPredefined = options.some(opt => opt.value === tag.value);
                                    return (
                                        <div key={tag.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 group">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-medium text-sm truncate">{tag.label}</span>
                                                {!isPredefined && <Badge variant="outline" className="text-[8px] uppercase tracking-tighter shrink-0">Dynamic</Badge>}
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100">
                                                        <X className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="font-bold">Delete Tag "{tag.label}"?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-sm">
                                                          This will permanently remove this tag from all tasks and, if it's a predefined tag, from the configuration. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="gap-2">
                                                        <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteTag(tag)} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold">Delete Tag</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )
                                })}
                            </div>
                            {allTags.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No tags found.</p>}
                        </div>
                    )}
                    
                    {showCustomOptionsUI && !isTagsField && (
                        <div className="space-y-3 pt-4 border-t">
                            <h4 className="font-bold tracking-tight">Options</h4>
                            <div className="space-y-3">
                                {options.map((option, index) => (
                                    <div key={option.id} className="flex items-end gap-2 p-3 border rounded-xl bg-muted/20">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 min-w-0">
                                            <FormField
                                                control={form.control}
                                                name={`options.${index}.label`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Label</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value ?? ""} placeholder="e.g. High Priority" className="h-9" />
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
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Value</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value ?? ""} placeholder="e.g. high_priority" className="h-9 font-mono text-xs" />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="shrink-0 h-9 w-9 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                             {form.formState.errors.options && <p className="text-sm text-destructive mt-1 font-semibold">{form.formState.errors.options.message}</p>}
                            <Button type="button" variant="outline" size="sm" onClick={() => append({id: `option_${crypto.randomUUID()}`, label: '', value: ''})} className="w-full h-10 border-dashed rounded-xl font-bold">
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Option
                            </Button>
                        </div>
                    )}

                    {isRepoField && (
                        <div className="space-y-3 pt-4 border-t">
                            <h4 className="font-bold tracking-tight">Repository Configurations</h4>
                             <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {localRepoConfigs.map((repo, index) => (
                                    <div key={repo.id} className="p-4 border rounded-2xl bg-muted/20 space-y-3 relative group">
                                        <div className="space-y-1">
                                            <Label htmlFor={`repo-name-${index}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</Label>
                                            <Input
                                                id={`repo-name-${index}`}
                                                value={repo.name}
                                                onChange={(e) => handleRepoChange(index, 'name', e.target.value)}
                                                className="h-9 bg-background font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`repo-url-${index}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Base PR URL</Label>
                                            <Input
                                                id={`repo-url-${index}`}
                                                value={repo.baseUrl}
                                                onChange={(e) => handleRepoChange(index, 'baseUrl', e.target.value)}
                                                placeholder="e.g. https://github.com/..."
                                                className="h-9 bg-background font-mono text-xs"
                                            />
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="font-bold">Delete {repo.name}?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-sm">
                                                            This will remove the repository from the configuration. It will not delete any tasks.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="gap-2">
                                                        <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteRepo(repo.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddRepo} className="w-full h-10 border-dashed rounded-xl font-bold">
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Repository
                            </Button>
                        </div>
                    )}
                </form>
            </Form>
        </div>
        <DialogFooter className="shrink-0 pt-4 border-t flex-row gap-2 mt-auto">
            <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11 font-medium">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="edit-field-form" className="flex-1 rounded-xl h-11 font-bold">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
