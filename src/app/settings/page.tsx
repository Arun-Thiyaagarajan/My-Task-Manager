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
    updateEnvironment,
    deleteEnvironment,
    updateCompany
} from '@/lib/data';
import type { UiConfig, FieldConfig, Person, RepositoryConfig, Environment, BackupFrequency, AuthMode } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    ChevronRight,
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
    X,
    Maximize2,
    Camera,
    Loader2,
    Lock,
    ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PeopleManagerDialog } from '@/components/people-manager-dialog';
import { EditFieldDialog } from '@/components/edit-field-dialog';
import { EditEnvironmentDialog } from '@/components/edit-environment-dialog';
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
import { cn, compressImage } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AuthModal } from '@/components/auth-modal';
import { ProfileImageCropper } from '@/components/profile-image-cropper';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirebase } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { userProfile } = useFirebase();
  const [uiConfig, setUiConfigState] = useState<UiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const [peopleManagerType, setPeopleManagerType] = useState<'developer' | 'tester' | null>(null);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Environment Management States
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [envToEdit, setEnvToEdit] = useState<Environment | null>(null);
  const [newEnvName, setNewEnvName] = useState('');

  // Mode change states
  const [isModeConfirmOpen, setIsModeConfirmOpen] = useState(false);
  const [pendingModeChange, setPendingModeChange] = useState<AuthMode | null>(null);

  // Form states for Display Settings
  const [appName, setAppName] = useState('');
  const [appIcon, setAppIcon] = useState('');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');

  // App Icon Editor states
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingIconImage, setPendingIconImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [originalIconImage, setOriginalIconImage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  const loadConfig = () => {
    const config = getUiConfig();
    setUiConfigState(config);
    setAppName(config?.appName || '');
    setAppIcon(config?.appIcon || '');
    setTimeFormat(config?.timeFormat || '12h');
    setIsLoading(false);
    document.title = `Settings | ${config?.appName || 'Task Manager'}`;
    window.dispatchEvent(new Event('navigation-end'));
  };

  useEffect(() => {
    loadConfig();
    window.addEventListener('company-changed', loadConfig);
    return () => window.removeEventListener('company-changed', loadConfig);
  }, []);

  const handleUpdateConfig = (updates: Partial<UiConfig>) => {
    if (!uiConfig) return;
    const newConfig = { ...uiConfig, ...updates };
    setUiConfigState(newConfig);
    setUiConfig(newConfig);
    window.dispatchEvent(new Event('config-changed'));
  };

  const handleSaveDisplaySettings = () => {
    const updates: Partial<UiConfig> = { appName, appIcon, timeFormat };
    
    // Manage previous icon history
    if (uiConfig?.appIcon && uiConfig.appIcon !== appIcon) {
        updates.previousAppIcon = uiConfig.appIcon;
    }

    handleUpdateConfig(updates);
    toast({ variant: 'success', title: 'Display settings saved.' });
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
      // Aggressive pre-compression for app icon
      const workingOriginal = await compressImage(rawDataUrl, 800, 0.75);
      setOriginalIconImage(workingOriginal);
      setPendingIconImage(workingOriginal);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setAppIcon(croppedImage);
    toast({ title: 'Photo ready', description: 'Click "Save Display Settings" to apply changes.' });
  };

  const handleRemoveIcon = () => {
    setAppIcon('');
    setOriginalIconImage(null);
    toast({ title: 'Icon removed', description: 'Click "Save Display Settings" to apply changes.' });
    setIsPreviewOpen(false);
  };

  const handleEditExistingIcon = () => {
    const imageToEdit = originalIconImage || (appIcon.startsWith('data:') ? appIcon : null);
    if (imageToEdit) {
        setPendingIconImage(imageToEdit);
        setIsPreviewOpen(false);
        setIsCropperOpen(true);
    }
  };

  const handleRestorePreviousIcon = () => {
      if (uiConfig?.previousAppIcon) {
          setAppIcon(uiConfig.previousAppIcon);
          toast({ title: 'Icon restored', description: 'Click "Save Display Settings" to apply.' });
          setIsPreviewOpen(false);
      }
  };

  const handleFieldToggle = (key: string, property: 'isActive' | 'isRequired') => {
    if (!uiConfig) return;
    const field = uiConfig.fields.find(f => f.key === key);
    if (!field) return;

    const newValue = !field[property];
    const newFields = (uiConfig.fields || []).map(f => {
        if (f.key === key) {
            const updated = { ...f, [property]: newValue };
            if (property === 'isRequired' && updated.isRequired) updated.isActive = true;
            return updated;
        }
        return f;
    });
    
    handleUpdateConfig({ fields: newFields });

    if (property === 'isActive') {
        toast({ 
            title: newValue ? 'Field Activated' : 'Field Deactivated', 
            description: newValue 
                ? `The "${field.label}" field is now visible in task forms.` 
                : `The "${field.label}" field has been hidden and removed from task forms.`
        });
    }
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

  // Environment Management Actions
  const handleAddEnv = () => {
    if (!newEnvName.trim()) return;
    addEnvironment({ name: newEnvName.trim(), color: '#3b82f6' });
    setNewEnvName('');
    toast({ variant: 'success', title: 'Environment added.' });
    loadConfig();
  };

  const handleSaveEnv = (id: string, data: { name: string, color: string }) => {
    try {
        updateEnvironment(id, data);
        toast({ variant: 'success', title: 'Environment Updated' });
        loadConfig();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Environment changes could not be saved. Please try again.' });
    }
  };

  const handleDeleteEnv = (id: string) => {
    if (deleteEnvironment(id)) {
        toast({ variant: 'success', title: 'Environment Deleted' });
        loadConfig();
    } else {
        toast({ variant: 'destructive', title: 'Deletion Blocked', description: 'Mandatory environments cannot be removed.' });
    }
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
            throw new Error("Invalid settings file format.");
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
            description: error.message || 'An error occurred while syncing. Please try again later.' 
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
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
        description: error.message || 'An error occurred while syncing. Please try again later.' 
      });
      setIsClearing(false);
    }
  };

  const handleInitiateModeChange = (mode: AuthMode) => {
    if (getAuthMode() === mode) return;
    
    if (mode === 'authenticate') {
        setIsAuthModalOpen(true);
    } else {
        setPendingModeChange(mode);
        setIsModeConfirmOpen(true);
    }
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
    return null;
  }

  const authMode = getAuthMode();
  const isDataURIIcon = appIcon && appIcon.startsWith('data:image');

  const handleBackToProfile = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push('/profile');
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div className="flex items-start gap-4">
            {isMobile && (
                <Button variant="ghost" size="icon" onClick={handleBackToProfile} className="h-10 w-10 -ml-2 rounded-full shrink-0">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
            )}
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Application Settings</h1>
                <p className="text-base text-muted-foreground mt-2 font-normal">Manage and customize fields and environments across your application.</p>
            </div>
        </div>
        <Button id="add-field-button" size="lg" className="h-12 px-6 font-medium shadow-sm w-full sm:w-auto" onClick={() => { setFieldToEdit(null); setIsFieldDialogOpen(true); }}>
            <PlusCircle className="h-5 w-5 mr-2" /> Add Field
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pb-20">
        {/* Storage Mode - Top on mobile, right sidebar on desktop */}
        <div className="order-1 lg:order-none lg:col-start-3 lg:row-start-1">
            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        STORAGE MODE
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">Select how your workspace data is managed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3">
                        <button 
                            onClick={() => handleInitiateModeChange('localStorage')}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                                authMode === 'localStorage' 
                                    ? "bg-primary/[0.03] border-primary shadow-[0_0_15px_-3px_rgba(61,90,254,0.2)]" 
                                    : "bg-background border-border hover:border-border/80"
                            )}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                authMode === 'localStorage' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                <Smartphone className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm tracking-tight">Local Storage</p>
                                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">Browser-based data. Fast & Offline.</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => handleInitiateModeChange('authenticate')}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                                authMode === 'authenticate' 
                                    ? "bg-primary/[0.03] border-primary shadow-[0_0_15px_-3px_rgba(61,90,254,0.2)]" 
                                    : "bg-background border-border hover:border-border/80"
                            )}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                authMode === 'authenticate' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                <Database className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm tracking-tight">Cloud Sync</p>
                                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">Real-time sync across all devices.</p>
                            </div>
                        </button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-dashed">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <Info className="h-3 w-3" />
                            Active Status
                        </div>
                        <p className="text-[11px] text-foreground/70 font-medium leading-relaxed mt-2">
                            {authMode === 'localStorage' 
                                ? "You are currently working offline. Data is stored strictly in this browser." 
                                : "Your data is currently syncing with the cloud. All changes are saved automatically."}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Main Content - Second on mobile, col 1-2 on desktop */}
        <div className="order-2 lg:order-none lg:col-span-2 lg:row-start-1 lg:row-span-10 space-y-8">
            <Card id="settings-field-config-card" className="border-none shadow-xl bg-card">
                <CardHeader className="pb-6">
                    <CardTitle className="text-xl font-semibold tracking-tight">Field Configuration</CardTitle>
                    <CardDescription className="text-sm font-normal">Edit, activate, or deactivate fields as needed.</CardDescription>
                    <div className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Search fields..." 
                                className="pl-10 h-12 text-base font-normal"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-10">
                    <div>
                        <h3 className="text-base font-semibold mb-6 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            Active Fields
                        </h3>
                        <div className="space-y-8">
                            {Object.entries(filteredAndGroupedFields.activeGroups).map(([groupName, fields]) => (
                                <div key={groupName} className="space-y-3">
                                    <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                                        {groupName}
                                        <div className="h-px bg-border flex-1" />
                                    </h4>
                                    <div className="grid gap-2">
                                        {fields.map(field => (
                                            <div key={field.id} className="flex items-center justify-between p-4 bg-muted/20 border rounded-xl hover:bg-muted/40 transition-all group border-transparent hover:border-border">
                                                <div className="flex items-center gap-4">
                                                    <GripVertical className="h-5 w-5 text-muted-foreground/30 cursor-grab active:cursor-grabbing" />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-medium text-base tracking-tight truncate">{field.label} {field.isRequired && <span className="text-destructive font-bold">*</span>}</span>
                                                            <Badge variant="outline" className="text-[9px] uppercase font-medium px-1.5 h-4 bg-background shrink-0">{field.type}</Badge>
                                                        </div>
                                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{field.group}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm" onClick={() => { setFieldToEdit(field); setIsFieldDialogOpen(true); }}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        {!['title', 'description', 'status', 'repositories'].includes(field.key) && (
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleFieldToggle(field.key, 'isActive')}>
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

                    <div className="pt-8 border-t">
                        <h3 className="text-base font-semibold mb-6 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                            Inactive Fields
                        </h3>
                        {filteredAndGroupedFields.inactiveFields.length > 0 ? (
                            <div className="grid gap-2">
                                {filteredAndGroupedFields.inactiveFields.map(field => (
                                    <div key={field.id} className="flex items-center justify-between p-4 bg-muted/5 border border-dashed rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                        <span className="text-base font-normal tracking-tight truncate pr-4">{field.label}</span>
                                        <Button variant="outline" size="sm" className="h-9 px-4 font-medium shrink-0 shadow-sm" onClick={() => handleFieldToggle(field.key, 'isActive')}>
                                            <Check className="h-4 w-4 mr-2" /> Activate
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-muted/5 rounded-xl border border-dashed">
                                <p className="text-sm text-muted-foreground font-normal">No inactive fields match your search.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Remaining Sidebar - Third on mobile, below Storage Mode on desktop */}
        <div className="order-3 lg:order-none lg:col-start-3 lg:row-start-2 space-y-6">
            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <Globe className="h-5 w-5 text-primary" />
                        Appearance
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">Custom branding and date formatting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Workspace Name</Label>
                        <Input value={appName} onChange={e => setAppName(e.target.value)} className="h-10 font-medium" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Workspace Icon</Label>
                        <div className="flex gap-2">
                            <Input 
                                value={isDataURIIcon ? '' : (appIcon || '')} 
                                onChange={e => setAppIcon(e.target.value)} 
                                placeholder={isDataURIIcon ? "Custom image uploaded" : "Emoji or URL..."} 
                                className="h-10 flex-1 font-normal" 
                            />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-10 w-10 shrink-0 border-dashed shadow-sm" 
                                            onClick={() => iconFileInputRef.current?.click()}
                                            type="button"
                                        >
                                            <Upload className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Upload Brand Icon</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <input type="file" ref={iconFileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" />
                        </div>
                    </div>

                    {uiConfig.previousAppIcon && (
                        <div className="p-3 rounded-xl border border-dashed bg-muted/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <History className="h-3 w-3" />
                                    Previously Used
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold px-2 rounded-full" onClick={handleRestorePreviousIcon}>
                                    <RotateCcw className="h-3 w-3 mr-1" /> Reuse
                                </Button>
                            </div>
                            <div className="flex justify-center">
                                <button 
                                    onClick={handleRestorePreviousIcon}
                                    className="h-12 w-12 border rounded-xl flex items-center justify-center bg-background text-xl overflow-hidden shadow-sm hover:ring-4 hover:ring-primary/5 transition-all group"
                                >
                                    {uiConfig.previousAppIcon.startsWith('data:image') ? (
                                        <img src={uiConfig.previousAppIcon} alt="Previous" className="h-full w-full object-contain group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <span className="group-hover:scale-110 transition-transform">{uiConfig.previousAppIcon}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Time Display</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setTimeFormat('12h')} className={cn("flex items-center justify-center p-2.5 border rounded-xl gap-2 transition-all", timeFormat === '12h' ? "bg-primary/10 border-primary text-primary font-medium shadow-sm" : "hover:bg-muted text-muted-foreground font-normal")}>
                                <Clock className="h-4 w-4" /><span className="text-xs">12-hour</span>
                            </button>
                            <button onClick={() => setTimeFormat('24h')} className={cn("flex items-center justify-center p-2.5 border rounded-xl gap-2 transition-all", timeFormat === '24h' ? "bg-primary/10 border-primary text-primary font-medium shadow-sm" : "hover:bg-muted text-muted-foreground font-normal")}>
                                <RotateCcw className="h-4 w-4" /><span className="text-xs">24-hour</span>
                            </button>
                        </div>
                    </div>
                    <Button onClick={handleSaveDisplaySettings} className="w-full h-11 font-medium shadow-md">Save Display Settings</Button>
                </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <Bell className="h-5 w-5 text-primary" />
                        Features
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">Toggle optional workspace modules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-border transition-colors">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold tracking-tight">Task Reminders</Label>
                            <p className="text-[10px] font-normal text-muted-foreground uppercase">Contextual notes on tasks.</p>
                        </div>
                        <Switch 
                            checked={uiConfig.remindersEnabled} 
                            onCheckedChange={(checked) => handleUpdateConfig({ remindersEnabled: checked })} 
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-border transition-colors">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold tracking-tight">Guided Tour</Label>
                            <p className="text-[10px] font-normal text-muted-foreground uppercase">Interactive tutorial mode.</p>
                        </div>
                        <Switch 
                            checked={uiConfig.tutorialEnabled} 
                            onCheckedChange={(checked) => handleUpdateConfig({ tutorialEnabled: checked })} 
                        />
                    </div>
                </CardContent>
            </Card>

            <ReleaseManagementCard />

            <Card id="settings-environment-card" className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <Rocket className="h-5 w-5 text-primary" />
                        Environments
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">Manage your deployment pipeline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        {(uiConfig.environments || []).map(env => {
                            if (!env || !env.name) return null;
                            const isMandatory = env.isMandatory || ['dev', 'production'].includes(env.name.toLowerCase());
                            return (
                                <div key={env.id} className="flex items-center justify-between p-2.5 border rounded-xl bg-muted/20 group hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-3 w-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: env.color }} />
                                        <span className="capitalize font-medium text-sm truncate">{env.name}</span>
                                        {isMandatory && <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7"
                                            onClick={() => { setEnvToEdit(env); setIsEnvDialogOpen(true); }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {!isMandatory && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Environment?</AlertDialogTitle>
                                                        <AlertDialogDescription className="font-normal">
                                                            This will permanently remove the "**${env.name}**" environment and all associated deployment data from tasks. This cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEnv(env.id)} className="bg-destructive hover:bg-destructive/90 font-semibold">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex gap-2">
                        <Input placeholder="New environment..." className="h-10 text-xs font-normal" value={newEnvName} onChange={e => setNewEnvName(e.target.value)} />
                        <Button size="sm" className="h-10 px-4 font-medium shrink-0 shadow-sm" onClick={handleAddEnv}>Add</Button>
                    </div>
                </CardContent>
            </Card>

            <Card id="settings-people-management" className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <Users className="h-5 w-5 text-primary" />
                        Team
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">Manage developers and QA staff.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full h-10 text-xs font-medium justify-between px-4 rounded-xl shadow-sm" onClick={() => setPeopleManagerType('developer')}>
                        Manage Developers <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button variant="outline" className="w-full h-10 text-xs font-medium justify-between px-4 rounded-xl shadow-sm" onClick={() => setPeopleManagerType('tester')}>
                        Manage Testers <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-2 border-destructive/20 shadow-lg bg-destructive/[0.02]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-destructive uppercase tracking-wider">
                        <Database className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription className="text-xs font-normal">Irreversible workspace operations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full h-10 text-xs font-medium justify-start px-4 rounded-xl shadow-sm" onClick={handleExportSettings}>
                        <Download className="h-4 w-4 mr-3 text-muted-foreground" /> Export All Settings
                    </Button>
                    <Button variant="outline" className="w-full h-10 text-xs font-medium justify-start px-4 rounded-xl shadow-sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-3 text-muted-foreground" /> Import Configuration
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleImportSettings} className="hidden" accept=".json" />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full h-10 text-xs font-semibold justify-start px-4 rounded-xl bg-destructive hover:bg-destructive/90 shadow-lg">
                                <Trash2 className="h-4 w-4 mr-3" /> Clear All Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-semibold tracking-tight">Clear all data?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-normal">
                                    This will permanently delete all your tasks, notes, and settings. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-3 mt-4">
                                <AlertDialogCancel className="rounded-xl font-medium" disabled={isClearing}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90 rounded-xl font-semibold px-6" disabled={isClearing}>
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

      <EditEnvironmentDialog
        isOpen={isEnvDialogOpen}
        onOpenChange={setIsEnvDialogOpen}
        environment={envToEdit}
        onSave={handleSaveEnv}
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        onSuccess={() => {
            setAuthMode('authenticate');
            window.dispatchEvent(new Event('company-changed'));
            toast({ variant: 'success', title: 'Switched to Authenticate Mode' });
        }}
      />

      <ProfileImageCropper 
        isOpen={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={pendingIconImage}
        onCropComplete={handleCropComplete}
      />

      <ImagePreviewDialog 
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        imageUrl={appIcon}
        imageName="App Icon Preview"
        isProfilePreview
        onEdit={handleEditExistingIcon}
        onChange={() => { setIsPreviewOpen(false); iconFileInputRef.current?.click(); }}
        onRemove={handleRemoveIcon}
        previousImageUrl={uiConfig.previousAppIcon}
        onRestore={handleRestorePreviousIcon}
      />

      <AlertDialog open={isModeConfirmOpen} onOpenChange={setIsModeConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-semibold tracking-tight">Change Storage Mode?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-normal">
                    {pendingModeChange === 'authenticate' 
                        ? "Switch to Cloud synchronization? You will need to sign in."
                        : "Switch to Local Storage? Cloud synchronization will be disabled."}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-3">
                <AlertDialogCancel className="rounded-xl font-medium" onClick={() => setPendingModeChange(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl font-semibold px-6" onClick={handleConfirmModeChange}>Confirm Change</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}