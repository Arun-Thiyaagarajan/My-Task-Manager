
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getUiConfig, updateUiConfig, addEnvironment, updateEnvironmentName, deleteEnvironment } from '@/lib/data';
import type { UiConfig, FieldConfig, RepositoryConfig, Person } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, PlusCircle, Edit, Trash2, ToggleLeft, ToggleRight, GripVertical, Check, X, Code2, ClipboardCheck, Server, Globe, Image as ImageIcon, BellRing, Settings2 } from 'lucide-react';
import { EditFieldDialog } from '@/components/edit-field-dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { PeopleManagerDialog } from '@/components/people-manager-dialog';
import { getDevelopers, getTesters } from '@/lib/data';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


export default function SettingsPage() {
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);
  
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupText, setEditingGroupText] = useState('');

  const [isPeopleManagerOpen, setIsPeopleManagerOpen] = useState(false);
  const [peopleManagerType, setPeopleManagerType] = useState<'developer' | 'tester'>('developer');

  const [newEnvName, setNewEnvName] = useState('');
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [editingEnvText, setEditingEnvText] = useState('');

  const [appName, setAppName] = useState('');
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  

  const refreshData = () => {
    const loadedConfig = getUiConfig();
    setConfig(loadedConfig);
    setDevelopers(getDevelopers());
    setTesters(getTesters());
    setAppName(loadedConfig.appName || 'My Task Manager');
    setAppIcon(loadedConfig.appIcon || null);
    setRemindersEnabled(loadedConfig.remindersEnabled || false);
  }

  useEffect(() => {
    const loadedConfig = getUiConfig();
    document.title = `Settings | ${loadedConfig.appName || 'My Task Manager'}`;
    refreshData();
  }, []);
  
  const handleToggleActive = (fieldId: string) => {
    if (!config) return;

    const field = config.fields.find(f => f.id === fieldId);
    if (!field) return;

    const protectedDateFields = ['devStartDate', 'devEndDate', 'qaStartDate', 'qaEndDate'];
    if (field.isRequired || protectedDateFields.includes(field.key)) {
        toast({
            variant: 'warning',
            title: 'Cannot Deactivate Field',
            description: `The "${field.label}" field is required and cannot be deactivated.`,
        });
        return;
    }

    const fields = config.fields.map(f => {
        if (f.id === fieldId) {
            return { ...f, isActive: !f.isActive };
        }
        return f;
    });

    const activeFields = fields.filter(f => f.isActive).sort((a,b) => a.order - b.order);
    const inactiveFields = fields.filter(f => !f.isActive).sort((a,b) => a.label.localeCompare(b.label));
    
    const newOrderedFields = [...activeFields, ...inactiveFields].map((field, index) => ({
        ...field,
        order: index
    }));

    const newConfig = { ...config, fields: newOrderedFields };
    updateUiConfig(newConfig);
    setConfig(newConfig);

    toast({
      variant: 'success',
      title: 'Field Updated',
      description: `The "${field.label}" field has been ${field.isActive ? 'deactivated' : 'activated'}.`,
    });
  }

  const handleDeleteField = (fieldId: string) => {
    if (!config) return;
    const fieldToDelete = config.fields.find(f => f.id === fieldId);
    if (!fieldToDelete) return;

    const fields = config.fields.filter(f => f.id !== fieldId);
    const newConfig = { ...config, fields };
    updateUiConfig(newConfig);
    setConfig(newConfig);
    
    toast({
      variant: 'success',
      title: 'Field Deleted',
      description: `The "${fieldToDelete.label}" field has been deleted.`,
    });
  };

  const handleOpenDialog = (field: FieldConfig | null) => {
    setFieldToEdit(field);
    setIsFieldDialogOpen(true);
  };

  const handleSaveField = (fieldData: FieldConfig, newRepoConfigs?: RepositoryConfig[]) => {
    if (!config) return;

    const fields = [...config.fields];
    const existingIndex = fields.findIndex(f => f.id === fieldData.id);

    if (existingIndex > -1) {
      fields[existingIndex] = fieldData;
    } else {
      const newField = {
        ...fieldData,
        key: `custom_${fieldData.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        order: fields.length,
      };
      fields.push(newField);
    }
    
    const finalRepoConfigs = newRepoConfigs ?? config.repositoryConfigs;
    
    if (newRepoConfigs) {
        const repoField = fields.find(f => f.key === 'repositories');
        if (repoField) {
            repoField.options = finalRepoConfigs.map(r => ({ id: r.id, value: r.name, label: r.name }));
        }
    }

    const newConfig = { ...config, fields, repositoryConfigs: finalRepoConfigs };
    updateUiConfig(newConfig);
    setConfig(newConfig);

    toast({
        variant: 'success',
        title: 'Field Saved',
        description: `The "${fieldData.label}" field has been saved.`,
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetField: FieldConfig) => {
    const draggedFieldId = e.dataTransfer.getData('fieldId');
    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    if (!draggedFieldId || draggedFieldId === targetField.id || !config) return;
    
    let activeFields = config.fields.filter(f => f.isActive).sort((a, b) => a.order - b.order);
    const otherFields = config.fields.filter(f => !f.isActive);

    const draggedIndex = activeFields.findIndex(f => f.id === draggedFieldId);
    const targetIndex = activeFields.findIndex(f => f.id === targetField.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = activeFields.splice(draggedIndex, 1);
    activeFields.splice(targetIndex, 0, removed);
    
    const newFields = [...activeFields, ...otherFields].map((field, index) => ({
      ...field,
      order: index
    }));
    
    const newConfig = { ...config, fields: newFields };
    updateUiConfig(newConfig);
    setConfig(newConfig);

    toast({
        variant: 'success',
        title: 'Fields Reordered',
        description: 'The active fields order has been updated.',
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropTarget = e.currentTarget;
    const rect = dropTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
        dropTarget.classList.add('drag-over-top');
        dropTarget.classList.remove('drag-over-bottom');
    } else {
        dropTarget.classList.add('drag-over-bottom');
        dropTarget.classList.remove('drag-over-top');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) {
        setEditingGroup(null);
        return;
    }
    
    if (!config) return;

    const existingGroupNames = [...new Set(config.fields.map(f => f.group.toLowerCase()))];
    if (existingGroupNames.includes(trimmedNewName.toLowerCase()) && trimmedNewName.toLowerCase() !== oldName.toLowerCase()) {
        toast({ variant: 'destructive', title: 'Group name already exists.' });
        return;
    }

    const newFields = config.fields.map(f => {
        if (f.group === oldName) return { ...f, group: trimmedNewName };
        return f;
    });

    const newConfig = { ...config, fields: newFields };
    updateUiConfig(newConfig);
    setConfig(newConfig);

    toast({
      variant: 'success',
      title: 'Group Renamed',
      description: `Group "${oldName}" has been renamed to "${trimmedNewName}".`,
    });
    setEditingGroup(null);
  };

  const handleAddEnvironment = () => {
    if (newEnvName.trim() === '') return;
    if (addEnvironment(newEnvName)) {
        toast({ variant: 'success', title: 'Environment Added', description: `"${newEnvName}" has been added.` });
        setNewEnvName('');
        refreshData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Environment already exists or name is invalid.' });
    }
  };

  const handleRenameEnvironment = (oldName: string) => {
    const trimmedNewName = editingEnvText.trim();
    if (trimmedNewName === '' || oldName === trimmedNewName) {
        setEditingEnv(null);
        return;
    }
    if (updateEnvironmentName(oldName, trimmedNewName)) {
        toast({ variant: 'success', title: 'Environment Renamed', description: `"${oldName}" renamed to "${trimmedNewName}".` });
        setEditingEnv(null);
        refreshData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'This name might already exist or is invalid.' });
    }
  };

  const handleDeleteEnvironment = (envName: string) => {
    if (deleteEnvironment(envName)) {
        toast({ variant: 'success', title: 'Environment Deleted', description: `"${envName}" has been deleted.` });
        refreshData();
    } else {
        toast({ 
            variant: 'destructive', 
            title: 'Action Not Allowed', 
            description: `The "${envName}" environment is protected and cannot be deleted.` 
        });
    }
  };
  
  const handleSaveBranding = () => {
    if(!config) return;
    const newConfig = {
        ...config,
        appName: appName.trim() || 'My Task Manager',
        appIcon: appIcon,
    };
    updateUiConfig(newConfig);
    toast({
        variant: 'success',
        title: 'Branding Updated',
        description: 'Your application name and icon have been saved.',
    });
    // This event will trigger the header to re-fetch the config.
    window.dispatchEvent(new Event('company-changed'));
  };

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file.' });
        if (event.target) event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_DIMENSION = 256;
              let { width, height } = img;

              if (width > height) {
                  if (width > MAX_DIMENSION) {
                      height = Math.round(height * (MAX_DIMENSION / width));
                      width = MAX_DIMENSION;
                  }
              } else {
                  if (height > MAX_DIMENSION) {
                      width = Math.round(width * (MAX_DIMENSION / height));
                      height = MAX_DIMENSION;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                  toast({ variant: 'destructive', title: 'Error', description: 'Could not prepare the image for compression.' });
                  return;
              }
              
              ctx.drawImage(img, 0, 0, width, height);

              // Get compressed data URL (webp is preferred for its quality/size ratio)
              const dataUrl = canvas.toDataURL('image/webp', 0.85); // 0.85 quality
              setAppIcon(dataUrl);

              toast({
                variant: 'success',
                title: 'Icon Ready',
                description: "Your new icon has been compressed. Click 'Save Branding' to apply it."
              });
          };
          img.onerror = () => {
            toast({ variant: 'destructive', title: 'Image Error', description: 'Could not load the selected image file.' });
          };
          
          const result = e.target?.result;
          if (typeof result === 'string') {
            img.src = result;
          }
      };
      reader.onerror = () => {
          toast({ variant: 'destructive', title: 'File Error', description: 'Could not read the selected file.' });
      }
      reader.readAsDataURL(file);

      if (event.target) event.target.value = '';
  };

  const handleSaveFeatures = () => {
    if (!config) return;
    const newConfig = { ...config, remindersEnabled };
    updateUiConfig(newConfig);
    toast({
        variant: 'success',
        title: 'Features Updated',
        description: 'Your feature settings have been saved.',
    });
  };

  const isDataURI = (str: string) => str.startsWith('data:image');

  const filteredAndGroupedFields = useMemo(() => {
    if (!config) return { active: {}, inactive: {} };
    
    const query = searchQuery.toLowerCase();
    const allFields = config.fields.filter(f => f.label.toLowerCase().includes(query) || f.group.toLowerCase().includes(query));

    const activeFields = allFields.filter(f => f.isActive).sort((a,b) => a.order - b.order)
        .reduce((acc, field) => {
            const group = field.group || 'General';
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
        }, {} as Record<string, FieldConfig[]>);

    const inactiveFields = allFields.filter(f => !f.isActive).sort((a,b) => a.label.localeCompare(b.label))
        .reduce((acc, field) => {
            const group = field.group || 'General';
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
        }, {} as Record<string, FieldConfig[]>);
        
    return { active: activeFields, inactive: inactiveFields };
  }, [config, searchQuery]);

  const openPeopleManager = (type: 'developer' | 'tester') => {
    setPeopleManagerType(type);
    setIsPeopleManagerOpen(true);
  };

  const handlePeopleManagerSuccess = () => {
    setDevelopers(getDevelopers());
    setTesters(getTesters());
  }

  if (!config) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  const renderFieldRow = (field: FieldConfig, isActiveList: boolean) => {
    const protectedDateFields = ['devStartDate', 'devEndDate', 'qaStartDate', 'qaEndDate'];
    const isDateProtected = protectedDateFields.includes(field.key);
    const isToggleDisabled = field.isRequired || isDateProtected;

    return (
        <div 
          key={field.id}
          draggable={isActiveList && !field.isRequired}
          onDragStart={e => {
            if (field.isRequired) { e.preventDefault(); return; }
            e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('fieldId', field.id);
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, field)}
          className={cn("flex items-center gap-4 p-3 pr-2 border rounded-lg bg-card transition-all group", (isActiveList && !field.isRequired) && "hover:bg-muted/50 hover:shadow-sm cursor-grab active:cursor-grabbing")}
        >
            {(isActiveList && !field.isRequired) ? <GripVertical className="h-5 w-5 text-muted-foreground" /> : <div className="w-5 h-5" />}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                <span className="font-medium text-foreground">{field.label} {field.isRequired && <span className="text-destructive">*</span>}</span>
                <Badge variant="outline" className="w-fit">{field.type}</Badge>
                <span className="text-sm text-muted-foreground">{field.group}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(field)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(field.id)} disabled={isToggleDisabled} title={isToggleDisabled ? "This field cannot be deactivated" : (isActiveList ? 'Deactivate' : 'Activate')}>
                    {field.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground"/>}
                </Button>
                {field.isCustom && (
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Custom Field?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the "{field.label}" field and all associated data from your tasks. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteField(field.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
    )
  };

  const renderFieldList = (groupedFields: Record<string, FieldConfig[]>, isActiveList: boolean) => (
      <div className="space-y-6">
        {Object.keys(groupedFields).sort().map(groupName => (
            <div key={groupName}>
                {editingGroup === groupName ? (
                    <div className="flex items-center gap-2 mb-3">
                       <Input value={editingGroupText} onChange={(e) => setEditingGroupText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(groupName, editingGroupText); }} className="h-9"/>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRenameGroup(groupName, editingGroupText)}><Check className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingGroup(null)}><X className="h-4 w-4" /></Button>
                   </div>
                ) : (
                   <div className="flex items-center gap-2 mb-3 group/header">
                       <h3 className="text-md font-semibold text-muted-foreground">{groupName}</h3>
                       <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/header:opacity-100 focus-within:opacity-100 transition-opacity" onClick={() => { setEditingGroup(groupName); setEditingGroupText(groupName); }}><Edit className="h-4 w-4"/></Button>
                   </div>
                )}
                <div className="space-y-2">{groupedFields[groupName].map(field => renderFieldRow(field, isActiveList))}</div>
            </div>
        ))}
        {Object.keys(groupedFields).length === 0 && <p className="text-muted-foreground text-center py-4">No fields match your search in this section.</p>}
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Settings</h1>
            <p className="text-muted-foreground mt-1">Manage and customize fields and environments across your application.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Field</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Field Configuration</CardTitle>
                    <CardDescription>Drag active fields to reorder them. Edit, activate, or deactivate fields as needed. Required fields cannot be deactivated. Custom fields are the only fields that can be deleted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search fields by label or group..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-full max-w-sm"/>
                    </div>
                    <div className="space-y-8">
                        <div><h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b">Active Fields</h2>{renderFieldList(filteredAndGroupedFields.active, true)}</div>
                        <div><h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b">Inactive Fields</h2>{renderFieldList(filteredAndGroupedFields.inactive, false)}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />App Branding</CardTitle>
                    <CardDescription>Customize your application's name and icon.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="app-name">App Name</Label>
                        <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>App Icon</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-md shrink-0">
                                {appIcon && isDataURI(appIcon) ? (
                                    <img src={appIcon} alt="App Icon Preview" className="h-full w-full object-contain rounded-md" />
                                ) : appIcon ? (
                                    <span className="text-3xl">{appIcon}</span>
                                ) : (
                                    <Globe className="h-6 w-6 text-muted-foreground"/>
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                 <Input
                                    placeholder="Paste an emoji..."
                                    value={appIcon && !isDataURI(appIcon) ? appIcon : ''}
                                    onChange={(e) => setAppIcon(e.target.value.slice(0, 2))}
                                    maxLength={2}
                                />
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="flex-1 border-t"></div>
                                    <span>OR</span>
                                    <div className="flex-1 border-t"></div>
                                </div>
                                <Button variant="outline" size="sm" className="w-full" onClick={() => iconInputRef.current?.click()}>
                                    <ImageIcon className="h-4 w-4 mr-2" /> Upload Image
                                </Button>
                                <input type="file" ref={iconInputRef} onChange={handleIconUpload} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                            </div>
                        </div>
                        {appIcon && (
                             <Button variant="link" size="sm" className="p-0 h-auto text-destructive" onClick={() => setAppIcon(null)}>
                                <Trash2 className="mr-1 h-3 w-3" /> Remove Icon
                            </Button>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveBranding} className="w-full">Save Branding</Button>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Feature Management</CardTitle>
                    <CardDescription>Enable or disable optional features.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label htmlFor="reminders-switch" className="flex items-center gap-2"><BellRing className="h-4 w-4" /> Task Reminders</Label>
                            <p className="text-xs text-muted-foreground">
                                Allow users to set and pin reminder notes on tasks.
                            </p>
                        </div>
                        <Switch
                            id="reminders-switch"
                            checked={remindersEnabled}
                            onCheckedChange={setRemindersEnabled}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveFeatures} className="w-full">Save Features</Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Environment Management</CardTitle>
                    <CardDescription>Add or rename deployment environments. `dev` and `production` are protected.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        {config.environments.map(env => {
                            const isProtected = ['dev', 'production'].includes(env.toLowerCase());
                            return (
                                <div key={env}>
                                    {editingEnv === env ? (
                                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                            <Input value={editingEnvText} onChange={e => setEditingEnvText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameEnvironment(env); }} className="h-8" />
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRenameEnvironment(env)}><Check className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingEnv(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-2 border rounded-md bg-card group">
                                            <span className="font-medium">{env}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingEnv(env); setEditingEnvText(env); }}><Edit className="h-4 w-4" /></Button>
                                                {!isProtected && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Environment?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete the "{env}" environment and all associated deployment data from your tasks. This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteEnvironment(env)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t">
                        <Input 
                            placeholder="New environment name..." 
                            value={newEnvName} 
                            onChange={e => setNewEnvName(e.target.value)} 
                            onKeyDown={e => { if (e.key === 'Enter') handleAddEnvironment(); }}
                            className="h-9"
                        />
                        <Button onClick={handleAddEnvironment} disabled={!newEnvName.trim()} size="sm">Add</Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><Code2 className="h-5 w-5" />Developer Management</span><Badge variant="outline">{developers.length}</Badge></CardTitle><CardDescription>Manage their names, contact info, and assignments.</CardDescription></CardHeader>
                <CardContent><Button onClick={() => openPeopleManager('developer')} className="w-full">Manage Developers</Button></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Tester Management</span><Badge variant="outline">{testers.length}</Badge></CardTitle><CardDescription>Manage their names, contact info, and assignments.</CardDescription></CardHeader>
                <CardContent><Button onClick={() => openPeopleManager('tester')} className="w-full">Manage Testers</Button></CardContent>
            </Card>
        </div>
      </div>

      {isFieldDialogOpen && (
        <EditFieldDialog isOpen={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen} field={fieldToEdit} onSave={handleSaveField} repositoryConfigs={config.repositoryConfigs} />
      )}
      {isPeopleManagerOpen && (
        <PeopleManagerDialog type={peopleManagerType} isOpen={isPeopleManagerOpen} onOpenChange={setIsPeopleManagerOpen} onSuccess={handlePeopleManagerSuccess} />
      )}
    </div>
  );
}
