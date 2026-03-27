'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, X, Info, Users, ClipboardCheck, ListChecks, CalendarIcon, Save } from 'lucide-react';
import type { FieldConfig, FieldOption, FieldType, PendingStatusConversion, RepositoryConfig, StatusConfigItem } from '@/lib/types';
import { FIELD_TYPES } from '@/lib/constants';
import * as React from 'react';
import { getUiConfig, getTasks, updateTask, addLog, getDevelopers, getTesters } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { MultiSelect } from '@/components/ui/multi-select';
import { buildStatusConfigItem } from '@/lib/status-config';
import { StatusManagementContent } from '@/components/status-management-content';

const fieldOptionSchema = z.object({
    id: z.string(),
    label: z.string().min(1, "Label is required"),
    value: z.string().min(1, "Value is required"),
});

const randomId = () => crypto.randomUUID();

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

interface FieldFormContentProps {
  field: FieldConfig | null;
  existingFields: FieldConfig[];
  repositoryConfigs?: RepositoryConfig[];
  statusConfigs?: StatusConfigItem[];
  pendingStatusConversions?: PendingStatusConversion[];
  onSave: (
    field: FieldConfig,
    repoConfigs?: RepositoryConfig[],
    statusConfigs?: StatusConfigItem[],
    pendingStatusConversions?: PendingStatusConversion[]
  ) => void;
  onCancel: () => void;
}

export function FieldFormContent({
  field,
  existingFields,
  repositoryConfigs,
  statusConfigs,
  pendingStatusConversions,
  onSave,
  onCancel,
}: FieldFormContentProps) {
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
  
  // Robust Unique Field Count
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
  const isSortableField = showOptions;
  
  const [allGroups, setAllGroups] = React.useState<string[]>([]);
  const [isGroupPopoverOpen, setIsGroupPopoverOpen] = React.useState(false);
  const [groupSearch, setGroupSearch] = React.useState('');
  
  const [localRepoConfigs, setLocalRepoConfigs] = React.useState<RepositoryConfig[]>([]);
  const [localStatusConfigs, setLocalStatusConfigs] = React.useState<StatusConfigItem[]>([]);
  const [localPendingStatusConversions, setLocalPendingStatusConversions] = React.useState<PendingStatusConversion[]>(pendingStatusConversions || []);
  const [isStatusEditorOpen, setIsStatusEditorOpen] = React.useState(false);
  const [newTag, setNewTag] = React.useState('');
  const [allTags, setAllTags] = React.useState<FieldOption[]>([]);
  const isRepoField = field?.key === 'repositories';
  const isStatusField = field?.key === 'status';
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

  // Real-time unique toggle restriction
  const isUniqueValue = form.watch('isUnique');
  const uniqueToggleDisabled = uniqueLimitReached && !isUniqueValue;

  React.useEffect(() => {
    const config = getUiConfig();
    const uniqueGroups = [...new Set(config.fields.map(f => f.group).filter(Boolean))].sort();
    setAllGroups(uniqueGroups);

    if(isRepoField) {
      setLocalRepoConfigs(repositoryConfigs || []);
    }
    if (isStatusField) {
      setLocalStatusConfigs((statusConfigs || []).map((status, index) => buildStatusConfigItem(status, index)));
      setLocalPendingStatusConversions(pendingStatusConversions || []);
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
  }, [field, isRepoField, isStatusField, isTagsField, repositoryConfigs, statusConfigs, pendingStatusConversions]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !options.some(opt => opt.value.toLowerCase() === trimmedTag.toLowerCase())) {
        const newOption = { id: `option_${randomId}`, label: trimmedTag, value: trimmedTag };
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

    if (isStatusField) {
      if (localStatusConfigs.length === 0 || localStatusConfigs.some(status => !status.name.trim())) {
        toast({
          variant: 'destructive',
          title: 'Status Configuration Error',
          description: 'Every status needs a name, and at least one status must remain available.',
        });
        return;
      }
    }

    const finalField: FieldConfig = {
      ...(field || {
        id: `field_custom_${randomId}`,
        key: '',
        order: 0,
        isCustom: true,
      }),
      ...data,
      sortDirection: data.sortDirection || 'manual',
    };
    const finalStatusConfigs = isStatusField
      ? localStatusConfigs.map((status, index) => buildStatusConfigItem(status, index))
      : undefined;
    const finalOptions = finalStatusConfigs?.map(status => ({ id: status.id, value: status.name, label: status.name }));
    onSave(
      isStatusField ? { ...finalField, options: finalOptions } : finalField,
      isRepoField ? localRepoConfigs : undefined,
      finalStatusConfigs,
      isStatusField ? localPendingStatusConversions : undefined
    );
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

  const repositoryOptions = React.useMemo(() => {
      return localRepoConfigs.map(repo => ({ value: repo.name, label: repo.name }));
  }, [localRepoConfigs]);

  const renderDefaultValueInput = (type: FieldType) => {
    const currentOptions = isStatusField
      ? localStatusConfigs.map(status => ({ id: status.id, value: status.name, label: status.name }))
      : (form.watch('options') || []);
    
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
                                <Input {...field} value={field.value ?? ""} type={type === 'number' ? 'number' : 'text'} className="h-11 rounded-xl bg-background" />
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
                                <Textarea {...field} value={field.value ?? ""} className="min-h-[100px] rounded-xl bg-background" />
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
                                <div className="flex items-center gap-3 h-11 px-1">
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
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 rounded-xl bg-background", !field.value && "text-muted-foreground")}>
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
                                    <SelectTrigger className="h-11 rounded-xl bg-background">
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
                                className="bg-background rounded-xl"
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
                        <FormLabel className="font-bold">Field Label</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ""} className="h-11 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold">Field Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!isCreating}>
                            <FormControl><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <FormField
                    control={form.control}
                    name="group"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="font-bold">Group Name</FormLabel>
                        <Popover open={isGroupPopoverOpen} onOpenChange={setIsGroupPopoverOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-11 rounded-xl">
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
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                     <FormField
                        control={form.control}
                        name="isRequired"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isRequiredToggleDisabled} /></FormControl>
                            <Label className="cursor-pointer font-semibold whitespace-nowrap">Required</Label>
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="isUnique"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={uniqueToggleDisabled} /></FormControl>
                            <Label className={cn("cursor-pointer font-semibold flex items-center gap-1.5 whitespace-nowrap", uniqueToggleDisabled && "opacity-50 cursor-not-allowed")}>
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
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isActiveToggleDisabled} /></FormControl>
                            <Label className="cursor-pointer font-semibold whitespace-nowrap">Active</Label>
                        </FormItem>
                        )}
                    />
                </div>
            </div>

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

            {showCustomOptionsUI && !isTagsField && (
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-bold">Options</h4>
                    {options.map((option, index) => (
                        <div key={option.id} className="flex items-end gap-2 p-3 border rounded-xl bg-muted/20">
                            <Input {...form.register(`options.${index}.label`)} value={form.watch(`options.${index}.label`) ?? ""} placeholder="Label" className="h-9 rounded-lg" />
                            <Input {...form.register(`options.${index}.value`)} value={form.watch(`options.${index}.value`) ?? ""} placeholder="Value" className="h-9 font-mono text-xs rounded-lg" />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="shrink-0 h-9 w-9 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({id: `option_${randomId}`, label: '', value: ''})} className="w-full h-11 border-dashed rounded-xl font-bold">
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                </div>
            )}

            {isTagsField && (
                 <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-bold">Tag Management</h4>
                    <div className="flex gap-2">
                        <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="New predefined tag" className="h-11 rounded-xl" onKeyDown={e => {if (e.key === 'Enter') { e.preventDefault(); handleAddTag();}}} />
                        <Button type="button" onClick={handleAddTag} disabled={!newTag.trim()} className="h-11 px-4 rounded-xl shrink-0"><PlusCircle className="h-4 w-4 mr-2" /> Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {allTags.map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="pl-3 pr-1 py-1 h-8 text-sm gap-2 border-primary/10">
                                {tag.label}
                                <button type="button" className="h-6 w-6 rounded-full hover:bg-destructive hover:text-white flex items-center justify-center transition-colors" onClick={() => remove(options.findIndex(o => o.value === tag.value))}>
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {isRepoField && (
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-bold">Repository Configurations</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {localRepoConfigs.map((repo, index) => (
                            <div key={repo.id} className="p-4 border rounded-2xl bg-muted/20 space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor={`repo-name-${index}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</Label>
                                    <Input
                                        id={`repo-name-${index}`}
                                        value={repo.name}
                                        onChange={(e) => handleRepoChange(index, 'name', e.target.value)}
                                        className="h-9 rounded-lg bg-background font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`repo-url-${index}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Base PR URL</Label>
                                    <Input
                                        id={`repo-url-${index}`}
                                        value={repo.baseUrl}
                                        onChange={(e) => handleRepoChange(index, 'baseUrl', e.target.value)}
                                        placeholder="e.g. https://github.com/..."
                                        className="h-9 rounded-lg bg-background font-mono text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isStatusField && (
                <StatusManagementContent
                    statuses={localStatusConfigs}
                    pendingConversions={localPendingStatusConversions}
                    onStatusesChange={setLocalStatusConfigs}
                    onPendingConversionsChange={setLocalPendingStatusConversions}
                    existingFields={existingFields}
                    onEditorOpenChange={setIsStatusEditorOpen}
                />
            )}
            
            <div className={cn("lg:hidden fixed bottom-24 right-6 z-[60] animate-in zoom-in-50 duration-500", isStatusField && isStatusEditorOpen && "hidden")}>
                <Button
                    type="submit"
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-2xl transition-all active:scale-90 shadow-black/20"
                >
                    <Save className="h-6 w-6" />
                    <span className="sr-only">Save Task</span>
                </Button>
            </div>

            {/* Will remove later */}
            {/* <div className="flex flex-col sm:flex-row gap-2 pt-6 border-t mt-auto">
                <Button type="submit" className="flex-1 rounded-2xl h-12 font-bold shadow-lg">Save Changes</Button>
                <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-12 font-medium" onClick={onCancel}>Cancel</Button>
            </div> */}
        </form>
    </Form>
  );
}
