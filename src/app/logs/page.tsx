
'use client';

import { useState, useEffect } from 'react';
import { getAggregatedLogs, getUiConfig } from '@/lib/data';
import type { Log, UiConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileClock, Link as LinkIcon, Activity, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function LogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);

    useEffect(() => {
        const refreshData = () => {
            const allLogs = getAggregatedLogs();
            const config = getUiConfig();
            setLogs(allLogs);
            setUiConfig(config);
            document.title = `Logs | ${config.appName || 'My Task Manager'}`;
            setIsLoading(false);
        };
        refreshData();
        
        // Listen for changes from other tabs
        window.addEventListener('storage', refreshData);
        // Listen for changes from the same tab (e.g. company switch)
        window.addEventListener('company-changed', refreshData);
        
        return () => {
            window.removeEventListener('storage', refreshData);
            window.removeEventListener('company-changed', refreshData);
        };

    }, []);

    if (isLoading || !uiConfig) {
        return <LoadingSpinner text="Loading logs..." />;
    }
    
    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <FileClock className="h-7 w-7"/> Activity Logs
                    </h1>
                    <p className="text-muted-foreground mt-1">A record of all changes made in this workspace.</p>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Logs</CardTitle>
                    <CardDescription>{logs.length} log entries found. The last 2000 entries are kept.</CardDescription>
                </CardHeader>
                <CardContent>
                   {logs.length > 0 ? (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Time</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead className="w-[150px] text-right">Related Task</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <p className="whitespace-pre-wrap">{log.message}</p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {log.taskId ? (
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/tasks/${log.taskId}`}>
                                                        <LinkIcon className="mr-2 h-3 w-3" />
                                                        View Task
                                                    </Link>
                                                </Button>
                                            ) : log.message.includes('to the bin') ? (
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href="/bin">
                                                        <Trash2 className="mr-2 h-3 w-3" />
                                                        View Bin
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">N/A</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                   ) : (
                    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-semibold">No activity yet.</p>
                        <p className="mt-1">Changes you make to tasks and settings will appear here.</p>
                    </div>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}

    
