'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  LayoutDashboard, 
  Plus,
  ShieldCheck
} from 'lucide-react';
import { cn, getInitials, getAvatarGradient } from '@/lib/utils';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getAuthMode, getLocalProfile } from '@/lib/data';
import { Button } from './ui/button';

const isActualImage = (url: string | null | undefined) => {
    if (!url) return false;
    return url.startsWith('data:image') || url.startsWith('http') || url.startsWith('/');
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { prompt } = useUnsavedChanges();
  const { user, userProfile } = useFirebase();
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after initial mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: 'Tasks', href: '/', icon: Home },
    { label: 'Stats', href: '/dashboard', icon: LayoutDashboard },
  ];

  const handleNavigate = (href: string) => {
    if (pathname === href) return;
    prompt(() => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(href);
    });
  };

  // Prevent hydration mismatch by returning a stable shell on the server
  if (!mounted) {
    return (
        <nav 
          className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-background/95 border-t border-border"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            height: 'calc(5.5rem + env(safe-area-inset-bottom))'
          }}
        />
    );
  }

  const authMode = getAuthMode();
  const localProfile = getLocalProfile();
  const isLocal = authMode === 'localStorage';
  
  const profileName = (authMode === 'authenticate' && user)
    ? (userProfile?.username || user?.displayName || user?.email || 'Cloud User')
    : (localProfile.username || 'Guest User');
    
  const profilePhoto = (authMode === 'authenticate' && user)
    ? (userProfile?.photoURL || (user?.photoURL === "" ? null : user?.photoURL))
    : localProfile.photoURL;

  return (
    <nav 
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-[100] bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.05)]",
        "flex items-center justify-around px-2 transform-gpu transition-all duration-300"
      )}
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        height: 'calc(5.5rem + env(safe-area-inset-bottom))'
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => handleNavigate(item.href)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
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
          className="h-12 w-12 rounded-full shadow-lg shadow-primary/30 -mt-12 border-4 border-background active:scale-95 transition-transform"
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
          "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
          pathname === '/bin' ? "text-primary" : "text-muted-foreground"
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("h-5 w-5", pathname === '/bin' && "fill-primary/10")}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        <span className="text-[10px] font-bold uppercase tracking-wider">Bin</span>
        {pathname === '/bin' && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
      </button>

      {/* Conditional Sign In or Profile */}
      {isLocal ? (
        <button
          onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative text-primary"
        >
          <ShieldCheck className="h-5 w-5 fill-primary/10" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Sync</span>
        </button>
      ) : null}

      <div className="flex flex-col items-center justify-center flex-1 h-full">
        <button 
          onClick={() => handleNavigate('/profile')}
          className="flex flex-col items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1"
        >
          <div className={cn(
            "h-7 w-7 rounded-full border-2 flex items-center justify-center overflow-hidden transition-transform active:scale-90",
            (authMode === 'authenticate' && user) ? "border-primary" : "border-muted-foreground/20"
          )}>
            <Avatar className="h-full w-full">
              <AvatarImage src={isActualImage(profilePhoto) ? profilePhoto : undefined} className="object-cover" />
              <AvatarFallback 
                className="text-white text-[8px] font-bold"
                style={{ background: getAvatarGradient(profileName) }}
              >
                {isActualImage(profilePhoto) ? getInitials(profileName) : (profilePhoto || getInitials(profileName))}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            pathname === '/profile' ? "text-primary" : "text-muted-foreground"
          )}>Me</span>
        </button>
      </div>
    </nav>
  );
}
