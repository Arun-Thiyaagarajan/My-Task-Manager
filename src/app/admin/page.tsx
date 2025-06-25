
'use client';

import { useState, useEffect } from 'react';
import { getAdminConfig, updateAdminConfig } from '@/lib/data';
import type { AdminConfig, FormField } from '@/lib/types';
import { MASTER_FORM_FIELDS, ICONS } from '@/lib/form-config';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowUp, ArrowDown, XCircle, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function AdminPage() {
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const CORE_FIELDS = ['title', 'description', 'status'];

  useEffect(() => {
    document.title = 'Admin Portal | TaskFlow';
    const config = getAdminConfig();
    setAdminConfig(config);
    setIsLoading(false);
  }, []);

  const handleToggleRequired = (fieldId: string) => {
    if (!adminConfig) return;
    
    const newConfig = { ...adminConfig };
    const fieldConf = newConfig.fieldConfig[fieldId];
    fieldConf.required = !fieldConf.required;
    setAdminConfig(newConfig);
  };
  
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (!adminConfig) return;

    const newLayout = [...adminConfig.formLayout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;

    const [movedItem] = newLayout.splice(index, 1);
    newLayout.splice(targetIndex, 0, movedItem);

    setAdminConfig({ ...adminConfig, formLayout: newLayout });
  }

  const handleRemoveField = (fieldId: string) => {
    if (!adminConfig || CORE_FIELDS.includes(fieldId)) return;

    const newLayout = adminConfig.formLayout.filter(id => id !== fieldId);
    const newFieldConfig = { ...adminConfig.fieldConfig[fieldId], visible: false, required: false };
    
    setAdminConfig({
      ...adminConfig,
      formLayout: newLayout,
      fieldConfig: {
        ...adminConfig.fieldConfig,
        [fieldId]: newFieldConfig
      }
    });
  }

  const handleAddField = (fieldId: string) => {
    if (!adminConfig) return;

    const newLayout = [...adminConfig.formLayout, fieldId];
    const newFieldConfig = { ...adminConfig.fieldConfig[fieldId], visible: true };

    setAdminConfig({
      ...adminConfig,
      formLayout: newLayout,
       fieldConfig: {
        ...adminConfig.fieldConfig,
        [fieldId]: newFieldConfig
      }
    });
  }

  const handleSaveChanges = () => {
    if (adminConfig) {
      updateAdminConfig(adminConfig);
      toast({
        variant: 'success',
        title: 'Configuration Saved',
        description: 'Your form settings have been updated.',
      });
    }
  };

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
  const availableFields = Object.keys(MASTER_FORM_FIELDS).filter(id => !formLayout.includes(id));

  return (
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
          <CardTitle className="text-3xl font-bold tracking-tight">Admin Portal</CardTitle>
          <CardDescription>Use the controls to reorder, add, or remove fields from your task forms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Active Form Fields</h2>
            <div className="space-y-4">
              {formLayout.map((fieldId, index) => {
                const fieldDefinition = MASTER_FORM_FIELDS[fieldId] as FormField | undefined;
                if (!fieldDefinition) return null;

                const Icon = ICONS[fieldDefinition.icon as keyof typeof ICONS] || ICONS.text;
                const isCoreField = CORE_FIELDS.includes(fieldId);

                return (
                  <div key={fieldId} className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Icon className="h-6 w-6 text-muted-foreground mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg">{fieldDefinition.label}</h3>
                        <p className="text-sm text-muted-foreground">{fieldDefinition.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-2 sm:pt-0 shrink-0">
                      <div className="flex items-center space-x-2">
                          <Switch
                            id={`required-${fieldId}`}
                            checked={fieldConfig[fieldId].required}
                            onCheckedChange={() => handleToggleRequired(fieldId)}
                            disabled={isCoreField}
                          />
                          <Label htmlFor={`required-${fieldId}`}>Required</Label>
                      </div>
                       <div className="flex items-center border-l pl-4 gap-1">
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveField(index, 'up')} disabled={index === 0}>
                           <ArrowUp className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveField(index, 'down')} disabled={index === formLayout.length - 1}>
                           <ArrowDown className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveField(fieldId)} disabled={isCoreField}>
                           <XCircle className="h-4 w-4" />
                         </Button>
                       </div>
                    </div>
                  </div>
                );
              })}
              {formLayout.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No active fields. Add some from the list below.</p>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Available Fields</h2>
            <div className="flex flex-wrap gap-2">
              {availableFields.map(fieldId => {
                 const fieldDefinition = MASTER_FORM_FIELDS[fieldId] as FormField | undefined;
                 if (!fieldDefinition) return null;
                 return (
                   <Button key={fieldId} variant="outline" size="sm" onClick={() => handleAddField(fieldId)}>
                     <PlusCircle className="mr-2 h-4 w-4" />
                     {fieldDefinition.label}
                   </Button>
                 )
              })}
              {availableFields.length === 0 && (
                <p className="text-muted-foreground text-center py-4 w-full">All available fields are active.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
