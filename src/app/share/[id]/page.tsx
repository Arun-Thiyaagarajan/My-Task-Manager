
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getTaskById, getUiConfig, getDevelopers, getTesters } from '@/lib/data';
import type { Task, UiConfig, Person, Environment, Attachment } from '@/lib/types';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { 
    Clock, 
    Box, 
    GitMerge, 
    Paperclip, 
    Link2, 
    ExternalLink, 
    FileText,
    ArrowLeft,
    CheckCircle2,
    X,
    FileSearch
} from 'lucide-react';
import { cn, getRepoBadgeStyle, formatTimestamp, getAvatarColor, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function SharedTaskContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [task, setTask] = useState<Task | null>(null);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [developers, setDevelopers] = useState<Person[]>([]);
    const [testers, setTesters] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const taskId = params.id as string;
        const payload = searchParams.get('p');
        
        const config = getUiConfig();
        const allDevs = getDevelopers();
        const allTesters = getTesters();
        
        setUiConfig(config);
        setDevelopers(allDevs);
        setTesters(allTesters);

        let finalTask: Task | null = null;

        // 1. Try to decode from URL payload first (Self-Sufficient approach)
        if (payload) {
            try {
                const decoded = atob(payload).split('').map((c) => 
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('');
                const snapshot = JSON.parse(decodeURIComponent(decoded));
                
                finalTask = {
                    id: taskId,
                    title: snapshot.t,
                    description: snapshot.d,
                    status: snapshot.s,
                    summary: snapshot.u,
                    tags: snapshot.g,
                    repositories: snapshot.r,
                    relevantEnvironments: snapshot.e,
                    deploymentStatus: snapshot.st,
                    deploymentDates: snapshot.dt,
                    attachments: snapshot.at?.map((a: any) => ({ name: a.n, url: a.u, type: a.t })),
                    devStartDate: snapshot.sd,
                    updatedAt: snapshot.up,
                    createdAt: snapshot.up, // fallback
                } as Task;
            } catch (e) {
                console.error("Failed to decode share payload", e);
            }
        }

        // 2. Fallback to API/Cache fetch if payload is missing or invalid
        if (!finalTask) {
            const foundTask = getTaskById(taskId);
            if (foundTask) {
                finalTask = foundTask;
            }
        }

        if (finalTask) {
            setTask(finalTask);
            document.title = `Shared: ${finalTask.title}`;
        }
        
        setIsLoading(false);
    }, [params.id, searchParams]);

    if (isLoading) return <LoadingSpinner text="Fetching shared publication..." />;

    if (!task || !uiConfig) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-muted/5">
                <div className="p-8 bg-background rounded-[2.5rem] border shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-500">
                    <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                        <X className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Task Unavailable</h1>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed font-medium">
                        This task publication may have expired, was moved to a private workspace, or the link is invalid.
                    </p>
                    <Button variant="outline" className="mt-8 w-full h-12 rounded-2xl font-bold shadow-sm" onClick={() => router.push('/')}>
                        Return to Home
                    </Button>
                </div>
            </div>
        );
    }

    const relevantEnvs = (task.relevantEnvironments || []).map(name => uiConfig.environments.find(e => e.name === name)).filter((e): e is Environment => !!e);

    return (
        <div className="min-h-screen bg-muted/5 pb-20 selection:bg-primary selection:text-white">
            {/* Minimal Public Header */}
            <div className="bg-background border-b h-16 flex items-center px-6 sticky top-0 z-50 shadow-sm">
                <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-sm shadow-lg shadow-primary/20">
                            TF
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-sm leading-none uppercase">Task Publication</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Read-Only View</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="hidden sm:flex bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] px-3 h-7">Secure Snapshot</Badge>
                        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full h-9 w-9">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 pt-12 space-y-10">
                {/* Header Section */}
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-wrap items-center gap-3">
                        <TaskStatusBadge status={task.status} variant="prominent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            Last Updated {formatTimestamp(task.updatedAt, uiConfig.timeFormat)}
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-foreground leading-tight">{task.title}</h1>
                    {task.summary && (
                        <p className="text-xl font-medium text-muted-foreground italic leading-relaxed border-l-4 border-primary/20 pl-6 py-2 bg-primary/[0.02] rounded-r-2xl">
                            {task.summary}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* Description */}
                        <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                                <FileText className="h-4 w-4" /> Description
                            </h2>
                            <div className="text-lg leading-relaxed text-foreground/90 bg-background p-8 rounded-[2.5rem] border shadow-xl prose prose-zinc dark:prose-invert max-w-none">
                                <RichTextViewer text={task.description} />
                            </div>
                        </section>

                        {/* Deployment Progress */}
                        {relevantEnvs.length > 0 && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4" /> Release Progress
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {relevantEnvs.map(env => {
                                        const isDeployed = task.deploymentStatus?.[env.name] ?? false;
                                        const date = task.deploymentDates?.[env.name];
                                        return (
                                            <div key={env.id} className={cn(
                                                "p-5 rounded-3xl border transition-all flex items-center justify-between",
                                                isDeployed ? "bg-green-500/[0.03] border-green-500/20 shadow-sm" : "bg-muted/30 border-transparent"
                                            )}>
                                                <div className="flex items-center gap-4">
                                                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: env.color }} />
                                                    <span className="font-bold text-base capitalize">{env.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={isDeployed ? 'default' : 'outline'} className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest px-3 h-6",
                                                        isDeployed ? "bg-green-600 text-white" : "text-muted-foreground border-muted-foreground/20"
                                                    )}>
                                                        {isDeployed ? 'Deployed' : 'Pending'}
                                                    </Badge>
                                                    {isDeployed && date && (
                                                        <p className="text-[9px] font-bold text-green-600/60 uppercase mt-1.5 tracking-tighter">
                                                            {format(new Date(date), 'MMM d, yyyy')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                        {/* Task Metadata Card */}
                        <Card className="rounded-[2.5rem] border shadow-2xl overflow-hidden bg-background">
                            <CardHeader className="bg-muted/20 pb-4 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Publication Details</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-8">
                                {/* Repositories */}
                                {task.repositories && task.repositories.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">System Context</p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {task.repositories.map(repo => (
                                                <Badge key={repo} variant="repo" style={getRepoBadgeStyle(repo)} className="text-[10px] font-black uppercase tracking-widest px-3 h-6 border-2">
                                                    {repo}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tags */}
                                {task.tags && task.tags.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Classification</p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {task.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-[10px] font-bold px-3 h-6 bg-muted/50 border-none rounded-full">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Separator className="opacity-50" />

                                {/* Dates */}
                                <div className="space-y-4">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Timeline</p>
                                    <div className="space-y-3 px-2">
                                        {task.devStartDate && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground font-medium">Commenced</span>
                                                <span className="font-bold tabular-nums">{format(new Date(task.devStartDate), 'MMM d, yyyy')}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground font-medium">System ID</span>
                                            <span className="font-mono text-[10px] font-black text-primary uppercase tracking-tighter bg-primary/5 px-2 py-0.5 rounded">#{task.id.split('-')[1]}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Attachments Section */}
                        {task.attachments && task.attachments.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 px-2">
                                    <Paperclip className="h-4 w-4" /> Verified Links
                                </h2>
                                <div className="space-y-3">
                                    {task.attachments.map((att, idx) => (
                                        <a 
                                            key={idx} 
                                            href={att.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-4 bg-background border rounded-3xl hover:border-primary/40 hover:bg-primary/[0.02] transition-all group shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center shrink-0 border group-hover:bg-primary/5 transition-colors">
                                                    <Link2 className="h-5 w-5 text-primary" />
                                                </div>
                                                <span className="text-sm font-bold truncate pr-4 group-hover:text-primary transition-colors">{att.name}</span>
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="max-w-5xl mx-auto px-6 mt-24 text-center space-y-6 opacity-40 hover:opacity-100 transition-opacity duration-500">
                <Separator />
                <div className="flex flex-col items-center gap-2 pb-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Published via TaskFlow Productivity Engine</p>
                    <p className="text-[9px] font-medium tracking-widest text-muted-foreground">&copy; {new Date().getFullYear()} External Communication Portal</p>
                </div>
            </div>
        </div>
    );
}

export default function SharedTaskPage() {
    return (
        <Suspense fallback={<LoadingSpinner text="Initializing secure view..." />}>
            <SharedTaskContent />
        </Suspense>
    );
}
