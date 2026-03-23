'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRecentTasks, getRecentImportedTasks, getUiConfig, getDevelopers, getTesters } from '@/lib/data';
import type { Task, UiConfig, Person } from '@/lib/types';
import { TaskCard } from '@/components/task-card';
import { Sparkles, Download, ArrowLeft, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

export default function InsightsPage() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [recentAdded, setRecentAdded] = useState<Task[]>([]);
    const [recentImported, setRecentImported] = useState<Task[]>([]);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [developers, setDevelopers] = useState<Person[]>([]);
    const [testers, setTesters] = useState<Person[]>([]);
    const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);

    const load = useCallback(() => {
        // 1. Get recent imported tasks (authoritative pool)
        const imported = getRecentImportedTasks(12);
        const importedIds = new Set(imported.map(t => t.id));
        
        // 2. Get recent added tasks and strictly exclude those that are in the imported list
        // Fetch a larger pool initially to maintain the count after deduplication
        const added = getRecentTasks(30)
            .filter(t => !importedIds.has(t.id))
            .slice(0, 12);

        setRecentAdded(added);
        setRecentImported(imported);
        
        setUiConfig(getUiConfig());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        try {
            setPinnedTaskIds(JSON.parse(localStorage.getItem('taskflow_pinned_tasks') || '[]'));
        } catch (e) {
            setPinnedTaskIds([]);
        }
        window.dispatchEvent(new Event('navigation-end'));
    }, []);

    useEffect(() => {
        load();
        
        // Essential listeners for cross-tab and same-tab updates (e.g. deletion, sync)
        window.addEventListener('storage', load);
        window.addEventListener('company-changed', load);
        window.addEventListener('sync-complete', load);
        window.addEventListener('config-changed', load);
        
        return () => {
            window.removeEventListener('storage', load);
            window.removeEventListener('company-changed', load);
            window.removeEventListener('sync-complete', load);
            window.removeEventListener('config-changed', load);
        };
    }, [load]);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.back();
    };

    if (!uiConfig) return null;

    return (
        <div id="insights-page" className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex items-center gap-4 mb-10">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                        <Sparkles className="h-8 w-8 text-primary" />
                        Recent Activity
                    </h1>
                    <p className="text-muted-foreground mt-1 font-normal">Insights into tasks added or imported in the last 7 days.</p>
                </div>
            </div>

            <div className="space-y-16">
                <section id="insights-added">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm">
                            <Clock className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Recently Added</h2>
                    </div>
                    {recentAdded.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {recentAdded.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onTaskDelete={load} 
                                    onTaskUpdate={load} 
                                    uiConfig={uiConfig} 
                                    developers={developers} 
                                    testers={testers} 
                                    pinnedTaskIds={pinnedTaskIds} 
                                    onPinToggle={() => {}} 
                                    currentQueryString="" 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center">
                            <History className="h-12 w-12 text-muted-foreground/20 mb-4" />
                            <p className="text-muted-foreground font-medium">No tasks added in the last 7 days.</p>
                        </div>
                    )}
                </section>

                <section id="insights-imported">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm">
                            <Download className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Recently Imported</h2>
                    </div>
                    {recentImported.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {recentImported.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onTaskDelete={load} 
                                    onTaskUpdate={load} 
                                    uiConfig={uiConfig} 
                                    developers={developers} 
                                    testers={testers} 
                                    pinnedTaskIds={pinnedTaskIds} 
                                    onPinToggle={() => {}} 
                                    currentQueryString="" 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center">
                            <Download className="h-12 w-12 text-muted-foreground/20 mb-4" />
                            <p className="text-muted-foreground font-medium">No tasks imported in the last 7 days.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
