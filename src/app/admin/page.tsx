
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAdminConfig, updateAdminConfig, getFields, deleteField } from '@/lib/data';
import type { AdminConfig, FormField } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, GripVertical, XCircle, PlusCircle, Trash2, Edit, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { FieldEditorDialog } from '@/components/field-editor-dialog';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FIELD_GROUPS = [
  {
    title: 'Core Details',
    fieldIds: ['title', 'description', 'status'],
  },
  {
    title: 'Assignment & Tracking',
    fieldIds: ['developers', 'repositories', 'azureWorkItemId', 'prLinks'],
  },
  {
    title: 'Dates',
    fieldIds: [
      'devStartDate',
      'devEndDate',
      'qaStartDate',
      'qaEndDate',
      'stageDate',
      'productionDate',
      'othersDate',
    ],
  },
  {
    title: 'Advanced',
    fieldIds: ['deploymentStatus', 'qaIssueIds', 'attachments'],
  }
];

export default function AdminPage() {
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [allFields, setAllFields] = useState<Record<string, FormField>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<FormField | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const initialLoadComplete = useRef(false);

  const refreshData = () => {
    const config = getAdminConfig();
    const cFields = getFields();
    setAdminConfig(config);
    setAllFields(cFields);
  };

  useEffect(() => {
    document.title = 'Admin Portal | TaskFlow';
    refreshData();
    setIsLoading(false);

    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, []);

  const adminConfigString = useMemo(() => JSON.stringify(adminConfig), [adminConfig]);

  useEffect(() => {
    if (isLoading) {
      return; // Don't save while initial data is loading
    }

    if (!initialLoadComplete.current) {
      // This is the first run after data has loaded.
      // Mark it as complete and do not save.
      initialLoadComplete.current = true;
      return;
    }

    // Any subsequent run of this effect is a real change.
    setIsSaving(true);
    const handler = setTimeout(() => {
      if (adminConfig) {
        updateAdminConfig(adminConfig);
        toast({
            variant: 'success',
            title: 'Configuration Saved',
            description: 'Your changes have been saved automatically.',
        });
      }
      setIsSaving(false);
    }, 1500);

    return () => clearTimeout(handler);
  }, [adminConfigString, isLoading]);


  const handleToggleRequired = (fieldId: string) => {
    if (!adminConfig) return;
    
    const newConfig = { ...adminConfig };
    const fieldConf = newConfig.fieldConfig[fieldId] || { visible: true, required: false };
    fieldConf.required = !fieldConf.required;
    newConfig.fieldConfig[fieldId] = fieldConf;
    setAdminConfig(newConfig);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fieldId: string) => {
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = 'move';
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }

  const handleDrop = (targetFieldId: string) => {
    if (!draggedFieldId || !adminConfig) return;
    
    const newLayout = [...adminConfig.formLayout];
    const draggedIndex = newLayout.indexOf(draggedFieldId);
    const targetIndex = newLayout.indexOf(targetFieldId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [movedItem] = newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, movedItem);

    setAdminConfig({ ...adminConfig, formLayout: newLayout });
    setDraggedFieldId(null);
  }

  const handleAddField = (fieldId: string) => {
    if (!adminConfig) return;
    if (adminConfig.formLayout.includes(fieldId)) return;
    
    const newLayout = [...adminConfig.formLayout, fieldId];
    const newFieldConfig = { ...(adminConfig.fieldConfig[fieldId] || { required: false }), visible: true };

    setAdminConfig({
      ...adminConfig,
      formLayout: newLayout,
       fieldConfig: {
        ...adminConfig.fieldConfig,
        [fieldId]: newFieldConfig
      }
    });
  }

  const handleRemoveField = (fieldId: string) => {
    if (!adminConfig) return;

    const newLayout = adminConfig.formLayout.filter(id => id !== fieldId);
    const newFieldConfig = { ...(adminConfig.fieldConfig[fieldId] || {}), visible: false };
    
    setAdminConfig({
      ...adminConfig,
      formLayout: newLayout,
      fieldConfig: {
        ...adminConfig.fieldConfig,
        [fieldId]: newFieldConfig
      }
    });
  }

  const handleOpenEditDialog = (field: FormField) => {
    setFieldToEdit(field);
    setIsFieldDialogOpen(true);
  }

  const handleDeleteField = (fieldId: string) => {
    deleteField(fieldId);
    toast({
        variant: 'success',
        title: 'Field Deleted',
        description: 'The custom field has been removed.',
    });
  }
  
  const filteredFields = useMemo(() => {
    if (!searchQuery) return allFields;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return Object.entries(allFields).reduce((acc, [id, field]) => {
      if (
        field.label.toLowerCase().includes(lowerCaseQuery) ||
        field.description?.toLowerCase().includes(lowerCaseQuery)
      ) {
        acc[id] = field;
      }
      return acc;
    }, {} as Record<string, FormField>);
  }, [searchQuery, allFields]);

  if (isLoading || !adminConfig) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-lg font-semibold text-muted-foreground">Loading Configuration...</p>
        </div>
      </div>
    );
  }

  const { formLayout, fieldConfig } = adminConfig;
  const filteredActiveLayout = formLayout.filter(id => filteredFields[id]);
  const inactiveFields = Object.keys(filteredFields).filter(id => !formLayout.includes(id));
  
  const renderFieldCard = (fieldId: string) => {
      const fieldDefinition = allFields[fieldId];
      if (!fieldDefinition) return null;

      return (
        <div 
          key={fieldId}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4 cursor-pointer bg-card hover:border-primary/50"
          draggable={true}
          onDragStart={(e) => handleDragStart(e, fieldId)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(fieldId)}
          onClick={() => handleOpenEditDialog(fieldDefinition)}
        >
          <div className="flex items-center gap-4 flex-1">
            <GripVertical className="h-6 w-6 text-muted-foreground cursor-grab shrink-0" />
              <div>
              <h3 className="font-semibold text-lg">{fieldDefinition.label}</h3>
              <p className="text-sm text-muted-foreground">{fieldDefinition.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${fieldId}`}
                  checked={fieldConfig[fieldId]?.required || false}
                  onCheckedChange={() => handleToggleRequired(fieldId)}
                />
                <Label htmlFor={`required-${fieldId}`}>Required</Label>
            </div>
            <div className="flex items-center border-l pl-4 gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveField(fieldId)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Deactivate</p>
                  </TooltipContent>
                </Tooltip>
            </div>
          </div>
        </div>
      );
  }
  
  const renderGroupedFields = (fieldsToRender: string[]) => {
      const customFields = fieldsToRender.filter(id => allFields[id]?.isCustom);
      const groupedStandardFields = FIELD_GROUPS.map(group => {
        return {
          ...group,
          fields: group.fieldIds.filter(id => fieldsToRender.includes(id))
        }
      }).filter(group => group.fields.length > 0);

      const standardFieldElements = groupedStandardFields.map(group => (
        <div key={group.title}>
            <h3 className="text-lg font-semibold mt-4 mb-3 pb-2 border-b">{group.title}</h3>
            <div className="space-y-2">
                {group.fields.map(renderFieldCard)}
            </div>
        </div>
      ));
      
      const customFieldElements = customFields.length > 0 ? (
        <div>
            <h3 className="text-lg font-semibold mt-4 mb-3 pb-2 border-b">Custom Fields</h3>
            <div className="space-y-2">
                {customFields.map(renderFieldCard)}
            </div>
        </div>
      ) : null;

      return (
          <>
            {standardFieldElements}
            {customFieldElements}
            {fieldsToRender.length === 0 && searchQuery && (
                <p className="text-muted-foreground text-center py-4">No active fields match your search.</p>
            )}
          </>
      )
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="ghost" className="pl-1">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tasks
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Admin Portal
              {isSaving && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>Drag and drop to reorder fields, or click to edit. Changes are saved automatically.</CardDescription>
             <div className="relative pt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            
            <div>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Active Form Fields</h2>
              {renderGroupedFields(filteredActiveLayout)}
              {filteredActiveLayout.length === 0 && !searchQuery && (
                  <p className="text-muted-foreground text-center py-4">No active fields. Add some from the list below.</p>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-xl font-semibold">Inactive Fields</h2>
                <Button variant="outline" onClick={() => { setFieldToEdit(null); setIsFieldDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Field
                </Button>
              </div>
              <div className="space-y-2">
                {inactiveFields.map(fieldId => {
                   const fieldDefinition = allFields[fieldId];
                   if (!fieldDefinition) return null;
                   return (
                     <div 
                        key={fieldId} 
                        className="flex items-center justify-between gap-4 rounded-lg border p-3 bg-muted/50"
                      >
                       <div className="flex-1">
                          <p className="font-medium">{fieldDefinition.label}</p>
                          <p className="text-xs text-muted-foreground">{fieldDefinition.type}</p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button size="sm" variant="outline" className="px-3 h-8" onClick={(e) => { e.stopPropagation(); handleAddField(fieldId);}}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Activate
                          </Button>
                           <Tooltip>
                              <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(fieldDefinition)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Edit Field</p>
                             </TooltipContent>
                           </Tooltip>
                          {fieldDefinition.isCustom ? (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Field</p>
                                      </TooltipContent>
                                    </Tooltip>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete the "{fieldDefinition.label}" field and all associated data from your tasks. This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteField(fieldId)} className="bg-destructive hover:bg-destructive/90">Delete Field</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          ) : (
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                   <Trash2 className="h-4 w-4 text-muted-foreground/50" />
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <p>Default fields cannot be deleted.</p>
                               </TooltipContent>
                             </Tooltip>
                          )}
                        </div>
                     </div>
                   )
                })}
                {inactiveFields.length === 0 && (
                  <p className="text-muted-foreground text-center py-4 w-full">
                    {searchQuery ? 'No inactive fields match your search.' : 'All fields are active.'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <FieldEditorDialog
        isOpen={isFieldDialogOpen}
        onOpenChange={setIsFieldDialogOpen}
        fieldToEdit={fieldToEdit}
        adminConfig={adminConfig}
        onSuccess={() => {
          toast({ variant: 'success', title: fieldToEdit ? 'Field Updated' : 'Field Created' });
          refreshData();
        }}
      />
    </TooltipProvider>
  );
}
