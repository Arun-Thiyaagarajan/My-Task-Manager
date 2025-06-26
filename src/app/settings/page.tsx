
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getUiConfig, updateUiConfig } from '@/lib/data';
import type { UiConfig, FieldConfig } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, PlusCircle, ArrowUp, ArrowDown, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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


export default function SettingsPage() {
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);

  useEffect(() => {
    document.title = 'Settings | My Task Manager';
    const loadedConfig = getUiConfig();
    setConfig(loadedConfig);
  }, []);

  const debouncedConfig = useDebounce(config, 1000);

  useEffect(() => {
    if (!debouncedConfig) return;
    if (initialLoad) {
      setInitialLoad(false);
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
  }, [debouncedConfig, toast, initialLoad]);
  
  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    setConfig(prevConfig => {
        if (!prevConfig) return null;
        
        const fields = [...prevConfig.fields];
        const activeFields = fields.filter(f => f.isActive).sort((a,b) => a.order - b.order);
        const fieldIndex = activeFields.findIndex(f => f.id === fieldId);

        if (fieldIndex === -1) return prevConfig;

        const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;

        if (newIndex < 0 || newIndex >= activeFields.length) return prevConfig;

        // Swap order properties
        const originalOrder = activeFields[fieldIndex].order;
        activeFields[fieldIndex].order = activeFields[newIndex].order;
        activeFields[newIndex].order = originalOrder;

        // Re-sort the original fields array by the new order
        fields.sort((a,b) => a.order - b.order);

        return { ...prevConfig, fields };
    });
  };
  
  const handleToggleActive = (fieldId: string) => {
    setConfig(prevConfig => {
        if (!prevConfig) return null;
        const fields = prevConfig.fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, isActive: !f.isActive };
            }
            return f;
        });
        return { ...prevConfig, fields };
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
    setIsDialogOpen(true);
  };

  const handleSaveField = (fieldData: FieldConfig) => {
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
          order: fields.length, // Add to the end
        };
        fields.push(newField);
      }
      return { ...prevConfig, fields };
    });
  };


  const filteredFields = useMemo(() => {
    if (!config) return { active: [], inactive: [] };
    const query = searchQuery.toLowerCase();
    const allFields = config.fields.filter(f => f.label.toLowerCase().includes(query));
    return {
        active: allFields.filter(f => f.isActive).sort((a,b) => a.order - b.order),
        inactive: allFields.filter(f => !f.isActive).sort((a,b) => a.label.localeCompare(b.label)),
    }
  }, [config, searchQuery]);

  if (!config) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  const renderFieldList = (fields: FieldConfig[], isActiveList: boolean) => (
    <div className="space-y-2">
        {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <span className="font-medium text-foreground">{field.label} {field.isRequired && !isActiveList && <span className="text-destructive">*</span>}</span>
                    <Badge variant="outline" className="w-fit">{field.type}</Badge>
                    <span className="text-sm text-muted-foreground">{field.group}</span>
                </div>
                <div className="flex items-center gap-1">
                    {isActiveList && (
                        <>
                         <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => handleMoveField(field.id, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === fields.length - 1} onClick={() => handleMoveField(field.id, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(field)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(field.id)}>
                        {isActiveList ? <ToggleLeft className="h-5 w-5 text-muted-foreground" /> : <ToggleRight className="h-5 w-5 text-primary"/>}
                    </Button>
                    {field.isCustom && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Custom Field?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the "{field.label}" field and all associated data from your tasks. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteField(field.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>
        ))}
        {fields.length === 0 && <p className="text-muted-foreground text-center py-4">No fields in this section.</p>}
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Settings</h1>
            <p className="text-muted-foreground mt-1">Manage and customize fields across your application.</p>
        </div>
        <div className="flex items-center gap-2">
             <div className="text-sm text-muted-foreground whitespace-nowrap">
                {isSaving ? 'Saving...' : 'All changes saved'}
            </div>
            <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Field
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Field Configuration</CardTitle>
            <CardDescription>
                Drag and drop active fields to reorder them. Edit, activate, or deactivate fields as needed.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search fields by label..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full max-w-sm"
                />
            </div>
            
            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b">Active Fields</h2>
                    {renderFieldList(filteredFields.active, true)}
                </div>
                 <div>
                    <h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b">Inactive Fields</h2>
                    {renderFieldList(filteredFields.inactive, false)}
                </div>
            </div>
        </CardContent>
      </Card>
      {isDialogOpen && (
        <EditFieldDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            field={fieldToEdit}
            onSave={handleSaveField}
        />
      )}
    </div>
  );
}
