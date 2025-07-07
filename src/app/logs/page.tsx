
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAggregatedLogs, getUiConfig } from '@/lib/data';
import type { Log, UiConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileClock, Link as LinkIcon, Activity, Trash2, LayoutGrid, Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export default function LogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openMonths, setOpenMonths] = useState<string[]>([]);

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
        
        window.addEventListener('storage', refreshData);
        window.addEventListener('company-changed', refreshData);
        
        return () => {
            window.removeEventListener('storage', refreshData);
            window.removeEventListener('company-changed', refreshData);
        };
    }, []);

    const filteredLogs = useMemo(() => {
        if (!searchQuery) return logs;
        return logs.filter(log =>
            log.message.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [logs, searchQuery]);

    const groupedLogs = useMemo(() => {
        return filteredLogs.reduce((acc, log) => {
            const monthYear = format(new Date(log.timestamp), 'yyyy-MM');
            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(log);
            return acc;
        }, {} as Record<string, Log[]>);
    }, [filteredLogs]);

    const sortedMonths = useMemo(() => {
        return Object.keys(groupedLogs).sort().reverse();
    }, [groupedLogs]);
    
    useEffect(() => {
        // This effect runs when the search query changes the available months.
        // If none of the currently open months are in the new list of sorted months,
        // it automatically opens the first available month.
        if (sortedMonths.length > 0 && !openMonths.some(m => sortedMonths.includes(m))) {
          setOpenMonths([sortedMonths[0]]);
        } else if (sortedMonths.length === 0) {
            setOpenMonths([]);
        }
    }, [sortedMonths]);

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
                    <CardDescription>{filteredLogs.length} of {logs.length} log entries found. The last 2000 entries are kept.</CardDescription>
                     <div className="relative pt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search logs..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="pl-10 w-full max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                   {sortedMonths.length > 0 ? (
                    <Accordion type="multiple" value={openMonths} onValueChange={setOpenMonths} className="w-full space-y-2">
                        {sortedMonths.map(monthKey => {
                            const monthLogs = groupedLogs[monthKey];
                            return (
                                <AccordionItem value={monthKey} key={monthKey} className="border-none">
                                    <AccordionTrigger className="text-lg font-semibold tracking-tight text-foreground hover:no-underline rounded-lg px-4 py-3 hover:bg-muted/50 data-[state=open]:bg-muted/50 data-[state=open]:[&>svg]:text-primary">
                                        <div className="flex items-center gap-3">
                                            <span>{format(new Date(monthKey + '-02'), 'MMMM yyyy')}</span>
                                            <Badge variant="secondary">{monthLogs.length} logs</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <div className="border rounded-lg overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[150px]">Time</TableHead>
                                                        <TableHead className="min-w-[300px]">Action</TableHead>
                                                        <TableHead className="w-[150px] text-right">Related Task</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {monthLogs.map(log => (
                                                        <TableRow key={log.id}>
                                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
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
                                                                ) : log.message.includes('from the bin') ? (
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <Link href="/">
                                                                            <LayoutGrid className="mr-2 h-3 w-3" />
                                                                            View Tasks
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
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                   ) : (
                    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-semibold">{logs.length > 0 ? 'No logs match your search.' : 'No activity yet.'}</p>
                        <p className="mt-1">{logs.length > 0 ? 'Try a different search query.' : 'Changes you make to tasks and settings will appear here.'}</p>
                    </div>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}
