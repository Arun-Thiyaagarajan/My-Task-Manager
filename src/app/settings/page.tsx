
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getUiConfig, updateUiConfig } from '@/lib/data';
import type { UiConfig, FieldConfig } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    document.title = 'Settings | My Task Manager';
    const loadedConfig = getUiConfig();
    setConfig(loadedConfig);
    setInitialLoad(false);
  }, []);

  const debouncedConfig = useDebounce(config, 1000);

  useEffect(() => {
    if (initialLoad || !debouncedConfig) {
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedConfig, toast]);

  const handleFieldChange = (fieldName: string, fieldConfig: Partial<FieldConfig>) => {
    setConfig(prevConfig => {
      if (!prevConfig) return null;
      return {
        ...prevConfig,
        fields: {
          ...prevConfig.fields,
          [fieldName]: {
            ...prevConfig.fields[fieldName as keyof typeof prevConfig.fields],
            ...fieldConfig,
          },
        },
      };
    });
  };

  const filteredFields = useMemo(() => {
    if (!config) return [];
    const query = searchQuery.toLowerCase();
    return Object.entries(config.fields).filter(([_, fieldConfig]) =>
      fieldConfig.label.toLowerCase().includes(query)
    );
  }, [config, searchQuery]);
  
  const groupedFields = useMemo(() => {
    return filteredFields.reduce((acc, [fieldName, fieldConfig]) => {
      const group = fieldConfig.group || 'Other';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push([fieldName, fieldConfig]);
      return acc;
    }, {} as Record<string, [string, FieldConfig][]>);
  }, [filteredFields]);

  if (!config) {
    return <LoadingSpinner text="Loading settings..." />;
  }
  
  const sortedGroupNames = Object.keys(groupedFields).sort();

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Application Settings
        </h1>
        <div className="text-sm text-muted-foreground">
            {isSaving ? 'Saving...' : 'All changes saved'}
        </div>
      </div>
      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Field Configuration</CardTitle>
            <CardDescription>
                Customize the labels, visibility, and requirements for fields throughout the application.
                Custom fields and deletions are coming soon.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full max-w-sm"
                />
            </div>
            
            <div className="space-y-8">
                {sortedGroupNames.map(groupName => (
                    <div key={groupName}>
                        <h2 className="text-xl font-semibold tracking-tight mb-4 pb-2 border-b">{groupName}</h2>
                        <div className="space-y-6">
                            {groupedFields[groupName].map(([fieldName, fieldConfig]) => (
                                <div key={fieldName} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start p-4 border rounded-lg">
                                    <div className="md:col-span-1">
                                        <Label htmlFor={`label-${fieldName}`}>Field Label</Label>
                                        <Input
                                            id={`label-${fieldName}`}
                                            value={fieldConfig.label}
                                            onChange={(e) => handleFieldChange(fieldName, { label: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-center space-x-8 pt-6">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`active-${fieldName}`}
                                                checked={fieldConfig.isActive}
                                                onCheckedChange={(checked) => handleFieldChange(fieldName, { isActive: checked })}
                                            />
                                            <Label htmlFor={`active-${fieldName}`}>Active</Label>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`required-${fieldName}`}
                                                checked={fieldConfig.isRequired}
                                                onCheckedChange={(checked) => handleFieldChange(fieldName, { isRequired: checked })}
                                            />
                                            <Label htmlFor={`required-${fieldName}`}>Required</Label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {filteredFields.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No fields match your search.</p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
