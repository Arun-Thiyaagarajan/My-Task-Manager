
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getUiConfig, updateUiConfig, updateEnvironmentName, getDevelopers, getTesters, addTaskStatus, updateTaskStatus, deleteTaskStatus } from '@/lib/data';
import type { UiConfig, FieldConfig, RepositoryConfig, Person } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, PlusCircle, Edit, Trash2, ToggleLeft, ToggleRight, GripVertical, Check, X, Code2, ClipboardCheck, ListTodo } from 'lucide-react';
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


export default function SettingsPage() {
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);
  
  const [newEnv, setNewEnv] = useState('');
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [editingEnvText, setEditingEnvText] = useState('');
  
  const [newStatus, setNewStatus] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingStatusText, setEditingStatusText] = useState('');
  
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingGroupText, setEditingGroupText] = useState('');

  const [isPeopleManagerOpen, setIsPeopleManagerOpen] = useState(false);
  const [peopleManagerType, setPeopleManagerType] = useState<'developer' | 'tester'>('developer');
  
  const isInitialMount = useRef(true);

  const refreshConfig = () => {
    const loadedConfig = getUiConfig();
    setConfig(loadedConfig);
  }

  useEffect(() => {
    document.title = 'Settings | My Task Manager';
    refreshConfig();
    setDevelopers(getDevelopers());
    setTesters(getTesters());
  }, []);

  const debouncedConfig = useDebounce(config, 1000);

  useEffect(() => {
    if (isInitialMount.current) {
        if (debouncedConfig) {
            isInitialMount.current = false;
        }
        return;
    }
    
    if (!debouncedConfig) {
      return;
    }
    
    setIsSaving(true);
    updateUiConfig(debouncedConfig);
    
    const timer = setTimeout(() => {
        setIsSaving(false);
        toast({
            variant: 'success',
            title: 'Settings Saved',
            description: 'Your changes have been automatically saved.',
            duration: 2000,
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [debouncedConfig, toast]);
  
  const handleToggleActive = (fieldId: string) => {
    setConfig(prevConfig => {
        if (!prevConfig) return null;
        
        const field = prevConfig.fields.find(f => f.id === fieldId);
        if (field?.isRequired) {
            toast({
                variant: 'warning',
                title: 'Cannot Deactivate Required Field',
                description: `The "${field.label}" field is required and cannot be deactivated.`,
            });
            return prevConfig;
        }

        const fields = prevConfig.fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, isActive: !f.isActive };
            }
            return f;
        });

        // Re-calculate order
        const activeFields = fields.filter(f => f.isActive).sort((a,b) => a.order - b.order);
        const inactiveFields = fields.filter(f => !f.isActive).sort((a,b) => a.label.localeCompare(b.label));
        
        const newOrderedFields = [...activeFields, ...inactiveFields].map((field, index) => ({
            ...field,
            order: index
        }));

        return { ...prevConfig, fields: newOrderedFields };
    });
  }

  const handleDeleteField = (fieldId: string) => {
    setConfig(prevConfig => {
        if (!prevConfig) return null;
        const fields = prevConfig.fields.filter(f => f.id !== fieldId);
        return { ...prevConfig, fields };
    });
  };

  const handleOpenDialog = (field: FieldConfig | null) => {
    setFieldToEdit(field);
    setIsFieldDialogOpen(true);
  };

  const handleSaveField = (fieldData: FieldConfig, newRepoConfigs?: RepositoryConfig[]) => {
    setConfig(prevConfig => {
      if (!prevConfig) return null;
      const fields = [...prevConfig.fields];
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
      
      const finalRepoConfigs = newRepoConfigs ?? prevConfig.repositoryConfigs;
      
      if (newRepoConfigs) {
          const repoField = fields.find(f => f.key === 'repositories');
          if (repoField) {
              repoField.options = finalRepoConfigs.map(r => ({ id: r.id, value: r.name, label: r.name }));
          }
      }

      return { ...prevConfig, fields, repositoryConfigs: finalRepoConfigs };
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetField: FieldConfig) => {
    const draggedFieldId = e.dataTransfer.getData('fieldId');
    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    if (!draggedFieldId || draggedFieldId === targetField.id) return;
    
    setConfig(prevConfig => {
      if (!prevConfig) return null;

      let activeFields = prevConfig.fields.filter(f => f.isActive).sort((a, b) => a.order - b.order);
      const otherFields = prevConfig.fields.filter(f => !f.isActive);

      const draggedIndex = activeFields.findIndex(f => f.id === draggedFieldId);
      const targetIndex = activeFields.findIndex(f => f.id === targetField.id);

      if (draggedIndex === -1 || targetIndex === -1) return prevConfig;

      const [removed] = activeFields.splice(draggedIndex, 1);
      activeFields.splice(targetIndex, 0, removed);
      
      const newFields = [...activeFields, ...otherFields].map((field, index) => ({
        ...field,
        order: index
      }));

      return { ...prevConfig, fields: newFields };
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
  
  // Environment Handlers
  const handleAddEnvironment = () => {
    if (!config || !newEnv.trim()) return;
    const newEnvLower = newEnv.trim().toLowerCase();
    if (config.environments?.includes(newEnvLower)) {
        toast({ variant: 'warning', title: 'Environment already exists.' })
        return;
    }
    setConfig({ ...config, environments: [...(config.environments || []), newEnvLower] });
    setNewEnv('');
  }

  const handleDeleteEnvironment = (envToDelete: string) => {
    if (!config) return;
    setConfig({ ...config, environments: config.environments?.filter(env => env !== envToDelete) || [] });
  }

  const handleStartEditEnv = (env: string) => { setEditingEnv(env); setEditingEnvText(env); }

  const handleSaveEnvName = () => {
    if (!editingEnv || !editingEnvText.trim() || !config) return;
    if (editingEnvText.trim() !== editingEnv && config.environments?.includes(editingEnvText.trim())) {
      toast({ variant: 'destructive', title: 'Name already exists' });
      return;
    }
    if (updateEnvironmentName(editingEnv, editingEnvText.trim())) {
        setConfig(getUiConfig());
        toast({ variant: 'success', title: 'Environment Renamed' });
    } else {
        toast({ variant: 'destructive', title: 'Failed to rename environment' });
    }
    setEditingEnv(null); setEditingEnvText('');
  }

  // Status Handlers
  const handleAddStatus = () => {
    if (!newStatus.trim()) return;
    try {
        const newConfig = addTaskStatus(newStatus.trim());
        setConfig(newConfig);
        setNewStatus('');
        toast({ variant: 'success', title: 'Status Added' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleStartEditStatus = (status: string) => { setEditingStatus(status); setEditingStatusText(status); };
  
  const handleSaveStatusName = () => {
    if (!editingStatus || !editingStatusText.trim()) return;
    try {
        const newConfig = updateTaskStatus(editingStatus, editingStatusText.trim());
        setConfig(newConfig);
        toast({ variant: 'success', title: 'Status Renamed' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setEditingStatus(null); setEditingStatusText('');
  };

  const handleDeleteStatus = (statusToDelete: string) => {
    try {
        const newConfig = deleteTaskStatus(statusToDelete);
        setConfig(newConfig);
        toast({ variant: 'success', title: 'Status Deleted' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };


  const handleRenameGroup = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) {
        setEditingGroup(null);
        return;
    }

    const existingGroupNames = [...new Set(config?.fields.map(f => f.group.toLowerCase()))];
    if (existingGroupNames.includes(trimmedNewName.toLowerCase()) && trimmedNewName.toLowerCase() !== oldName.toLowerCase()) {
        toast({ variant: 'destructive', title: 'Group name already exists.' });
        return;
    }

    setConfig(prevConfig => {
        if (!prevConfig) return null;
        const newFields = prevConfig.fields.map(f => {
            if (f.group === oldName) return { ...f, group: trimmedNewName };
            return f;
        });
        return { ...prevConfig, fields: newFields };
    });
    setEditingGroup(null);
  };
  
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
    const isProtected = protectedDateFields.includes(field.key);
    const isToggleDisabled = field.isRequired || isProtected;

    return (
        <div 
          key={field.id}
          draggable={isActiveList && !field.isRequired && !isProtected}
          onDragStart={e => {
            if (isProtected) { e.preventDefault(); return; }
            e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('fieldId', field.id);
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, field)}
          className={cn("flex items-center gap-4 p-3 pr-2 border rounded-lg bg-card transition-all group", (isActiveList && !field.isRequired && !isProtected) && "hover:bg-muted/50 hover:shadow-sm cursor-grab active:cursor-grabbing")}
        >
            {(isActiveList && !field.isRequired && !isProtected) ? <GripVertical className="h-5 w-5 text-muted-foreground" /> : <div className="w-5 h-5" />}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                <span className="font-medium text-foreground">{field.label} {field.isRequired && <span className="text-destructive">*</span>}</span>
                <Badge variant="outline" className="w-fit">{field.type}</Badge>
                <span className="text-sm text-muted-foreground">{field.group}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(field)} disabled={isProtected}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(field.id)} disabled={isToggleDisabled} title={isToggleDisabled ? "This field cannot be deactivated" : (isActiveList ? 'Deactivate' : 'Activate')}>
                    {field.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground"/>}
                </Button>
                {field.isCustom && !isProtected && (
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
             <div className="text-sm text-muted-foreground whitespace-nowrap">{isSaving ? 'Saving...' : 'All changes saved'}</div>
            <Button onClick={() => handleOpenDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Field</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Field Configuration</CardTitle>
                    <CardDescription>Drag active fields to reorder them. Edit, activate, or deactivate fields as needed. Required fields cannot be deactivated or reordered. Custom fields are the only fields that can be deleted.</CardDescription>
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
                <CardHeader><CardTitle>Environment Management</CardTitle><CardDescription>Add or remove deployment environments. Default environments cannot be removed.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {(config.environments || []).map(env => {
                            const isDefault = (config.coreEnvironments || []).includes(env);
                            return (
                                <div key={env} className="flex items-center justify-between p-2 border rounded-md bg-card">
                                    {editingEnv === env ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <Input value={editingEnvText} onChange={(e) => setEditingEnvText(e.target.value)} className="h-8" onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEnvName()}} />
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEnvName()}><Check className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingEnv(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium capitalize">{env}</span>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditEnv(env)}><Edit className="h-4 w-4" /></Button>
                                                {!isDefault && (<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteEnvironment(env)}><Trash2 className="h-4 w-4" /></Button>)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t">
                        <Input placeholder="Add new environment..." value={newEnv} onChange={(e) => setNewEnv(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEnvironment(); }}} />
                        <Button variant="outline" size="sm" onClick={handleAddEnvironment}>Add</Button>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" />Task Status Management</CardTitle><CardDescription>Add or remove task statuses. Core statuses cannot be removed.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {(config.taskStatuses || []).map(status => {
                            const isDefault = (config.coreTaskStatuses || []).includes(status);
                            return (
                                <div key={status} className="flex items-center justify-between p-2 border rounded-md bg-card">
                                    {editingStatus === status ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <Input value={editingStatusText} onChange={(e) => setEditingStatusText(e.target.value)} className="h-8" onKeyDown={(e) => { if(e.key === 'Enter') handleSaveStatusName()}} />
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveStatusName()}><Check className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingStatus(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium">{status}</span>
                                            <div className="flex items-center">
                                                {!isDefault && (<>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditStatus(status)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteStatus(status)}><Trash2 className="h-4 w-4" /></Button>
                                                </>)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t">
                        <Input placeholder="Add new status..." value={newStatus} onChange={(e) => setNewStatus(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStatus(); }}}/>
                        <Button variant="outline" size="sm" onClick={handleAddStatus}>Add</Button>
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
