'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getLocalProfile,
  getUserPreferences,
  updateUserPreferences,
} from '@/lib/data';
import type { Company, UiConfig } from '@/lib/types';
import { 
  Building, 
  PlusCircle, 
  Trash2, 
  Edit, 
  LayoutDashboard, 
  Cog, 
  FileClock, 
  Home, 
  Bell, 
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Compass,
  Sparkles,
  Wand2,
  ArrowLeft,
  HelpCircle,
  Inbox,
  type LucideIcon,
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials, getAvatarGradient, cn } from '@/lib/utils';
import { AuthModal } from './auth-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationsHub } from './notifications-hub';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

const HeaderLink = ({ href, children, className, onClick, id }: { href: string; children: React.ReactNode, className?: string; onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; id?: string; }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { prompt } = useUnsavedChanges();

    // Fix: Robust Active State Detection for highlighting
    const isActive = useMemo(() => {
        if (href === '/') {
            // "Tasks" tab stays active when viewing / or nested /tasks/...
            return pathname === '/' || pathname?.startsWith('/tasks/');
        }
        // Sub-routes trigger active state for parent (e.g. /feedback/123 -> /feedback)
        return pathname === href || pathname?.startsWith(`${href}/`);
    }, [pathname, href]);

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

    return (
        <a 
            href={href} 
            onClick={handleClick} 
            className={cn(
                className,
                // Active Navigation Highlight Styling
                isActive && "text-primary bg-primary/5 font-bold shadow-[inset_0_-2px_0_0_hsl(var(--primary))]"
            )} 
            id={id}
        >
            {children}
        </a>
    );
}

type HeaderNavItem = {
    href: string;
    id: string;
    label: string;
    icon: LucideIcon;
};

const isActualImage = (url: string | null | undefined) => {
    if (!url) return false;
    return url.startsWith('data:image') || url.startsWith('http') || url.startsWith('/');
};

export function Header() {
  const isMobile = useIsMobile();
  const { auth, user, userProfile, isUserLoading, isProfileLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { prompt } = useUnsavedChanges();
  
  const [mounted, setMounted] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const activeCompanyId = useActiveCompany();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [generalRemindersCount, setGeneralRemindersCount] = useState(0);
  const { startTutorial } = useTutorial();
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isTutorialHintOpen, setIsTutorialHintOpen] = useState(false);
  const [isFeatureDiscoveryOpen, setIsFeatureDiscoveryOpen] = useState(false);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthModeState] = useState<'localStorage' | 'authenticate'>('localStorage');
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const refreshAllData = useCallback(() => {
    const config = getUiConfig();
    setCompanies(getCompanies());
    setUiConfig(config);
    setGeneralRemindersCount(getGeneralReminders().length);
    setAuthModeState(getAuthMode());
  }, []);

  const handleOpenAuth = useCallback(() => {
    if (isMobile) {
      if (!pathname.startsWith('/auth')) {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/auth');
      }
    } else {
      setIsAuthModalOpen(true);
    }
  }, [isMobile, router, pathname]);

  useEffect(() => {
    setMounted(true);
    refreshAllData();
    
    const handleSyncStart = () => setIsGlobalLoading(true);
    const handleSyncEnd = () => setIsGlobalLoading(false);
    const handleNavStart = () => setIsGlobalLoading(true);
    const handleNavEnd = () => setIsGlobalLoading(false);

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

  }, [isMobile, router, refreshAllData, handleOpenAuth]);

  useEffect(() => {
    if (!mounted) return;

    const handleInstallPromptDismissed = () => {
      const prefs = getUserPreferences();
      if (!uiConfig?.tutorialEnabled || prefs.tutorialButtonHintSeen) return;

      window.setTimeout(() => {
        setIsTutorialHintOpen(true);
      }, 350);
    };

    window.addEventListener('app-install-prompt-dismissed', handleInstallPromptDismissed);
    return () => {
      window.removeEventListener('app-install-prompt-dismissed', handleInstallPromptDismissed);
    };
  }, [mounted, uiConfig?.tutorialEnabled]);

  useEffect(() => {
    if (!mounted) return;

    const openFeatureDiscovery = () => {
      const prefs = getUserPreferences();
      if (prefs.featureDiscoverySeen) return;
      setIsFeatureDiscoveryOpen(true);
    };

    const handleShowFeatureDiscoveryPrompt = () => {
      window.setTimeout(openFeatureDiscovery, 150);
    };

    const handleTutorialClosedForFeatureDiscovery = () => {
      const pending = window.sessionStorage.getItem('taskflow_pending_feature_discovery');
      if (!pending) return;

      window.sessionStorage.removeItem('taskflow_pending_feature_discovery');
      window.setTimeout(openFeatureDiscovery, 250);
    };

    window.addEventListener('show-feature-discovery-prompt', handleShowFeatureDiscoveryPrompt);
    window.addEventListener('tutorial-closed', handleTutorialClosedForFeatureDiscovery);

    return () => {
      window.removeEventListener('show-feature-discovery-prompt', handleShowFeatureDiscoveryPrompt);
      window.removeEventListener('tutorial-closed', handleTutorialClosedForFeatureDiscovery);
    };
  }, [mounted]);

  useEffect(() => {
    const handleTutorialStepHighlighted = (event: Event) => {
      const selector = (event as CustomEvent<{ selector?: string }>).detail?.selector;
      setIsProfileMenuOpen(selector === '#header-profile-trigger');
    };

    const handleTutorialClosed = () => {
      setIsProfileMenuOpen(false);
    };

    window.addEventListener('tutorial-step-highlighted', handleTutorialStepHighlighted as EventListener);
    window.addEventListener('tutorial-closed', handleTutorialClosed);

    return () => {
      window.removeEventListener('tutorial-step-highlighted', handleTutorialStepHighlighted as EventListener);
      window.removeEventListener('tutorial-closed', handleTutorialClosed);
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
    window.dispatchEvent(new Event('navigation-start'));
    try {
      await signOut(auth);
      setAuthMode('localStorage');
      setAuthModeState('localStorage');
      toast({ variant: 'success', title: 'Signed Out', description: 'You have been logged out and returned to local mode.' });
      refreshAllData();
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: error.message });
      window.dispatchEvent(new Event('navigation-end'));
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === '/') return;
    prompt(() => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/');
    });
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId);
  
  const localProfile = getLocalProfile();
  const profileName = (authMode === 'authenticate' && user) 
    ? (userProfile?.username || user?.displayName || user?.email || 'Cloud User')
    : (localProfile.username || 'Guest User');
    
  const profilePhoto = (authMode === 'authenticate' && user)
    ? (userProfile?.photoURL || (user?.photoURL === "" ? null : user?.photoURL))
    : localProfile.photoURL;

  const showProgress = isUserLoading || isProfileLoading || isGlobalLoading;

  const handleRemindersClick = () => {
    if (isMobile) {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/reminders');
    } else {
        setIsRemindersOpen(true);
    }
  };

  const isAdmin = useMemo(() => {
    return (authMode === 'authenticate' || getAuthMode() === 'authenticate') && userProfile?.role === 'admin';
  }, [authMode, userProfile]);

  const headerNavItems: HeaderNavItem[] = [
    { href: '/', id: 'header-nav-home', label: 'Tasks', icon: Home },
    { href: '/dashboard', id: 'header-nav-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/insights', id: 'header-nav-insights', label: 'Recent', icon: Sparkles },
    { href: '/logs', id: 'header-nav-logs', label: 'Logs', icon: FileClock },
    { href: '/bin', id: 'header-nav-bin', label: 'Bin', icon: Trash2 },
    // { href: '/releases', id: 'header-nav-releases', label: 'Releases', icon: History },
  ]; 

  const handleTutorialHintOpenChange = (open: boolean) => {
    if (open) return;
    setIsTutorialHintOpen(false);
    updateUserPreferences({ tutorialButtonHintSeen: true });
    const prefs = getUserPreferences();
    if (!prefs.featureDiscoverySeen) {
      window.dispatchEvent(new Event('show-feature-discovery-prompt'));
    }
  };

  const handleTutorialHintDismiss = () => {
    setIsTutorialHintOpen(false);
    updateUserPreferences({ tutorialButtonHintSeen: true });
    const prefs = getUserPreferences();
    if (!prefs.featureDiscoverySeen) {
      window.dispatchEvent(new Event('show-feature-discovery-prompt'));
    }
  };

  const handleTutorialHintStart = () => {
    setIsTutorialHintOpen(false);
    updateUserPreferences({ tutorialButtonHintSeen: true, tutorialSeen: true });
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('taskflow_pending_feature_discovery', 'true');
    }
    startTutorial();
  };

  const handleFeatureDiscoveryOpenChange = (open: boolean) => {
    if (!open) {
      updateUserPreferences({ featureDiscoverySeen: true });
    }
    setIsFeatureDiscoveryOpen(open);
  };

  const handleFeatureDiscoveryDismiss = () => {
    setIsFeatureDiscoveryOpen(false);
    updateUserPreferences({ featureDiscoverySeen: true });
  };

  const handleFeatureDiscoveryExplore = () => {
    setIsFeatureDiscoveryOpen(false);
    updateUserPreferences({ featureDiscoverySeen: true });
    window.dispatchEvent(new Event('navigation-start'));
    router.push('/help-center');
  };

  return (
    <>
      <header id="main-header" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between relative px-4 sm:px-6">
          <div className="flex items-center gap-2 md:gap-4 lg:gap-8 min-w-0">
            <div className="flex items-center space-x-2 shrink-0">
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

              <button 
                onClick={handleLogoClick} 
                className="hidden sm:inline-block font-semibold tracking-tight text-lg whitespace-nowrap hover:text-primary transition-colors"
              >
                {uiConfig?.appName || 'Task Manager'}
              </button>
            </div>

            <nav className="hidden md:flex items-center gap-2 lg:gap-3 xl:gap-4 overflow-hidden h-14">
               {headerNavItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <HeaderLink
                      key={item.id}
                      href={item.href}
                      id={item.id}
                      className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-all group whitespace-nowrap px-3 h-full"
                    >
                      <Icon className="md:mr-0 lg:mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </HeaderLink>
                  );
               })}
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {mounted && activeCompany && !isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button id="header-workspace-trigger" variant="outline" className="px-2 sm:px-4 font-medium shadow-sm border-primary/10 bg-primary/5 hover:bg-primary/10 h-9 rounded-full transition-all">
                      <Building className="h-4 w-4 lg:mr-2 text-primary" />
                      <span className="hidden lg:inline tracking-tight truncate max-w-[100px] xl:max-w-none">{activeCompany.name}</span>
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
                                      <AlertDialogContent className="rounded-2xl overscroll-contain">
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
            
            {/* Unified Notification Hub - Prominent on both mobile and desktop for ALL users */}
            {mounted && <div className="shrink-0"><NotificationsHub /></div>}

            {/* Recent Activity Shortcut (Mobile Only) */}
            <HeaderLink href="/insights" className="md:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Recent Activity</span>
            </HeaderLink>

            <Button id="header-reminders-trigger" variant="ghost" size="icon" onClick={handleRemindersClick} className="relative h-9 w-9 rounded-full group shrink-0">
                <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                {generalRemindersCount > 0 && (
                    <div className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                    </div>
                )}
                <span className="sr-only">General Reminders</span>
            </Button>

            {uiConfig?.tutorialEnabled && (
                <div id="tutorial-trigger-wrapper" className="shrink-0">
                    <Popover open={isTutorialHintOpen} onOpenChange={handleTutorialHintOpenChange}>
                        <PopoverAnchor asChild>
                            <div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn("h-9 w-9 rounded-full group", isTutorialHintOpen && "bg-primary/10 text-primary")}
                                                onClick={() => {
                                                    if (isTutorialHintOpen) {
                                                        handleTutorialHintDismiss();
                                                    }
                                                    startTutorial();
                                                }}
                                            >
                                                <Compass className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                <span className="sr-only">Show Tour</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="font-normal">
                                            <p>Take Workspace Tour</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </PopoverAnchor>
                        <PopoverContent align="end" sideOffset={12} className="w-80 rounded-2xl border-primary/15 bg-background/95 p-0 shadow-2xl backdrop-blur">
                            <div className="space-y-4 p-5">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">Quick Tip</p>
                                    <h3 className="text-base font-semibold tracking-tight">The tour is always here</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        Use this compass button any time to restart the guided tutorial and explore the workspace again.
                                    </p>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={handleTutorialHintDismiss}>
                                        Maybe later
                                    </Button>
                                    <Button size="sm" className="rounded-xl shadow-sm" onClick={handleTutorialHintStart}>
                                        Start Tour
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            )}
            
            <div className="shrink-0"><ThemeToggle /></div>

            {/* Sign In Button - Only for Mobile, hidden on Auth page */}
            {mounted && authMode === 'localStorage' && !pathname.startsWith('/auth') && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleOpenAuth}
                    className={cn(
                        "h-9 rounded-full px-3 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-black shadow-sm flex items-center transition-all active:scale-95 sm:hidden",
                        "ml-1"
                    )}
                >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    <span>Sign In</span>
                </Button>
            )}

            <div className="hidden sm:block shrink-0">
              {mounted && (
                <DropdownMenu open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button id="header-profile-trigger" className="relative h-9 w-9 rounded-full group ring-offset-background transition-all hover:ring-2 hover:ring-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <div className={cn(
                        "flex h-full w-full items-center justify-center rounded-full border-2 transition-all overflow-hidden",
                        authMode === 'authenticate' && user ? "border-primary p-0.5" : "border-muted-foreground/20"
                      )}>
                        <Avatar className="h-full w-full">
                          <AvatarImage src={isActualImage(profilePhoto) ? profilePhoto : undefined} className="object-cover" />
                          <AvatarFallback 
                            className="text-white text-[10px] font-semibold"
                            style={{ background: getAvatarGradient(profileName) }}
                          >
                            {isActualImage(profilePhoto) ? getInitials(profileName) : (profilePhoto || getInitials(profileName))}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent id="header-profile-menu" className="w-60 p-2 rounded-xl shadow-xl" align="end" sideOffset={8}>
                    <DropdownMenuLabel className="font-normal p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none truncate tracking-tight">
                          {profileName}
                        </p>
                        <p className="text-[10px] leading-none text-muted-foreground truncate font-medium uppercase tracking-wider">
                          {authMode === 'authenticate' && user ? (user.email || user.phoneNumber) : 'Local Mode: Data in Browser'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuGroup className="space-y-1">
                      <DropdownMenuItem 
                          id="header-profile-menu-profile"
                          onSelect={() => {
                              if (pathname === '/profile') return;
                              prompt(() => { 
                                  window.dispatchEvent(new Event('navigation-start')); 
                                  router.push('/profile'); 
                              });
                          }} 
                          className="rounded-lg font-medium py-2"
                      >
                          <UserIcon className="mr-2 h-4 w-4 opacity-70" />
                          <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                          id="header-profile-menu-settings"
                          onSelect={() => {
                            if (pathname === '/settings') return;
                            prompt(() => { 
                                  window.dispatchEvent(new Event('navigation-start')); 
                                  router.push('/settings'); 
                              });
                          }}
                          className="rounded-lg font-medium py-2"
                      >
                          <Cog className="mr-2 h-4 w-4 opacity-70" />
                          <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                          id="header-profile-menu-help"
                          onSelect={() => {
                              if (pathname === '/about') return;
                              prompt(() => { 
                                  window.dispatchEvent(new Event('navigation-start')); 
                                  router.push('/about'); 
                              });
                          }} 
                          className="rounded-lg font-medium py-2"
                      >
                          <HelpCircle className="mr-2 h-4 w-4 opacity-70" />
                          <span>Help & About</span>
                      </DropdownMenuItem>
                      {!(authMode === 'authenticate' && user) && (
                        <DropdownMenuItem id="header-profile-menu-signin" onSelect={handleOpenAuth} className="rounded-lg font-semibold text-primary focus:bg-primary/5 focus:text-primary py-2">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          <span>Sign In / Cloud Sync</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    {authMode === 'authenticate' && user && (
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
              )}
            </div>
          </div>
          
          {showProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden bg-primary/10">
              <div className="h-full bg-primary animate-loading-bar" />
            </div>
          )}
        </div>
      </header>

      <Dialog open={isFeatureDiscoveryOpen} onOpenChange={handleFeatureDiscoveryOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="items-center text-center">
            <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-semibold">Explore Available Features</DialogTitle>
            <DialogDescription className="font-normal max-w-md">
              Explore what is available across TaskFlow and quickly discover where each feature lives in the workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Wand2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">See what is available</p>
                <p className="text-xs text-muted-foreground">Browse reminders, notes, dashboards, export tools, settings modules, and more in one place.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <HelpCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Find the right page faster</p>
                <p className="text-xs text-muted-foreground">Open the feature explorer when you want a quick guide to available features without restarting the full tutorial.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-center sm:justify-center gap-2 pt-4">
            <Button variant="ghost" onClick={handleFeatureDiscoveryDismiss} className="font-normal">Later</Button>
            <Button onClick={handleFeatureDiscoveryExplore} className="font-medium">
              Explore Features
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
        <AlertDialogContent className="rounded-2xl overscroll-contain">
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
      
      {!isMobile && (
        <GeneralRemindersDialog
            isOpen={isRemindersOpen}
            onOpenChange={setIsRemindersOpen}
        />
      )}

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
