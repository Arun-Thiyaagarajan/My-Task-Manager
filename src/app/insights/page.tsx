'use client';

import { memo, useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { getRecentTasks, getRecentImportedTasksBySource, getUiConfig, getDevelopers, getLogs, getTesters } from '@/lib/data';
import type { Log, Task, UiConfig, Person } from '@/lib/types';
import { TaskCard } from '@/components/task-card';
import { Sparkles, ArrowLeft, Clock, FileJson, FileSpreadsheet, ChevronDown, Search, CalendarRange, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const COLLAPSED_CARD_COUNT = 7;
const EXPAND_BATCH_SIZE = 8;
const EXPAND_BATCH_DELAY_MS = 44;

type ActivityDateFilter = 'all' | 'today' | 'last7' | 'last30' | 'custom';

const ACTIVITY_DATE_FILTERS: Array<{ value: ActivityDateFilter; label: string }> = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' },
];

type ActivitySectionId = 'added' | 'json' | 'excel';

interface ActivitySectionConfig {
    id: ActivitySectionId;
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    accentClassName: string;
    icon: typeof Clock;
    tasks: Task[];
}

interface DateRangeValue {
    from?: Date;
    to?: Date;
}

function resolveImportSourceFromLogMessage(message: string): 'json' | 'excel' | null {
    if (message.includes('via Excel import')) return 'excel';
    if (message.includes('via JSON import') || message.includes('from external source')) return 'json';
    return null;
}

function buildActivityTimestampMaps(logs: Log[]) {
    const sourceMaps = {
        json: new Map<string, number>(),
        excel: new Map<string, number>(),
    };

    logs.forEach(log => {
        if (!log.taskId || !log.message.includes('Imported task')) return;
        const source = resolveImportSourceFromLogMessage(log.message);
        if (!source) return;

        const timestamp = new Date(log.timestamp).getTime();
        if (Number.isNaN(timestamp)) return;

        const current = sourceMaps[source].get(log.taskId);
        if (!current || timestamp > current) {
            sourceMaps[source].set(log.taskId, timestamp);
        }
    });

    return sourceMaps;
}

function buildTaskSearchText(task: Task, developers: Person[], testers: Person[]) {
    const developerNames = (task.developers || [])
        .map(id => developers.find(person => person.id === id)?.name || id)
        .filter(Boolean);
    const testerNames = (task.testers || [])
        .map(id => testers.find(person => person.id === id)?.name || id)
        .filter(Boolean);

    return [
        task.title,
        task.description,
        task.status,
        task.summary,
        task.azureWorkItemId,
        ...(task.tags || []),
        ...(task.repositories || []),
        ...(task.relevantEnvironments || []),
        ...developerNames,
        ...testerNames,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function matchesActivityDateFilter(timestamp: number, filter: ActivityDateFilter, customRange: DateRangeValue) {
    if (!Number.isFinite(timestamp)) return false;
    if (filter === 'all') return true;

    const candidateDate = new Date(timestamp);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'today') {
        return candidateDate >= startOfToday;
    }

    if (filter === 'last7') {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 6);
        return candidateDate >= start;
    }

    if (filter === 'last30') {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 29);
        return candidateDate >= start;
    }

    const from = customRange.from ? new Date(customRange.from.getFullYear(), customRange.from.getMonth(), customRange.from.getDate()) : null;
    const to = customRange.to ? new Date(customRange.to.getFullYear(), customRange.to.getMonth(), customRange.to.getDate(), 23, 59, 59, 999) : null;

    if (from && candidateDate < from) return false;
    if (to && candidateDate > to) return false;

    return Boolean(from || to);
}

function formatCustomDateRange(range: DateRangeValue) {
    if (range.from && range.to) {
        return `${format(range.from, 'dd MMM yyyy')} - ${format(range.to, 'dd MMM yyyy')}`;
    }

    if (range.from) {
        return `From ${format(range.from, 'dd MMM yyyy')}`;
    }

    if (range.to) {
        return `Until ${format(range.to, 'dd MMM yyyy')}`;
    }

    return 'Pick a custom range';
}

const ActivityTaskCard = memo(function ActivityTaskCard({
    task,
    uiConfig,
    developers,
    testers,
    pinnedTaskIds,
    onRefresh,
}: {
    task: Task;
    uiConfig: UiConfig;
    developers: Person[];
    testers: Person[];
    pinnedTaskIds: string[];
    onRefresh: () => void;
}) {
    return (
        <TaskCard
            task={task}
            onTaskDelete={onRefresh}
            onTaskUpdate={onRefresh}
            uiConfig={uiConfig}
            developers={developers}
            testers={testers}
            pinnedTaskIds={pinnedTaskIds}
            onPinToggle={() => {}}
            currentQueryString=""
        />
    );
});

function ActivityToggleCard({
    expanded,
    hiddenCount,
    title,
    onClick,
}: {
    expanded: boolean;
    hiddenCount: number;
    title: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group h-full min-h-[220px] overflow-hidden rounded-[1.75rem] border p-6 text-left transition-all duration-300 ease-in-out hover:-translate-y-1',
                expanded
                    ? 'border-dashed border-border/70 bg-muted/25 hover:border-primary/25 hover:bg-muted/40'
                    : 'border-dashed border-primary/25 bg-primary/[0.04] hover:border-primary/40 hover:bg-primary/[0.07]'
            )}
        >
            <div className="flex h-full flex-col justify-between gap-6">
                <div className="space-y-3">
                    <div
                        className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 ease-in-out',
                            expanded ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70' : 'bg-primary/10 text-primary'
                        )}
                    >
                        <ChevronDown
                            className={cn(
                                'h-5 w-5 transition-transform duration-300 ease-in-out',
                                expanded ? 'rotate-180' : 'rotate-0 group-hover:translate-y-0.5'
                            )}
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                            {expanded ? 'Show fewer' : 'Show more'}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            {expanded
                                ? `Collapse this section back to the first ${COLLAPSED_CARD_COUNT} recent tasks.`
                                : `Reveal ${hiddenCount} more recent task${hiddenCount === 1 ? '' : 's'} in ${title.toLowerCase()}.`}
                        </p>
                    </div>
                </div>
                <p className={cn('text-sm font-medium', expanded ? 'text-foreground' : 'text-primary')}>
                    {expanded ? 'Keep it compact' : 'View the rest'}
                </p>
            </div>
        </button>
    );
}

function ExpandableActivityGrid({
    tasks,
    title,
    uiConfig,
    developers,
    testers,
    pinnedTaskIds,
    expanded,
    onToggle,
    onRefresh,
}: {
    tasks: Task[];
    title: string;
    uiConfig: UiConfig;
    developers: Person[];
    testers: Person[];
    pinnedTaskIds: string[];
    expanded: boolean;
    onToggle: () => void;
    onRefresh: () => void;
}) {
    const baseTasks = tasks.slice(0, COLLAPSED_CARD_COUNT);
    const extraTasks = tasks.slice(COLLAPSED_CARD_COUNT);
    const hiddenCount = extraTasks.length;
    const [renderedExtraCount, setRenderedExtraCount] = useState(0);
    const [extraHeight, setExtraHeight] = useState(0);
    const extraInnerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRenderedExtraCount(current => Math.min(current, extraTasks.length));
    }, [extraTasks.length]);

    useEffect(() => {
        if (!expanded || extraTasks.length === 0 || renderedExtraCount >= extraTasks.length) return;

        const timeoutId = window.setTimeout(() => {
            setRenderedExtraCount(current => Math.min(extraTasks.length, current + EXPAND_BATCH_SIZE));
        }, EXPAND_BATCH_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [expanded, renderedExtraCount, extraTasks.length]);

    useEffect(() => {
        if (!expanded || extraTasks.length === 0) return;
        if (renderedExtraCount > 0) return;
        setRenderedExtraCount(Math.min(extraTasks.length, EXPAND_BATCH_SIZE));
    }, [expanded, renderedExtraCount, extraTasks.length]);

    useLayoutEffect(() => {
        const updateHeight = () => {
            setExtraHeight(expanded && extraInnerRef.current ? extraInnerRef.current.scrollHeight : 0);
        };

        updateHeight();

        if (!expanded || !extraInnerRef.current || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => updateHeight());
        observer.observe(extraInnerRef.current);
        return () => observer.disconnect();
    }, [expanded, renderedExtraCount, extraTasks.length]);

    const renderedExtraTasks = extraTasks.slice(0, renderedExtraCount);

    return (
        <div className="overflow-hidden transition-all duration-300 ease-in-out">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {baseTasks.map(task => (
                    <ActivityTaskCard
                        key={task.id}
                        task={task}
                        uiConfig={uiConfig}
                        developers={developers}
                        testers={testers}
                        pinnedTaskIds={pinnedTaskIds}
                        onRefresh={onRefresh}
                    />
                ))}
                {hiddenCount > 0 && !expanded && (
                    <ActivityToggleCard
                        expanded={false}
                        hiddenCount={hiddenCount}
                        title={title}
                        onClick={onToggle}
                    />
                )}
            </div>

            {hiddenCount > 0 && (
                <div
                    className="overflow-hidden transition-[height,opacity,margin] duration-300 ease-in-out"
                    style={{
                        height: extraHeight,
                        opacity: expanded ? 1 : 0,
                        marginTop: expanded ? 16 : 0,
                    }}
                    aria-hidden={!expanded}
                >
                    <div ref={extraInnerRef}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {renderedExtraTasks.map((task, index) => (
                                <div
                                    key={task.id}
                                    className={cn(
                                        'transition-[opacity,transform,filter] duration-300 ease-in-out',
                                        expanded
                                            ? 'translate-y-0 opacity-100 blur-0'
                                            : 'pointer-events-none -translate-y-1 opacity-0 blur-[1px]'
                                    )}
                                    style={{ transitionDelay: expanded ? `${Math.min(index, 5) * 24}ms` : '0ms' }}
                                >
                                    <ActivityTaskCard
                                        task={task}
                                        uiConfig={uiConfig}
                                        developers={developers}
                                        testers={testers}
                                        pinnedTaskIds={pinnedTaskIds}
                                        onRefresh={onRefresh}
                                    />
                                </div>
                            ))}
                            <div
                                className={cn(
                                    'transition-[opacity,transform] duration-300 ease-in-out',
                                    expanded ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                                )}
                            >
                                <ActivityToggleCard
                                    expanded
                                    hiddenCount={hiddenCount}
                                    title={title}
                                    onClick={onToggle}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActivitySection({
    id,
    title,
    emptyTitle,
    emptyDescription,
    accentClassName,
    icon: Icon,
    tasks,
    uiConfig,
    developers,
    testers,
    pinnedTaskIds,
    expanded,
    onToggle,
    onRefresh,
}: ActivitySectionConfig & {
    uiConfig: UiConfig;
    developers: Person[];
    testers: Person[];
    pinnedTaskIds: string[];
    expanded: boolean;
    onToggle: (sectionId: ActivitySectionId) => void;
    onRefresh: () => void;
}) {
    return (
        <section id={`insights-${id}`}>
            <div className="mb-6 flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-sm', accentClassName)}>
                    <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            </div>
            {tasks.length > 0 ? (
                <ExpandableActivityGrid
                    tasks={tasks}
                    title={title}
                    uiConfig={uiConfig}
                    developers={developers}
                    testers={testers}
                    pinnedTaskIds={pinnedTaskIds}
                    expanded={expanded}
                    onToggle={() => onToggle(id)}
                    onRefresh={onRefresh}
                />
            ) : (
                <Card className="rounded-[2.5rem] border-2 border-dashed bg-muted/5">
                    <CardContent className="flex flex-col items-center py-20 text-center">
                        <Icon className="mb-4 h-12 w-12 text-muted-foreground/20" />
                        <p className="font-medium text-foreground">{emptyTitle}</p>
                        <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">{emptyDescription}</p>
                    </CardContent>
                </Card>
            )}
        </section>
    );
}

export default function InsightsPage() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const [recentAdded, setRecentAdded] = useState<Task[]>([]);
    const [recentJsonImported, setRecentJsonImported] = useState<Task[]>([]);
    const [recentExcelImported, setRecentExcelImported] = useState<Task[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [developers, setDevelopers] = useState<Person[]>([]);
    const [testers, setTesters] = useState<Person[]>([]);
    const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<ActivityDateFilter>('all');
    const [customDateRange, setCustomDateRange] = useState<DateRangeValue>({});
    const [expandedSections, setExpandedSections] = useState<Record<ActivitySectionId, boolean>>({
        added: false,
        json: false,
        excel: false,
    });

    const load = useCallback(() => {
        const jsonImported = getRecentImportedTasksBySource('json', 30);
        const excelImported = getRecentImportedTasksBySource('excel', 30);
        const importedIds = new Set([...jsonImported, ...excelImported].map(task => task.id));
        const added = getRecentTasks(50)
            .filter(task => !importedIds.has(task.id))
            .slice(0, 30);

        setRecentAdded(added);
        setRecentJsonImported(jsonImported);
        setRecentExcelImported(excelImported);
        setLogs(getLogs());

        setUiConfig(getUiConfig());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        try {
            setPinnedTaskIds(JSON.parse(localStorage.getItem('taskflow_pinned_tasks') || '[]'));
        } catch {
            setPinnedTaskIds([]);
        }
        window.dispatchEvent(new Event('navigation-end'));
    }, []);

    useEffect(() => {
        load();

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

    const handleToggleSection = (sectionId: ActivitySectionId) => {
        setExpandedSections(current => ({
            ...current,
            [sectionId]: !current[sectionId],
        }));
    };

    const activityTimestampMaps = useMemo(() => buildActivityTimestampMaps(logs), [logs]);

    const searchValue = searchQuery.trim().toLowerCase();

    const filteredRecentAdded = useMemo(() => {
        return recentAdded.filter(task => {
            const activityTimestamp = new Date(task.createdAt).getTime();
            const matchesSearch = !searchValue || buildTaskSearchText(task, developers, testers).includes(searchValue);
            return matchesSearch && matchesActivityDateFilter(activityTimestamp, dateFilter, customDateRange);
        });
    }, [customDateRange, dateFilter, developers, recentAdded, searchValue, testers]);

    const filteredRecentJsonImported = useMemo(() => {
        return recentJsonImported.filter(task => {
            const activityTimestamp = activityTimestampMaps.json.get(task.id) || new Date(task.createdAt).getTime();
            const matchesSearch = !searchValue || buildTaskSearchText(task, developers, testers).includes(searchValue);
            return matchesSearch && matchesActivityDateFilter(activityTimestamp, dateFilter, customDateRange);
        });
    }, [activityTimestampMaps.json, customDateRange, dateFilter, developers, recentJsonImported, searchValue, testers]);

    const filteredRecentExcelImported = useMemo(() => {
        return recentExcelImported.filter(task => {
            const activityTimestamp = activityTimestampMaps.excel.get(task.id) || new Date(task.createdAt).getTime();
            const matchesSearch = !searchValue || buildTaskSearchText(task, developers, testers).includes(searchValue);
            return matchesSearch && matchesActivityDateFilter(activityTimestamp, dateFilter, customDateRange);
        });
    }, [activityTimestampMaps.excel, customDateRange, dateFilter, developers, recentExcelImported, searchValue, testers]);

    const sections = useMemo<ActivitySectionConfig[]>(() => [
        {
            id: 'added',
            title: 'Recently Added',
            emptyTitle: 'No tasks added in the last 7 days.',
            emptyDescription: 'Freshly created tasks that were not imported will appear here.',
            accentClassName: 'bg-green-500/10 text-green-600',
            icon: Clock,
            tasks: filteredRecentAdded,
        },
        {
            id: 'json',
            title: 'Recent JSON Imports',
            emptyTitle: 'No JSON imports in the last 7 days.',
            emptyDescription: 'Tasks imported through the JSON workflow will appear here separately.',
            accentClassName: 'bg-blue-500/10 text-blue-600',
            icon: FileJson,
            tasks: filteredRecentJsonImported,
        },
        {
            id: 'excel',
            title: 'Recent Excel Imports',
            emptyTitle: 'No Excel imports in the last 7 days.',
            emptyDescription: 'Tasks imported through the Excel workflow will appear here separately.',
            accentClassName: 'bg-cyan-500/10 text-cyan-600',
            icon: FileSpreadsheet,
            tasks: filteredRecentExcelImported,
        },
    ], [filteredRecentAdded, filteredRecentExcelImported, filteredRecentJsonImported]);

    const totalFilteredCount = sections.reduce((sum, section) => sum + section.tasks.length, 0);
    const hasActiveFilters = Boolean(searchQuery.trim()) || dateFilter !== 'all';

    const handleDateFilterChange = (nextFilter: ActivityDateFilter) => {
        setDateFilter(nextFilter);
        if (nextFilter !== 'custom') {
            setCustomDateRange({});
        }
    };

    const handleCustomRangeSelect = (range: DateRange | undefined) => {
        setCustomDateRange(range || {});
        setDateFilter('custom');
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setDateFilter('all');
        setCustomDateRange({});
    };

    if (!uiConfig) return null;

    return (
        <div id="insights-page" className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
                        <Sparkles className="h-8 w-8 text-primary" />
                        Recent Activity
                    </h1>
                    <p className="mt-1 font-normal text-muted-foreground">
                        Insights into tasks added recently, plus separate JSON and Excel imports from the last 7 days.
                    </p>
                </div>
            </div>

            <Card className="mb-10 overflow-hidden border-border/60 bg-gradient-to-br from-background/95 via-background/88 to-muted/[0.08] shadow-sm">
                <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative min-w-0 xl:w-auto xl:min-w-[18rem] xl:max-w-[28rem] xl:flex-[1.15_1_22rem]">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                            <Input
                                value={searchQuery}
                                onChange={event => setSearchQuery(event.target.value)}
                                placeholder="Search tasks, statuses, tags, repos, assignees..."
                                className="h-11 w-full rounded-2xl border-border/70 bg-background/92 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/75 shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.45)] transition-[border-color,box-shadow,background-color,width] hover:border-border/90 hover:bg-background focus-visible:bg-background dark:bg-[#171d28] dark:shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.025)] dark:hover:bg-[#192131] dark:focus-visible:bg-[#1b2436]"
                            />
                        </div>

                        <div className="flex min-w-0 flex-col gap-3 xl:flex-1 xl:flex-row xl:items-center xl:justify-end">
                            <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                                <div className="flex h-10 items-center gap-2 rounded-2xl border border-border/60 bg-background/72 px-3 text-xs font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                                    <CalendarRange className="h-4 w-4" />
                                    Activity Date
                                </div>
                                {ACTIVITY_DATE_FILTERS.filter(filter => filter.value !== 'custom').map(filter => (
                                    <Button
                                        key={filter.value}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDateFilterChange(filter.value)}
                                        className={cn(
                                            'h-10 rounded-2xl px-3 text-xs font-semibold text-muted-foreground',
                                            dateFilter === filter.value &&
                                                'bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-primary/10 hover:text-primary'
                                        )}
                                    >
                                        {filter.label}
                                    </Button>
                                ))}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                'h-10 rounded-2xl px-3 text-xs font-semibold text-muted-foreground',
                                                dateFilter === 'custom' &&
                                                    'bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-primary/10 hover:text-primary'
                                            )}
                                        >
                                            {customDateRange.from || customDateRange.to ? formatCustomDateRange(customDateRange) : 'Custom Range'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-auto rounded-3xl border-border/70 p-0">
                                        <Calendar
                                            mode="range"
                                            numberOfMonths={isMobile ? 1 : 2}
                                            selected={customDateRange.from ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                                            onSelect={handleCustomRangeSelect}
                                            defaultMonth={customDateRange.from || new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Showing {totalFilteredCount} result{totalFilteredCount === 1 ? '' : 's'}.</span>
                            {searchQuery.trim() ? (
                                <Badge variant="secondary" className="rounded-full px-3 py-1">
                                    Search: {searchQuery.trim()}
                                </Badge>
                            ) : null}
                            {dateFilter !== 'all' ? (
                                <Badge variant="secondary" className="rounded-full px-3 py-1">
                                    Date:{' '}
                                    {dateFilter === 'custom'
                                        ? formatCustomDateRange(customDateRange)
                                        : ACTIVITY_DATE_FILTERS.find(filter => filter.value === dateFilter)?.label}
                                </Badge>
                            ) : null}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground"
                            >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Clear
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className={cn('space-y-16', isMobile && 'space-y-12')}>
                {sections.map(section => (
                    <ActivitySection
                        key={section.id}
                        {...section}
                        uiConfig={uiConfig}
                        developers={developers}
                        testers={testers}
                        pinnedTaskIds={pinnedTaskIds}
                        expanded={expandedSections[section.id]}
                        onToggle={handleToggleSection}
                        onRefresh={load}
                    />
                ))}
            </div>
        </div>
    );
}
