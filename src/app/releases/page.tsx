
'use client';

import { useState, useEffect } from 'react';
import { getReleaseUpdates, getUiConfig } from '@/lib/data';
import type { ReleaseUpdate, ReleaseItemType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Rocket, Zap, Bug, Calendar, ChevronRight, History, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function ReleasesPage() {
    const [releases, setReleases] = useState<ReleaseUpdate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uiConfig, setUiConfig] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const load = () => {
            setReleases(getReleaseUpdates(true));
            setUiConfig(getUiConfig());
            setIsLoading(false);
        };
        load();
        window.addEventListener('storage', load);
        return () => window.removeEventListener('storage', load);
    }, []);

    if (isLoading) return <LoadingSpinner text="Loading release history..." />;

    const getIcon = (type: ReleaseItemType) => {
        switch (type) {
            case 'feature': return <Rocket className="h-4 w-4 text-primary" />;
            case 'improvement': return <Zap className="h-4 w-4 text-amber-500" />;
            case 'fix': return <Bug className="h-4 w-4 text-red-500" />;
            default: return <Sparkles className="h-4 w-4 text-primary" />;
        }
    };

    return (
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <History className="h-10 w-10 text-primary" />
                        Release History
                    </h1>
                    <p className="text-lg text-muted-foreground">Keep track of the latest features, improvements, and fixes.</p>
                </div>
                <Button asChild variant="ghost">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Tasks
                    </Link>
                </Button>
            </div>

            <div className="relative space-y-16">
                {/* Vertical Timeline Line */}
                <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 hidden sm:block" />

                {releases.map((release, index) => (
                    <div key={release.id} className="relative">
                        {/* Timeline Point */}
                        <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 -top-2 z-10">
                            <div className={cn(
                                "h-10 w-10 rounded-full border-4 border-background flex items-center justify-center shadow-lg",
                                index === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            )}>
                                <Rocket className="h-5 w-5" />
                            </div>
                        </div>

                        <div className={cn(
                            "sm:w-[45%] space-y-4",
                            index % 2 === 0 ? "sm:ml-auto sm:pl-8" : "sm:mr-auto sm:pr-8 sm:text-right"
                        )}>
                            <div className={cn(
                                "flex items-center gap-2 mb-1",
                                index % 2 !== 0 && "sm:justify-end"
                            )}>
                                <Badge variant={index === 0 ? "default" : "outline"} className="text-sm font-bold">
                                    v{release.version}
                                </Badge>
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(release.date), 'MMM d, yyyy')}
                                </span>
                            </div>

                            <Card className="overflow-hidden border-2 transition-all hover:shadow-xl hover:border-primary/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">{release.title}</CardTitle>
                                    {release.description && (
                                        <CardDescription className="text-base leading-relaxed">
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
                                                    "text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2",
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
                                                                "p-3 rounded-lg border bg-muted/20 flex flex-col gap-2 transition-all",
                                                                item.link && "hover:bg-primary/5 hover:border-primary/30 cursor-pointer"
                                                            )}
                                                            onClick={() => item.link && router.push(item.link)}
                                                        >
                                                            <div className={cn(
                                                                "flex items-start gap-3",
                                                                index % 2 !== 0 && "sm:flex-row-reverse sm:text-right"
                                                            )}>
                                                                <div className="flex-1 text-sm font-medium leading-snug">
                                                                    {item.text}
                                                                </div>
                                                                {item.link && <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-1" />}
                                                            </div>
                                                            {item.imageUrl && (
                                                                <div className="rounded-md border overflow-hidden">
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
                    <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                        <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h2 className="text-xl font-bold text-muted-foreground">No release history found.</h2>
                        <p className="text-sm text-muted-foreground mt-1">Updates will appear here as they are published.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
