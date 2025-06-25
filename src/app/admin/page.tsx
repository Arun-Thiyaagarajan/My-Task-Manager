
'use client';

import { useState, useEffect } from 'react';
import { getAdminConfig, updateAdminConfig } from '@/lib/data';
import type { AdminConfig, FormField } from '@/lib/types';
import { MASTER_FORM_FIELDS, ICONS } from '@/lib/form-config';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function AdminPage() {
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Admin Portal | My Task Manager';
    const config = getAdminConfig();
    setAdminConfig(config);
    setIsLoading(false);
  }, []);

  const handleToggleVisibility = (fieldId: string) => {
    if (!adminConfig) return;

    const newConfig = { ...adminConfig };
    const fieldConf = newConfig.fieldConfig[fieldId];
    fieldConf.visible = !fieldConf.visible;
    
    // If hiding a field, it cannot be required
    if (!fieldConf.visible) {
      fieldConf.required = false;
    }
    
    setAdminConfig(newConfig);
  };

  const handleToggleRequired = (fieldId: string) => {
    if (!adminConfig) return;
    
    const newConfig = { ...adminConfig };
    const fieldConf = newConfig.fieldConfig[fieldId];
    fieldConf.required = !fieldConf.required;
    setAdminConfig(newConfig);
  };

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
          <CardDescription>Configure the fields displayed on the task creation and editing forms.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {formLayout.map(fieldId => {
              const fieldDefinition = MASTER_FORM_FIELDS[fieldId] as FormField | undefined;
              const fieldSettings = fieldConfig[fieldId];

              if (!fieldDefinition || !fieldSettings) return null;

              const Icon = ICONS[fieldDefinition.icon as keyof typeof ICONS] || ICONS.text;

              return (
                <div key={fieldId} className="flex flex-col sm:flex-row items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-lg">{fieldDefinition.label}</h3>
                      <p className="text-sm text-muted-foreground">{fieldDefinition.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-2 sm:pt-0">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`visible-${fieldId}`}
                        checked={fieldSettings.visible}
                        onCheckedChange={() => handleToggleVisibility(fieldId)}
                        disabled={fieldId === 'title' || fieldId === 'description' || fieldId === 'status'}
                      />
                      <Label htmlFor={`visible-${fieldId}`}>Visible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`required-${fieldId}`}
                        checked={fieldSettings.required}
                        onCheckedChange={() => handleToggleRequired(fieldId)}
                        disabled={!fieldSettings.visible || fieldId === 'title' || fieldId === 'description' || fieldId === 'status'}
                      />
                      <Label htmlFor={`required-${fieldId}`}>Required</Label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end mt-8">
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
