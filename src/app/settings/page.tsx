
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
    updateCompany,
    getTasksUsingField
} from '@/lib/data';
import type { Task, UiConfig, FieldConfig, Person, RepositoryConfig, Environment, BackupFrequency, AuthMode } from '@/lib/types';
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
    ArrowLeft,
    Sun,
    Moon,
    Monitor,
    AlertCircle,
    DownloadCloud,
    CheckCircle2,
    Share,
    PlusSquare,
    MoreVertical,
    Eraser,
    Palette,
    Sparkles
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PeopleManagementContent } from '@/components/people-management-content';
import { useTheme } from 'next-themes';
import { FieldFormContent } from '@/components/field-form-content';
import { EnvironmentFormContent } from '@/components/environment-form-content';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SettingsPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile } = useFirebase();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [uiConfig, setUiConfigState] = useState<UiConfig | null>(null);
  const [localFields, setLocalFields] = useState<FieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  // Mobile Nav States
  const [activeMobileSection, setActiveMobileSection] = useState<string | null>(null);

  const [peopleManagerType, setPeopleManagerType] = useState<'developer' | 'tester' | null>(null);
  const [fieldToEdit, setFieldToEdit] = useState<FieldConfig | null>(null);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Deletion logic states
  const [fieldAttemptingDelete, setFieldAttemptingDelete] = useState<FieldConfig | null>(null);
  const [tasksUsingField, setTasksUsingField] = useState<Task[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Deactivation confirmation states
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [pendingDeactivateFields, setPendingDeactivateFields] = useState<FieldConfig[]>([]);

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

  // Install State
  const [installStatus, setInstallStatus] = useState<'installed' | 'not-installed' | 'checking'>('checking');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    // Detect install status
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setInstallStatus(isStandalone ? 'installed' : 'not-installed');

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setPlatform('ios');
    else if (/android/.test(userAgent)) setPlatform('android');
    else setPlatform('desktop');
  }, []);

  const loadConfig = () => {
    const config = getUiConfig();
    setUiConfigState(config);
    setLocalFields(config?.fields || []);
    setAppName(config?.appName || '');
    setAppIcon(config?.appIcon || '');
    setTimeFormat(config?.timeFormat || '12h');
    setIsLoading(false);
    document.title = `Settings | ${config?.appName || 'Task Manager'}`;
    
    const section = searchParams.get('section');
    if (section) setActiveMobileSection(section);
    
    window.dispatchEvent(new Event('navigation-end'));
  };

  useEffect(() => {
    loadConfig();
    window.addEventListener('company-changed', loadConfig);
    return () => window.removeEventListener('company-changed', loadConfig);
  }, [searchParams]);

  const handleUpdateConfig = (updates: Partial<UiConfig>) => {
    if (!uiConfig) return;
    const newConfig = { ...uiConfig, ...updates };
    setUiConfigState(newConfig);
    setUiConfig(newConfig);
    window.dispatchEvent(new Event('config-changed'));
  };

  const handleSaveDisplaySettings = () => {
    const updates: Partial<UiConfig> = { appName, appIcon, timeFormat };
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

  // Field Management Logic (Now Local-Only until saved)
  const handleFieldToggleLocal = (key: string, property: 'isActive' | 'isRequired') => {
    const updatedFields = localFields.map(f => {
        if (f.key === key) {
            const updated = { ...f, [property]: !f[property] };
            if (property === 'isRequired' && updated.isRequired) updated.isActive = true;
            return updated;
        }
        return f;
    });
    setLocalFields(updatedFields);
  };

  const handleRequestDeleteField = (field: FieldConfig) => {
    const inUse = getTasksUsingField(field.key);
    if (inUse.length > 0) {
        setTasksUsingField(inUse);
        setFieldAttemptingDelete(field);
        return;
    }
    setFieldAttemptingDelete(field);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteLocal = () => {
    if (!fieldAttemptingDelete) return;
    const updatedFields = localFields.filter(f => f.id !== fieldAttemptingDelete.id);
    setLocalFields(updatedFields);
    setIsDeleteConfirmOpen(false);
    setFieldAttemptingDelete(null);
    toast({ title: 'Field marked for deletion', description: 'Click "Save Changes" to finalize.' });
  };

  const handleSaveFields = () => {
    const currentlyActive = uiConfig?.fields.filter(f => f.isActive).map(f => f.key) || [];
    const deactivating = localFields.filter(f => !f.isActive && currentlyActive.includes(f.key));
    
    if (deactivating.length > 0) {
        setPendingDeactivateFields(deactivating);
        setIsDeactivateConfirmOpen(true);
        return;
    }
    
    performSaveFields();
  };

  const performSaveFields = () => {
    handleUpdateConfig({ fields: localFields });
    toast({ variant: 'success', title: 'Field configuration saved successfully.' });
    setIsDeactivateConfirmOpen(false);
    setPendingDeactivateFields([]);
    if (isMobile) setActiveMobileSection('fields');
  };

  const hasUnsavedFieldChanges = useMemo(() => {
    return JSON.stringify(localFields) !== JSON.stringify(uiConfig?.fields || []);
  }, [localFields, uiConfig]);

  const handleSaveField = (updatedField: FieldConfig, repoConfigs?: RepositoryConfig[]) => {
    let newFields = [...localFields];
    const index = newFields.findIndex(f => f.id === updatedField.id);
    if (index !== -1) {
        newFields[index] = updatedField;
    } else {
        const key = updatedField.label.toLowerCase().replace(/\s+/g, '_');
        updatedField.key = key;
        updatedField.order = newFields.length;
        newFields.push(updatedField);
    }
    setLocalFields(newFields);
    if (repoConfigs) handleUpdateConfig({ repositoryConfigs: repoConfigs });
    
    if (isMobile) setActiveMobileSection('fields');
  };

  // Environment Management
  const handleAddEnv = () => {
    if (!newEnvName.trim()) return;
    addEnvironment({ name: newEnvName.trim(), color: '#3b82f6' });
    setNewEnvName('');
    toast({ variant: 'success', title: 'Environment added.' });
    loadConfig();
  };

  const handleSaveEnv = (id: string, data: { name: string, color: string }) => {
    updateEnvironment(id, data);
    toast({ variant: 'success', title: 'Environment Updated' });
    loadConfig();
    if (isMobile) setActiveMobileSection('environments');
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

    if (!file.name.toLowerCase().endsWith('.json')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid .json file for configuration.'
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

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
        toast({ variant: 'success', title: 'Settings Imported' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'An error occurred.' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      toast({ variant: 'success', title: 'Workspace Reset' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: error.message });
      setIsClearing(false);
    }
  };

  const handleInitiateModeChange = (mode: AuthMode) => {
    if (getAuthMode() === mode) return;
    if (mode === 'authenticate') setIsAuthModalOpen(true);
    else { setPendingModeChange(mode); setIsModeConfirmOpen(true); }
  };

  const handleConfirmModeChange = () => {
    if (!pendingModeChange) return;
    if (pendingModeChange === 'authenticate') setIsAuthModalOpen(true);
    else { setAuthMode('localStorage'); window.dispatchEvent(new Event('company-changed')); }
    setIsModeConfirmOpen(false);
    setPendingModeChange(null);
  };

  const filteredAndGroupedFields = useMemo(() => {
    const queryStr = searchQuery.toLowerCase();
    const allFields = localFields.filter(f => 
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
  }, [localFields, searchQuery]);

  if (!mounted || isLoading || !uiConfig) return <div className="container mx-auto pt-10 pb-6 px-4"><LoadingSpinner /></div>;

  const authMode = getAuthMode();
  const isAdmin = authMode === 'authenticate' && userProfile?.role === 'admin';
  const isDataURIIcon = appIcon && appIcon.startsWith('data:image');

  const handleBackToProfile = () => {
    window.dispatchEvent(new Event('navigation-end'));
    router.push('/profile');
  };

  const MobileHubRow = ({ icon: Icon, title, subLabel, onClick, color = 'text-muted-foreground' }: { icon: any, title: string, subLabel: string, onClick?: () => void, color?: string }) => (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-4 px-4 hover:bg-muted/50 active:bg-muted transition-colors border-b last:border-0 text-left group">
        <div className={cn("shrink-0", color)}><Icon className="h-6 w-6" /></div>
        <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{subLabel}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-active:text-primary" />
    </button>
  );

  const MobileSectionHeader = ({ title }: { title: string }) => (
    <div className="px-4 pt-6 pb-2"><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{title}</h3></div>
  );

  // SHARED DIALOGS
  const sharedDialogs = (
    <>
        <Dialog open={tasksUsingField.length > 0} onOpenChange={(open) => !open && setTasksUsingField([])}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl flex flex-col max-h-[90vh]">
                <div className="p-6 pb-0 flex-shrink-0">
                    <DialogHeader>
                        <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <DialogTitle className="text-center text-xl">Field Deletion Blocked</DialogTitle>
                        <DialogDescription className="text-center text-base">
                            The field <strong>{fieldAttemptingDelete?.label}</strong> is currently used in <strong>{tasksUsingField.length}</strong> task(s).
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 overflow-hidden px-6 py-4">
                    <div className="h-full border rounded-2xl bg-muted/20 overflow-hidden">
                        <ScrollArea className="h-full">
                            <ul className="divide-y divide-border/50">
                                {tasksUsingField.map(task => (
                                    <li key={task.id} className="text-sm py-3 px-4 flex items-center justify-between gap-4 bg-background/50">
                                        <span className="truncate font-semibold">{task.title}</span>
                                        {task.deletedAt && <Badge variant="secondary" className="text-[8px] uppercase h-4 bg-amber-50 text-amber-700 border-amber-200">In Bin</Badge>}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter className="p-4 bg-muted/10 border-t flex flex-row justify-center sm:justify-center shrink-0">
                    <Button onClick={() => setTasksUsingField([])} className="w-full sm:w-32 rounded-xl h-11 font-bold">Got it</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Field "{fieldAttemptingDelete?.label}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove this field configuration. This action cannot be undone. Click Save after confirmation to apply changes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-3">
                    <AlertDialogCancel className="rounded-xl h-11 font-medium">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeleteLocal} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">Mark for Deletion</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeactivateConfirmOpen} onOpenChange={setIsDeactivateConfirmOpen}>
            <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold tracking-tight">Confirm Deactivation</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-normal">
                        The following fields will be hidden across the application:
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-4 border rounded-2xl bg-muted/30 p-4">
                    <ScrollArea className="max-h-40">
                        <ul className="space-y-2">
                            {pendingDeactivateFields.map(f => (
                                <li key={f.id} className="flex items-center gap-2 text-sm font-semibold">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    {f.label}
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
                <AlertDialogFooter className="mt-6 gap-3 flex-col sm:flex-row">
                    <AlertDialogCancel className="rounded-xl h-11 font-medium border-none bg-muted/50 hover:bg-muted" onClick={() => setIsDeactivateConfirmOpen(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={performSaveFields} className="bg-primary hover:bg-primary/90 rounded-xl h-11 font-bold shadow-lg">Confirm & Save</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );

  // MOBILE HUB VIEW
  if (isMobile && !activeMobileSection) {
    return (
        <div className="pb-6">
            <div className="px-6 pt-10 pb-6 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBackToProfile} className="h-10 w-10 -ml-2 rounded-full shrink-0"><ArrowLeft className="h-6 w-6" /></Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
                    <p className="text-xs text-muted-foreground font-medium">Configure your TaskFlow environment.</p>
                </div>
            </div>
            <MobileSectionHeader title="Workspace" />
            <div className="px-4">
                <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                    <MobileHubRow icon={ShieldCheck} title="Storage Mode" subLabel={authMode === 'localStorage' ? 'Local Only' : 'Cloud Sync Enabled'} onClick={() => setActiveMobileSection('storage')} color="text-primary" />
                    <MobileHubRow icon={Globe} title="Appearance" subLabel="Branding, theme, and time" onClick={() => setActiveMobileSection('appearance')} color="text-blue-500" />
                    <MobileHubRow icon={DownloadCloud} title="App Installation" subLabel={installStatus === 'installed' ? 'App Installed' : 'Install for best experience'} onClick={() => setActiveMobileSection('install')} color="text-green-600" />
                    <MobileHubRow icon={Bell} title="Features" subLabel="Reminders and tutorials" onClick={() => setActiveMobileSection('features')} color="text-amber-500" />
                </div>
            </div>
            <MobileSectionHeader title="Insights" />
            <div className="px-4">
                <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                    <MobileHubRow 
                        icon={Sparkles} 
                        title="Recent Activity" 
                        subLabel="Tasks added or imported recently" 
                        onClick={() => router.push('/insights')} 
                        color="text-primary" 
                    />
                </div>
            </div>
            <MobileSectionHeader title="Structure" />
            <div className="px-4">
                <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                    <MobileHubRow icon={Layout} title="Field Configuration" subLabel="Task fields and visibility" onClick={() => setActiveMobileSection('fields')} color="text-purple-500" />
                    <MobileHubRow icon={Rocket} title="Environments" subLabel="Deployment pipeline" onClick={() => setActiveMobileSection('environments')} color="text-green-500" />
                </div>
            </div>
            <MobileSectionHeader title="Organization" />
            <div className="px-4">
                <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                    <MobileHubRow icon={Users} title="Team Management" subLabel="Developers and testers" onClick={() => setActiveMobileSection('team')} color="text-indigo-500" />
                </div>
            </div>
            <MobileSectionHeader title="System" />
            <div className="px-4">
                <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                    <MobileHubRow icon={History} title="Releases" subLabel={isAdmin ? 'Manage updates' : 'View updates'} onClick={() => setActiveMobileSection('releases')} color="text-orange-500" />
                    <MobileHubRow icon={Database} title="Data & Safety" subLabel="Import, export, clear data" onClick={() => setActiveMobileSection('data')} color="text-red-500" />
                </div>
            </div>
            {sharedDialogs}
        </div>
    );
  }

  // MOBILE SUB-PAGE VIEW
  if (isMobile && activeMobileSection) {
    const isPeopleManager = activeMobileSection === 'manage-developers' || activeMobileSection === 'manage-testers';
    const managerType = activeMobileSection === 'manage-developers' ? 'developer' : 'tester';

    return (
        <div className="pb-6">
            <div className="px-6 pt-10 pb-6 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => {
                    if (activeMobileSection === 'edit-field') setActiveMobileSection('fields');
                    else if (activeMobileSection === 'edit-environment') setActiveMobileSection('environments');
                    else if (isPeopleManager) setActiveMobileSection('team');
                    else setActiveMobileSection(null);
                }} className="h-10 w-10 -ml-2 rounded-full shrink-0"><ArrowLeft className="h-6 w-6" /></Button>
                <h1 className="text-xl font-bold capitalize">
                    {activeMobileSection === 'manage-developers' ? 'Manage Developers' : 
                     activeMobileSection === 'manage-testers' ? 'Manage Testers' : 
                     activeMobileSection === 'edit-field' ? (fieldToEdit ? 'Edit Field' : 'Add Field') :
                     activeMobileSection === 'edit-environment' ? (envToEdit ? 'Edit Environment' : 'Add Environment') :
                     activeMobileSection === 'install' ? 'App Installation' :
                     activeMobileSection.replace('-', ' ')}
                </h1>
            </div>

            <div className={cn("px-4 space-y-4", (isPeopleManager || activeMobileSection === 'edit-field' || activeMobileSection === 'edit-environment') && "px-0")}>
                {isPeopleManager && <PeopleManagementContent type={managerType} />}
                {activeMobileSection === 'edit-field' && (
                    <div className="bg-background min-h-0 px-6 py-4">
                        <FieldFormContent field={fieldToEdit} repositoryConfigs={uiConfig.repositoryConfigs} onSave={handleSaveField} onCancel={() => setActiveMobileSection('fields')} />
                    </div>
                )}
                {activeMobileSection === 'edit-environment' && (
                    <div className="bg-background min-h-0 px-6 py-4">
                        <EnvironmentFormContent environment={envToEdit} onSave={handleSaveEnv} onCancel={() => setActiveMobileSection('environments')} />
                    </div>
                )}
                {activeMobileSection === 'storage' && (
                    <Card className="border shadow-lg rounded-3xl">
                        <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><ShieldCheck className="h-5 w-5 text-primary" />STORAGE MODE</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3">
                                <button onClick={() => handleInitiateModeChange('localStorage')} className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all", authMode === 'localStorage' ? "bg-primary/[0.03] border-primary shadow-sm" : "bg-background border-border")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", authMode === 'localStorage' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><Smartphone className="h-5 w-5" /></div>
                                    <div className="min-w-0"><p className="font-bold text-sm tracking-tight">Local Storage</p><p className="text-[10px] text-muted-foreground font-medium mt-0.5">Browser-based. Fast & Offline.</p></div>
                                </button>
                                <button onClick={() => handleInitiateModeChange('authenticate')} className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all", authMode === 'authenticate' ? "bg-primary/[0.03] border-primary shadow-sm" : "bg-background border-border")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", authMode === 'authenticate' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><Database className="h-5 w-5" /></div>
                                    <div className="min-w-0"><p className="font-bold text-sm tracking-tight">Cloud Sync</p><p className="text-[10px] text-muted-foreground font-medium mt-0.5">Real-time sync across devices.</p></div>
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {activeMobileSection === 'appearance' && (
                    <Card className="border shadow-lg rounded-3xl">
                        <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Globe className="h-5 w-5 text-primary" />Appearance</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Application Theme</Label>
                                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setTheme('light')} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2", theme === 'light' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent")}><div className={cn("h-5 w-5", theme === 'light' ? "text-primary" : "text-muted-foreground")}><Sun /></div><span className={cn("text-[10px] font-bold uppercase", theme === 'light' ? "text-primary" : "text-muted-foreground")}>Light</span></button>
                                    <button onClick={() => setTheme('dark')} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2", theme === 'dark' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent")}><div className={cn("h-5 w-5", theme === 'dark' ? "text-primary" : "text-muted-foreground")}><Moon /></div><span className={cn("text-[10px] font-bold uppercase", theme === 'dark' ? "text-primary" : "text-muted-foreground")}>Dark</span></button>
                                    <button onClick={() => setTheme('system')} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2", theme === 'system' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent")}><div className={cn("h-5 w-5", theme === 'system' ? "text-primary" : "text-muted-foreground")}><Monitor /></div><span className={cn("text-[10px] font-bold uppercase", theme === 'system' ? "text-primary" : "text-muted-foreground")}>System</span></button>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2"><Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Workspace Name</Label><Input value={appName} onChange={e => setAppName(e.target.value)} className="h-10 font-medium transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Workspace Icon</Label><div className="flex gap-2"><Input value={isDataURIIcon ? '' : (appIcon || '')} onChange={e => setAppIcon(e.target.value)} placeholder={isDataURIIcon ? "Custom image uploaded" : "Emoji or URL..."} className="h-10 flex-1 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" /><Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => iconFileInputRef.current?.click()}><Upload className="h-4 w-4" /></Button><input type="file" ref={iconFileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" /></div></div>
                            <div className="space-y-2"><Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Time Display</Label><div className="grid grid-cols-2 gap-2"><button onClick={() => setTimeFormat('12h')} className={cn("flex items-center justify-center p-2.5 border rounded-xl gap-2 transition-all", timeFormat === '12h' ? "bg-primary/10 border-primary text-primary font-medium" : "bg-muted text-muted-foreground")}>12-hour</button><button onClick={() => setTimeFormat('24h')} className={cn("flex items-center justify-center p-2.5 border rounded-xl gap-2 transition-all", timeFormat === '24h' ? "bg-primary/10 border-primary text-primary font-medium" : "bg-muted text-muted-foreground")}>24-hour</button></div></div>
                            <Button onClick={handleSaveDisplaySettings} className="w-full h-11 font-medium">Save Display Settings</Button>
                        </CardContent>
                    </Card>
                )}
                {activeMobileSection === 'install' && (
                    <Card className="border shadow-lg rounded-3xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                                <DownloadCloud className="h-5 w-5 text-primary" />
                                APP INSTALLATION
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center text-center p-6 bg-muted/20 rounded-2xl border-2 border-dashed">
                                {installStatus === 'installed' ? (
                                    <>
                                        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="text-lg font-bold">App Installed</h3>
                                        <p className="text-xs text-muted-foreground mt-1">You are currently running the TaskFlow web app.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                            <Smartphone className="h-8 w-8 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-bold">Install TaskFlow</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Install for a faster, app-like experience with offline support.</p>
                                    </>
                                )}
                            </div>

                            {installStatus !== 'installed' && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Installation Guide</p>
                                    {platform === 'ios' ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm">
                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Share className="h-4 w-4" /></div>
                                                <p className="text-xs font-medium">1. Tap the <strong>Share</strong> button in Safari</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm">
                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><PlusSquare className="h-4 w-4" /></div>
                                                <p className="text-xs font-medium">2. Select <strong>Add to Home Screen</strong></p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm">
                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><MoreVertical className="h-4 w-4" /></div>
                                                <p className="text-xs font-medium">1. Tap the browser's menu (three dots)</p>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm">
                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><DownloadCloud className="h-4 w-4" /></div>
                                                <p className="text-xs font-medium">2. Select <strong>Install App</strong></p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
                {activeMobileSection === 'features' && (
                    <Card className="border shadow-lg rounded-3xl">
                        <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Bell className="h-5 w-5 text-primary" />Features</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20"><div className="space-y-0.5"><Label className="text-sm font-semibold tracking-tight">Task Reminders</Label><p className="text-[10px] font-normal text-muted-foreground uppercase">Sticky notes on tasks.</p></div><Switch checked={uiConfig.remindersEnabled} onCheckedChange={(checked) => handleUpdateConfig({ remindersEnabled: checked })} /></div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20"><div className="space-y-0.5"><Label className="text-sm font-semibold tracking-tight">Guided Tour</Label><p className="text-[10px] font-normal text-muted-foreground uppercase">Onboarding tips.</p></div><Switch checked={uiConfig.tutorialEnabled} onCheckedChange={(checked) => handleUpdateConfig({ tutorialEnabled: checked })} /></div>
                        </CardContent>
                    </Card>
                )}
                {activeMobileSection === 'fields' && (
                    <div className="space-y-4">
                        <Button className="w-full h-12 font-bold shadow-lg rounded-2xl" onClick={() => { setFieldToEdit(null); setActiveMobileSection('edit-field'); }}><PlusCircle className="h-5 w-5 mr-2" /> Add Field</Button>
                        <Card className="border shadow-xl bg-card rounded-3xl">
                            <CardHeader className="pb-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search fields..." 
                                        className="pl-10 h-12 rounded-xl transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        Active Fields
                                    </h3>
                                    <div className="space-y-6">
                                        {Object.entries(filteredAndGroupedFields.activeGroups).map(([groupName, fields]) => (
                                            <div key={groupName} className="space-y-3">
                                                <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">{groupName}</h4>
                                                <div className="grid gap-2">
                                                    {fields.map(field => {
                                                        const isMandatory = !field.isCustom && ['title', 'description', 'status', 'repositories', 'developers'].includes(field.key);
                                                        return (
                                                            <div key={field.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-2xl hover:bg-muted/40 transition-all group">
                                                                <div className="min-w-0 flex-1 pr-2">
                                                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                        <span className="font-medium text-sm sm:text-base truncate max-w-full">
                                                                            {field.label} {field.isRequired && <span className="text-destructive">*</span>}
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] h-4 shrink-0 uppercase tracking-tighter"> {field.type} </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 shrink-0">
                                                                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => { setFieldToEdit(field); setActiveMobileSection('edit-field'); }}><Pencil className="h-4 w-4" /></Button>
                                                                    {!isMandatory && (
                                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-full" onClick={() => field.isCustom ? handleRequestDeleteField(field) : handleFieldToggleLocal(field.key, 'isActive')}>
                                                                            {field.isCustom ? <Trash2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {filteredAndGroupedFields.inactiveFields.length > 0 && (
                                    <div className="pt-6 border-t border-dashed">
                                        <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
                                            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                                            Deactivated Fields
                                        </h3>
                                        <div className="grid gap-2">
                                            {filteredAndGroupedFields.inactiveFields.map(field => (
                                                <div key={field.id} className="flex items-center justify-between p-3 bg-muted/5 border border-dashed rounded-2xl opacity-60">
                                                    <span className="text-sm font-medium truncate pr-4">{field.label}</span>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" onClick={() => handleFieldToggleLocal(field.key, 'isActive')}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        {field.isCustom && (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleRequestDeleteField(field)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {hasUnsavedFieldChanges && (
                            <div className="fixed bottom-24 right-6 z-[100] animate-in zoom-in duration-300">
                                <Button onClick={handleSaveFields} size="icon" className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40"><Save className="h-6 w-6" /><span className="sr-only">Save Fields</span></Button>
                            </div>
                        )}
                    </div>
                )}
                {activeMobileSection === 'environments' && (
                    <Card className="border shadow-lg rounded-3xl">
                        <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Rocket className="h-5 w-5 text-primary" /> Environments</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                {(uiConfig.environments || []).map(env => {
                                    const isMandatory = env.isMandatory || ['dev', 'production'].includes(env.name.toLowerCase());
                                    return (
                                        <div key={env.id} className="flex items-center justify-between p-3 border rounded-2xl bg-muted/20">
                                            <div className="flex items-center gap-3"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color }} /><span className="capitalize font-medium text-sm">{env.name}</span></div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { setEnvToEdit(env); setActiveMobileSection('edit-environment'); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                                {!isMandatory && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => handleDeleteEnv(env.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2"><Input placeholder="New environment..." className="h-10 text-xs rounded-xl transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" value={newEnvName} onChange={e => setNewEnvName(e.target.value)} /><Button size="sm" className="h-10 px-4 shrink-0 rounded-xl font-bold" onClick={handleAddEnv}>Add</Button></div>
                        </CardContent>
                    </Card>
                )}
                {activeMobileSection === 'team' && (
                    <Card className="border shadow-lg rounded-3xl">
                        <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Users className="h-5 w-5 text-primary" /> Team Management</CardTitle></CardHeader>
                        <CardContent className="space-y-3"><Button variant="outline" className="w-full h-14 text-sm justify-between rounded-2xl font-bold px-4" onClick={() => setActiveMobileSection('manage-developers')}><span className="flex items-center gap-3"><Users className="h-5 w-5 text-indigo-500" /> Manage Developers</span><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" className="w-full h-14 text-sm justify-between rounded-2xl font-bold px-4" onClick={() => setActiveMobileSection('manage-testers')}><span className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-green-500" /> Manage Testers</span><ChevronRight className="h-4 w-4" /></Button></CardContent>
                    </Card>
                )}
                {activeMobileSection === 'releases' && <ReleaseManagementCard />}
                {activeMobileSection === 'data' && (
                    <div className="space-y-4">
                        <Card className="border shadow-lg rounded-3xl">
                            <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold uppercase tracking-wider">Data Operations</CardTitle></CardHeader>
                            <CardContent className="space-y-3"><Button variant="outline" className="w-full h-12 justify-start rounded-2xl font-bold px-4" onClick={handleExportSettings}><Download className="h-5 w-5 mr-3 text-muted-foreground" /> Export Settings</Button><Button variant="outline" className="w-full h-12 justify-start rounded-2xl font-bold px-4" onClick={() => fileInputRef.current?.click()}><Upload className="h-5 w-5 mr-3 text-muted-foreground" /> Import Configuration</Button><input type="file" ref={fileInputRef} onChange={handleImportSettings} className="hidden" accept=".json" /></CardContent>
                        </Card>
                        <Card className="border-2 border-destructive/20 shadow-lg bg-destructive/[0.02] rounded-3xl">
                            <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold text-destructive uppercase tracking-wider">Danger Zone</CardTitle></CardHeader>
                            <CardContent><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full h-12 justify-start rounded-2xl font-bold px-4 shadow-md"><Trash2 className="h-5 w-5 mr-3" /> Clear All Workspace Data</Button></AlertDialogTrigger><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Clear everything?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all tasks, notes, and settings. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3 mt-4"><AlertDialogCancel className="rounded-xl" disabled={isClearing}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold" disabled={isClearing}>{isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Clear Data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent>
                        </Card>
                    </div>
                )}
            </div>
            <PeopleManagerDialog type={peopleManagerType === 'developer' ? 'developer' : 'tester'} isOpen={peopleManagerType !== null} onOpenChange={(open) => !open && setPeopleManagerType(null)} onSuccess={() => {}} />
            <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} onSuccess={() => { setAuthMode('authenticate'); window.dispatchEvent(new Event('company-changed')); }} />
            <ProfileImageCropper isOpen={isCropperOpen} onOpenChange={setIsCropperOpen} imageSrc={pendingIconImage} onCropComplete={handleCropComplete} />
            <ImagePreviewDialog isOpen={isPreviewOpen} onOpenChange={setIsPreviewOpen} imageUrl={appIcon} imageName="Icon Preview" isProfilePreview onChange={() => { setIsPreviewOpen(false); iconFileInputRef.current?.click(); }} onRemove={handleRemoveIcon} previousImageUrl={uiConfig.previousAppIcon} onRestore={handleRestorePreviousIcon} />
            <AlertDialog open={isModeConfirmOpen} onOpenChange={setIsModeConfirmOpen}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Change Mode?</AlertDialogTitle><AlertDialogDescription>{pendingModeChange === 'authenticate' ? "Switch to Cloud sync?" : "Switch to Local Storage?"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-4 gap-3"><AlertDialogCancel onClick={() => setPendingModeChange(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmModeChange}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            {sharedDialogs}
        </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div className="container mx-auto pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Application Settings</h1>
            <p className="text-base text-muted-foreground mt-2 font-normal">Manage and customize fields and environments across your application.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pb-20">
        <div className="lg:col-span-2 space-y-8">
            <Card id="settings-field-config-card" className="border-none shadow-xl bg-card">
                <CardHeader className="pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-semibold tracking-tight">Field Configuration</CardTitle>
                            <CardDescription className="text-sm font-normal">Edit, activate, or remove fields. Standard fields cannot be deleted.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {hasUnsavedFieldChanges && (
                                <Button onClick={handleSaveFields} variant="default" className="font-bold shadow-md bg-primary hover:bg-primary/90">
                                    <Save className="h-4 w-4 mr-2" /> Save Changes
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="font-bold px-4 h-10 shadow-sm" onClick={() => { setFieldToEdit(null); setIsFieldDialogOpen(true); }}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Field
                            </Button>
                        </div>
                    </div>
                    <div className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Search fields..." 
                                className="pl-10 h-12 text-base font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-10">
                    <div>
                        <h3 className="text-base font-semibold mb-6 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500" />Active Fields</h3>
                        <div className="space-y-8">
                            {Object.entries(filteredAndGroupedFields.activeGroups).map(([groupName, fields]) => (
                                <div key={groupName} className="space-y-3">
                                    <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">{groupName}<div className="h-px bg-border flex-1" /></h4>
                                    <div className="grid gap-2">
                                        {fields.map(field => {
                                            const isMandatory = !field.isCustom && ['title', 'description', 'status', 'repositories', 'developers'].includes(field.key);
                                            return (
                                                <div key={field.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-xl hover:bg-muted/40 transition-all group border-transparent hover:border-border">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                                        <GripVertical className="h-5 w-5 text-muted-foreground/30 cursor-grab active:cursor-grabbing shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap"><span className="font-medium text-sm sm:text-base tracking-tight truncate max-w-full">{field.label} {field.isRequired && <span className="text-destructive font-bold">*</span>}</span><Badge variant="outline" className="text-[9px] uppercase font-medium px-1.5 h-4 bg-background shrink-0">{field.type}</Badge></div>
                                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{field.group}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm" onClick={() => { setFieldToEdit(field); setIsFieldDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                                            {!isMandatory && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => field.isCustom ? handleRequestDeleteField(field) : handleFieldToggleLocal(field.key, 'isActive')}>
                                                                                {field.isCustom ? <Trash2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent><p>{field.isCustom ? 'Delete Field' : 'Deactivate Field'}</p></TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
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
                    </div>
                    <div className="pt-8 border-t">
                        <h3 className="text-base font-semibold mb-6 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-muted-foreground/30" />Inactive Fields</h3>
                        {filteredAndGroupedFields.inactiveFields.length > 0 ? (
                            <div className="grid gap-2">
                                {filteredAndGroupedFields.inactiveFields.map(field => (
                                    <div key={field.id} className="flex items-center justify-between p-3 bg-muted/5 border border-dashed rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                        <span className="text-sm sm:text-base font-normal tracking-tight truncate pr-4">{field.label}</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="h-9 px-4 font-medium shrink-0 shadow-sm" onClick={() => handleFieldToggleLocal(field.key, 'isActive')}><Check className="h-4 w-4 mr-2" /> Activate</Button>
                                            {field.isCustom && (
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => handleRequestDeleteField(field)}><Trash2 className="h-4 w-4" /></Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="text-center py-10 bg-muted/5 rounded-xl border border-dashed"><p className="text-sm text-muted-foreground font-normal">No inactive fields match your search.</p></div>)}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><ShieldCheck className="h-5 w-5 text-primary" />STORAGE MODE</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3">
                        <button onClick={() => handleInitiateModeChange('localStorage')} className={cn("flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all", authMode === 'localStorage' ? "bg-primary/[0.03] border-primary shadow-[0_0_15px_-3px_rgba(61,90,254,0.2)]" : "bg-background border-border hover:border-border/80")}><div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", authMode === 'localStorage' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><Smartphone className="h-5 w-5" /></div><div className="min-w-0"><p className="font-bold text-sm tracking-tight">Local Storage</p><p className="text-[10px] text-muted-foreground font-medium mt-0.5">Browser-based data. Fast & Offline.</p></div></button>
                        <button onClick={() => handleInitiateModeChange('authenticate')} className={cn("flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all", authMode === 'authenticate' ? "bg-primary/[0.03] border-primary shadow-[0_0_15px_-3px_rgba(61,90,254,0.2)]" : "bg-background border-border hover:border-border/80")}><div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", authMode === 'authenticate' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><Database className="h-5 w-5" /></div><div className="min-w-0"><p className="font-bold text-sm tracking-tight">Cloud Sync</p><p className="text-[10px] text-muted-foreground font-medium mt-0.5">Real-time sync across all devices.</p></div></button>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Globe className="h-5 w-5 text-primary" />Appearance</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3 pb-2 border-b border-dashed"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Theme Preference</Label><RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2"><button onClick={() => setTheme('light')} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2", theme === 'light' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50")}><div className={cn("h-5 w-5", theme === 'light' ? "text-primary" : "text-muted-foreground")}><Sun /></div><span className={cn("text-[10px] font-bold uppercase", theme === 'light' ? "text-primary" : "text-muted-foreground")}>Light</span></button><button onClick={() => setTheme('dark')} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2", theme === 'dark' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50")}><div className={cn("h-5 w-5", theme === 'dark' ? "text-primary" : "text-muted-foreground")}><Moon /></div><span className={cn("text-[10px] font-bold uppercase", theme === 'dark' ? "text-primary" : "text-muted-foreground")}>Dark</span></button><button onClick={() => setTheme('system')} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2", theme === 'system' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50")}><div className={cn("h-5 w-5", theme === 'system' ? "text-primary" : "text-muted-foreground")}><Monitor /></div><span className={cn("text-[10px] font-bold uppercase", theme === 'system' ? "text-primary" : "text-muted-foreground")}>System</span></button></RadioGroup></div>
                    <div className="space-y-2"><Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Workspace Name</Label><Input value={appName} onChange={e => setAppName(e.target.value)} className="h-10 font-medium transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Workspace Icon</Label><div className="flex gap-2"><Input value={isDataURIIcon ? '' : (appIcon || '')} onChange={e => setAppIcon(e.target.value)} placeholder={isDataURIIcon ? "Custom image uploaded" : "Emoji or URL..."} className="h-10 flex-1 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" /><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10 border-dashed shadow-sm" onClick={() => iconFileInputRef.current?.click()} type="button"><Upload className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Upload Brand Icon</TooltipContent></Tooltip></TooltipProvider><input type="file" ref={iconFileInputRef} onChange={handleIconUpload} className="hidden" accept="image/*" /></div></div>
                    <Button onClick={handleSaveDisplaySettings} className="w-full h-11 font-medium shadow-md">Save Display Settings</Button>
                </CardContent>
            </Card>
            
            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <DownloadCloud className="h-5 w-5 text-primary" />
                        APP INSTALLATION
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/20 border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center",
                                installStatus === 'installed' ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                            )}>
                                {installStatus === 'installed' ? <CheckCircle2 className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold leading-none">{installStatus === 'installed' ? 'App Installed' : 'Not Installed'}</p>
                                <p className="text-[9px] text-muted-foreground uppercase font-medium mt-1">{installStatus === 'installed' ? 'Running as PWA' : 'Available for install'}</p>
                            </div>
                        </div>
                        {installStatus === 'installed' && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none h-5 px-2 text-[8px] font-black uppercase">Live</Badge>}
                    </div>

                    {installStatus !== 'installed' && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Guide for {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Desktop'}</p>
                            
                            {platform === 'ios' ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium"><div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0"><Share className="h-3.5 w-3.5" /></div><span>Tap <strong>Share</strong> in Safari</span></div>
                                    <div className="flex items-center gap-2 text-xs font-medium"><div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0"><PlusSquare className="h-3.5 w-3.5" /></div><span>Choose <strong>Add to Home Screen</strong></span></div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium"><div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0"><DownloadCloud className="h-3.5 w-3.5" /></div><span>Click <strong>Install App</strong> in browser menu</span></div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Bell className="h-5 w-5 text-primary" />FEATURES</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-border transition-colors">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold tracking-tight">Task Reminders</Label>
                            <p className="text-[10px] font-normal text-muted-foreground uppercase">Sticky notes on tasks.</p>
                        </div>
                        <Switch checked={uiConfig.remindersEnabled} onCheckedChange={(checked) => handleUpdateConfig({ remindersEnabled: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-border transition-colors">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold tracking-tight">Onboarding Tour</Label>
                            <p className="text-[10px] font-normal text-muted-foreground uppercase">Guided walkthrough.</p>
                        </div>
                        <Switch checked={uiConfig.tutorialEnabled} onCheckedChange={(checked) => handleUpdateConfig({ tutorialEnabled: checked })} />
                    </div>
                </CardContent>
            </Card>

            <Card id="settings-team-card" className="border-none shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider">
                        <Users className="h-5 w-5 text-primary" />
                        Team Management
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full h-12 text-sm justify-between rounded-xl font-bold px-4" onClick={() => setPeopleManagerType('developer')}>
                        <span className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-indigo-500" /> 
                            Manage Developers
                        </span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="w-full h-12 text-sm justify-between rounded-xl font-bold px-4" onClick={() => setPeopleManagerType('tester')}>
                        <span className="flex items-center gap-3">
                            <ClipboardCheck className="h-5 w-5 text-green-500" /> 
                            Manage Testers
                        </span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>

            <Card id="settings-environment-card" className="border-none shadow-lg">
                <CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider"><Rocket className="h-5 w-5 text-primary" />Environments</CardTitle></CardHeader>
                <CardContent className="space-y-4"><div className="grid gap-2">{(uiConfig.environments || []).map(env => { const isMandatory = env.isMandatory || ['dev', 'production'].includes(env.name.toLowerCase()); return (<div key={env.id} className="flex items-center justify-between p-2.5 border rounded-xl bg-muted/20 group hover:bg-muted/40 transition-colors"><div className="flex items-center gap-3 min-w-0"><div className="h-3 w-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: env.color }} /><span className="capitalize font-medium text-sm truncate">{env.name}</span>{isMandatory && <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />}</div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => { setEnvToEdit(env); setIsEnvDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>{!isMandatory && <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Delete Environment?</AlertDialogTitle><AlertDialogDescription className="font-normal">Permanently remove the "**${env.name}**" environment?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEnv(env.id)} className="bg-destructive hover:bg-destructive/90 font-semibold">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div></div>) })}</div><div className="flex gap-2"><Input placeholder="New environment..." className="h-10 text-xs font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" value={newEnvName} onChange={e => setNewEnvName(e.target.value)} /><Button size="sm" className="h-10 px-4 font-medium shrink-0 shadow-sm" onClick={handleAddEnv}>Add</Button></div></CardContent>
            </Card>
            <Card className="border-2 border-destructive/20 shadow-lg bg-destructive/[0.02]"><CardHeader className="pb-4"><CardTitle className="text-xs font-semibold flex items-center gap-2 text-destructive uppercase tracking-wider"><Database className="h-5 w-5" />Danger Zone</CardTitle></CardHeader>
            <CardContent className="space-y-2"><Button variant="outline" className="w-full h-10 text-xs font-medium justify-start px-4 rounded-xl shadow-sm" onClick={handleExportSettings}><Download className="h-4 w-4 mr-3 text-muted-foreground" /> Export Settings</Button><Button variant="outline" className="w-full h-10 text-xs font-medium justify-start px-4 rounded-xl shadow-sm" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-3 text-muted-foreground" /> Import Configuration</Button><input type="file" ref={fileInputRef} onChange={handleImportSettings} className="hidden" accept=".json" /><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full h-10 text-xs font-semibold justify-start px-4 rounded-xl bg-destructive hover:bg-destructive/90 shadow-lg"><Trash2 className="h-4 w-4 mr-3" /> Clear All Data</Button></AlertDialogTrigger><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogTitle>Clear all data?</AlertDialogTitle><AlertDialogDescription>Permanently delete all tasks, notes, and settings?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3 mt-4"><AlertDialogCancel className="rounded-xl font-medium" disabled={isClearing}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90 rounded-xl font-semibold px-6" disabled={isClearing}>Clear Data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent></Card>
        </div>
      </div>
      <EditFieldDialog isOpen={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen} field={fieldToEdit} repositoryConfigs={uiConfig.repositoryConfigs || []} onSave={handleSaveField} />
      <EditEnvironmentDialog isOpen={isEnvDialogOpen} onOpenChange={setIsEnvDialogOpen} environment={envToEdit} onSave={handleSaveEnv} />
      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} onSuccess={() => { setAuthMode('authenticate'); window.dispatchEvent(new Event('company-changed')); }} />
      {sharedDialogs}
      <PeopleManagerDialog type={peopleManagerType === 'developer' ? 'developer' : 'tester'} isOpen={peopleManagerType !== null} onOpenChange={(open) => !open && setPeopleManagerType(null)} onSuccess={loadConfig} />
    </div>
  );
}
