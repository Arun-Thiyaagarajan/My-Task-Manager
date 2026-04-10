'use client';

import { useState, useEffect } from 'react';
import { getActiveCompanyId, getReleaseUpdates, getUserPreferences, updateUserPreferences } from '@/lib/data';
import type { ReleaseAudience, ReleaseUpdate, ReleaseItemType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Rocket, Bug, Calendar, History, ArrowLeft, ArrowRight, AlertCircle, Monitor, ShieldCheck, Smartphone, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { ReleaseHistorySkeleton } from '@/components/release-page-skeleton';
import { getAuthMode } from '@/lib/data';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';

export default function ReleasesPage() {
    const isMobile = useIsMobile();
    const { userProfile } = useFirebase();
    const [releases, setReleases] = useState<ReleaseUpdate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from');
    const { prompt } = useUnsavedChanges();
    const isAdmin = getAuthMode() === 'authenticate' && userProfile?.role === 'admin';

    useEffect(() => {
        const load = () => {
            try {
                // Only show published releases to standard users
                const publishedReleases = getReleaseUpdates(true);
                setReleases(publishedReleases);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch releases:", err);
                setError("Unable to load releases. Please try again later.");
            } finally {
                setIsLoading(false);
                window.dispatchEvent(new Event('navigation-end'));
            }
        };
        
        load();
        
        // Listen for real-time updates from cloud sync or local storage changes
        window.addEventListener('storage', load);
        window.addEventListener('company-changed', load);
        
        return () => {
            window.removeEventListener('storage', load);
            window.removeEventListener('company-changed', load);
        };
    }, []);

    useEffect(() => {
        if (isLoading || releases.length === 0) return;

        const companyId = getActiveCompanyId();
        const preferences = getUserPreferences();
        const currentSeenKeys = preferences.seenReleaseInboxKeys?.[companyId] || [];
        const releaseKeys = releases.map((release) => `${release.id}:${release.publishedAt || release.date}`);
        const unseenKeys = releaseKeys.filter((key) => !currentSeenKeys.includes(key));

        if (unseenKeys.length === 0) return;

        void updateUserPreferences({
            seenReleaseInboxKeys: {
                ...(preferences.seenReleaseInboxKeys || {}),
                [companyId]: [...currentSeenKeys, ...unseenKeys],
            },
        });
    }, [isLoading, releases]);

    if (isLoading) {
        return <ReleaseHistorySkeleton />;
    }

    const getIcon = (type: ReleaseItemType) => {
        switch (type) {
            case 'feature': return <Rocket className="h-4 w-4 text-primary" />;
            case 'improvement': return <Wrench className="h-4 w-4 text-amber-500" />;
            case 'fix': return <Bug className="h-4 w-4 text-red-500" />;
            case 'security': return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
            default: return <Sparkles className="h-4 w-4 text-primary" />;
        }
    };

    const getTypeLabel = (type: ReleaseItemType) => {
        switch (type) {
            case 'feature': return 'Features';
            case 'improvement': return 'Improvements';
            case 'fix': return 'Bug Fixes';
            case 'security': return 'Security';
            default: return 'Updates';
        }
    };

    const getAudienceMeta = (audience: ReleaseAudience = 'both') => {
        switch (audience) {
            case 'desktop':
                return { label: 'Desktop', icon: Monitor };
            case 'mobile':
                return { label: 'Mobile', icon: Smartphone };
            default:
                return { label: 'Desktop + Mobile', icon: Monitor };
        }
    };

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        if (isMobile && from === 'profile') {
            router.push('/profile');
            return;
        }
        router.push(isMobile ? '/profile' : '/');
    };

    const handleManageReleases = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/releases/manage');
    };

    return (
        <div id="releases-page" className="mx-auto w-full max-w-[92rem] px-4 py-12 sm:px-6 lg:px-10 xl:px-12">
            {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
                <div className="flex items-start gap-4">
                    {isMobile && (
                        <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 -ml-2 rounded-full shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    )}
                    <div className="space-y-1">
                        <h1 className="text-4xl font-semibold tracking-tight flex items-center gap-3 text-foreground">
                            <History className="h-10 w-10 text-primary" />
                            Release History
                        </h1>
                        <p className="text-lg text-muted-foreground font-medium">Keep track of the latest features, improvements, and fixes.</p>
                    </div>
                </div>
                {!isMobile && (
                    <Button variant="ghost" onClick={handleBack} className="font-medium">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tasks
                    </Button>
                )}
            </div> */}
            <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.96),hsl(var(--card)/0.92))] px-5 py-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="h-11 w-11 -ml-1 rounded-2xl border border-border/60 bg-background/70 shadow-sm shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground sm:text-[2.45rem]">
                            <History className="h-10 w-10 text-primary sm:h-11 sm:w-11" /> Release History
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground sm:text-base">
                            Keep track of the latest features, improvements, and fixes.
                        </p>
                    </div>
                </div>
                {isAdmin ? (
                    <Button onClick={handleManageReleases} className="rounded-xl px-4 font-semibold">
                        Manage Releases
                    </Button>
                ) : null}
            </div>

            {error ? (
                <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-semibold uppercase tracking-widest text-[10px] mb-1">Error Loading Data</AlertTitle>
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
            ) : (
                <div className="relative space-y-16 lg:space-y-20">
                    {/* Vertical Timeline Line */}
                    {releases.length > 0 && (
                        <div className="absolute left-4 top-0 bottom-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-primary/20 via-border/60 to-transparent sm:left-1/2 lg:block" />
                    )}

                    {releases.map((release, index) => (
                        <div key={release.id} className="relative animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                            {/* Timeline Point */}
                            <div className="absolute left-4 -top-2 z-10 -translate-x-1/2 lg:left-1/2">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full border-4 border-background shadow-[0_22px_44px_-24px_rgba(15,23,42,0.66)] transition-transform hover:scale-110 sm:h-11 sm:w-11",
                                    index === 0 ? "bg-primary text-white" : "bg-card text-muted-foreground"
                                )}>
                                    <Rocket className="h-5 w-5" />
                                </div>
                            </div>

                            <div className={cn(
                                "space-y-4 pl-16 lg:pl-0 lg:w-[47%]",
                                index % 2 === 0 ? "lg:ml-auto lg:pl-12" : "lg:mr-auto lg:pr-12 lg:text-right"
                            )}>
                                <div className={cn(
                                    "mb-1 flex flex-wrap items-center gap-3",
                                    index % 2 !== 0 && "lg:justify-end"
                                )}>
                                    <Badge variant={index === 0 ? "default" : "outline"} className="text-xs font-semibold uppercase tracking-wider h-6 px-2.5 shrink-0">
                                        v{release.version}
                                    </Badge>
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(release.date), 'MMM d, yyyy')}
                                    </span>
                                </div>

                                <Card className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.9))] shadow-[0_28px_80px_-44px_rgba(15,23,42,0.58)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_34px_96px_-46px_rgba(15,23,42,0.7)]">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="break-words text-2xl font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-[2rem]">{release.title}</CardTitle>
                                        {release.description && (
                                            <div className="overflow-hidden text-sm font-medium leading-7 text-muted-foreground sm:text-[15px]">
                                                <div className="max-w-none break-words [overflow-wrap:anywhere] [&_blockquote]:my-2 [&_code]:break-words [&_ol]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_ul]:my-2">
                                                    <RichTextViewer text={release.description} />
                                                </div>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-6 sm:space-y-7">
                                        {['feature', 'improvement', 'fix', 'security'].map(type => {
                                            const items = release.items.filter(i => i.type === type);
                                            if (items.length === 0) return null;

                                            return (
                                                <div key={type} className="space-y-3.5">
                                                    <h4 className={cn(
                                                        "text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1",
                                                        index % 2 !== 0 && "lg:flex-row-reverse"
                                                    )}>
                                                        {getIcon(type as ReleaseItemType)}
                                                        {getTypeLabel(type as ReleaseItemType)}
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {items.map(item => (
                                                            <div
                                                                    key={item.id} 
                                                                    className={cn(
                                                                        "flex flex-col gap-2 rounded-[1.35rem] border border-border/50 bg-muted/[0.16] p-4 transition-all",
                                                                        item.link && "hover:bg-primary/5 hover:border-primary/20 cursor-pointer"
                                                                    )}
                                                                onClick={() => item.link && prompt(() => { window.dispatchEvent(new Event('navigation-start')); router.push(item.link!); })}
                                                                >
                                                                    <div className={cn(
                                                                        "flex items-start gap-3",
                                                                        index % 2 !== 0 && "lg:flex-row-reverse lg:text-right"
                                                                    )}>
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className={cn("flex flex-wrap items-center gap-2", index % 2 !== 0 && "lg:justify-end")}>
                                                                            {(() => {
                                                                                const audience = getAudienceMeta(item.audience || 'both');
                                                                                const AudienceIcon = audience.icon;
                                                                                return (
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-semibold text-muted-foreground border border-border/60">
                                                                                        <AudienceIcon className="h-3 w-3" />
                                                                                        {audience.label}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="break-words text-sm font-medium leading-7 tracking-tight text-foreground/95 [overflow-wrap:anywhere] sm:text-[15px]">
                                                                            {item.text}
                                                                        </div>
                                                                    </div>
                                                                    {item.link && <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                                                                </div>
                                                                {item.imageUrl && (
                                                                    <div className="overflow-hidden rounded-[1.25rem] border border-border/60 shadow-sm">
                                                                        <img src={item.imageUrl} alt="" className="w-full h-auto object-cover max-h-40" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ))}

                    {releases.length === 0 && (
                        <div className="text-center py-24 bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-muted-foreground/20 max-w-6xl mx-auto">
                            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                                <History className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground/80">No releases available.</h2>
                            <p className="text-muted-foreground font-medium mt-2 max-w-xs mx-auto">Application updates published by an administrator will appear here.</p>
                            <Button variant="outline" className="mt-8 font-medium rounded-xl h-11 px-8" onClick={handleBack}>
                                Return to Workspace
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
