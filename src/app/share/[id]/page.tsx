
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTaskById, getUiConfig, getDevelopers, getTesters } from '@/lib/data';
import type { Task, UiConfig, Person, Environment } from '@/lib/types';
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
    CheckCircle2
} from 'lucide-react';
import { cn, getRepoBadgeStyle, formatTimestamp, getAvatarColor, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function SharedTaskPage() {
    const params = useParams();
    const router = useRouter();
    const [task, setTask] = useState<Task | null>(null);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [developers, setDevelopers] = useState<Person[]>([]);
    const [testers, setTesters] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const taskId = params.id as string;
        const foundTask = getTaskById(taskId);
        const config = getUiConfig();
        const allDevs = getDevelopers();
        const allTesters = getTesters();

        if (foundTask) {
            setTask(foundTask);
            setUiConfig(config);
            setDevelopers(allDevs);
            setTesters(allTesters);
            document.title = `Shared: ${foundTask.title}`;
        }
        setIsLoading(false);
    }, [params.id]);

    if (isLoading) return <LoadingSpinner text="Fetching shared task..." />;

    if (!task || !uiConfig) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
                <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h1 className="text-2xl font-bold tracking-tight">Task not available</h1>
                <p className="text-muted-foreground mt-2">This task may have been removed or the link is invalid.</p>
                <Button variant="outline" className="mt-6 rounded-xl" onClick={() => router.push('/')}>Return to App</Button>
            </div>
        );
    }

    const assignedDevs = (task.developers || []).map(id => developers.find(d => d.id === id)).filter(Boolean) as Person[];
    const assignedTesters = (task.testers || []).map(id => testers.find(t => t.id === id)).filter(Boolean) as Person[];
    const relevantEnvs = (task.relevantEnvironments || []).map(name => uiConfig.environments.find(e => e.name === name)).filter(Boolean) as Environment[];

    return (
        <div className="min-h-screen bg-muted/5 pb-20">
            {/* Minimal Public Header */}
            <div className="bg-background border-b h-16 flex items-center px-6 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs shadow-sm">
                            TF
                        </div>
                        <span className="font-bold tracking-tight text-sm uppercase">Task Publication</span>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-widest px-2 h-6">Read Only</Badge>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
                {/* Header Section */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <TaskStatusBadge status={task.status} variant="prominent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            Updated {formatTimestamp(task.updatedAt, uiConfig.timeFormat)}
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">{task.title}</h1>
                    {task.summary && (
                        <p className="text-lg font-medium text-muted-foreground italic leading-relaxed border-l-4 border-primary/20 pl-4 py-1">
                            {task.summary}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        <section className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Description
                            </h2>
                            <div className="text-lg leading-relaxed text-foreground/90 bg-background p-6 rounded-3xl border shadow-sm prose prose-zinc dark:prose-invert max-w-none">
                                <RichTextViewer text={task.description} />
                            </div>
                        </section>

                        {/* Deployment Progress */}
                        {relevantEnvs.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Deployment Status
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {relevantEnvs.map(env => {
                                        const isDeployed = task.deploymentStatus?.[env.name] ?? false;
                                        const date = task.deploymentDates?.[env.name];
                                        return (
                                            <div key={env.id} className={cn(
                                                "p-4 rounded-2xl border transition-all flex items-center justify-between",
                                                isDeployed ? "bg-green-500/5 border-green-500/20" : "bg-muted/30 border-transparent"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: env.color }} />
                                                    <span className="font-bold text-sm capitalize">{env.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={isDeployed ? 'default' : 'outline'} className={cn(
                                                        "text-[9px] font-black uppercase px-2",
                                                        isDeployed ? "bg-green-600 text-white" : "text-muted-foreground"
                                                    )}>
                                                        {isDeployed ? 'Deployed' : 'Pending'}
                                                    </Badge>
                                                    {isDeployed && date && (
                                                        <p className="text-[8px] font-bold text-green-600/60 uppercase mt-1">
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

                    <div className="space-y-6">
                        {/* Task Metadata Card */}
                        <Card className="rounded-3xl border shadow-sm overflow-hidden bg-background">
                            <CardHeader className="bg-muted/20 pb-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Publication Details</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Team */}
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assigned Team</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[...assignedDevs, ...assignedTesters].map(person => (
                                                <div key={person.id} className="flex items-center gap-2 p-1 pr-3 bg-muted/30 rounded-full border border-transparent hover:border-primary/10 transition-all">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback 
                                                            className="text-[8px] font-bold text-white"
                                                            style={{ backgroundColor: `#${getAvatarColor(person.name)}` }}
                                                        >
                                                            {getInitials(person.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-bold truncate max-w-[100px]">{person.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Repositories */}
                                    {task.repositories && task.repositories.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Repositories</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {task.repositories.map(repo => (
                                                    <Badge key={repo} variant="repo" style={getRepoBadgeStyle(repo)} className="text-[10px] font-bold uppercase tracking-wider px-2 h-5">
                                                        {repo}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {task.tags && task.tags.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Labels</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {task.tags.map(tag => (
                                                    <Badge key={tag} variant="secondary" className="text-[10px] font-bold px-2 h-5 bg-muted/50 border-none">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator className="opacity-50" />

                                {/* Dates */}
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Timeline</p>
                                    <div className="space-y-2">
                                        {task.devStartDate && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground font-medium">Commencement</span>
                                                <span className="font-bold">{format(new Date(task.devStartDate), 'MMM d, yyyy')}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">System ID</span>
                                            <span className="font-mono text-[10px] font-bold opacity-40 uppercase tracking-tighter">#{task.id.split('-')[1]}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Attachments Section */}
                        {task.attachments && task.attachments.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <Paperclip className="h-4 w-4" /> Documents
                                </h2>
                                <div className="space-y-2">
                                    {task.attachments.map((att, idx) => (
                                        <a 
                                            key={idx} 
                                            href={att.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 bg-background border rounded-2xl hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    {att.type === 'image' ? <Image className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4 text-blue-500" />}
                                                </div>
                                                <span className="text-xs font-bold truncate pr-4 group-hover:text-primary transition-colors">{att.name}</span>
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="max-w-4xl mx-auto px-6 mt-20 text-center space-y-4 opacity-40">
                <Separator />
                <div className="flex flex-col items-center gap-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">Generated by TaskFlow Productivity Engine</p>
                    <p className="text-[8px] font-medium">&copy; {new Date().getFullYear()} Idea Elan Infinity Workspace</p>
                </div>
            </div>
        </div>
    );
}

import { Image } from 'lucide-react';
