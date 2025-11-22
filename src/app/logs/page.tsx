

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAggregatedLogs, getUiConfig } from '@/lib/data';
import type { Log, UiConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileClock, Link as LinkIcon, Activity, Trash2, LayoutGrid, Search, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { fuzzySearch, formatTimestamp } from '@/lib/utils';

const parseLogMessage = (message: string) => {
    const parts = message.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold text-foreground/90">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="italic text-foreground/80">{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
    });
};

export default function LogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openMonths, setOpenMonths] = useState<string[]>([]);
    const isInitialLoad = useRef(true);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [commandKey, setCommandKey] = useState('Ctrl');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCommandKey(navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
        
        const savedState = localStorage.getItem('taskflow_logs_open_months');
        if (savedState) {
            try {
                setOpenMonths(JSON.parse(savedState));
            } catch (e) { /* ignore */ }
        }

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
            fuzzySearch(searchQuery, log.message)
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
    
    // Save state to localStorage whenever it changes.
    useEffect(() => {
        // Don't save on the very first render cycle.
        if (!isInitialLoad.current) {
            localStorage.setItem('taskflow_logs_open_months', JSON.stringify(openMonths));
        }
    }, [openMonths]);

    // This effect runs once after initial data load to set a default open state if none exists.
    useEffect(() => {
        if (!isLoading && isInitialLoad.current) {
            const savedState = localStorage.getItem('taskflow_logs_open_months');
            if (!savedState && sortedMonths.length > 0) {
                setOpenMonths([sortedMonths[0]]);
            }
            isInitialLoad.current = false;
        }
    }, [isLoading, sortedMonths]);


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
                     <div className="pt-4">
                        <div className="relative flex items-center w-full max-w-sm">
                            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                ref={searchInputRef}
                                placeholder="Search logs..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                className="w-full pl-10 pr-20"
                            />
                            <div className="absolute right-0 flex items-center h-full pr-1.5">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    <span className="text-xs">{commandKey}</span>K
                                </kbd>
                            </div>
                        </div>
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
                                                        <TableHead className="w-[150px] text-right">Related Item</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {monthLogs.map(log => {
                                                        const isNoteLog = log.message.toLowerCase().includes('note');

                                                        return (
                                                        <TableRow key={log.id}>
                                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                                {formatTimestamp(log.timestamp, uiConfig.timeFormat)}
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                <p className="whitespace-pre-wrap">{parseLogMessage(log.message)}</p>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {log.taskId && !isNoteLog ? (
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <Link href={`/tasks/${log.taskId}`}>
                                                                            <LinkIcon className="mr-2 h-3 w-3" />
                                                                            View Task
                                                                        </Link>
                                                                    </Button>
                                                                ) : isNoteLog ? (
                                                                     <Button asChild variant="outline" size="sm">
                                                                        <Link href="/notes">
                                                                            <StickyNote className="mr-2 h-3 w-3" />
                                                                            View Notes
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
                                                    )})}
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
