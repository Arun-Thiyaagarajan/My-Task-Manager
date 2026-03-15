
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  LayoutDashboard, 
  FileClock, 
  Trash2, 
  User as UserIcon, 
  Settings, 
  History, 
  LogOut,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { cn, getInitials, getAvatarGradient } from '@/lib/utils';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';
import { setAuthMode } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { prompt } = useUnsavedChanges();
  const { user, userProfile, auth, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const navItems = [
    { label: 'Tasks', href: '/', icon: Home },
    { label: 'Stats', href: '/dashboard', icon: LayoutDashboard },
  ];

  const handleNavigate = (href: string) => {
    if (pathname === href) return;
    prompt(() => router.push(href));
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setAuthMode('localStorage');
      toast({ variant: 'success', title: 'Signed Out', description: 'Returned to local mode.' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: error.message });
    }
  };

  const profileName = userProfile?.username || user?.displayName || user?.email || 'User';
  const profilePhoto = userProfile?.photoURL || user?.photoURL;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around h-16 px-2 safe-area-pb">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => handleNavigate(item.href)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            {isActive && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
          </button>
        );
      })}

      {/* FAB - New Task */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Button 
          size="icon" 
          className="h-12 w-12 rounded-full shadow-lg shadow-primary/30 -mt-8 border-4 border-background"
          onClick={() => handleNavigate('/tasks/new')}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">New Task</span>
        </Button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">New</span>
      </div>

      <button
        onClick={() => handleNavigate('/bin')}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
          pathname === '/bin' ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Trash2 className={cn("h-5 w-5", pathname === '/bin' && "fill-primary/10")} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Bin</span>
        {pathname === '/bin' && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
      </button>

      <div className="flex flex-col items-center justify-center flex-1 h-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 focus:outline-none">
              <div className={cn(
                "h-7 w-7 rounded-full border-2 flex items-center justify-center overflow-hidden transition-transform active:scale-90",
                user ? "border-primary" : "border-muted-foreground/20"
              )}>
                {user ? (
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profilePhoto || undefined} className="object-cover" />
                    <AvatarFallback 
                      className="text-white text-[8px] font-bold"
                      style={{ background: getAvatarGradient(profileName) }}
                    >
                      {getInitials(profileName)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Me</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold truncate">{profileName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'Local Storage Mode'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {user && (
                <DropdownMenuItem onSelect={() => handleNavigate('/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => handleNavigate('/logs')}>
                <FileClock className="mr-2 h-4 w-4" />
                <span>Activity Logs</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleNavigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleNavigate('/releases')}>
                <History className="mr-2 h-4 w-4" />
                <span>Releases</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {user ? (
              <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event('open-auth-modal'))}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Sign In</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
