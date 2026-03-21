'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    Clock, 
    MessageSquareQuote, 
    BadgeAlert, 
    Lightbulb, 
    HelpCircle,
    Smartphone,
    Monitor,
    ShieldCheck,
    AlertCircle,
    Info,
    Calendar,
    ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFeedbackById } from '@/lib/data';
import type { Feedback } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Separator } from '@/components/ui/separator';

export default function FeedbackDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Feedback | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getFeedbackById(params.id as string);
            setItem(data);
            setIsLoading(false);
            window.dispatchEvent(new Event('navigation-end'));
        };
        load();
    }, [params.id]);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/feedback');
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
            case 'Reviewed': return 'bg-amber-500/10 text-amber-600 border-amber-200';
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

    return (
        <div className="container max-w-3xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        Report Details
                    </h1>
                    <p className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">Tracking ID: {item.id.slice(0, 8)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-muted/20 py-6 px-6 sm:px-8">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1 min-w-0">
                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2 border mb-2", getStatusStyle(item.status))}>
                                        {item.status}
                                    </Badge>
                                    <CardTitle className="text-2xl font-black tracking-tight leading-tight">{item.title}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</p>
                                <div className="text-base leading-relaxed text-foreground/90 font-normal">
                                    <RichTextViewer text={item.description} />
                                </div>
                            </div>

                            {item.attachments && item.attachments.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-dashed">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attachments</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {item.attachments.map((att, i) => (
                                            <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-muted bg-muted/20 shadow-sm hover:border-primary/20 transition-all">
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
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border-none shadow-lg bg-card rounded-3xl overflow-hidden">
                        <CardHeader className="pb-3"><CardTitle className="text-sm font-black uppercase tracking-widest text-primary/60">Metadata</CardTitle></CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Priority</p>
                                <Badge variant="outline" className={cn("text-[10px] font-bold h-6 px-2.5 border rounded-lg w-full justify-center", getPriorityStyle(item.priority))}>
                                    {item.priority} Priority
                                </Badge>
                            </div>
                            
                            <Separator className="opacity-50" />

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Submitted</p>
                                        <p className="text-xs font-bold truncate">{formatTimestamp(item.createdAt)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                        <ArrowUpCircle className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">App Version</p>
                                        <p className="text-xs font-bold truncate">v{item.appVersion || '1.1.0'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                        <Globe className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Environment</p>
                                        <p className="text-xs font-bold truncate">{item.environment || 'Production'}</p>
                                    </div>
                                </div>
                            </div>

                            {item.contactEmail && (
                                <>
                                    <Separator className="opacity-50" />
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Contact For Follow-up</p>
                                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20 overflow-hidden">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <p className="text-xs font-bold truncate text-foreground/80">{item.contactEmail}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Alert className="bg-primary/5 border-primary/20 rounded-3xl">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Secure Tracking</AlertTitle>
                        <AlertDescription className="text-xs font-medium text-muted-foreground leading-relaxed">
                            Our team reviews all reports within 48 hours. You'll be notified via email of any updates.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}
