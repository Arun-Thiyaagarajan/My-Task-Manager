'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  LayoutDashboard, 
  Plus,
  StickyNote
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
            paddingBottom: 'env(safe-area-inset-bottom)',
            height: 'calc(5rem + env(safe-area-inset-bottom))'
          }}
        />
    );
  }

  const authMode = getAuthMode();
  const localProfile = getLocalProfile();
  
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
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(5rem + env(safe-area-inset-bottom))'
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
              "flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-colors relative",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-6 w-6", isActive && "fill-primary/10")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            {isActive && <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        );
      })}

      {/* FAB - New Task (Always Center) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-xl shadow-primary/30 -mt-12 border-4 border-background active:scale-95 transition-transform"
          onClick={() => handleNavigate('/tasks/new')}
        >
          <Plus className="h-7 w-7" />
          <span className="sr-only">New Task</span>
        </Button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2">New</span>
      </div>

      {/* Dedicated Notes Link (Replaces Bin) */}
      <button
        onClick={() => handleNavigate('/notes')}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-colors relative",
          pathname === '/notes' ? "text-primary" : "text-muted-foreground"
        )}
      >
        <StickyNote className={cn("h-6 w-6", pathname === '/notes' && "fill-primary/10")} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
        {pathname === '/notes' && <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />}
      </button>

      {/* Profile Link (Me) */}
      <div className="flex flex-col items-center justify-center flex-1 h-full">
        <button 
          onClick={() => handleNavigate('/profile')}
          className="flex flex-col items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1"
        >
          <div className={cn(
            "h-8 w-8 rounded-full border-2 flex items-center justify-center overflow-hidden transition-transform active:scale-90",
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
