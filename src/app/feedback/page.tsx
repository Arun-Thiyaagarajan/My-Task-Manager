'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    MessageSquareQuote, 
    Clock, 
    ChevronRight, 
    Plus,
    History,
    Mail,
    BadgeAlert,
    Lightbulb,
    HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMyFeedback } from '@/lib/data';
import type { Feedback } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useFirebase } from '@/firebase';

export default function FeedbackPage() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const { userProfile } = useFirebase();
    const [submissions, setSubmissions] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isAdmin = userProfile?.role === 'admin';

    const load = async () => {
        const data = await getMyFeedback();
        setSubmissions(data);
        setIsLoading(false);
        window.dispatchEvent(new Event('navigation-end'));
    };

    useEffect(() => {
        load();
    }, []);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/about');
    };

    const handleNewFeedback = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/feedback/new');
    };

    const handleDetailNavigate = (id: string) => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(`/feedback/${id}`);
    };

    const getStatusStyle = (status: Feedback['status']) => {
        switch (status) {
            case 'Submitted': return 'bg-blue-500/10 text-blue-600 border-blue-200';
            case 'Reviewed': return 'bg-amber-500/10 text-amber-600 border-amber-200';
            case 'Closed': return 'bg-green-500/10 text-green-600 border-green-200';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getTypeIcon = (type: Feedback['type']) => {
        switch (type) {
            case 'Bug Report': return <BadgeAlert className="h-4 w-4 text-red-500" />;
            case 'Feature Request': return <Lightbulb className="h-4 w-4 text-amber-500" />;
            case 'Suggestion': return <MessageSquareQuote className="h-4 w-4 text-primary" />;
            default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
        }
    };

    if (isLoading) return <LoadingSpinner text="Loading submissions..." />;

    return (
        <div className="container max-w-4xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 sm:gap-3">
                            <MessageSquareQuote className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                            Support Hub
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage your feedback and support requests.</p>
                    </div>
                </div>
                {!isAdmin && (
                    <Button onClick={handleNewFeedback} className="w-full sm:w-auto h-11 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-2 px-1">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">My Submissions</h2>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold ml-auto">{submissions.length}</Badge>
                </div>

                {submissions.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 opacity-20">
                            <Mail className="h-8 w-8" />
                        </div>
                        <p className="text-muted-foreground font-bold tracking-tight">No active requests.</p>
                        <p className="text-xs text-muted-foreground/60 max-w-[200px] mt-1">
                            {isAdmin ? 'Admins manage user submissions in the Support Inbox.' : 'Submit a feedback or bug report to see it tracked here.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {submissions.map((item) => (
                            <Card 
                                key={item.id} 
                                className="border-muted/60 shadow-sm hover:shadow-md transition-all active:scale-[0.99] rounded-2xl overflow-hidden group cursor-pointer"
                                onClick={() => handleDetailNavigate(item.id)}
                            >
                                <CardContent className="p-0">
                                    <div className="p-5 flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-sm truncate pr-2">{item.title}</h3>
                                                <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest h-4 px-1.5 border", getStatusStyle(item.status))}>
                                                    {item.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 font-normal">{item.description}</p>
                                            <div className="flex items-center gap-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimestamp(item.createdAt)}</span>
                                                <span className="flex items-center gap-1 capitalize">• {item.type}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground/20 group-hover:text-primary transition-colors self-center shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
