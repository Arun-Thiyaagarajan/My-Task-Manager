'use client';

import { useState, useEffect } from 'react';
import { getReleaseUpdates, getUiConfig } from '@/lib/data';
import type { ReleaseUpdate, ReleaseItemType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Rocket, Zap, Bug, Calendar, ChevronRight, History, ArrowLeft, ArrowRight, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ReleasesPage() {
    const isMobile = useIsMobile();
    const [releases, setReleases] = useState<ReleaseUpdate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" text="Fetching latest updates..." />
            </div>
        );
    }

    const getIcon = (type: ReleaseItemType) => {
        switch (type) {
            case 'feature': return <Rocket className="h-4 w-4 text-primary" />;
            case 'improvement': return <Zap className="h-4 w-4 text-amber-500" />;
            case 'fix': return <Bug className="h-4 w-4 text-red-500" />;
            default: return <Sparkles className="h-4 w-4 text-primary" />;
        }
    };

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(isMobile ? '/profile' : '/');
    };

    return (
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
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
            </div>

            {error ? (
                <Alert variant="destructive" className="rounded-2xl border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="font-semibold uppercase tracking-widest text-[10px] mb-1">Error Loading Data</AlertTitle>
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
            ) : (
                <div className="relative space-y-16">
                    {/* Vertical Timeline Line */}
                    {releases.length > 0 && (
                        <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-border/50 -translate-x-1/2 hidden sm:block" />
                    )}

                    {releases.map((release, index) => (
                        <div key={release.id} className="relative animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                            {/* Timeline Point */}
                            <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 -top-2 z-10">
                                <div className={cn(
                                    "h-10 w-10 rounded-full border-4 border-background flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                                    index === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    <Rocket className="h-5 w-5" />
                                </div>
                            </div>

                            <div className={cn(
                                "pl-16 sm:pl-0 sm:w-[45%] space-y-4",
                                index % 2 === 0 ? "sm:ml-auto sm:pl-8" : "sm:mr-auto sm:pr-8 sm:text-right"
                            )}>
                                <div className={cn(
                                    "flex items-center flex-nowrap gap-3 mb-1",
                                    index % 2 !== 0 && "sm:justify-end"
                                )}>
                                    <Badge variant={index === 0 ? "default" : "outline"} className="text-xs font-semibold uppercase tracking-wider h-6 px-2.5 shrink-0">
                                        v{release.version}
                                    </Badge>
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(release.date), 'MMM d, yyyy')}
                                    </span>
                                </div>

                                <Card className="overflow-hidden border-none shadow-xl bg-card hover:shadow-2xl transition-all duration-300">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-2xl font-semibold group-hover:text-primary transition-colors tracking-tight">{release.title}</CardTitle>
                                        {release.description && (
                                            <CardDescription className="text-sm font-medium leading-relaxed">
                                                {release.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {['feature', 'improvement', 'fix'].map(type => {
                                            const items = release.items.filter(i => i.type === type);
                                            if (items.length === 0) return null;

                                            return (
                                                <div key={type} className="space-y-3">
                                                    <h4 className={cn(
                                                        "text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1",
                                                        index % 2 !== 0 && "sm:flex-row-reverse"
                                                    )}>
                                                        {getIcon(type as ReleaseItemType)}
                                                        {type}s
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {items.map(item => (
                                                            <div 
                                                                key={item.id} 
                                                                className={cn(
                                                                    "p-3 rounded-xl border border-transparent bg-muted/20 flex flex-col gap-2 transition-all",
                                                                    item.link && "hover:bg-primary/5 hover:border-primary/20 cursor-pointer"
                                                                )}
                                                                onClick={() => item.link && prompt(() => { window.dispatchEvent(new Event('navigation-start')); router.push(item.link!); })}
                                                            >
                                                                <div className={cn(
                                                                    "flex items-start gap-3",
                                                                    index % 2 !== 0 && "sm:flex-row-reverse sm:text-right"
                                                                )}>
                                                                    <div className="flex-1 text-sm font-medium leading-snug tracking-tight">
                                                                        {item.text}
                                                                    </div>
                                                                    {item.link && <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                                                                </div>
                                                                {item.imageUrl && (
                                                                    <div className="rounded-xl border overflow-hidden shadow-sm">
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
                        <div className="text-center py-24 bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-muted-foreground/20 max-w-2xl mx-auto">
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
