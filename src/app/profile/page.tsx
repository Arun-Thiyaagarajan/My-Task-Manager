
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { updateProfile, updatePassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarGradient, cn, compressImage, fuzzySearch } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
    setAuthMode, 
    getAuthMode, 
    getLocalProfile, 
    setLocalProfile, 
    getCompanies, 
    setActiveCompanyId, 
    deleteCompany,
    addCompany,
    updateCompany
} from '@/lib/data';
import type { Company, UserProfile } from '@/lib/types';
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Loader2, 
  AlertCircle,
  Calendar,
  KeyRound,
  Eye,
  EyeOff,
  Maximize2,
  LogOut,
  UserCog,
  History,
  RotateCcw,
  FileClock,
  Settings,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Bell,
  Building,
  PlusCircle,
  Edit,
  Trash2,
  Search,
  X,
  Globe,
  Rocket,
  Users,
  Database,
  Layout,
  SunMoon,
  Check,
  Download,
  Upload,
  Eraser,
  Palette,
  SearchX,
  DownloadCloud
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileImageCropper } from '@/components/profile-image-cropper';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveCompany } from '@/hooks/use-active-company';
import { CompaniesManager } from '@/components/companies-manager';

const isActualImage = (url: string | null | undefined) => {
    if (!url) return false;
    return url.startsWith('data:image') || url.startsWith('http') || url.startsWith('/');
};

function WorkspaceListContent({ onCompanySelect }: { onCompanySelect?: (id: string) => void }) {
    const isMobile = useIsMobile();
    const activeCompanyId = useActiveCompany();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
    
    // Inline editing states for mobile
    const [inlineEditId, setInlineEditId] = useState<string | null>(null);
    const [inlineName, setInlineName] = useState('');
    const [isAddingInline, setIsAddingInline] = useState(false);
    
    const { toast } = useToast();

    useEffect(() => {
        setCompanies(getCompanies());
    }, []);

    const handleCompanyChange = (id: string) => {
        setActiveCompanyId(id);
        window.dispatchEvent(new Event('company-changed'));
        onCompanySelect?.(id);
    };

    const handleAdd = () => {
        if (isMobile) {
            setIsAddingInline(true);
            setInlineEditId(null);
            setInlineName('');
        } else {
            setCompanyToEdit(null);
            setIsManagerOpen(true);
        }
    };

    const handleEdit = (c: Company) => {
        if (isMobile) {
            setInlineEditId(c.id);
            setInlineName(c.name);
            setIsAddingInline(false);
        } else {
            setCompanyToEdit(c);
            setIsManagerOpen(true);
        }
    };

    const handleSaveInline = () => {
        if (!inlineName.trim()) return;
        
        if (isAddingInline) {
            addCompany(inlineName.trim());
            toast({ title: 'Company added' });
        } else if (inlineEditId) {
            updateCompany(inlineEditId, inlineName.trim());
            toast({ title: 'Company updated' });
        }
        
        setCompanies(getCompanies());
        window.dispatchEvent(new Event('company-changed'));
        setInlineEditId(null);
        setIsAddingInline(false);
    };

    const handleCancelInline = () => {
        setInlineEditId(null);
        setIsAddingInline(false);
    };

    const handleDelete = (id: string) => {
        if (deleteCompany(id)) {
            setCompanies(getCompanies());
            window.dispatchEvent(new Event('company-changed'));
            toast({ title: 'Company deleted' });
        } else {
            toast({ variant: 'destructive', title: 'Cannot delete the last company' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                {companies.map(company => (
                    <div key={company.id} className={cn(
                        "flex flex-col p-4 rounded-2xl border transition-all",
                        company.id === activeCompanyId ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}>
                        {inlineEditId === company.id ? (
                            <div className="space-y-3 animate-in fade-in duration-200">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rename Company</Label>
                                <Input 
                                    value={inlineName} 
                                    onChange={e => setInlineName(e.target.value)} 
                                    autoFocus
                                    className="h-10 bg-background"
                                    onKeyDown={e => e.key === 'Enter' && handleSaveInline()}
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" className="h-8 flex-1 font-bold" onClick={handleSaveInline}>Save</Button>
                                    <Button size="sm" variant="ghost" className="h-8 flex-1 font-medium" onClick={handleCancelInline}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => handleCompanyChange(company.id)}
                                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                                >
                                    <div className={cn(
                                        "h-2.5 w-2.5 rounded-full shrink-0",
                                        company.id === activeCompanyId ? "bg-primary" : "bg-muted-foreground/30"
                                    )} />
                                    <span className={cn("font-bold text-base truncate", company.id === activeCompanyId && "text-primary")}>{company.name}</span>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleEdit(company)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-3xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="font-bold tracking-tight">Delete Workspace?</AlertDialogTitle>
                                                <AlertDialogDescription className="font-normal text-sm">
                                                    This action cannot be undone. This will permanently delete the workspace and all its tasks.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="pt-4 gap-2">
                                                <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(company.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold px-6">
                                                    Delete Company
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {isAddingInline && (
                    <div className="flex flex-col p-4 rounded-2xl border bg-primary/5 border-primary/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Company Name</Label>
                            <Input 
                                value={inlineName} 
                                onChange={e => setInlineName(e.target.value)} 
                                autoFocus
                                className="h-10 bg-background"
                                onKeyDown={e => e.key === 'Enter' && handleSaveInline()}
                            />
                            <div className="flex gap-2">
                                <Button size="sm" className="h-8 flex-1 font-bold" onClick={handleSaveInline}>Create</Button>
                                <Button size="sm" variant="ghost" className="h-8 flex-1 font-medium" onClick={handleCancelInline}>Cancel</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {!isAddingInline && (
                <Button onClick={handleAdd} variant="outline" className="w-full border-dashed rounded-2xl h-14 font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/30">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Add New Company
                </Button>
            )}

            {!isMobile && (
                <CompaniesManager 
                    isOpen={isManagerOpen}
                    onOpenChange={setIsManagerOpen}
                    onSuccess={() => {
                        setCompanies(getCompanies());
                        window.dispatchEvent(new Event('company-changed'));
                    }}
                    companyToEdit={companyToEdit}
                />
            )}
        </div>
    );
}

function WorkspaceDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl w-[95%]">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Building className="h-5 w-5 text-primary" />
                        My Workspaces
                    </DialogTitle>
                    <DialogDescription className="text-sm font-normal">Switch between or manage your company profiles.</DialogDescription>
                </DialogHeader>
                
                <div className="px-6 py-4">
                    <WorkspaceListContent onCompanySelect={() => onOpenChange(false)} />
                </div>
                
                <DialogFooter className="p-4 bg-muted/10">
                    <Button variant="ghost" className="w-full rounded-xl font-semibold" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ProfilePage() {
  const isMobile = useIsMobile();
  const { user, firestore, auth, isUserLoading, userProfile, isProfileLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCompanyId = useActiveCompany();

  const authMode = getAuthMode();
  const isLocal = authMode === 'localStorage';

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [showMobileSubPage, setShowMobileSubPage] = useState(false);
  const [isUpdating, setIsPending] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [previousPhotoURL, setPreviousPhotoURL] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  // Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Photo Editor states
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLocal && !isUserLoading && !user) {
      router.push('/');
      return;
    }

    if (isLocal) {
        const local = getLocalProfile();
        setDisplayName(local.username || 'Guest User');
        setEmail('Local Storage Mode');
        setPhotoURL(local.photoURL || null);
        setPreviousPhotoURL(local.previousPhotoURL || null);
        setIsPageLoading(false);
        window.dispatchEvent(new Event('navigation-end'));
    } else if (user) {
      setDisplayName(user.displayName || userProfile?.username || '');
      setEmail(user.email || '');
      const avatar = userProfile?.photoURL || (user.photoURL === "" ? null : user.photoURL);
      setPhotoURL(avatar);
      setPreviousPhotoURL(userProfile?.previousPhotoURL || null);
      if (!isProfileLoading) {
          setIsPageLoading(false);
          window.dispatchEvent(new Event('navigation-end'));
      }
    }
  }, [user, isUserLoading, userProfile, router, isProfileLoading, isLocal]);

  // Sync state from URL for better back-navigation support
  useEffect(() => {
    if (!isMobile) return;
    const tab = searchParams.get('tab');
    if (tab) {
        setActiveTab(tab);
        setShowMobileSubPage(true);
    } else {
        setShowMobileSubPage(false);
    }
  }, [searchParams, isMobile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      if (isLocal) {
          const current = getLocalProfile();
          setLocalProfile({
              username: displayName,
              photoURL: photoURL,
              previousPhotoURL: photoURL !== current.photoURL ? current.photoURL : current.previousPhotoURL
          });
          toast({ variant: 'success', title: 'Profile Updated', description: 'Local changes saved.' });
      } else {
          if (!user || !firestore) return;
          
          await updateProfile(user, { 
            displayName,
            photoURL: null
          });
          
          const userRef = doc(firestore, 'users', user.uid);
          const updates: any = {
            id: user.uid,
            username: displayName,
            email: email,
            photoURL: photoURL,
            updatedAt: new Date().toISOString()
          };

          if (!userProfile) {
              updates.role = 'user';
          }

          if (photoURL !== userProfile?.photoURL && userProfile?.photoURL) {
              updates.previousPhotoURL = userProfile.photoURL;
          }

          await setDoc(userRef, updates, { merge: true });
          toast({ variant: 'success', title: 'Profile Updated', description: 'Cloud changes synced successfully.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setOriginalImage(workingOriginal);
      setPendingImage(workingOriginal);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setPhotoURL(croppedImage);
    toast({ title: 'Photo ready', description: 'Click "Save Changes" to apply.' });
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
    setOriginalImage(null);
    toast({ title: 'Photo removed', description: 'Click "Save Changes" to update.' });
    setIsPreviewOpen(false);
  };

  const handleEditExistingIcon = () => {
    const imageToEdit = originalImage || photoURL;
    if (isActualImage(imageToEdit)) {
        setPendingImage(imageToEdit);
        setIsPreviewOpen(false);
        setIsCropperOpen(true);
    }
  };

  const handleRestorePrevious = () => {
      if (previousPhotoURL) {
          setPhotoURL(previousPhotoURL);
          toast({ title: 'Photo restored', description: 'Click "Save Changes" to apply.' });
          setIsPreviewOpen(false);
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Mismatch', description: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Invalid Password', description: 'Password must be at least 6 characters.' });
      return;
    }

    setIsPending(true);
    try {
      await updatePassword(user, newPassword);
      toast({ variant: 'success', title: 'Password Changed', description: 'Your password has been updated.' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPass(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      toast({ 
        variant: 'success', 
        title: 'Verification Sent', 
        description: 'Check your email to verify your account.' 
      });
    } catch (error: any) {
      toast({ 
        variant: 'success', 
        title: 'Error', 
        description: 'Verification email could not be sent.' 
      });
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    setIsPending(true);
    try {
      await signOut(auth);
      setAuthMode('localStorage');
      toast({ variant: 'success', title: 'Signed Out', description: 'Logged out successfully.' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (/[A-Z]/.test(newPassword)) strength += 25;
    if (/[0-9]/.test(newPassword)) strength += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 25;
    return strength;
  };

  const searchableItems = useMemo(() => {
    const items = [
        // Top Level Tabs
        { id: 'general', title: 'Account Settings', subLabel: 'Personal information & email', icon: UserIcon, type: 'tab', category: 'User', color: 'text-primary', keywords: ['profile', 'me', 'display name', 'email', 'avatar'] },
        { id: 'security', title: 'Password & Security', subLabel: 'Manage your credentials', icon: Lock, type: 'tab', category: 'User', color: 'text-amber-500', keywords: ['password', 'auth', 'protect', 'login'] },
        { id: 'workspaces', title: 'Manage Workspaces', subLabel: 'Switch between companies', icon: Building, type: 'tab', category: 'User', color: 'text-cyan-500', keywords: ['company', 'switch', 'projects', 'organizations'] },
        
        // Settings Sections
        { id: 'storage', title: 'Storage Mode', subLabel: 'Cloud Sync vs Local Storage', icon: ShieldCheck, type: 'settings', section: 'storage', category: 'Workspace', color: 'text-primary', keywords: ['cloud', 'sync', 'local', 'browser', 'offline'] },
        { id: 'appearance', title: 'Theme & Appearance', subLabel: 'Branding, Dark Mode, Icons', icon: Palette, type: 'settings', section: 'appearance', category: 'Workspace', color: 'text-blue-500', keywords: ['dark mode', 'theme', 'color', 'icon', 'logo', 'brand', '12h', '24h'] },
        { id: 'install', title: 'App Installation', subLabel: 'Install TaskFlow as a PWA', icon: DownloadCloud, type: 'settings', section: 'install', category: 'Workspace', color: 'text-green-600', keywords: ['install', 'pwa', 'mobile app', 'desktop app', 'home screen'] },
        { id: 'features', title: 'Feature Modules', subLabel: 'Reminders & Guided Tour', icon: Bell, type: 'settings', section: 'features', category: 'Workspace', color: 'text-amber-500', keywords: ['reminders', 'tutorial', 'tour', 'help'] },
        { id: 'fields', title: 'Field Configuration', subLabel: 'Task fields and visibility', icon: Layout, type: 'settings', section: 'fields', category: 'Structure', color: 'text-purple-500', keywords: ['custom fields', 'inputs', 'required', 'active'] },
        { id: 'environments', title: 'Deploy Environments', subLabel: 'Pipeline configuration', icon: Rocket, type: 'settings', section: 'environments', category: 'Structure', color: 'text-green-500', keywords: ['dev', 'stage', 'production', 'pipeline', 'deployment'] },
        { id: 'team', title: 'Team & People', subLabel: 'Developers and QA staff', icon: Users, type: 'settings', section: 'team', category: 'Organization', color: 'text-indigo-500', keywords: ['staff', 'developers', 'testers', 'contacts', 'qa'] },
        { id: 'data', title: 'Data & Safety', subLabel: 'Import, Export, Reset Workspace', icon: Database, type: 'settings', section: 'data', category: 'System', color: 'text-red-500', keywords: ['backup', 'reset', 'clear data', 'json', 'export', 'import'] },
        
        // Deep Deep Navigation (System Shortcuts)
        { id: 'clear-data', title: 'Clear All Data', subLabel: 'Permanently reset workspace', icon: Eraser, type: 'settings', section: 'data', category: 'Danger Zone', color: 'text-destructive', keywords: ['reset', 'delete all', 'wipe', 'nuke'] },
        { id: 'import-data', title: 'Import Configuration', subLabel: 'Load settings from JSON', icon: Upload, type: 'settings', section: 'data', category: 'Data Ops', color: 'text-blue-600', keywords: ['restore', 'json', 'upload config'] },
        { id: 'export-data', title: 'Export Settings', subLabel: 'Download workspace config', icon: Download, type: 'settings', section: 'data', category: 'Data Ops', color: 'text-green-600', keywords: ['backup', 'json', 'download config'] },
        { id: 'manage-releases', title: 'Publish Update', subLabel: 'Manage release notes (Admin)', icon: Sparkles, type: 'settings', section: 'releases', category: 'System', color: 'text-primary', keywords: ['publish', 'whats new', 'admin only'] },

        // Standalone Links
        { id: 'logs', title: 'Activity Logs', subLabel: 'Audit trail of all changes', icon: FileClock, type: 'link', href: '/logs', category: 'System', color: 'text-blue-500', keywords: ['history', 'audit', 'track', 'changes'] },
        { id: 'releases', title: 'What\'s New', subLabel: 'Latest updates and features', icon: Sparkles, type: 'link', href: '/releases', category: 'System', color: 'text-green-500', keywords: ['version', 'changelog', 'updates'] },
        { id: 'general-reminders', title: 'General Reminders', subLabel: 'Manage global workspace notes', icon: Bell, type: 'link', href: '/reminders', category: 'Productivity', color: 'text-amber-600', keywords: ['sticky notes', 'global notes', 'bulletin'] },
    ];
    if (isLocal) {
        items.unshift({ id: 'auth', title: 'Sign In / Cloud Sync', subLabel: 'Securely sync your workspace', icon: ShieldCheck, type: 'event', event: 'open-auth-modal', category: 'Identity', color: 'text-primary font-bold', keywords: ['login', 'register', 'firebase', 'cloud'] } as any);
    }
    return items;
  }, [isLocal]);

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    
    return searchableItems.filter(item => {
        // 1. Text-based fuzzy match
        if (fuzzySearch(q, item.title) || fuzzySearch(q, item.subLabel) || fuzzySearch(q, item.category)) return true;
        
        // 2. Intent-based keyword match
        if (item.keywords?.some(kw => fuzzySearch(q, kw) || kw.includes(q))) return true;
        
        return false;
    });
  }, [searchQuery, searchableItems]);

  if (isPageLoading) return null;

  const profileName = displayName || (isLocal ? 'Guest User' : user?.email) || 'User';
  const displayRole = isLocal ? 'guest' : (userProfile?.role || 'user');
  const isVerified = isLocal ? true : user?.emailVerified;
  
  const activeCompany = getCompanies().find(c => c.id === activeCompanyId);
  const activeCompanyName = activeCompany?.name || 'Default Workspace';

  const hasChanges = 
    displayName !== (isLocal ? getLocalProfile().username : (user?.displayName || userProfile?.username || '')) || 
    photoURL !== (isLocal ? getLocalProfile().photoURL : (userProfile?.photoURL || (user?.photoURL === "" ? null : user?.photoURL)));

  const handleMobileRowClick = (tab: string) => {
    router.push(`/profile?tab=${tab}`);
  };

  const MobileHubRow = ({ icon: Icon, title, subLabel, onClick, color = 'text-muted-foreground' }: { icon: any, title: string, subLabel: string, onClick?: () => void, color?: string }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center gap-4 py-4 px-4 hover:bg-muted/50 active:bg-muted transition-colors border-b last:border-0 text-left group"
    >
        <div className={cn("shrink-0", color)}>
            <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{subLabel}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-active:text-primary" />
    </button>
  );

  const sharedDialogs = (
    <>
      <ProfileImageCropper 
        isOpen={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={pendingImage}
        onCropComplete={handleCropComplete}
      />

      <ImagePreviewDialog 
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        imageUrl={photoURL}
        imageName="Profile Photo"
        isProfilePreview
        onEdit={handleEditExistingIcon}
        onChange={() => { setIsPreviewOpen(false); fileInputRef.current?.click(); }}
        onRemove={handleRemovePhoto}
        previousImageUrl={previousPhotoURL}
        onRestore={handleRestorePrevious}
      />

      <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <AlertDialogContent className="rounded-3xl w-[90%] md:w-full">
            <AlertDialogHeader>
                <AlertDialogTitle className="font-semibold text-center">Sign out of TaskFlow?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-normal text-center">
                    Your cloud data is safe and will sync back next time you sign in.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col md:flex-row gap-2 mt-4">
                <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90 font-semibold w-full h-11 rounded-xl">Sign Out</AlertDialogAction>
                <AlertDialogCancel className="font-medium w-full h-11 border-none bg-transparent hover:bg-muted rounded-xl">Cancel</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkspaceDialog 
        isOpen={isWorkspaceDialogOpen} 
        onOpenChange={setIsWorkspaceDialogOpen} 
      />
    </>
  );

  const isSearchActive = searchQuery.trim().length >= 2;

  // MOBILE HUB VIEW
  if (isMobile && !showMobileSubPage) {
    return (
        <div className="bg-background no-scrollbar pb-6">
            {/* WhatsApp Style Header */}
            <div className="px-6 pt-10 pb-6 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <button 
                            onClick={() => (photoURL || previousPhotoURL) ? setIsPreviewOpen(true) : fileInputRef.current?.click()}
                            className="relative block cursor-pointer transition-transform duration-300 active:scale-95 rounded-full"
                        >
                            <Avatar className="h-20 w-20 border-2 border-background shadow-xl relative z-10 ring-4 ring-primary/10 ring-offset-2 ring-offset-background">
                                <AvatarImage src={isActualImage(photoURL) ? photoURL : undefined} className="object-cover" />
                                <AvatarFallback 
                                    className="text-2xl font-semibold text-white" 
                                    style={{ background: getAvatarGradient(profileName) }}
                                >
                                    {isActualImage(photoURL) ? getInitials(profileName) : (photoURL || getInitials(profileName))}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg border-2 border-background z-20"
                        >
                            <Camera className="h-3 w-3" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold tracking-tight truncate">{profileName}</h1>
                        <p className="text-sm text-muted-foreground truncate">{email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="flex items-center gap-1.5 text-[10px] uppercase font-bold px-2 h-5 bg-primary/5 border-primary/20 text-primary">
                                <Building className="h-3 w-3" />
                                {activeCompanyName}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 h-5 bg-muted/50 border-none">
                                {displayRole}
                            </Badge>
                            {isVerified && <ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Search Bar */}
            <div className="px-6 mb-6 relative">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search settings..." 
                        className="pl-10 h-11 bg-muted/30 border-transparent transition-all rounded-xl font-normal focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                
                {/* Deep Navigation Suggestions Dropdown */}
                {isSearchFocused && isSearchActive && (
                    <div className="absolute top-full left-6 right-6 mt-2 bg-popover border rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredSearchItems.length > 0 ? (
                            filteredSearchItems.map(item => (
                                <button
                                    key={item.id}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-muted active:bg-muted/80 transition-colors text-left border-b last:border-0"
                                    onClick={() => {
                                        if (item.type === 'tab') {
                                            router.push(`/profile?tab=${item.id}`);
                                        } else if (item.type === 'link') {
                                            router.push(item.href);
                                        } else if (item.type === 'settings') {
                                            router.push(`/settings?section=${item.section}`);
                                        } else if (item.type === 'event') {
                                            window.dispatchEvent(new Event(item.event!));
                                        }
                                        setSearchQuery('');
                                    }}
                                >
                                    <div className={cn("p-2 rounded-lg bg-muted/50", item.color)}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">{item.category}</p>
                                        <p className="text-sm font-bold truncate">{item.title}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{item.subLabel}</p>
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center animate-in zoom-in-95 duration-300">
                                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                                    <SearchX className="h-6 w-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-bold text-foreground/80">No matches found</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Try a different setting</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* List of Settings Rows - Boxed Container */}
            <div className="px-4">
                <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
                    {isLocal && (
                        <MobileHubRow 
                            icon={ShieldCheck} 
                            title="Sign In / Cloud Sync" 
                            subLabel="Securely sync your workspace" 
                            onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
                            color="text-primary font-bold"
                        />
                    )}
                    <MobileHubRow 
                        icon={UserIcon} 
                        title="Account" 
                        subLabel="Personal information, email details" 
                        onClick={() => handleMobileRowClick('general')}
                        color="text-primary"
                    />
                    <MobileHubRow 
                        icon={Lock} 
                        title="Security" 
                        subLabel="Password, account protection" 
                        onClick={() => handleMobileRowClick('security')}
                        color="text-amber-500"
                    />
                    <MobileHubRow 
                        icon={Building} 
                        title="Workspaces" 
                        subLabel="Manage companies and workspace identity" 
                        onClick={() => handleMobileRowClick('workspaces')}
                        color="text-cyan-500"
                    />
                    <MobileHubRow 
                        icon={Bell} 
                        title="General Reminders" 
                        subLabel="Workspace global notes" 
                        onClick={() => router.push('/reminders')}
                        color="text-amber-600"
                    />
                    <MobileHubRow 
                        icon={FileClock} 
                        title="Activity Logs" 
                        subLabel="Your workspace history" 
                        onClick={() => router.push('/logs')}
                        color="text-blue-500"
                    />
                    <MobileHubRow 
                        icon={Settings} 
                        title="Workspace Settings" 
                        subLabel="Fields, environments, team" 
                        onClick={() => router.push('/settings')}
                        color="text-purple-500"
                    />
                    <MobileHubRow 
                        icon={Sparkles} 
                        title="What's New" 
                        subLabel="Release notes and updates" 
                        onClick={() => router.push('/releases')}
                        color="text-green-500"
                    />
                </div>
            </div>

            {/* Account Actions - Boxed Container */}
            <div className="mt-6 px-4 pb-0">
                <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
                    {!isLocal ? (
                        <button 
                            onClick={() => setIsSignOutDialogOpen(true)}
                            className="w-full flex items-center gap-4 py-4 px-4 hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-left"
                        >
                            <div className="shrink-0 text-destructive">
                                <LogOut className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-medium text-destructive">Sign Out</p>
                                <p className="text-xs text-muted-foreground">End your cloud session</p>
                            </div>
                        </button>
                    ) : (
                        <button 
                            onClick={() => router.push('/')}
                            className="w-full flex items-center gap-4 py-4 px-4 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                        >
                            <div className="shrink-0 text-muted-foreground">
                                <ArrowLeft className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-medium">Return Home</p>
                                <p className="text-xs text-muted-foreground">Go back to workspace</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
            {sharedDialogs}
        </div>
    );
  }

  // SUB-PAGE OR DESKTOP VIEW
  return (
    <div className="container max-w-4xl mx-auto pt-10 pb-6 px-4">
      {/* Mobile Back Header */}
      {isMobile && showMobileSubPage && (
          <div className="flex items-center gap-2 mb-8 -mt-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/profile')} className="rounded-full h-10 w-10">
                  <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold capitalize">{activeTab}</h1>
          </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Info Card (Hidden on mobile sub-page to save space) */}
        {!isMobile && (
            <div className="w-full md:w-1/3 space-y-6">
            <Card className="overflow-hidden shadow-xl border-none bg-card rounded-3xl">
                <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent w-full" />
                <div className="px-6 pb-8 text-center -mt-12">
                <div className="relative inline-block group">
                    <div className="absolute inset-0 rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-primary/10 blur-xl" />
                    
                    <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <button 
                            onClick={() => (photoURL || previousPhotoURL) ? setIsPreviewOpen(true) : fileInputRef.current?.click()}
                            className="relative block cursor-pointer transition-transform duration-300 active:scale-95 rounded-full"
                        >
                            <Avatar className="h-24 w-24 border-[6px] border-background shadow-2xl transition-all duration-300 group-hover:border-primary/20">
                            <AvatarImage src={isActualImage(photoURL) ? photoURL : undefined} className="object-cover" />
                            <AvatarFallback 
                                className="text-2xl font-semibold text-white" 
                                style={{ background: getAvatarGradient(profileName) }}
                            >
                                {isActualImage(photoURL) ? getInitials(profileName) : (photoURL || getInitials(profileName))}
                            </AvatarFallback>
                            </Avatar>
                            
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            {(photoURL || previousPhotoURL) ? (
                                <>
                                    <Maximize2 className="h-6 w-6 text-white mb-1" />
                                    <span className="text-[10px] text-white font-medium uppercase tracking-tight">View / Edit</span>
                                </>
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 text-white mb-1" />
                                    <span className="text-[10px] text-white font-medium uppercase tracking-tight">Upload</span>
                                </>
                            )}
                            </div>
                        </button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>{(photoURL || previousPhotoURL) ? 'View profile photo' : 'Upload profile photo'}</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>

                    <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg border-2 border-background scale-0 group-hover:scale-100 transition-transform duration-300 z-30 hover:bg-primary/90 cursor-pointer"
                    >
                    <Camera className="h-4 w-4" />
                    </button>
                </div>
                
                <div className="mt-4 space-y-1 overflow-hidden">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground truncate px-4" title={profileName}>{profileName}</h2>
                    <div className="flex flex-col items-center gap-2 mt-2">
                        <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 text-[10px] font-semibold uppercase tracking-wider bg-primary/5 border-primary/20 text-primary rounded-full">
                            <Building className="h-3 w-3" />
                            {activeCompanyName}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground font-normal truncate" title={email}>{email}</p>
                        <Badge variant="outline" className={cn(
                            "h-4 px-1.5 text-[8px] uppercase font-semibold tracking-widest",
                            displayRole === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                        )}>
                            {displayRole}
                        </Badge>
                    </div>
                </div>
                
                <div className="mt-6 flex flex-col items-center gap-3">
                    <Badge 
                    variant="outline" 
                    className={cn(
                        "flex items-center gap-1.5 py-1 px-3 text-[10px] font-semibold uppercase tracking-wider border-none rounded-full",
                        isVerified 
                        ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                    >
                    {isVerified ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {isVerified ? (isLocal ? 'Local Identity' : 'Verified Account') : 'Action Required'}
                    </Badge>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                    <Calendar className="h-3 w-3" />
                    {isLocal ? 'Local Storage Active' : `Joined ${user?.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'MMM d, yyyy') : 'N/A'}`}
                    </div>
                </div>
                </div>
            </Card>

            {previousPhotoURL && (
                <Card className="p-4 border-dashed border-2 bg-muted/5 rounded-3xl">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            <History className="h-3.5 w-3.5" />
                            Previously Used
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleRestorePrevious}>
                                        <RotateCcw className="h-3 w-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restore this photo</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex justify-center">
                        <button 
                            onClick={handleRestorePrevious}
                            className="relative group/restore cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                        >
                            <Avatar className="h-16 w-16 border-2 border-border transition-all group-hover/restore:border-primary/50 group-hover/restore:scale-105">
                                <AvatarImage src={isActualImage(previousPhotoURL) ? previousPhotoURL : undefined} className="object-cover" />
                                <AvatarFallback className="text-sm">
                                    {isActualImage(previousPhotoURL) ? 'Old' : 'N/A'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/restore:opacity-100 transition-opacity">
                                <RotateCcw className="h-5 w-5 text-white" />
                            </div>
                        </button>
                    </div>
                </Card>
            )}
            </div>
        )}

        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {!isMobile && (
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl h-auto">
                    <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer font-medium rounded-lg">General</TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer font-medium rounded-lg">Security</TabsTrigger>
                </TabsList>
            )}

            <TabsContent value="general" className="space-y-6">
              <form onSubmit={handleUpdateProfile}>
                <Card className="shadow-sm border-none lg:border rounded-3xl lg:rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <UserIcon className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-sm font-normal">Update your profile details displayed in the workspace.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isMobile && (
                        <div className="flex justify-center pb-4">
                            <div className="relative group">
                                <button 
                                    type="button"
                                    onClick={() => (photoURL || previousPhotoURL) ? setIsPreviewOpen(true) : fileInputRef.current?.click()}
                                    className="relative block cursor-pointer transition-transform duration-300 active:scale-95 rounded-full"
                                >
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-2xl relative z-10 ring-4 ring-primary/10 ring-offset-4 ring-offset-background">
                                        <AvatarImage src={isActualImage(photoURL) ? photoURL : undefined} className="object-cover" />
                                        <AvatarFallback 
                                            className="text-4xl font-semibold text-white" 
                                            style={{ background: getAvatarGradient(profileName) }}
                                        >
                                            {isActualImage(photoURL) ? getInitials(profileName) : (photoURL || getInitials(profileName))}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    className="absolute bottom-1 right-1 p-2 bg-primary text-primary-foreground rounded-full shadow-lg border-2 border-background z-20"
                                >
                                    <Camera className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {!isLocal && !user?.emailVerified && (
                      <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="font-semibold">Verification Required</AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex-1">
                            <p className="font-normal text-sm">Verify your email to secure your account and enable full features.</p>
                            <Button variant="link" onClick={handleVerifyEmail} type="button" className="h-auto p-0 text-xs font-semibold underline cursor-pointer mt-2">Resend verification email</Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="display-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display Name</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="display-name" 
                          className="pl-10 h-11 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)} 
                          placeholder="e.g. John Doe"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                            id="email" 
                            className="pl-10 h-11 bg-muted/50 cursor-not-allowed border-dashed font-normal" 
                            value={email} 
                            readOnly
                            disabled
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access Role</Label>
                        <div className="relative">
                            <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                className="pl-10 h-11 bg-muted/50 cursor-not-allowed border-dashed capitalize font-semibold" 
                                value={displayRole} 
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating || !hasChanges} className="px-8 cursor-pointer font-medium w-full sm:w-auto">
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {isLocal ? (
                  <Alert className="bg-primary/5 border-primary/20 rounded-3xl">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <AlertTitle className="font-bold">Local Security</AlertTitle>
                      <AlertDescription className="text-sm font-normal">
                          You are currently using Local Storage. Security settings like password management are handled by your browser. Sign in to enable cloud synchronization.
                      </AlertDescription>
                  </Alert>
              ) : (
                <form onSubmit={handlePasswordChange}>
                    <Card className="shadow-sm border-none lg:border rounded-3xl lg:rounded-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <KeyRound className="h-5 w-5 text-primary" />
                        Security Settings
                        </CardTitle>
                        <CardDescription className="text-sm font-normal">Keep your cloud account secure with a strong password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                        <Label htmlFor="new-pass" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New Password</Label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                            id="new-pass" 
                            type={showPass ? 'text' : 'password'}
                            className="pl-10 pr-10 h-11 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            />
                            <button 
                            type="button" 
                            onClick={() => setShowPass(!showPass)} 
                            onMouseDown={(e) => e.preventDefault()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer z-10"
                            >
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-widest text-muted-foreground">
                            <span>Password Strength</span>
                            <span className={cn(
                                "font-semibold",
                                getPasswordStrength() === 100 ? "text-green-600" : getPasswordStrength() >= 50 ? "text-amber-600" : "text-red-600"
                            )}>
                                {getPasswordStrength() === 100 ? 'Strong' : getPasswordStrength() >= 50 ? 'Medium' : 'Weak'}
                            </span>
                            </div>
                            <Progress value={getPasswordStrength()} className="h-1.5" />
                        </div>
                        </div>

                        <div className="grid gap-2">
                        <Label htmlFor="confirm-pass" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirm New Password</Label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                            id="confirm-pass" 
                            type="password"
                            className="pl-10 h-11 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            />
                        </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                        <Button type="submit" disabled={isUpdating || !newPassword} className="px-8 font-medium w-full sm:w-auto">
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                        </Button>
                    </CardFooter>
                    </Card>
                </form>
              )}

              {!isMobile && (
                  <Card className="border-destructive/20 bg-destructive/5 shadow-sm rounded-3xl">
                    <CardHeader>
                    <CardTitle className="text-destructive text-base font-semibold">Advanced Account Actions</CardTitle>
                    <CardDescription className="text-sm font-normal">Manage your session and access mode.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-2xl bg-background shadow-sm group hover:border-destructive/20 transition-colors">
                        <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-muted-foreground" />
                            {isLocal ? 'Return Home' : 'Sign out of session'}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-normal">{isLocal ? 'Go back to your workspace.' : 'End your current cloud session.'}</p>
                        </div>
                        {isLocal ? (
                            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="h-8 text-xs font-semibold px-4">Workspace</Button>
                        ) : (
                            <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold group-hover:bg-destructive group-hover:text-white transition-all cursor-pointer">Sign Out</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-semibold tracking-tight">Sign out of TaskFlow?</AlertDialogTitle>
                                        <AlertDialogDescription className="font-normal text-sm text-center">
                                            You will be returned to Local Mode. Your cloud data is safe and will sync back the next time you sign in.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col gap-2">
                                        <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90 font-semibold w-full rounded-xl h-11">Sign Out</AlertDialogAction>
                                        <AlertDialogCancel className="font-medium w-full h-11 border-none hover:bg-muted rounded-xl">Cancel</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-6">
                <Card className="shadow-sm border-none lg:border rounded-3xl lg:rounded-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Building className="h-5 w-5 text-primary" />
                            Workspace Management
                        </CardTitle>
                        <CardDescription className="text-sm font-normal">Switch between, add, or rename your organizational environments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WorkspaceListContent />
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
      {sharedDialogs}
    </div>
  );
}
