'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Inbox, 
    Bell, 
    MessageSquare, 
    Rocket, 
    ChevronRight, 
    X,
    Check,
    Loader2,
    ArrowRight,
    User,
    Volume2,
    VolumeX,
    ShieldCheck
} from 'lucide-react';
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { 
    collection, 
    query, 
    limit, 
    onSnapshot,
    where,
} from 'firebase/firestore';
import type { AppNotification } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { markNotificationRead, getAuthMode, getUserPreferences, updateUserPreferences } from '@/lib/data';

// Subtle professional alert sound
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

export function NotificationsHub() {
    const { user, userProfile, firestore, isUserLoading } = useFirebase();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isNavigatingId, setIsNavigatingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const initialLoadRef = useRef(true);
    const isOpenRef = useRef(false);

    const isAdmin = userProfile?.role === 'admin';
    const authMode = getAuthMode();
    const prefs = getUserPreferences();
    const isMuted = prefs.notificationSounds === false;

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.35;
        audioRef.current.load();
    }, []);

    const playNotificationSound = React.useCallback(() => {
        // Condition: Trigger only when muted is OFF and HUB is CLOSED
        if (isMuted || !audioRef.current || isOpenRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }, [isMuted]);

    useEffect(() => {
        if (!firestore || !user || authMode !== 'authenticate') {
            setIsLoading(false);
            return;
        }

        const notifRef = collection(firestore, 'notifications');
        const recipientIds = [user.uid];
        if (isAdmin) recipientIds.push('admin');

        // Fetch notifications targeting the current user UID or the global admin broadcast
        const q = query(
            notifRef, 
            where('recipientId', 'in', recipientIds),
            limit(100) 
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AppNotification));
            
            // Client-side sort: Always show newest first
            const sortedItems = items.sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            // Handle New Notification Events
            if (!initialLoadRef.current) {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const newNotif = change.doc.data() as AppNotification;
                        // Don't notify for actions the user performed themselves
                        // CRITICAL: Also don't notify if the user is ALREADY on the target page
                        const isCurrentPage = pathname === newNotif.link;
                        
                        if (newNotif.senderId !== user.uid && !isCurrentPage) {
                            playNotificationSound();
                            // Show toast if the popup is closed
                            if (!isOpenRef.current) {
                                toast({
                                    title: newNotif.title,
                                    description: newNotif.message,
                                    action: (
                                        <Button size="sm" variant="outline" onClick={() => {
                                            markNotificationRead(change.doc.id);
                                            router.push(newNotif.link);
                                        }}>
                                            View
                                        </Button>
                                    )
                                });
                            }
                        }
                    }
                });
            }

            setNotifications(sortedItems);
            setIsLoading(false);
            initialLoadRef.current = false;
        }, (error) => {
            console.error("Notifications Sync Error:", error);
            setIsLoading(false);
        });

        return () => unsub();
    }, [firestore, isAdmin, user, authMode, router, toast, playNotificationSound, pathname]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    // Show a loading/placeholder state if auth is still processing
    if (isUserLoading && !user) {
        return (
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full opacity-50 cursor-wait">
                <Inbox className="h-5 w-5 text-muted-foreground" />
            </Button>
        );
    }

    // Visibility logic: show hub always if mounted, prompt for login if not cloud
    const showAuthPrompt = authMode !== 'authenticate' || !user;

    if (showAuthPrompt) {
        return (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full group shrink-0">
                        <Inbox className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    align="end" 
                    className="w-[calc(100vw-2rem)] sm:w-[320px] p-6 rounded-[1.5rem] shadow-2xl border-none bg-background/95 backdrop-blur-md animate-in zoom-in-95 duration-200"
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
        
        setIsNavigatingId(notif.id);
        window.dispatchEvent(new Event('navigation-start'));

        // Background update for read status
        if (!notif.read) {
            markNotificationRead(notif.id);
        }
        
        setIsOpen(false);
        router.push(notif.link);
        
        // Navigation timeout safety
        setTimeout(() => setIsNavigatingId(null), 3000);
    };

    const markAllRead = () => {
        notifications
            .filter(n => !n.read)
            .forEach(n => markNotificationRead(n.id));
    };

    const toggleMute = () => {
        const newMuteState = !isMuted;
        updateUserPreferences({ notificationSounds: !newMuteState });
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
                className="w-[calc(100vw-2rem)] sm:w-[360px] p-0 overflow-hidden rounded-[1.5rem] shadow-2xl border-none bg-background/95 backdrop-blur-md animate-in zoom-in-95 duration-200"
            >
                <div className="bg-primary/5 p-4 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <h3 className="font-black text-xs uppercase tracking-[0.1em] text-foreground/80">Notifications</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleMute}
                            className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                        >
                            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </Button>
                        {unreadCount > 0 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={markAllRead} 
                                className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>
                </div>

                <div className="min-h-[180px] flex flex-col">
                    <ScrollArea className="flex-1 max-h-[420px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Syncing alerts...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-8 animate-in fade-in duration-500 min-h-[180px]">
                                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-2 shadow-inner">
                                    <Inbox className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground/60">No new alerts</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-[200px] mx-auto">
                                        Your inbox is empty. Support activity and replies will appear here.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleAction(notif)}
                                        disabled={isNavigatingId !== null}
                                        className={cn(
                                            "w-full flex items-start gap-4 p-4 text-left transition-all hover:bg-muted/50 relative group",
                                            !notif.read ? "bg-primary/[0.03]" : "opacity-80",
                                            isNavigatingId === notif.id && "bg-muted cursor-wait"
                                        )}
                                    >
                                        {!notif.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                        )}
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105",
                                            notif.type === 'user_request' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                                            notif.type === 'admin_reply' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                            "bg-primary/10 text-primary border-primary/20"
                                        )}>
                                            {isNavigatingId === notif.id ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            ) : (
                                                notif.type === 'user_request' ? <Rocket className="h-5 w-5" /> : 
                                                notif.type === 'admin_reply' ? <MessageSquare className="h-5 w-5" /> :
                                                <Bell className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className={cn(
                                                    "text-xs font-black truncate tracking-tight uppercase",
                                                    !notif.read ? "text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[9px] font-bold text-muted-foreground/40 whitespace-nowrap pt-0.5 uppercase">
                                                    {formatTimestamp(notif.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 pr-2">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-1.5 pt-1.5">
                                                {notif.senderName && (
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 mr-auto">
                                                        <User className="h-2.5 w-2.5" />
                                                        {notif.senderName}
                                                    </div>
                                                )}
                                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 group-hover:text-primary transition-colors flex items-center">
                                                    Open
                                                    <ChevronRight className="h-3 w-3 ml-0.5" />
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {isAdmin && (
                    <div className="p-4 bg-muted/20 border-t shrink-0">
                        <Button 
                            onClick={() => { setIsOpen(false); router.push('/admin/feedback'); }}
                            className="w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] gap-2 shadow-xl shadow-primary/10 group"
                        >
                            <Inbox className="h-4 w-4" />
                            Support Command Center
                            <ArrowRight className="h-3.5 w-3.5 ml-auto transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
