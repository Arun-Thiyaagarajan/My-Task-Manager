
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Inbox, 
    Bell, 
    MessageSquare, 
    Rocket, 
    ChevronRight, 
    Volume2,
    VolumeX,
    ShieldCheck,
    User,
    Loader2
} from 'lucide-react';
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import type { AppNotification } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { markNotificationRead, getAuthMode, getUserPreferences, updateUserPreferences, getAppData } from '@/lib/data';

export function NotificationsHub() {
    const { user, userProfile, isUserLoading } = useFirebase();
    const router = useRouter();
    const pathname = usePathname();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isNavigatingId, setIsNavigatingId] = useState<string | null>(null);
    
    const [isMuted, setIsMuted] = useState(getUserPreferences().notificationSounds === false);

    useEffect(() => {
        const handlePrefsChange = () => {
            setIsMuted(getUserPreferences().notificationSounds === false);
        };
        window.addEventListener('preferences-changed', handlePrefsChange);
        return () => window.removeEventListener('preferences-changed', handlePrefsChange);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const loadNotifications = () => {
            const data = getAppData();
            const items = data.notifications || [];
            
            const sortedItems = [...items].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            setNotifications(sortedItems);
            setIsLoading(false);
        };

        loadNotifications();

        window.addEventListener('company-changed', loadNotifications);
        window.addEventListener('storage', loadNotifications);

        return () => {
            window.removeEventListener('company-changed', loadNotifications);
            window.removeEventListener('storage', loadNotifications);
        };
    }, [user]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    if (isUserLoading && !user) {
        return (
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full opacity-50 cursor-wait">
                <Inbox className="h-5 w-5 text-muted-foreground" />
            </Button>
        );
    }

    const authMode = getAuthMode();

    if (authMode !== 'authenticate' || !user) {
        return (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full group shrink-0">
                        <Inbox className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    align="end" 
                    className="w-[calc(100vw-2rem)] sm:w-[320px] p-6 rounded-[1.5rem] shadow-2xl border border-primary/10 bg-background/95 backdrop-blur-md animate-in zoom-in-95 duration-200"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black uppercase tracking-tight">Cloud Sync Required</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                                Real-time notifications and support alerts are only available in Cloud mode. Sign in to stay updated.
                            </p>
                        </div>
                        <Button 
                            className="w-full font-black text-[10px] uppercase tracking-widest h-11 rounded-xl shadow-lg shadow-primary/20"
                            onClick={() => { setIsOpen(false); window.dispatchEvent(new Event('open-auth-modal')); }}
                        >
                            Sign In / Connect
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    const handleAction = (notif: AppNotification) => {
        if (isNavigatingId) return;
        
        if (pathname === notif.link) {
            setIsOpen(false);
            if (!notif.read) {
                markNotificationRead(notif.id);
            }
            return;
        }

        setIsNavigatingId(notif.id);
        window.dispatchEvent(new Event('navigation-start'));

        if (!notif.read) {
            markNotificationRead(notif.id);
        }
        
        setIsOpen(false);

        const fromPath = pathname || '/';
        const separator = notif.link.includes('?') ? '&' : '?';
        const targetWithReturn = `${notif.link}${separator}from=${encodeURIComponent(fromPath)}`;

        if (notif.link.startsWith('/feedback/')) {
            router.replace(targetWithReturn);
        } else {
            router.push(targetWithReturn);
        }
        
        setTimeout(() => setIsNavigatingId(null), 3000);
    };

    const markAllRead = () => {
        notifications
            .filter(n => !n.read)
            .forEach(n => markNotificationRead(n.id));
    };

    const toggleMute = () => {
        const nextMuteState = !isMuted;
        setIsMuted(nextMuteState);
        updateUserPreferences({ notificationSounds: !nextMuteState });
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full group shrink-0">
                    <Inbox className={cn(
                        "h-5 w-5 transition-all duration-300",
                        unreadCount > 0 ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {unreadCount > 0 && (
                        <div className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border border-background"></span>
                        </div>
                    )}
                    <span className="sr-only">Notification Hub</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                align="end" 
                className="w-[calc(100vw-1.5rem)] sm:w-[380px] max-h-[85vh] p-0 rounded-[2rem] shadow-2xl border border-primary/10 bg-background/95 backdrop-blur-md animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* Fixed Header */}
                <div className="bg-primary/5 p-5 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground/80">Inbox</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleMute}
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors rounded-full"
                        >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        {unreadCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={markAllRead} 
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors rounded-full"
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar scroll-smooth p-3 space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Reconciling alerts...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4 text-center px-10 animate-in fade-in duration-500">
                            <div className="h-20 w-20 rounded-[2.5rem] bg-muted/30 flex items-center justify-center mb-2 shadow-inner rotate-3">
                                <Inbox className="h-10 w-10 text-muted-foreground/20" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-base font-black tracking-tight text-foreground/60">No new alerts</p>
                                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed uppercase tracking-widest">
                                    Support activity and system updates will appear here in real-time.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5 pb-4">
                            {notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleAction(notif)}
                                    disabled={isNavigatingId !== null}
                                    className={cn(
                                        "w-full flex items-start gap-4 p-4 text-left transition-all rounded-[1.25rem] border border-transparent relative group animate-in slide-in-from-top-2 duration-300",
                                        !notif.read 
                                            ? "bg-primary/[0.04] border-primary/10 shadow-sm" 
                                            : "bg-card border-muted/40 opacity-70 hover:opacity-100",
                                        isNavigatingId === notif.id && "bg-muted cursor-wait"
                                    )}
                                >
                                    {!notif.read && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full ml-1.5 shadow-[0_0_8px_rgba(61,90,254,0.5)]" />
                                    )}
                                    
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-transform group-hover:scale-105",
                                        notif.type === 'user_request' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                                        notif.type === 'admin_reply' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                        "bg-primary/10 text-primary border-primary/20"
                                    )}>
                                        {isNavigatingId === notif.id ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        ) : (
                                            notif.type === 'user_request' ? <Rocket className="h-6 w-6" /> : 
                                            notif.type === 'admin_reply' ? <MessageSquare className="h-6 w-6" /> :
                                            <Bell className="h-6 w-6" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={cn(
                                                "text-xs tracking-tight uppercase leading-tight",
                                                !notif.read ? "font-black text-foreground" : "font-bold text-muted-foreground"
                                            )}>
                                                {notif.title}
                                            </p>
                                            <span className="text-[9px] font-black text-muted-foreground/40 whitespace-nowrap pt-0.5 uppercase tracking-tighter">
                                                {notif.timestamp ? formatTimestamp(notif.timestamp) : 'Now'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 pr-4 font-medium">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-2 pt-2">
                                            {notif.senderName && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mr-auto">
                                                    <User className="h-2.5 w-2.5" />
                                                    {notif.senderName}
                                                </div>
                                            )}
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 group-hover:text-primary transition-colors flex items-center">
                                                OPEN <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                {userProfile?.role === 'admin' && notifications.length > 0 && (
                    <div className="p-5 bg-muted/20 border-t shrink-0">
                        <Button 
                            onClick={() => { setIsOpen(false); router.push('/admin/feedback'); }}
                            className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] gap-2 shadow-2xl shadow-primary/20 group"
                        >
                            <Inbox className="h-4 w-4" />
                            Support Inbox
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
