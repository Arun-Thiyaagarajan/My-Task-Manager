'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Icons } from './icons';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  getCompanies,
  setActiveCompanyId,
  deleteCompany,
  getUiConfig,
  getGeneralReminders,
  getAuthMode,
  setAuthMode,
} from '@/lib/data';
import type { Company, UiConfig } from '@/lib/types';
import { 
  Building, 
  PlusCircle, 
  Trash2, 
  Edit, 
  LayoutDashboard, 
  Cog, 
  Menu, 
  FileClock, 
  Home, 
  Bell, 
  GraduationCap, 
  History,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Smartphone,
  Database,
  Lock
} from 'lucide-react';
import { CompaniesManager } from './companies-manager';
import { useToast } from '@/hooks/use-toast';
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
import { useActiveCompany } from '@/hooks/use-active-company';
import { ThemeToggle } from './theme-toggle';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useRouter, usePathname } from 'next/navigation';
import { ImagePreviewDialog } from './image-preview-dialog';
import { GeneralRemindersDialog } from './general-reminders-dialog';
import { useTutorial } from '@/hooks/use-tutorial';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials, getAvatarColor, getAvatarGradient, cn } from '@/lib/utils';
import { AuthModal } from './auth-modal';

const HeaderLink = ({ href, children, className, onClick, id }: { href: string; children: React.ReactNode, className?: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; id?: string; }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { prompt } = useUnsavedChanges();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) {
            onClick(e);
            if (e.defaultPrevented) {
                return;
            }
        }
        if (pathname === href) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        prompt(() => {
            window.dispatchEvent(new Event('navigation-start'));
            router.push(href);
        });
    };

    return <a href={href} onClick={handleClick} className={className} id={id}>{children}</a>;
}


export function Header() {
  const { auth, user, userProfile, isUserLoading, isProfileLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { prompt } = useUnsavedChanges();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const activeCompanyId = useActiveCompany();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [generalRemindersCount, setGeneralRemindersCount] = useState(0);
  const { startTutorial } = useTutorial();
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthModeState] = useState<'localStorage' | 'authenticate'>('localStorage');
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const refreshAllData = () => {
    const config = getUiConfig();
    setCompanies(getCompanies());
    setUiConfig(config);
    setGeneralRemindersCount(getGeneralReminders().length);
    setAuthModeState(getAuthMode());
  };

  useEffect(() => {
    refreshAllData();
    
    const handleSyncStart = () => setIsGlobalLoading(true);
    const handleSyncEnd = () => setIsGlobalLoading(false);
    const handleNavStart = () => setIsGlobalLoading(true);
    const handleNavEnd = () => setIsGlobalLoading(false);
    const handleOpenAuth = () => setIsAuthModalOpen(true);

    window.addEventListener('company-changed', refreshAllData);
    window.addEventListener('storage', refreshAllData);
    window.addEventListener('sync-start', handleSyncStart);
    window.addEventListener('sync-end', handleSyncEnd);
    window.addEventListener('navigation-start', handleNavStart);
    window.addEventListener('navigation-end', handleNavEnd);
    window.addEventListener('open-auth-modal', handleOpenAuth);

    return () => {
        window.removeEventListener('company-changed', refreshAllData);
        window.removeEventListener('storage', refreshAllData);
        window.removeEventListener('sync-start', handleSyncStart);
        window.removeEventListener('sync-end', handleSyncEnd);
        window.removeEventListener('navigation-start', handleNavStart);
        window.removeEventListener('navigation-end', handleNavEnd);
        window.removeEventListener('open-auth-modal', handleOpenAuth);
    };

  }, []);
  
  const isDataURI = (str: string | null | undefined): str is string => !!str && str.startsWith('data:image');

  const handleCompanyChange = (id: string) => {
    setActiveCompanyId(id);
    window.dispatchEvent(new Event('company-changed'));
  };

  const handleAddCompany = () => {
    setCompanyToEdit(null);
    setIsManagerOpen(true);
  };
  
  const handleEditCompany = (company: Company) => {
      setCompanyToEdit(company);
      setIsManagerOpen(true);
  }
  
  const handleDeleteCompany = (id: string) => {
      if(deleteCompany(id)) {
          toast({title: 'Company Deleted', description: 'The company has been successfully removed.'});
          window.dispatchEvent(new Event('company-changed'));
      } else {
          toast({variant: 'destructive', title: 'Error', description: 'Cannot delete the only company.'});
      }
  }

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setAuthMode('localStorage');
      setAuthModeState('localStorage');
      toast({ variant: 'success', title: 'Signed Out', description: 'You have been logged out and returned to local mode.' });
      refreshAllData();
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: error.message });
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  const profileName = userProfile?.username || user?.displayName || user?.email || 'User';
  const profilePhoto = userProfile?.photoURL || user?.photoURL;

  const showProgress = isUserLoading || isProfileLoading || isGlobalLoading;

  return (
    <>
      <header id="main-header" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between relative px-4 sm:px-6">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center space-x-2">
                {uiConfig?.appIcon && isDataURI(uiConfig.appIcon) ? (
                    <button onClick={() => setIsImagePreviewOpen(true)} className="flex-shrink-0 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-transform active:scale-95">
                        <img src={uiConfig.appIcon} alt="App Icon" className="h-6 w-6 object-contain rounded-md shadow-sm" />
                        <span className="sr-only">Show app icon preview</span>
                    </button>
                ) : uiConfig?.appIcon ? (
                     <span className="text-2xl h-6 w-6 flex items-center justify-center drop-shadow-sm">{uiConfig.appIcon}</span>
                ) : (
                    <Icons.logo className="h-6 w-6 text-primary drop-shadow-sm" />
                )}

              <HeaderLink href="/" className="hidden sm:inline-block">
                <span className="font-semibold tracking-tight text-lg">{uiConfig?.appName || 'Task Manager'}</span>
              </HeaderLink>
            </div>

            <nav className="hidden md:flex items-center gap-6">
               <HeaderLink href="/" id="header-nav-home" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <Home className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                  Tasks
               </HeaderLink>
               <HeaderLink href="/dashboard" id="header-nav-dashboard" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <LayoutDashboard className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                  Dashboard
               </HeaderLink>
               <HeaderLink href="/settings" id="header-nav-settings" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <Cog className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                  Settings
               </HeaderLink>
               <HeaderLink href="/releases" id="header-nav-releases" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <History className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                  Releases
               </HeaderLink>
               <HeaderLink href="/logs" id="header-nav-logs" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <FileClock className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                  Logs
               </HeaderLink>
               <HeaderLink href="/bin" id="header-nav-bin" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <Trash2 className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                  Bin
               </HeaderLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {activeCompany && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="px-3 sm:px-4 font-medium shadow-sm border-primary/10 bg-primary/5 hover:bg-primary/10 h-9 rounded-full transition-all">
                      <Building className="h-4 w-4 sm:mr-2 text-primary" />
                      <span className="hidden sm:inline tracking-tight">{activeCompany.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Switch Company</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={activeCompanyId} onValueChange={handleCompanyChange}>
                      {companies.map((company) => (
                          <DropdownMenuRadioItem key={company.id} value={company.id} className="rounded-lg font-medium py-2">
                              {company.name}
                          </DropdownMenuRadioItem>
                      ))}
                  </DropdownMenuRadioGroup>

                  <DropdownMenuSeparator className="my-2" />
                  
                  <DropdownMenuGroup className="space-y-1">
                      <DropdownMenuItem onSelect={handleAddCompany} className="rounded-lg font-semibold text-primary focus:bg-primary/5 focus:text-primary">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <span>Add New Company</span>
                      </DropdownMenuItem>
                      <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mt-2">Manage</DropdownMenuLabel>
                      {companies.map((company) => (
                          <DropdownMenuItem key={company.id} onSelect={e => e.preventDefault()} className="flex justify-between items-center pr-1 rounded-lg">
                              <span className="flex-1 truncate pr-2 font-normal">{company.name}</span>
                              <div className="flex items-center gap-0.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }}>
                                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10" onClick={e => e.stopPropagation()}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-2xl">
                                          <AlertDialogHeader>
                                              <AlertDialogTitle className="font-semibold tracking-tight">Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription className="font-normal">
                                                  This action cannot be undone. This will permanently delete the company and all its tasks.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter className="pt-4 gap-2">
                                              <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteCompany(company.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl font-semibold px-6">
                                                  Delete Company
                                              </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </div>
                          </DropdownMenuItem>
                      ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {uiConfig?.tutorialEnabled && (
                <div id="tutorial-trigger-wrapper">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => startTutorial()}>
                                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                                <span className="sr-only">Show Tutorial</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="font-normal">
                            <p>Start Tutorial</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsRemindersOpen(true)} className="relative h-9 w-9 rounded-full group">
                <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                {generalRemindersCount > 0 && (
                    <div className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                    </div>
                )}
                <span className="sr-only">General Reminders</span>
            </Button>
            
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative h-10 w-10 rounded-full group ring-offset-background transition-all hover:ring-2 hover:ring-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <div className={cn(
                      "flex h-full w-full items-center justify-center rounded-full border-2 transition-all overflow-hidden",
                      authMode === 'authenticate' && user ? "border-primary p-0.5" : "border-muted-foreground/20"
                    )}>
                      {authMode === 'authenticate' && user ? (
                        <Avatar className="h-full w-full">
                          <AvatarImage src={profilePhoto || undefined} className="object-cover" />
                          <AvatarFallback 
                            className="text-white text-[10px] font-semibold"
                            style={{ background: getAvatarGradient(profileName) }}
                          >
                            {getInitials(profileName)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 p-2 rounded-xl shadow-xl" align="end" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none truncate tracking-tight">
                        {authMode === 'authenticate' && user ? (profileName) : 'Guest User'}
                      </p>
                      <p className="text-[10px] leading-none text-muted-foreground truncate font-medium uppercase tracking-wider">
                        {authMode === 'authenticate' && user ? (user.email || user.phoneNumber) : 'Local Mode: Data in Browser'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuGroup className="space-y-1">
                    {authMode === 'authenticate' && user ? (
                      <DropdownMenuItem onSelect={() => prompt(() => { window.dispatchEvent(new Event('navigation-start')); router.push('/profile'); })} className="rounded-lg font-medium py-2">
                        <UserIcon className="mr-2 h-4 w-4 opacity-70" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => setIsAuthModalOpen(true)} className="rounded-lg font-semibold text-primary focus:bg-primary/5 focus:text-primary py-2">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>Sign In / Cloud Sync</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  {authMode === 'authenticate' && (
                    <>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsSignOutDialogOpen(true); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg font-semibold py-2">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ThemeToggle />
          </div>
          
          {/* Navbar Bottom Progress Bar */}
          {showProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden bg-primary/10">
              <div className="h-full bg-primary animate-loading-bar" />
            </div>
          )}
        </div>
      </header>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onOpenChange={setIsAuthModalOpen} 
        onSuccess={() => {
          setAuthMode('authenticate');
          setAuthModeState('authenticate');
          window.dispatchEvent(new Event('company-changed'));
        }} 
      />

      <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold tracking-tight">Sign Out Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="font-normal">
              You will be returned to Local Mode. Your cloud data is safe and will sync back the next time you sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-2">
            <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90 rounded-xl font-semibold px-6">
                Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompaniesManager 
        isOpen={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        onSuccess={() => {
            window.dispatchEvent(new Event('company-changed'));
        }}
        companyToEdit={companyToEdit}
      />
      <GeneralRemindersDialog
        isOpen={isRemindersOpen}
        onOpenChange={setIsRemindersOpen}
      />
      {uiConfig?.appIcon && isDataURI(uiConfig.appIcon) && (
        <ImagePreviewDialog
            isOpen={isImagePreviewOpen}
            onOpenChange={setIsImagePreviewOpen}
            imageUrl={uiConfig.appIcon}
            imageName={`${uiConfig.appName || 'App'} Icon`}
        />
      )}
    </>
  );
}
