'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getUiConfig, 
    setUiConfig, 
    clearAllData, 
    getDevelopers, 
    getTesters,
    getAuthMode,
    setAuthMode,
    addLog,
    addEnvironment,
    updateCompany
} from '@/lib/data';
import type { UiConfig, FieldConfig, Person, RepositoryConfig, Environment, BackupFrequency, AuthMode } from '@/lib/types';
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
    RotateCcw,
    Smartphone,
    Database,
    ShieldCheck,
    GripVertical,
    Check,
    Upload,
    Download,
    PlusCircle,
    Info,
    X
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AuthModal } from '@/components/auth-modal';

export default function SettingsPage() {
  const [uiConfig, setUiConfigState] = useState<UiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const [peopleManagerType, setPeopleManagerType] = useState<'developer' | 'tester' | null>(null);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Mode change states
  const [isModeConfirmOpen, setIsModeConfirmOpen] = useState(false);
  const [pendingModeChange, setPendingModeChange] = useState<AuthMode | null>(null);

  // Form states for Display Settings
  const [appName, setAppName] = useState('');
  const [appIcon, setAppIcon] = useState('');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');

  // Environment state
  const [newEnvName, setNewEnvName] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const config = getUiConfig();
    setUiConfigState(config);
    setAppName(config?.appName || '');
    setAppIcon(config?.appIcon || '');
    setTimeFormat(config?.timeFormat || '12h');
    setIsLoading(false);
    document.title = `Settings | ${config?.appName || 'Task Manager'}`;
  }, []);

  const handleUpdateConfig = (updates: Partial<UiConfig>) => {
    if (!uiConfig) return;
    const newConfig = { ...uiConfig, ...updates };
    setUiConfigState(newConfig);
    setUiConfig(newConfig);
    window.dispatchEvent(new Event('config-changed'));
  };

  const handleSaveDisplaySettings = () => {
    handleUpdateConfig({ appName, appIcon, timeFormat });
    toast({ variant: 'success', title: 'Display settings saved.' });
  };

  const compressImage = (dataUrl: string, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    });
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      const compressed = await compressImage(rawDataUrl, 128, 0.8);
      setAppIcon(compressed);
      toast({ title: 'Icon uploaded', description: 'Click "Save Display Settings" to apply.' });
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleSaveFeatureSettings = (updates: Partial<UiConfig>) => {
    handleUpdateConfig(updates);
    toast({ variant: 'success', title: 'Features updated.' });
  };

  const handleFieldToggle = (key: string, property: 'isActive' | 'isRequired') => {
    if (!uiConfig) return;
    const newFields = (uiConfig.fields || []).map(f => {
        if (f.key === key) {
            const updated = { ...f, [property]: !f[property] };
            if (property === 'isRequired' && updated.isRequired) updated.isActive = true;
            return updated;
        }
        return f;
    });
    handleUpdateConfig({ fields: newFields });
  };

  const handleSaveField = (updatedField: FieldConfig, repoConfigs?: RepositoryConfig[]) => {
    if (!uiConfig) return;
    let newFields = [...(uiConfig.fields || [])];
    const index = newFields.findIndex(f => f.id === updatedField.id);
    if (index !== -1) {
        newFields[index] = updatedField;
    } else {
        const key = updatedField.label.toLowerCase().replace(/\s+/g, '_');
        updatedField.key = key;
        updatedField.order = newFields.length;
        newFields.push(updatedField);
    }
    const updates: Partial<UiConfig> = { fields: newFields };
    if (repoConfigs) updates.repositoryConfigs = repoConfigs;
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

  const handleAddEnv = () => {
    if (!newEnvName.trim()) return;
    addEnvironment({ name: newEnvName.trim(), color: '#3b82f6' });
    setNewEnvName('');
    toast({ variant: 'success', title: 'Environment added.' });
  };

  const handleExportSettings = () => {
    if (!uiConfig) return;
    const fileName = `${uiConfig.appName?.replace(/\s+/g, '_') || 'TaskFlow'}_Settings_${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(uiConfig, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = fileName;
    link.click();
    toast({ variant: 'success', title: 'Settings Exported' });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedConfig = JSON.parse(text);
        
        if (typeof importedConfig !== 'object' || importedConfig === null || !Array.isArray(importedConfig.fields)) {
            throw new Error("Invalid settings file format. Please provide a valid TaskFlow settings JSON.");
        }

        setUiConfigState(importedConfig);
        setUiConfig(importedConfig);
        window.dispatchEvent(new Event('config-changed'));
        
        toast({ 
            variant: 'success', 
            title: 'Settings Imported', 
            description: 'Your application configuration has been updated.' 
        });
      } catch (error: any) {
        toast({ 
            variant: 'destructive', 
            title: 'Import Failed', 
            description: error.message || 'There was an error parsing the file.' 
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    setIsClearing(true);
    const mode = getAuthMode();
    try {
      await clearAllData();
      toast({ 
        variant: 'success', 
        title: mode === 'authenticate' ? 'Cloud Data Cleared' : 'Local Data Cleared', 
        description: 'Your workspace has been successfully reset.' 
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Clear Data Failed', 
        description: error.message || 'An unexpected error occurred while clearing your data. Please try again.' 
      });
      setIsClearing(false);
    }
  };

  const handleInitiateModeChange = (mode: AuthMode) => {
    if (getAuthMode() === mode) return;
    setPendingModeChange(mode);
    setIsModeConfirmOpen(true);
  };

  const handleConfirmModeChange = () => {
    if (!pendingModeChange) return;
    
    if (pendingModeChange === 'authenticate') {
        setIsAuthModalOpen(true);
    } else {
        setAuthMode('localStorage');
        window.dispatchEvent(new Event('company-changed'));
        toast({ variant: 'success', title: 'Switched to Local Storage', description: 'Cloud synchronization has been disabled.' });
    }
    
    setIsModeConfirmOpen(false);
    setPendingModeChange(null);
  };

  const filteredAndGroupedFields = useMemo(() => {
    if (!uiConfig || !uiConfig.fields) return { activeGroups: {}, inactiveFields: [] };
    
    const queryStr = searchQuery.toLowerCase();
    const allFields = uiConfig.fields.filter(f => 
        f.label.toLowerCase().includes(queryStr) || 
        (f.group && f.group.toLowerCase().includes(queryStr))
    );

    const activeGroups: Record<string, FieldConfig[]> = {};
    allFields.filter(f => f.isActive).forEach(f => {
        const g = f.group || 'Other';
        if (!activeGroups[g]) activeGroups[g] = [];
        activeGroups[g].push(f);
    });

    const inactiveFields = allFields.filter(f => !f.isActive);

    return { activeGroups, inactiveFields };
  }, [uiConfig, searchQuery]);

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  const authMode = getAuthMode();

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Application Settings</h1>
            <p className="text-muted-foreground mt-1">Manage and customize fields and environments across your application.</p>
        </div>
        <Button onClick={() => { setFieldToEdit(null); setIsFieldDialogOpen(true); }}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Field
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Field Configuration */}
        <div className="lg:col-span-2 space-y-8">
            <Card id="settings-field-config-card">
                <CardHeader>
                    <CardTitle className="text-2xl">Field Configuration</CardTitle>
                    <CardDescription>Drag active fields to reorder them. Edit, activate, or deactivate fields as needed.</CardDescription>
                    <div className="pt-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search fields by label or group..." 
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-bold mb-4">Active Fields</h3>
                        <div className="space-y-6">
                            {Object.entries(filteredAndGroupedFields.activeGroups).map(([groupName, fields]) => (
                                <div key={groupName} className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">{groupName}</h4>
                                    <div className="space-y-2">
                                        {fields.map(field => (
                                            <div key={field.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg hover:bg-muted/40 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm">{field.label} {field.isRequired && <span className="text-destructive">*</span>}</span>
                                                            <Badge variant="outline" className="text-[10px] uppercase font-mono">{field.type}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">{field.group}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFieldToEdit(field); setIsFieldDialogOpen(true); }}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {!['title', 'description', 'status', 'repositories'].includes(field.key) && (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleFieldToggle(field.key, 'isActive')}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-bold mb-4">Inactive Fields</h3>
                        {filteredAndGroupedFields.inactiveFields.length > 0 ? (
                            <div className="space-y-2">
                                {filteredAndGroupedFields.inactiveFields.map(field => (
                                    <div key={field.id} className="flex items-center justify-between p-3 bg-muted/10 border border-dashed rounded-lg opacity-60">
                                        <span className="text-sm font-medium">{field.label}</span>
                                        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleFieldToggle(field.key, 'isActive')}>
                                            <Check className="h-4 w-4 mr-2" /> Activate
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">No inactive fields match your search.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Sidebar Cards */}
        <div className="space-y-6">
            {/* Authentication Mode */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Authentication Mode
                    </CardTitle>
                    <CardDescription>Select how your data is managed and stored.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <button 
                        onClick={() => handleInitiateModeChange('localStorage')}
                        className={cn(
                            "w-full text-left p-3 border rounded-xl transition-all",
                            authMode === 'localStorage' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Smartphone className={cn("h-5 w-5 mt-0.5", authMode === 'localStorage' ? "text-primary" : "text-muted-foreground")} />
                            <div>
                                <p className="text-sm font-bold">Local Storage</p>
                                <p className="text-[11px] text-muted-foreground">Data is stored only in your browser. Fastest mode, no login required.</p>
                            </div>
                        </div>
                    </button>
                    <button 
                        onClick={() => handleInitiateModeChange('authenticate')}
                        className={cn(
                            "w-full text-left p-3 border rounded-xl transition-all",
                            authMode === 'authenticate' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Database className={cn("h-5 w-5 mt-0.5", authMode === 'authenticate' ? "text-primary" : "text-muted-foreground")} />
                            <div>
                                <p className="text-sm font-bold">Authenticate Mode</p>
                                <p className="text-[11px] text-muted-foreground">Securely sync your data across devices using cloud authentication.</p>
                            </div>
                        </div>
                    </button>
                </CardContent>
            </Card>

            {/* Display Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Display Settings
                    </CardTitle>
                    <CardDescription>Customize your application's appearance and formatting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs">App Name</Label>
                        <Input value={appName} onChange={e => setAppName(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">App Icon</Label>
                        <div className="flex gap-2">
                            <Input 
                                value={appIcon.startsWith('data:image') ? '[Image Data]' : appIcon} 
                                onChange={e => setAppIcon(e.target.value)} 
                                placeholder="Paste emoji or URL..." 
                                className="h-9 flex-1" 
                            />
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 shrink-0" 
                                onClick={() => iconFileInputRef.current?.click()}
                                type="button"
                            >
                                <Upload className="h-4 w-4" />
                            </Button>
                            <div className="h-9 w-9 border rounded-md flex items-center justify-center bg-muted text-lg overflow-hidden shrink-0">
                                {appIcon && appIcon.startsWith('data:image') ? (
                                    <img src={appIcon} alt="Icon" className="h-full w-full object-contain" />
                                ) : (
                                    appIcon || '📋'
                                )}
                            </div>
                            <input type="file" ref={iconFileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Time Format</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setTimeFormat('12h')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 border rounded-lg text-center gap-1 transition-all",
                                    timeFormat === '12h' ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"
                                )}
                            >
                                <Clock className="h-4 w-4" />
                                <span className="text-[10px] font-bold">12-hour</span>
                                <span className="text-[8px] opacity-60">(e.g. 4:30 PM)</span>
                            </button>
                            <button 
                                onClick={() => setTimeFormat('24h')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 border rounded-lg text-center gap-1 transition-all",
                                    timeFormat === '24h' ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"
                                )}
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span className="text-[10px] font-bold">24-hour</span>
                                <span className="text-[8px] opacity-60">(e.g. 16:30)</span>
                            </button>
                        </div>
                    </div>
                    <Button onClick={handleSaveDisplaySettings} className="w-full h-9">Save Display Settings</Button>
                </CardContent>
            </Card>

            {/* Release Management */}
            <Card>
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" />
                            Release Management
                        </CardTitle>
                        <CardDescription>Manage application updates.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        {uiConfig.currentVersion && (
                            <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Rocket className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-xs font-bold">v{uiConfig.currentVersion}</p>
                                        <p className="text-[10px] text-muted-foreground">Productivity Boost</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-[8px] bg-primary/10 text-primary">Published</Badge>
                            </div>
                        )}
                    </div>
                    <Button asChild variant="outline" className="w-full h-9 text-xs">
                        <a href="/releases">View Full History</a>
                    </Button>
                </CardContent>
            </Card>

            {/* Feature Management */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Cog className="h-4 w-4 text-primary" />
                        Feature Management
                    </CardTitle>
                    <CardDescription>Enable or disable optional features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-xs">Task Reminders</Label>
                            <p className="text-[10px] text-muted-foreground">Allow users to set pin-able notes.</p>
                        </div>
                        <Switch 
                            checked={uiConfig.remindersEnabled} 
                            onCheckedChange={v => handleSaveFeatureSettings({ remindersEnabled: v })} 
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-xs">Show Tutorial</Label>
                            <p className="text-[10px] text-muted-foreground">Enable the guided tour feature.</p>
                        </div>
                        <Switch 
                            checked={uiConfig.tutorialEnabled} 
                            onCheckedChange={v => handleSaveFeatureSettings({ tutorialEnabled: v })} 
                        />
                    </div>
                    <div className="space-y-2 border-t pt-3">
                        <div className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Automatic Backup</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={uiConfig.autoBackupFrequency} onValueChange={v => handleSaveFeatureSettings({ autoBackupFrequency: v as BackupFrequency })}>
                                <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="off">Off</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={String(uiConfig.autoBackupTime)} onValueChange={v => handleSaveFeatureSettings({ autoBackupTime: parseInt(v) })}>
                                <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <SelectItem key={i} value={String(i)}>{i}:00</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Environment Management */}
            <Card id="settings-environment-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-primary" />
                        Environment Management
                    </CardTitle>
                    <CardDescription>Add or rename deployment environments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        {(uiConfig.environments || []).map(env => (
                            <div key={env.id} className="flex items-center gap-3 p-2 border rounded-lg bg-muted/20">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color }} />
                                <span className="text-sm font-medium flex-1">{env.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="New environment name..." 
                            className="h-9 text-xs" 
                            value={newEnvName}
                            onChange={e => setNewEnvName(e.target.value)}
                        />
                        <Button size="sm" className="h-9" onClick={handleAddEnv}>Add</Button>
                    </div>
                </CardContent>
            </Card>

            {/* People Management */}
            <Card id="settings-people-management-dev">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Developer Management
                        </CardTitle>
                        <span className="text-xs font-bold text-muted-foreground">{getDevelopers().length}</span>
                    </div>
                    <CardDescription>Manage your list of developers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setPeopleManagerType('developer')}>Manage Developers</Button>
                </CardContent>
            </Card>

            <Card id="settings-people-management-tester">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            Tester Management
                        </CardTitle>
                        <span className="text-xs font-bold text-muted-foreground">{getTesters().length}</span>
                    </div>
                    <CardDescription>Manage your list of testers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setPeopleManagerType('tester')}>Manage Testers</Button>
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="border-destructive/20">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <Database className="h-4 w-4" />
                        Data Management
                    </CardTitle>
                    <CardDescription>Export, import, or clear workspace data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full h-9 text-xs justify-start px-3" onClick={handleExportSettings}>
                        <Download className="h-3.5 w-3.5 mr-3" /> Export Settings
                    </Button>
                    <Button variant="outline" className="w-full h-9 text-xs justify-start px-3" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-3" /> Import Settings
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleImportSettings} className="hidden" accept=".json" />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full h-9 text-xs justify-start px-3 bg-destructive hover:bg-destructive/90">
                                <Trash2 className="h-3.5 w-3.5 mr-3" /> Clear All {authMode === 'authenticate' ? 'Cloud' : 'Local'} Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear all workspace data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {authMode === 'authenticate' 
                                        ? "This will permanently delete all Tasks, Notes, People, and Settings from your cloud workspace. This action cannot be undone."
                                        : "This will wipe all Tasks, Notes, People, and Settings from this browser's local storage. This action cannot be undone."}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearData} className="bg-destructive hover:bg-destructive/90" disabled={isClearing}>
                                    {isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Clear Data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
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

      <AuthModal 
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        onSuccess={() => {
            setAuthMode('authenticate');
            window.dispatchEvent(new Event('company-changed'));
            toast({ variant: 'success', title: 'Switched to Authenticate Mode', description: 'Your data will now sync with the cloud.' });
        }}
      />

      {/* Mode Change Confirmation Dialog */}
      <AlertDialog open={isModeConfirmOpen} onOpenChange={setIsModeConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Change Storage Mode?</AlertDialogTitle>
                <AlertDialogDescription>
                    {pendingModeChange === 'authenticate' 
                        ? "You are about to switch to Authenticate Mode. This will enable cloud synchronization, but you will need to sign in to access your data."
                        : "You are about to switch to Local Storage. Cloud synchronization will be disabled, and data will only be stored in this browser."}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPendingModeChange(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmModeChange} className="bg-primary">
                    Confirm Switch
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
