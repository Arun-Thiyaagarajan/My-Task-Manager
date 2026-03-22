
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Inbox, 
    Bell, 
    MessageSquare, 
    Rocket, 
    ChevronRight, 
    X,
    Check,
    Loader2,
    ArrowRight
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
    orderBy, 
    limit, 
    onSnapshot,
    where,
    doc,
    updateDoc
} from 'firebase/firestore';
import type { AdminNotification } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { markAdminNotificationRead } from '@/lib/data';

export function NotificationsHub() {
    const { user, userProfile, firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const isAdmin = userProfile?.role === 'admin';

    useEffect(() => {
        if (!firestore || !isAdmin || !user) return;

        const notifRef = collection(firestore, 'admin_notifications');
        const q = query(
            notifRef, 
            orderBy('timestamp', 'desc'), 
            limit(20)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AdminNotification));
            
            // Trigger toast for new notifications if not already seen
            const newItems = items.filter(n => !n.read);
            if (newItems.length > notifications.filter(n => !n.read).length) {
                const latest = newItems[0];
                if (latest) {
                    toast({
                        title: latest.title,
                        description: latest.message,
                        action: (
                            <Button size="sm" variant="outline" onClick={() => router.push(latest.link)}>
                                View
                            </Button>
                        )
                    });
                }
            }

            setNotifications(items);
            setIsLoading(false);
        });

        return () => unsub();
    }, [firestore, isAdmin, user, toast, router]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    if (!isAdmin) return null;

    const handleAction = async (notif: AdminNotification) => {
        if (!notif.read) {
            await markAdminNotificationRead(notif.id);
        }
        setIsOpen(false);
        router.push(notif.link);
    };

    const markAllRead = async () => {
        const batchPromises = notifications
            .filter(n => !n.read)
            .map(n => markAdminNotificationRead(n.id));
        await Promise.all(batchPromises);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full group">
                    <Inbox className={cn(
                        "h-5 w-5 transition-colors",
                        unreadCount > 0 ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {unreadCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
                        </div>
                    )}
                    <span className="sr-only">Admin Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[350px] p-0 overflow-hidden rounded-2xl shadow-2xl border-none bg-background/95 backdrop-blur-md">
                <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase tracking-widest px-2 h-5">ADMIN</Badge>
                        <h3 className="font-bold text-sm tracking-tight">Notification Hub</h3>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                            Mark all read
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Fetching updates...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                                <Inbox className="h-8 w-8 text-muted-foreground/20" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-foreground/80">Inbox is empty</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">No administrative actions requiring your attention.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleAction(notif)}
                                    className={cn(
                                        "w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50 relative group",
                                        !notif.read && "bg-primary/[0.02]"
                                    )}
                                >
                                    {!notif.read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                    )}
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                                        notif.type === 'user_request' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                    )}>
                                        {notif.type === 'user_request' ? <Rocket className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={cn(
                                                "text-xs font-bold truncate tracking-tight",
                                                !notif.read ? "text-foreground" : "text-muted-foreground"
                                            )}>
                                                {notif.title}
                                            </p>
                                            <span className="text-[9px] font-medium text-muted-foreground/60 whitespace-nowrap pt-0.5">
                                                {formatTimestamp(notif.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-1.5 pt-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 group-hover:text-primary transition-colors">View Details</span>
                                            <ChevronRight className="h-2.5 w-2.5 text-primary/40 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 bg-muted/10 border-t">
                    <Button 
                        onClick={() => { setIsOpen(false); router.push('/admin/feedback'); }}
                        className="w-full h-11 rounded-xl font-bold gap-2 shadow-lg"
                    >
                        <Inbox className="h-4 w-4" />
                        Go to Support Inbox
                        <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
