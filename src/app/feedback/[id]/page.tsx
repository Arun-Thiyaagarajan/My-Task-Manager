'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    MessageSquareQuote, 
    BadgeAlert, 
    Lightbulb, 
    HelpCircle,
    ShieldCheck,
    AlertCircle,
    Calendar,
    ArrowUpCircle,
    Send,
    Loader2,
    User,
    CheckCircle2,
    Clock,
    Smartphone,
    Monitor,
    Lock,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFeedbackById, sendFeedbackMessage, updateFeedbackStatus, getAuthMode, getAppData } from '@/lib/data';
import type { Feedback, FeedbackMessage, FeedbackStatus } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Separator } from '@/components/ui/separator';
import { Globe, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function FeedbackDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, firestore, userProfile, isUserLoading } = useFirebase();
    const [item, setItem] = useState<Feedback | null>(null);
    const [messages, setMessages] = useState<FeedbackMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isAdmin = userProfile?.role === 'admin';
    const authMode = getAuthMode();
    const isLocalMode = authMode === 'localStorage';

    useEffect(() => {
        const load = async () => {
            const data = await getFeedbackById(params.id as string);
            setItem(data);
            setIsLoading(false);
            window.dispatchEvent(new Event('navigation-end'));
        };
        load();
    }, [params.id]);

    useEffect(() => {
        const mode = getAuthMode();
        
        // Handle Local Mode Messages
        if (mode === 'localStorage') {
            const loadLocalMessages = () => {
                const data = getAppData();
                const localMsgs = (data as any).localMessages?.[params.id as string] || [];
                setMessages(localMsgs);
                setTimeout(() => {
                    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }, 100);
            };
            loadLocalMessages();
            window.addEventListener('storage', loadLocalMessages);
            return () => window.removeEventListener('storage', loadLocalMessages);
        }

        // Handle Cloud Mode Messages
        if (!firestore || !params.id || isUserLoading || !user) return;

        const messagesRef = collection(firestore, 'feedback', params.id as string, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsub = onSnapshot(q, 
            (snapshot) => {
                const msgs = snapshot.docs.map(doc => doc.data() as FeedbackMessage);
                setMessages(msgs);
                // Scroll to bottom on new message
                setTimeout(() => {
                    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }, 100);
            },
            async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: messagesRef.path,
                    operation: 'list',
                });
                errorEmitter.emit('permission-error', permissionError);
            }
        );

        return () => unsub();
    }, [firestore, params.id, user, isUserLoading]);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        if (isAdmin) {
            router.push('/admin/feedback');
        } else {
            router.push('/feedback');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending || !item || item.status === 'Closed' || isLocalMode) return;

        setIsSending(true);
        try {
            await sendFeedbackMessage(item.id, newMessage.trim());
            setNewMessage('');
            if (getAuthMode() === 'localStorage') {
                const data = getAppData();
                setMessages((data as any).localMessages?.[item.id] || []);
            }
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleStatusUpdate = async (status: FeedbackStatus) => {
        if (!item) return;
        await updateFeedbackStatus(item.id, status);
        setItem(prev => prev ? { ...prev, status } : null);
    };

    if (isLoading) return <LoadingSpinner text="Loading submission details..." />;

    if (!item) {
        return (
            <div className="container max-w-lg mx-auto pt-20 px-6 text-center space-y-6">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                    <AlertCircle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Submission Not Found</h1>
                    <p className="text-muted-foreground">The feedback report you are looking for does not exist or you do not have permission to view it.</p>
                </div>
                <Button onClick={handleBack} variant="outline" className="rounded-xl px-8 h-11 font-bold">
                    Back to History
                </Button>
            </div>
        );
    }

    const getTypeIcon = (type: Feedback['type']) => {
        switch (type) {
            case 'Bug Report': return <BadgeAlert className="h-5 w-5 text-red-500" />;
            case 'Feature Request': return <Lightbulb className="h-5 w-5 text-amber-500" />;
            case 'Suggestion': return <MessageSquareQuote className="h-5 w-5 text-primary" />;
            default: return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getStatusStyle = (status: Feedback['status']) => {
        switch (status) {
            case 'Submitted': return 'bg-blue-500/10 text-blue-600 border-blue-200';
            case 'In Progress': return 'bg-purple-500/10 text-purple-600 border-purple-200';
            case 'Reviewed': return 'bg-amber-500/10 text-amber-600 border-amber-200';
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
            case 'Closed': return 'bg-green-500/10 text-green-600 border-green-200';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getPriorityStyle = (priority: Feedback['priority']) => {
        switch (priority) {
            case 'High': return 'bg-red-500/10 text-red-600 border-red-200';
            case 'Medium': return 'bg-amber-500/10 text-amber-600 border-amber-200';
            default: return 'bg-muted/50 text-muted-foreground border-muted';
        }
    };

    const isClosed = item.status === 'Closed';

    return (
        <div className="container max-w-7xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 truncate">
                        {getTypeIcon(item.type)}
                        {item.title}
                    </h1>
                    <p className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">Tracking ID: {item.id.slice(0, 8)}</p>
                </div>
                {isAdmin && (
                    <div className="hidden sm:block">
                        <Select value={item.status} onValueChange={(val: any) => handleStatusUpdate(val)}>
                            <SelectTrigger className="w-[160px] rounded-xl font-bold h-10 border-primary/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="Submitted">Submitted</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Reviewed">Reviewed</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
                {/* Left Column: Report Details */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-muted/20 py-6 px-6 sm:px-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2 border", getStatusStyle(item.status))}>
                                        {item.status}
                                    </Badge>
                                    <CardTitle className="text-xl font-black tracking-tight">{item.title}</CardTitle>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Priority</p>
                                        <Badge variant="outline" className={cn("text-[10px] font-bold h-6 px-2.5 border rounded-lg", getPriorityStyle(item.priority))}>
                                            {item.priority}
                                        </Badge>
                                    </div>
                                    <div className="h-10 w-px bg-muted-foreground/10 hidden sm:block" />
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Submitted</p>
                                        <p className="text-xs font-bold">{formatTimestamp(item.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-8">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Description</p>
                                <div className="text-base leading-relaxed text-foreground/90 font-normal prose prose-sm max-w-none">
                                    <RichTextViewer text={item.description} />
                                </div>
                            </div>

                            {item.attachments && item.attachments.length > 0 && (
                                <div className="space-y-4 pt-6 border-t border-dashed">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Original Attachments</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {item.attachments.map((att, i) => (
                                            <div key={i} className="group relative aspect-video rounded-2xl overflow-hidden border-2 border-muted bg-muted/20 shadow-sm hover:border-primary/20 transition-all">
                                                <img src={att.url} alt="" className="h-full w-full object-cover" />
                                                <a 
                                                    href={att.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <Badge variant="secondary" className="bg-white/90 text-black border-none font-bold text-[9px] uppercase">View Full</Badge>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-dashed">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Environment</p>
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <Globe className="h-4 w-4 text-primary/60" />
                                        {item.environment || 'Production'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">App Version</p>
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <ArrowUpCircle className="h-4 w-4 text-primary/60" />
                                        v{item.appVersion || '1.1.0'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Alert className={cn("rounded-3xl transition-colors", isClosed ? "bg-muted border-muted-foreground/20" : "bg-primary/5 border-primary/20")}>
                        {isClosed ? <Lock className="h-4 w-4 text-muted-foreground" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                        <AlertTitle className="text-[10px] font-black uppercase tracking-widest mb-1">
                            {isClosed ? "Conversation Locked" : "Support Status"}
                        </AlertTitle>
                        <AlertDescription className="text-xs font-medium text-muted-foreground leading-relaxed">
                            {isClosed 
                                ? "This conversation has been closed and is now read-only. If you have further issues, please open a new request."
                                : item.status === 'Resolved'
                                    ? "This issue is marked as resolved. You can still send messages if you need further clarification."
                                    : "Our support team is reviewing your report. You can send additional messages or updates using the conversation panel."}
                        </AlertDescription>
                    </Alert>
                </div>

                {/* Right Column: Conversation */}
                <div className="flex flex-col h-[600px] lg:h-[calc(100vh-200px)]">
                    <Card className="flex-1 flex flex-col border-none shadow-2xl bg-card rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b py-4 px-6 shrink-0">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <MessageSquareQuote className="h-4 w-4 text-primary" />
                                Conversation
                            </CardTitle>
                        </CardHeader>
                        
                        <ScrollArea className="flex-1 p-6" viewportRef={scrollRef}>
                            <div className="space-y-6">
                                {/* Original Message */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-3 w-3 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.userName || 'User'}</span>
                                        <span className="text-[9px] text-muted-foreground/60">{formatTimestamp(item.createdAt)}</span>
                                    </div>
                                    <div className="bg-muted/30 rounded-2xl rounded-tl-none p-4 text-sm font-medium border border-muted-foreground/10 max-w-[90%]">
                                        Reported: {item.title}
                                    </div>
                                </div>

                                {messages.map((msg) => {
                                    const isMe = user ? msg.senderId === user.uid : false;
                                    const isAdminMsg = msg.senderRole === 'admin';

                                    return (
                                        <div key={msg.id} className={cn("flex flex-col gap-2", isMe ? "items-end" : "items-start")}>
                                            <div className="flex items-center gap-2">
                                                {!isMe && (
                                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", isAdminMsg ? "bg-amber-500/10" : "bg-primary/10")}>
                                                        {isAdminMsg ? <ShieldCheck className="h-3 w-3 text-amber-600" /> : <User className="h-3 w-3 text-primary" />}
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    {isMe ? 'You' : msg.senderName}
                                                    {isAdminMsg && !isMe && <span className="text-amber-600 ml-1">(Support)</span>}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground/60">{formatTimestamp(msg.timestamp)}</span>
                                            </div>
                                            <div className={cn(
                                                "p-4 text-sm font-medium max-w-[90%] shadow-sm",
                                                isMe 
                                                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none" 
                                                    : "bg-muted rounded-2xl rounded-tl-none border border-muted-foreground/10"
                                            )}>
                                                <RichTextViewer text={msg.message} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {messages.length === 0 && (
                                    <div className="text-center py-10 opacity-40">
                                        <MessageSquareQuote className="h-10 w-10 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-6 bg-muted/10 border-t shrink-0">
                            {isLocalMode ? (
                                <div className="space-y-3 animate-in fade-in duration-500">
                                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-inner">
                                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-tight">Chat restricted</p>
                                            <p className="text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80 font-medium">
                                                Communication with our support team requires an active cloud session. Please sign in to sync and send messages.
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
                                        onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
                                    >
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Sign In / Cloud Sync
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder={isClosed ? "Conversation closed" : "Type a message..."}
                                            className="h-12 rounded-2xl bg-background border-transparent focus-visible:ring-primary/20"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            disabled={isSending || isClosed}
                                        />
                                        <Button 
                                            type="submit" 
                                            size="icon" 
                                            className="h-12 w-12 shrink-0 rounded-2xl shadow-lg"
                                            disabled={isSending || !newMessage.trim() || isClosed}
                                        >
                                            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                    {isClosed && (
                                        <p className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Lock className="h-3 w-3" />
                                            This request is closed
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
