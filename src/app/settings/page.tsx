'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    getUiConfig, 
    setUiConfig, 
    clearAllData, 
    getDevelopers, 
    getTesters,
    addLog
} from '@/lib/data';
import type { UiConfig, FieldConfig, Person, RepositoryConfig, Environment, BackupFrequency } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
    Cog, 
    ShieldAlert, 
    Trash2, 
    Plus, 
    Users, 
    ClipboardCheck, 
    Layout, 
    Globe, 
    Bell, 
    GraduationCap, 
    History,
    Search,
    ChevronUp,
    ChevronDown,
    Save,
    Pencil,
    Rocket,
    Clock,
    RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PeopleManagerDialog } from '@/components/people-manager-dialog';
import { EditFieldDialog } from '@/components/edit-field-dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReleaseManagementCard } from '@/components/release-management-card';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [uiConfig, setUiConfigState] = useState<UiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const [peopleManagerType, setPeopleManagerType] = useState<'developer' | 'tester' | null>(null);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);

  useEffect(() => {
    const config = getUiConfig();
    setUiConfigState(config);
    setIsLoading(false);
    document.title = `Settings | ${config.appName || 'Task Manager'}`;
  }, []);

  const handleUpdateConfig = (updates: Partial<UiConfig>) => {
    if (!uiConfig) return;
    const newConfig = { ...uiConfig, ...updates };
    setUiConfigState(newConfig);
    setUiConfig(newConfig);
    
    // Notify other components
    window.dispatchEvent(new Event('config-changed'));
  };

  const handleFieldToggle = (key: string, property: 'isActive' | 'isRequired') => {
    if (!uiConfig) return;
    
    const newFields = (uiConfig.fields || []).map(f => {
        if (f.key === key) {
            const updated = { ...f, [property]: !f[property] };
            // Ensure isActive is true if isRequired is true
            if (property === 'isRequired' && updated.isRequired) {
                updated.isActive = true;
            }
            return updated;
        }
        return f;
    });
    
    handleUpdateConfig({ fields: newFields });
  };

  const handleFieldOrder = (index: number, direction: 'up' | 'down') => {
    if (!uiConfig || !uiConfig.fields) return;
    const newFields = [...uiConfig.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        // Update order property
        const reordered = newFields.map((f, i) => ({ ...f, order: i }));
        handleUpdateConfig({ fields: reordered });
    }
  };

  const handleSaveField = (updatedField: FieldConfig, repoConfigs?: RepositoryConfig[]) => {
    if (!uiConfig) return;
    
    let newFields = [...(uiConfig.fields || [])];
    const index = newFields.findIndex(f => f.id === updatedField.id);
    
    if (index !== -1) {
        newFields[index] = updatedField;
    } else {
        // Create key for custom field
        const key = updatedField.label.toLowerCase().replace(/\s+/g, '_');
        updatedField.key = key;
        updatedField.order = newFields.length;
        newFields.push(updatedField);
    }
    
    const updates: Partial<UiConfig> = { fields: newFields };
    if (repoConfigs) {
        updates.repositoryConfigs = repoConfigs;
    }
    
    handleUpdateConfig(updates);
    toast({ variant: 'success', title: 'Field configuration saved.' });
  };

  const handleDeleteField = (id: string) => {
      if (!uiConfig || !uiConfig.fields) return;
      const fieldToDelete = uiConfig.fields.find(f => f.id === id);
      if (!fieldToDelete) return;

      const newFields = uiConfig.fields.filter(f => f.id !== id);
      handleUpdateConfig({ fields: newFields });
      addLog({ message: `Deleted custom field: **${fieldToDelete.label}**` });
      toast({ variant: 'success', title: 'Field deleted.' });
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      toast({
        variant: 'success',
        title: 'Data Cleared',
        description: 'Your workspace has been reset successfully.',
        duration: 5000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error clearing data:", error);
      toast({
        variant: 'destructive',
        title: 'Error Clearing Data',
        description: error?.message || 'An unexpected error occurred while clearing data.',
        duration: 5000,
      });
    }
  };

  const filteredAndGroupedFields = useMemo(() => {
    if (!uiConfig || !uiConfig.fields) return {};
    
    const queryStr = searchQuery.toLowerCase();
    const allFields = uiConfig.fields.filter(f => 
        f.label.toLowerCase().includes(queryStr) || 
        (f.group && f.group.toLowerCase().includes(queryStr))
    );

    return allFields.reduce((acc, field) => {
        const group = field.group || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(field);
        return acc;
    }, {} as Record<string, FieldConfig[]>);
  }, [uiConfig, searchQuery]);

  const groupOrder = useMemo(() => {
      const keys = Object.keys(filteredAndGroupedFields);
      return keys.sort((a, b) => {
          const aFields = filteredAndGroupedFields[a];
          const bFields = filteredAndGroupedFields[b];
          const aMin = Math.min(...aFields.map(f => f.order));
          const bMin = Math.min(...bFields.map(f => f.order));
          return aMin - bMin;
      });
  }, [filteredAndGroupedFields]);

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <Cog className="h-9 w-9 text-primary animate-spin-slow" />
                Workspace Settings
            </h1>
            <p className="text-muted-foreground mt-1">Manage your application configuration and data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Branding & Features */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Layout className="h-6 w-6 text-primary" />
                General Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Application Identity</CardTitle>
                        <CardDescription>How TaskFlow appears to you and your team.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="app-name">Workspace Name</Label>
                            <Input 
                                id="app-name" 
                                value={uiConfig.appName || ''} 
                                onChange={(e) => handleUpdateConfig({ appName: e.target.value })} 
                                placeholder="My Task Manager"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="app-icon">App Icon (Emoji or Data URI)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="app-icon" 
                                    value={uiConfig.appIcon || ''} 
                                    onChange={(e) => handleUpdateConfig({ appIcon: e.target.value })} 
                                    placeholder="🚀 or data:image/..."
                                />
                                <div className="h-10 w-10 flex-shrink-0 border rounded-md flex items-center justify-center text-xl bg-muted">
                                    {uiConfig.appIcon && uiConfig.appIcon.startsWith('data:image') ? (
                                        <img src={uiConfig.appIcon} alt="Icon" className="h-6 w-6 object-contain" />
                                    ) : (
                                        uiConfig.appIcon || '📋'
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Preferences</CardTitle>
                        <CardDescription>Regional and display settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Time Format</Label>
                                <p className="text-xs text-muted-foreground">Choose between 12-hour and 24-hour clocks.</p>
                            </div>
                            <Select value={uiConfig.timeFormat} onValueChange={(val: '12h' | '24h') => handleUpdateConfig({ timeFormat: val })}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12h">12-hour</SelectItem>
                                    <SelectItem value="24h">24-hour</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Tutorial Mode</Label>
                                <p className="text-xs text-muted-foreground">Show helpful guided tours on first visit.</p>
                            </div>
                            <Switch 
                                checked={uiConfig.tutorialEnabled ?? true} 
                                onCheckedChange={(val) => handleUpdateConfig({ tutorialEnabled: val })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Reminders System</Label>
                                <p className="text-xs text-muted-foreground">Enable or disable task and general reminders.</p>
                            </div>
                            <Switch 
                                checked={uiConfig.remindersEnabled ?? true} 
                                onCheckedChange={(val) => handleUpdateConfig({ remindersEnabled: val })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>

        {/* Field Configuration */}
        <section className="space-y-6" id="settings-field-config-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    Field Management
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter fields..." 
                            className="pl-9 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button size="sm" id="add-field-button" onClick={() => { setFieldToEdit(null); setIsFieldDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Field
                    </Button>
                </div>
            </div>

            <div className="space-y-8">
                {groupOrder.map(groupName => (
                    <div key={groupName} className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">{groupName}</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {filteredAndGroupedFields[groupName].map((field, idx) => {
                                const isUnchangeable = ['title', 'description', 'status', 'repositories'].includes(field.key);
                                const isProtectedDate = ['devStartDate', 'devEndDate'].includes(field.key);

                                return (
                                    <div key={field.id} className="flex items-center justify-between p-3 bg-card border rounded-xl hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <button 
                                                    className="p-0.5 hover:bg-muted rounded text-muted-foreground disabled:opacity-30" 
                                                    disabled={idx === 0}
                                                    onClick={() => handleFieldOrder(idx, 'up')}
                                                >
                                                    <ChevronUp className="h-3 w-3" />
                                                </button>
                                                <button 
                                                    className="p-0.5 hover:bg-muted rounded text-muted-foreground disabled:opacity-30" 
                                                    disabled={idx === filteredAndGroupedFields[groupName].length - 1}
                                                    onClick={() => handleFieldOrder(idx, 'down')}
                                                >
                                                    <ChevronDown className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{field.label}</span>
                                                    {!field.isCustom && <Badge variant="outline" className="text-[10px] h-4">System</Badge>}
                                                    {field.isRequired && <Badge variant="secondary" className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20">Required</Badge>}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-mono">{field.type}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-4 border-r pr-6 hidden sm:flex">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-xs text-muted-foreground">Active</Label>
                                                    <Switch 
                                                        size="sm"
                                                        checked={field.isActive} 
                                                        disabled={isUnchangeable || isProtectedDate}
                                                        onCheckedChange={() => handleFieldToggle(field.key, 'isActive')}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-xs text-muted-foreground">Req.</Label>
                                                    <Switch 
                                                        size="sm"
                                                        checked={field.isRequired} 
                                                        disabled={isUnchangeable}
                                                        onCheckedChange={() => handleFieldToggle(field.key, 'isRequired')}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFieldToEdit(field); setIsFieldDialogOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {field.isCustom && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently remove the "{field.label}" field and all its data from every task. This action cannot be undone.
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
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* People & Environments */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Resource Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card id="settings-people-management-devs">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                            Developers
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        <CardDescription>Assignees for dev work.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-2xl font-bold mb-1">{getDevelopers().length}</div>
                        <p className="text-xs text-muted-foreground">Configured developers</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="outline" className="w-full text-xs h-8" onClick={() => setPeopleManagerType('developer')}>Manage List</Button>
                    </CardFooter>
                </Card>

                <Card id="settings-people-management-testers">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                            Testers
                            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        <CardDescription>QA and verification team.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-2xl font-bold mb-1">{getTesters().length}</div>
                        <p className="text-xs text-muted-foreground">Configured testers</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="outline" className="w-full text-xs h-8" onClick={() => setPeopleManagerType('tester')}>Manage List</Button>
                    </CardFooter>
                </Card>

                <Card id="settings-environment-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                            Environments
                            <Rocket className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        <CardDescription>Deployment targets.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-2xl font-bold mb-1">{(uiConfig.environments || []).length}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {(uiConfig.environments || []).map(e => (
                                <Badge key={e.id} variant="outline" className="text-[10px] capitalize" style={{ borderColor: e.color, color: e.color }}>{e.name}</Badge>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="outline" className="w-full text-xs h-8" disabled>Coming Soon</Button>
                    </CardFooter>
                </Card>
            </div>
        </section>

        {/* Releases Management */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                Application Lifecycle
            </h2>
            <ReleaseManagementCard />
        </section>

        {/* Data Management */}
        <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-destructive flex items-center gap-2">
                <ShieldAlert className="h-6 w-6" />
                Danger Zone
            </h2>
            <Card className="border-destructive/20 bg-destructive/5 overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-destructive">Reset Data</CardTitle>
                    <CardDescription>
                        Clear all your tasks, logs, notes, and configurations. This will return TaskFlow to its default state.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl bg-background shadow-sm gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-bold">Clear all workspace data</p>
                            <p className="text-xs text-muted-foreground">This action is irreversible. All your data will be permanently deleted.</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                                    <Trash2 className="h-4 w-4 mr-2" /> Reset Workspace
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all your tasks, people, environments, and configurations.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearData} className="bg-destructive hover:bg-destructive/90">
                                        Yes, reset everything
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
        </section>
      </div>

      <PeopleManagerDialog 
        type={peopleManagerType === 'developer' ? 'developer' : 'tester'}
        isOpen={peopleManagerType !== null}
        onOpenChange={(open) => !open && setPeopleManagerType(null)}
        onSuccess={() => {}}
      />

      <EditFieldDialog 
        isOpen={isFieldDialogOpen}
        onOpenChange={setIsFieldDialogOpen}
        field={fieldToEdit}
        repositoryConfigs={uiConfig.repositoryConfigs || []}
        onSave={handleSaveField}
      />
    </div>
  );
}
