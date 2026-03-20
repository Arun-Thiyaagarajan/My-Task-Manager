'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getTaskById, getUiConfig } from '@/lib/data';
import type { Task, UiConfig, Person, Environment, Attachment, FieldConfig } from '@/lib/types';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { TaskStatusBadge, getStatusConfig } from '@/components/task-status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    FileSearch,
    ListChecks,
    Users,
    Code2,
    ClipboardCheck,
    MessageSquare
} from 'lucide-react';
import { cn, getRepoBadgeStyle, formatTimestamp, getAvatarColor, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PrLinksGroup } from '@/components/pr-links-group';
import { CommentsSection } from '@/components/comments-section';

function SharedTaskContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [task, setTask] = useState<Task | null>(null);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [fieldLabels, setFieldLabels] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const taskId = params.id as string;
        const payload = searchParams.get('p');
        const config = getUiConfig();
        setUiConfig(config);

        let finalTask: Task | null = null;
        let finalLabels: Record<string, string> = {};

        if (payload) {
            try {
                const decoded = atob(payload).split('').map((c) => 
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('');
                const snapshot = JSON.parse(decodeURIComponent(decoded));
                
                finalLabels = snapshot.lb || {};
                
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
                    devEndDate: snapshot.ed,
                    qaStartDate: snapshot.qsd,
                    qaEndDate: snapshot.qed,
                    customFields: snapshot.cf,
                    developers: snapshot.dv, // Snapshot contains names
                    testers: snapshot.ts, // Snapshot contains names
                    prLinks: snapshot.pr,
                    azureWorkItemId: snapshot.az,
                    updatedAt: snapshot.up,
                    createdAt: snapshot.up,
                    comments: snapshot.cm || []
                } as Task;
            } catch (e) {
                console.error("Failed to decode share payload", e);
            }
        }

        if (!finalTask) {
            const foundTask = getTaskById(taskId);
            if (foundTask) {
                finalTask = foundTask;
                // Use app's current labels as fallback
                config.fields.forEach(f => {
                    finalLabels[f.key] = f.label;
                });
            }
        }

        if (finalTask) {
            setTask(finalTask);
            setFieldLabels(new Map(Object.entries(finalLabels)));
            document.title = `Snapshot: ${finalTask.title}`;
        }
        setIsLoading(false);
    }, [params.id, searchParams]);

    const renderCustomFieldValue = (fieldKey: string, label: string, value: any) => {
        if (value === null || value === undefined || value === '') return <span className="text-muted-foreground font-normal">N/A</span>;
        
        // Determine type based on common key patterns or value types if config isn't fully available
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return <div className="flex flex-wrap gap-1">{value.map((v: any) => <Badge key={v} variant="secondary">{v}</Badge>)}</div>;
        if (String(value).startsWith('http')) return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{String(value)}</a>;
        
        return <RichTextViewer text={String(value)} />;
    }

    if (isLoading) return <LoadingSpinner text="Initializing secure view..." />;

    if (!task || !uiConfig) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-muted/5">
                <div className="p-8 bg-background rounded-[2.5rem] border shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-500">
                    <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                        <X className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Snapshot Unavailable</h1>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed font-medium">This task publication may have expired or the link is invalid.</p>
                    <Button variant="outline" className="mt-8 w-full h-12 rounded-2xl font-bold shadow-sm" onClick={() => router.push('/')}>Return Home</Button>
                </div>
            </div>
        );
    }

    const relevantEnvs = (task.relevantEnvironments || []).map(name => uiConfig.environments.find(e => e.name === name)).filter((e): e is Environment => !!e);
    
    // Custom fields present in the task snapshot
    const customFieldKeys = Object.keys(task.customFields || {});
    
    const statusConfig = getStatusConfig(task.status);
    const { Icon, cardClassName, iconColorClassName } = statusConfig;

    const prLinksLabel = fieldLabels.get('prLinks') || 'Pull Requests';
    const deploymentLabel = fieldLabels.get('deploymentStatus') || 'Deployments';
    const developersLabel = fieldLabels.get('developers') || 'Developers';
    const testersLabel = fieldLabels.get('testers') || 'Testers';
    const repositoriesLabel = fieldLabels.get('repositories') || 'Repositories';
    const attachmentsLabel = fieldLabels.get('attachments') || 'Attachments';

    return (
        <div className="min-h-screen bg-muted/5 pb-20 selection:bg-primary selection:text-white">
            {/* Header Mirror */}
            <div className="bg-background border-b h-16 flex items-center px-6 sticky top-0 z-50 shadow-sm">
                <div className="max-w-screen-2xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-sm shadow-lg">TF</div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-sm leading-none uppercase">Secure Publication</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Read-Only Snapshot</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="hidden sm:flex bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] px-3 h-7">Snapshot Locked</Badge>
                        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full h-9 w-9"><ArrowLeft className="h-5 w-5" /></Button>
                    </div>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                    
                    {/* MAIN COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className={cn("relative overflow-hidden", cardClassName)}>
                            <Icon className={cn('absolute -bottom-12 -right-12 h-48 w-48 pointer-events-none opacity-20', iconColorClassName)} />
                            <div className="relative z-10 flex flex-col h-full">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <CardTitle className="text-3xl font-semibold tracking-tight">{task.title}</CardTitle>
                                        <TaskStatusBadge status={task.status} variant="prominent" />
                                    </div>
                                    <CardDescription className="font-normal">Last updated {formatTimestamp(task.updatedAt, uiConfig.timeFormat)}</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    {task.summary && (
                                        <div className="mb-4 p-3 rounded-md bg-background/50 border border-border/50">
                                            <p className="text-sm italic text-muted-foreground leading-relaxed font-normal">{task.summary}</p>
                                        </div>
                                    )}
                                    <div className="font-normal text-foreground/90 leading-relaxed"><RichTextViewer text={task.description} /></div>
                                </CardContent>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2 text-xl font-semibold"><CheckCircle2 className="h-5 w-5" />{deploymentLabel}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-1 text-sm">
                                        {relevantEnvs.length > 0 ? relevantEnvs.map(env => {
                                            const isDeployed = task.deploymentStatus?.[env.name] ?? false;
                                            return (
                                                <div key={env.id} className="flex justify-between items-center p-2 -m-2">
                                                    <span className="capitalize text-foreground font-medium">{env.name}</span>
                                                    <div className={cn('flex items-center gap-2 font-medium', isDeployed ? 'text-green-600' : 'text-yellow-600')}>
                                                        {isDeployed ? <><CheckCircle2 className="h-4 w-4" /><span>Deployed</span></> : <><Clock className="h-4 w-4" /><span>Pending</span></>}
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-muted-foreground text-center text-xs pt-2">No relevant environments defined.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2 text-xl font-semibold"><GitMerge className="h-5 w-5" />{prLinksLabel}</CardTitle></CardHeader>
                                <CardContent><PrLinksGroup prLinks={task.prLinks} repositories={task.repositories} configuredEnvs={relevantEnvs.map(e => e.name)} repositoryConfigs={uiConfig.repositoryConfigs} isEditing={false} /></CardContent>
                            </Card>
                        </div>

                        {customFieldKeys.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2 text-xl font-semibold"><Box className="h-5 w-5" />Extended Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {customFieldKeys.map(key => {
                                        const label = fieldLabels.get(key) || key;
                                        const value = task.customFields?.[key];
                                        return (
                                            <div key={key} className="break-words">
                                                <h4 className="text-sm font-semibold text-muted-foreground mb-1">{label}</h4>
                                                <div className="text-sm text-foreground font-normal">{renderCustomFieldValue(key, label, value)}</div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        )}

                        {/* Comments Section */}
                        <CommentsSection 
                            taskId={task.id} 
                            comments={task.comments || []} 
                            onCommentsUpdate={() => {}} 
                            readOnly={true} 
                        />
                    </div>

                    {/* SIDEBAR */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2 text-xl font-semibold"><ListChecks className="h-5 w-5" />Task Profile</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                        <Code2 className="h-4 w-4" /> {developersLabel}
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {((task.developers || []) as any[]).map((name, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-full border">
                                                <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] font-bold text-white" style={{backgroundColor:`#${getAvatarColor(name)}`}}>{getInitials(name)}</AvatarFallback></Avatar>
                                                <span className="text-xs font-bold">{name}</span>
                                            </div>
                                        ))}
                                        {!task.developers?.length && <p className="text-xs text-muted-foreground font-normal italic">None assigned.</p>}
                                    </div>
                                </div>
                                <Separator className="opacity-50" />
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                        <ClipboardCheck className="h-4 w-4" /> {testersLabel}
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {((task.testers || []) as any[]).map((name, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-full border">
                                                <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] font-bold text-white" style={{backgroundColor:`#${getAvatarColor(name)}`}}>{getInitials(name)}</AvatarFallback></Avatar>
                                                <span className="text-xs font-bold">{name}</span>
                                            </div>
                                        ))}
                                        {!task.testers?.length && <p className="text-xs text-muted-foreground font-normal italic">None assigned.</p>}
                                    </div>
                                </div>
                                <Separator className="opacity-50" />
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                        <GitMerge className="h-4 w-4" /> {repositoriesLabel}
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {task.repositories?.map(repo => <Badge key={repo} variant="repo" style={getRepoBadgeStyle(repo)} className="text-[10px] font-bold uppercase">{repo}</Badge>)}
                                        {task.azureWorkItemId && <Badge variant="outline" className="text-[10px] font-bold">AZURE #{task.azureWorkItemId}</Badge>}
                                    </div>
                                </div>
                                <Separator className="opacity-50" />
                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> Timeline
                                    </h4>
                                    <div className="space-y-2 text-xs font-medium">
                                        {task.devStartDate && <div className="flex justify-between"><span>Dev Commenced</span><span className="font-bold">{format(new Date(task.devStartDate), 'PPP')}</span></div>}
                                        {task.devEndDate && <div className="flex justify-between"><span>Dev Completed</span><span className="font-bold">{format(new Date(task.devEndDate), 'PPP')}</span></div>}
                                        {task.qaStartDate && <div className="flex justify-between"><span>QA Started</span><span className="font-bold">{format(new Date(task.qaStartDate), 'PPP')}</span></div>}
                                        {task.qaEndDate && <div className="flex justify-between"><span>QA Verified</span><span className="font-bold">{format(new Date(task.qaEndDate), 'PPP')}</span></div>}
                                        {!task.devStartDate && <p className="text-muted-foreground italic font-normal">No timeline milestones set.</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Paperclip className="h-4 w-4" />{attachmentsLabel}</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {task.attachments?.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-xl hover:bg-primary/5 transition-all group">
                                            <Link2 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                            <span className="text-xs font-bold truncate flex-1">{att.name}</span>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                    {!task.attachments?.length && <p className="text-center py-4 text-xs text-muted-foreground font-normal italic">No documents provided.</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-6 mt-20 text-center space-y-4 opacity-40">
                <Separator />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Published via TaskFlow Productivity Engine</p>
            </div>
        </div>
    );
}

export default function SharedTaskPage() {
    return (
        <Suspense fallback={<LoadingSpinner text="Connecting to snapshot..." />}>
            <SharedTaskContent />
        </Suspense>
    );
}