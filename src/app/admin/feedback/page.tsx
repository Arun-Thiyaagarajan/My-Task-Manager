
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    MessageSquareQuote, 
    Search, 
    Filter, 
    ArrowLeft, 
    BadgeAlert, 
    Lightbulb, 
    HelpCircle,
    ChevronRight,
    Clock,
    User,
    Inbox,
    RefreshCcw,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getFeedbackAdmin } from '@/lib/data';
import type { Feedback } from '@/lib/types';
import { formatTimestamp, cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useFirebase } from '@/firebase';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminFeedbackPage() {
    const { userProfile, isUserLoading } = useFirebase();
    const router = useRouter();
    const [submissions, setSubmissions] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Feedback['status'] | 'All'>('All');

    const isAdmin = userProfile?.role === 'admin';

    const load = async () => {
        setIsLoading(true);
        const data = await getFeedbackAdmin();
        setSubmissions(data);
        setIsLoading(false);
        window.dispatchEvent(new Event('navigation-end'));
    };

    useEffect(() => {
        if (!isUserLoading && !isAdmin) {
            router.push('/');
            return;
        }
        if (isAdmin) load();
    }, [isAdmin, isUserLoading, router]);

    const handleBack = () => {
        router.push('/profile');
    };

    const handleDetail = (id: string) => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(`/feedback/${id}`);
    };

    const filtered = submissions.filter(item => {
        const matchesSearch = 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (isUserLoading || isLoading) return <LoadingSpinner text="Accessing Support Vault..." />;

    const getTypeIcon = (type: Feedback['type']) => {
        switch (type) {
            case 'Bug Report': return <BadgeAlert className="h-4 w-4 text-red-500" />;
            case 'Feature Request': return <Lightbulb className="h-4 w-4 text-amber-500" />;
            case 'Suggestion': return <MessageSquareQuote className="h-4 w-4 text-primary" />;
            default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getStatusStyle = (status: Feedback['status']) => {
        switch (status) {
            case 'Submitted': return 'bg-blue-500/10 text-blue-600 border-blue-200';
            case 'In Progress': return 'bg-purple-500/10 text-purple-600 border-purple-200';
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
            case 'Closed': return 'bg-green-500/10 text-green-600 border-green-200';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="container max-w-6xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                            <Inbox className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                            Support Inbox
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm font-medium uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" />
                            Admin Console
                        </p>
                    </div>
                </div>
                <Button onClick={load} variant="outline" className="hidden md:flex rounded-xl h-11 px-4 font-bold border-primary/20 bg-primary/5">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by title, user, or email..." 
                            className="pl-10 h-12 bg-card rounded-2xl border-none shadow-md transition-all focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Tabs value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)} className="w-full md:w-auto">
                        <TabsList className="bg-muted/50 p-1 h-12 rounded-2xl border w-full md:w-auto overflow-x-auto no-scrollbar">
                            <TabsTrigger value="All" className="rounded-xl font-bold px-4 data-[state=active]:shadow-sm">All</TabsTrigger>
                            <TabsTrigger value="Submitted" className="rounded-xl font-bold px-4 data-[state=active]:shadow-sm">New</TabsTrigger>
                            <TabsTrigger value="In Progress" className="rounded-xl font-bold px-4 data-[state=active]:shadow-sm">Active</TabsTrigger>
                            <TabsTrigger value="Resolved" className="rounded-xl font-bold px-4 data-[state=active]:shadow-sm text-emerald-600">Resolved</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center animate-in fade-in duration-500">
                        <Inbox className="h-16 w-16 text-muted-foreground/20 mb-4" />
                        <p className="text-xl font-black tracking-tight text-foreground/60">Queue is empty</p>
                        <p className="text-sm text-muted-foreground max-w-[250px] mt-1 font-medium leading-relaxed">No requests match your current filters or everything is handled.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filtered.map((item) => (
                            <Card 
                                key={item.id} 
                                className="border-none shadow-lg hover:shadow-xl transition-all active:scale-[0.99] rounded-3xl overflow-hidden group cursor-pointer bg-card"
                                onClick={() => handleDetail(item.id)}
                            >
                                <CardContent className="p-0">
                                    <div className="p-6 flex items-start gap-5">
                                        <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-primary/10 transition-colors">
                                            {getTypeIcon(item.type)}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-black text-base sm:text-lg tracking-tight truncate pr-2 group-hover:text-primary transition-colors">{item.title}</h3>
                                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2 border", getStatusStyle(item.status))}>
                                                    {item.status}
                                                </Badge>
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase h-5 px-2 bg-muted/50 border-none text-muted-foreground">
                                                    {item.priority}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/70">
                                                    <User className="h-3 w-3" />
                                                    {item.userName || 'Anonymous'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTimestamp(item.updatedAt)}
                                                </div>
                                                <div className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                                                    v{item.appVersion} • {item.type}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-6 w-6 text-muted-foreground/20 group-hover:text-primary transition-colors self-center shrink-0" />
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
