
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAdminConfig, updateAdminConfig, getFields, deleteField, renameGroup, moveFieldAndReorder, moveFieldToNewGroup, addField, removeField } from '@/lib/data';
import type { AdminConfig, FormField } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, GripVertical, XCircle, PlusCircle, Trash2, Edit, Search, Check, X, ShieldCheck } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function AdminPage() {
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [allFields, setAllFields] = useState<Record<string, FormField>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<FormField | null>(null);
  const [creationMode, setCreationMode] = useState<'parent' | 'child' | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [draggedGroupTitle, setDraggedGroupTitle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();

  const initialLoadComplete = useRef(false);
  const scrollDirectionRef = useRef<number>(0);
  const scrollIntervalRef = useRef<number | null>(null);


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
    if (isLoading || !initialLoadComplete.current) {
        return;
    }

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
  
  useEffect(() => {
      if (!isLoading) {
          const timer = setTimeout(() => {
            initialLoadComplete.current = true;
          }, 500);
          return () => clearTimeout(timer);
      }
  }, [isLoading]);


  const handleToggleRequired = (fieldId: string) => {
    if (!adminConfig) return;
    const isProtectedField = fieldId === 'title' || fieldId === 'description';
    if (isProtectedField) return;
    
    const newConfig = { ...adminConfig };
    const fieldConf = newConfig.fieldConfig[fieldId] || { visible: true, required: false };
    fieldConf.required = !fieldConf.required;
    newConfig.fieldConfig[fieldId] = fieldConf;
    setAdminConfig(newConfig);
  };

  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
    }
    scrollIntervalRef.current = null;
    scrollDirectionRef.current = 0;
  };

  const startScrolling = () => {
    if (scrollIntervalRef.current) return;

    const scrollStep = () => {
      if (scrollDirectionRef.current !== 0) {
        window.scrollBy(0, scrollDirectionRef.current * 15);
        scrollIntervalRef.current = requestAnimationFrame(scrollStep);
      } else {
        stopScrolling();
      }
    };
    scrollIntervalRef.current = requestAnimationFrame(scrollStep);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const viewportHeight = window.innerHeight;
    const scrollZone = 100;

    if (e.clientY < scrollZone) {
      scrollDirectionRef.current = -1;
      startScrolling();
    } else if (e.clientY > viewportHeight - scrollZone) {
      scrollDirectionRef.current = 1;
      startScrolling();
    } else {
      scrollDirectionRef.current = 0;
      stopScrolling();
    }
  };
  
  const handleDragEnd = () => {
    stopScrolling();
    setDraggedFieldId(null);
    setDraggedGroupTitle(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fieldId: string) => {
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = 'move';
  }

  const handleDropOnField = (targetFieldId: string) => {
    stopScrolling();
    if (!draggedFieldId) return;
    moveFieldAndReorder(draggedFieldId, targetFieldId);
    refreshData();
    setDraggedFieldId(null);
  };

  const handleDropOnGroup = (targetGroupTitle: string) => {
    stopScrolling();
    if (!draggedFieldId) return;
    const field = allFields[draggedFieldId];
    if (field?.group === targetGroupTitle) {
      setDraggedFieldId(null);
      return;
    }
    moveFieldToNewGroup(draggedFieldId, targetGroupTitle);
    refreshData();
    setDraggedFieldId(null);
  };
  
  const handleGroupContainerDrop = (targetGroupTitle: string) => {
      stopScrolling();
      if (draggedGroupTitle) {
          handleGroupDrop(targetGroupTitle);
      } else if (draggedFieldId) {
          handleDropOnGroup(targetGroupTitle);
      }
  };
  
  const handleGroupDragStart = (e: React.DragEvent<HTMLDivElement>, title: string) => {
    setDraggedGroupTitle(title);
    e.dataTransfer.effectAllowed = 'move';
  }

  const handleGroupDrop = (targetGroupTitle: string) => {
    stopScrolling();
    if (!draggedGroupTitle || !adminConfig?.groupOrder) return;
    
    const newGroupOrder = [...adminConfig.groupOrder];
    const draggedIndex = newGroupOrder.indexOf(draggedGroupTitle);
    const targetIndex = newGroupOrder.indexOf(targetGroupTitle);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [movedItem] = newGroupOrder.splice(draggedIndex, 1);
    newGroupOrder.splice(targetIndex, 0, movedItem);

    setAdminConfig({ ...adminConfig, groupOrder: newGroupOrder });
    setDraggedGroupTitle(null);
  }

  const handleOpenEditDialog = (field: FormField) => {
    setCreationMode(null);
    setFieldToEdit(field);
    setIsFieldDialogOpen(true);
  }

  const handleOpenNewDialog = (mode: 'parent' | 'child') => {
    setFieldToEdit(null);
    setCreationMode(mode);
    setIsFieldDialogOpen(true);
  }

  const handleDeleteField = (fieldId: string) => {
    deleteField(fieldId);
    refreshData();
    toast({
        variant: 'success',
        title: 'Field Deleted',
        description: 'The field has been permanently removed.',
    });
  }

  const handleRenameGroup = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName) {
      setEditingGroup(null);
      return;
    }
    if (adminConfig?.groupOrder?.includes(trimmedNewName)) {
      toast({
        variant: 'destructive',
        title: 'Group Name Exists',
        description: `A group named "${trimmedNewName}" already exists.`,
      });
      return;
    }
    renameGroup(oldName, trimmedNewName);
    refreshData();
    setEditingGroup(null);
    toast({
      variant: 'success',
      title: 'Group Renamed',
      description: `The group "${oldName}" was renamed to "${trimmedNewName}".`,
    });
  };
  
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
  
  const fieldGroups = useMemo(() => {
    if (!adminConfig?.groupOrder) return [];
    
    const groupedByTitle = Object.values(allFields).reduce((acc, field) => {
        const groupTitle = field.group || (field.isCustom ? (field.type === 'tags' ? 'Tagging' : 'Custom Fields') : 'Core Details');
        if (!acc[groupTitle]) {
            acc[groupTitle] = [];
        }
        acc[groupTitle].push(field.id);
        return acc;
    }, {} as Record<string, string[]>);
    
    const orderedGroupTitles = [...adminConfig.groupOrder];
    Object.keys(groupedByTitle).forEach(title => {
        if (!orderedGroupTitles.includes(title)) {
            orderedGroupTitles.push(title);
        }
    });
    
    return orderedGroupTitles.map(title => ({
        title: title,
        fieldIds: groupedByTitle[title] || [],
    }));
  }, [allFields, adminConfig?.groupOrder]);

  const { formLayout, fieldConfig } = adminConfig || {};
  const filteredActiveLayout = formLayout?.filter(id => filteredFields[id]) || [];
  
  const allInactiveFields = Object.keys(filteredFields).filter(id => !formLayout?.includes(id));
  const inactiveChildFields = allInactiveFields.filter(id => filteredFields[id].type !== 'group');
  const inactiveParentFields = allInactiveFields.filter(id => filteredFields[id].type === 'group');

  // --- Bulk Selection ---
    const handleSelectField = (fieldId: string) => {
        setSelectedFields(prev =>
            prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
        );
    };

    const activeFieldsInView = useMemo(() => {
        if (!formLayout) return [];
        return fieldGroups.flatMap(g =>
            g.fieldIds.filter(id => formLayout.includes(id) && filteredFields[id])
        );
    }, [fieldGroups, formLayout, filteredFields]);

    const selectedActiveFields = useMemo(() => {
        return selectedFields.filter(id => activeFieldsInView.includes(id));
    }, [selectedFields, activeFieldsInView]);

    const allActiveSelected = activeFieldsInView.length > 0 && selectedActiveFields.length === activeFieldsInView.length;
    const someActiveSelected = selectedActiveFields.length > 0 && !allActiveSelected;
    
  // --- Bulk Actions ---
    const handleBulkSetRequired = (required: boolean) => {
        if (!adminConfig) return;
        const newConfig = { ...adminConfig };
        selectedFields.forEach(fieldId => {
            const isProtectedField = fieldId === 'title' || fieldId === 'description';
            if (isProtectedField) return;
            const fieldConf = newConfig.fieldConfig[fieldId] || { visible: true, required: false };
            fieldConf.required = required;
            newConfig.fieldConfig[fieldId] = fieldConf;
        });
        setAdminConfig(newConfig);
        toast({
            variant: 'success',
            title: 'Fields Updated',
            description: `${selectedFields.length} field(s) have been marked as ${required ? 'required' : 'not required'}.`
        });
        setSelectedFields([]);
    };

    const handleBulkActivate = () => {
        selectedFields.forEach(fieldId => {
           if (formLayout && !formLayout.includes(fieldId)) {
                addField(fieldId);
            }
        });
        refreshData();
        toast({
            variant: 'success',
            title: 'Fields Activated',
            description: 'Selected fields have been added to the form.'
        });
        setSelectedFields([]);
    };

    const handleBulkDeactivate = () => {
        const selection = selectedFields.filter(id => id !== 'title' && id !== 'description');
        selection.forEach(fieldId => {
            if (formLayout && formLayout.includes(fieldId)) {
                removeField(fieldId);
            }
        });
        refreshData();
        toast({
            variant: 'success',
            title: 'Fields Deactivated',
            description: `${selection.length} field(s) have been removed from the form.`
        });
        setSelectedFields([]);
    };

    const handleBulkDelete = () => {
        const selection = selectedFields.filter(id => id !== 'title' && id !== 'description');
        selection.forEach(fieldId => {
            deleteField(fieldId);
        });
        refreshData();
        toast({
            variant: 'success',
            title: 'Fields Deleted',
            description: `${selection.length} field(s) have been permanently removed.`
        });
        setSelectedFields([]);
    };


  if (isLoading || !adminConfig || !fieldConfig) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-lg font-semibold text-muted-foreground">Loading Configuration...</p>
        </div>
      </div>
    );
  }
  
  const renderFieldCard = (fieldId: string) => {
      const fieldDefinition = allFields[fieldId];
      if (!fieldDefinition) return null;

      const isSelected = selectedFields.includes(fieldId);
      const isProtectedField = fieldId === 'title' || fieldId === 'description';

      return (
        <div 
          key={fieldId}
          className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4 transition-colors",
            isSelected && !isProtectedField ? 'bg-primary/10 border-primary' : 'bg-background hover:border-primary/50'
          )}
          draggable={!isProtectedField}
          onDragStart={(e) => !isProtectedField && handleDragStart(e, fieldId)}
          onDragOver={handleDragOver}
          onDrop={() => handleDropOnField(fieldId)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center gap-4 flex-1">
             <Checkbox
                id={`select-${fieldId}`}
                checked={isSelected}
                onCheckedChange={() => handleSelectField(fieldId)}
                aria-label={`Select field ${fieldDefinition.label}`}
                className="shrink-0"
                disabled={isProtectedField}
            />
            <GripVertical className={cn("h-6 w-6 text-muted-foreground shrink-0", isProtectedField ? "cursor-not-allowed text-muted-foreground/50" : "cursor-grab")} />
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => handleOpenEditDialog(fieldDefinition)}
              >
              <h3 className="font-semibold text-lg">{fieldDefinition.label}</h3>
              <p className="text-sm text-muted-foreground">{fieldDefinition.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${fieldId}`}
                  checked={isProtectedField || (fieldConfig[fieldId]?.required || false)}
                  onCheckedChange={() => !isProtectedField && handleToggleRequired(fieldId)}
                  onClick={e => e.stopPropagation()}
                  disabled={isProtectedField}
                />
                <Label htmlFor={`required-${fieldId}`} className={cn(isProtectedField && "text-muted-foreground/80")}>Required</Label>
            </div>
            <div className="flex items-center border-l pl-4 gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive" 
                        onClick={() => removeField(fieldId)}
                        disabled={isProtectedField}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isProtectedField ? "This field cannot be deactivated" : "Deactivate"}</p>
                  </TooltipContent>
                </Tooltip>
            </div>
          </div>
        </div>
      );
  }

  const renderAvailableField = (fieldId: string) => {
    const fieldDefinition = allFields[fieldId];
    if (!fieldDefinition) return null;
    const isSelected = selectedFields.includes(fieldId);
    const isProtectedField = fieldId === 'title' || fieldId === 'description';

    return (
      <div 
          key={fieldId} 
          className={cn("flex items-center justify-between gap-2 rounded-lg border p-2",
              isSelected && !isProtectedField ? 'bg-primary/10 border-primary' : 'bg-muted/50'
          )}
        >
        <div className="flex-1 flex items-center gap-2">
            <Checkbox
                  id={`select-inactive-${fieldId}`}
                  checked={isSelected}
                  onCheckedChange={() => handleSelectField(fieldId)}
                  aria-label={`Select field ${fieldDefinition.label}`}
                  disabled={isProtectedField}
            />
          <p className="font-medium text-sm">{fieldDefinition.label}</p>
          </div>
          <div className='flex items-center gap-0.5'>
            <Tooltip>
              <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addField(fieldId)}>
                  <PlusCircle className="h-4 w-4 text-green-500" />
              </Button>
              </TooltipTrigger>
              <TooltipContent><p>Activate</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDialog(fieldDefinition)}>
                    <Edit className="h-4 w-4" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Field</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={isProtectedField}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Field</span>
                  </Button>
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
          </div>
      </div>
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
            <CardDescription>Drag and drop to reorder fields or groups. Changes are saved automatically.</CardDescription>
             <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-4 border-b pb-2">
                  <Checkbox
                      id="select-all-active"
                      checked={someActiveSelected ? 'indeterminate' : allActiveSelected}
                      onCheckedChange={(checked) => {
                          const allActiveIds = activeFieldsInView.filter(id => id !== 'title' && id !== 'description');
                          if (checked) {
                              setSelectedFields(prev => [...new Set([...prev, ...allActiveIds])]);
                          } else {
                              setSelectedFields(prev => prev.filter(id => !allActiveIds.includes(id)));
                          }
                      }}
                      aria-label="Select all active fields"
                    />
                    <h2 className="text-xl font-semibold">Active Form Layout</h2>
                </div>
              
                {fieldGroups.map(groupInfo => {
                  const activeFieldsInGroup = formLayout.filter(id => 
                      groupInfo.fieldIds.includes(id) && filteredFields[id]
                  );
                  
                  if (activeFieldsInGroup.length === 0) return null;

                  return (
                      <div 
                          key={groupInfo.title}
                          onDragOver={handleDragOver}
                          onDrop={() => handleGroupContainerDrop(groupInfo.title)}
                          className="mb-6 rounded-lg border bg-muted/20"
                      >
                        {editingGroup === groupInfo.title ? (
                            <div className="p-4 rounded-t-lg bg-muted/50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <Input 
                                        value={newGroupName} 
                                        onChange={e => setNewGroupName(e.target.value)}
                                        className="h-9"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameGroup(groupInfo.title, newGroupName);
                                            if (e.key === 'Escape') setEditingGroup(null);
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button size="icon" className="h-8 w-8" onClick={() => handleRenameGroup(groupInfo.title, newGroupName)}><Check className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingGroup(null)}><X className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-t-lg bg-muted/50 flex items-center justify-between">
                                <div 
                                    draggable 
                                    onDragStart={(e) => handleGroupDragStart(e, groupInfo.title)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver}
                                    className="flex items-center gap-2 flex-1 cursor-grab"
                                >
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="text-lg font-semibold">{groupInfo.title}</h3>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                            setEditingGroup(groupInfo.title);
                                            setNewGroupName(groupInfo.title);
                                        }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Rename Group</p></TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                          <div className="p-4 pt-2 space-y-2">
                              {activeFieldsInGroup.map(renderFieldCard)}
                          </div>
                      </div>
                  );
                })}

                {filteredActiveLayout.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    {searchQuery ? 'No active fields match your search.' : 'No active fields. Add some from the library below.'}
                  </p>
                )}
              </div>
            
              <div className="lg:col-span-1 space-y-4">
                <Card className="sticky top-20">
                  <CardHeader>
                      <h2 className="text-xl font-semibold">Fields Library</h2>
                      <CardDescription>Add new fields to use in your forms.</CardDescription>
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenNewDialog('child')}>
                           Add Child Field
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenNewDialog('parent')}>
                           Add Parent Field
                        </Button>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Tabs defaultValue="child">
                      <TabsList className="w-full rounded-none justify-start px-6">
                        <TabsTrigger value="child">Child Fields</TabsTrigger>
                        <TabsTrigger value="parent">Parent Fields</TabsTrigger>
                      </TabsList>
                      <div className="p-4 max-h-[calc(100vh-30rem)] overflow-y-auto">
                        <TabsContent value="child">
                           <div className="space-y-2">
                              {inactiveChildFields.length > 0 
                                ? inactiveChildFields.map(renderAvailableField)
                                : <p className="text-muted-foreground text-center py-4 w-full text-sm">No available child fields.</p>
                              }
                           </div>
                        </TabsContent>
                        <TabsContent value="parent">
                           <div className="space-y-2">
                            {inactiveParentFields.length > 0 
                              ? inactiveParentFields.map(renderAvailableField)
                              : <p className="text-muted-foreground text-center py-4 w-full text-sm">No available parent fields.</p>
                            }
                           </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {selectedFields.length > 0 && (
            <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[90%] shadow-2xl">
                <CardContent className="p-3 flex items-center gap-4">
                    <div className="text-sm font-medium whitespace-nowrap">
                        {selectedFields.length} selected
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => handleBulkSetRequired(true)}>Set as Required</Button>
                        <Button size="sm" variant="outline" onClick={() => handleBulkSetRequired(false)}>Set as Not Required</Button>
                        <Button size="sm" variant="outline" onClick={handleBulkActivate}>Activate</Button>
                        <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>Deactivate</Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the {selectedFields.length} selected field(s) and all associated data. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete Field(s)</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedFields([])}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear selection</span>
                    </Button>
                </CardContent>
            </Card>
        )}
      <FieldEditorDialog
        isOpen={isFieldDialogOpen}
        onOpenChange={setIsFieldDialogOpen}
        fieldToEdit={fieldToEdit}
        creationMode={creationMode}
        adminConfig={adminConfig}
        allFields={allFields}
        onSuccess={() => {
          toast({ variant: 'success', title: fieldToEdit ? 'Field Updated' : 'Field Created' });
          refreshData();
        }}
      />
    </TooltipProvider>
  );
}
