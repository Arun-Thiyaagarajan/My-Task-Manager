import React, { memo } from 'react';
import { TaskCard } from '@/components/task-card';
import { TaskCardSkeleton } from '@/components/task-card-skeleton';
import type { Task, UiConfig, Person } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { getOrderedTaskStatusGroups } from '@/lib/status-config';
import { Button } from './ui/button';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface TasksGridProps {
  tasks: Task[];
  onTaskDelete: () => void;
  onTaskUpdate: () => void;
  uiConfig: UiConfig | null;
  developers: Person[];
  testers: Person[];
  selectedTaskIds: string[];
  setSelectedTaskIds: (ids: string[]) => void;
  isSelectMode: boolean;
  openGroups: string[];
  setOpenGroups: (groups: string[]) => void;
  pinnedTaskIds: string[];
  onPinToggle: (taskId: string) => void;
  currentQueryString: string;
  favoritesOnly?: boolean;
  isLoading?: boolean;
}

export const TasksGrid = memo(function TasksGrid({ 
  tasks, 
  onTaskDelete, 
  onTaskUpdate, 
  uiConfig, 
  developers, 
  testers, 
  selectedTaskIds, 
  setSelectedTaskIds, 
  isSelectMode, 
  openGroups, 
  setOpenGroups, 
  pinnedTaskIds, 
  onPinToggle, 
  currentQueryString,
  favoritesOnly,
  isLoading
}: TasksGridProps) {
  const PAGE_SIZE = 7;
  const groups = React.useMemo(
    () => getOrderedTaskStatusGroups(tasks, uiConfig, favoritesOnly),
    [tasks, uiConfig, favoritesOnly]
  );
  const firstGroupTitle = groups[0]?.title || (favoritesOnly ? 'Favorite Tasks' : 'Tasks');
  const getShowMoreLabel = React.useCallback((count: number) => {
    if (count <= 1) return 'Show 1 more';
    return `Show ${count} more`;
  }, []);
  const [visibleCounts, setVisibleCounts] = React.useState<Record<string, number>>({});
  const [loadingGroupKey, setLoadingGroupKey] = React.useState<string | null>(null);
  const [loadingBatchCount, setLoadingBatchCount] = React.useState(0);
  const expandTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setVisibleCounts((current) => {
      const next: Record<string, number> = {};
      groups.forEach(({ key, tasks: tasksInGroup }) => {
        const existing = current[key] ?? PAGE_SIZE;
        next[key] = Math.min(Math.max(existing, PAGE_SIZE), tasksInGroup.length);
      });
      return next;
    });
  }, [groups]);

  React.useEffect(() => {
    return () => {
      if (expandTimerRef.current) {
        window.clearTimeout(expandTimerRef.current);
      }
    };
  }, []);

  const handleShowMore = React.useCallback((groupKey: string, totalCount: number) => {
    if (loadingGroupKey) return;

    const currentlyVisible = visibleCounts[groupKey] ?? PAGE_SIZE;
    const nextBatch = Math.min(PAGE_SIZE, totalCount - currentlyVisible);
    if (nextBatch <= 0) return;

    setLoadingGroupKey(groupKey);
    setLoadingBatchCount(nextBatch);

    expandTimerRef.current = window.setTimeout(() => {
      setVisibleCounts((current) => ({
        ...current,
        [groupKey]: Math.min((current[groupKey] ?? PAGE_SIZE) + PAGE_SIZE, totalCount),
      }));
      setLoadingGroupKey(null);
      setLoadingBatchCount(0);
      expandTimerRef.current = null;
    }, 280);
  }, [loadingGroupKey, visibleCounts]);

  const handleShowFewer = React.useCallback((groupKey: string, totalCount: number) => {
    if (loadingGroupKey === groupKey) return;

    setVisibleCounts((current) => ({
      ...current,
      [groupKey]: Math.min(PAGE_SIZE, totalCount),
    }));
  }, [loadingGroupKey]);

  const renderGrid = (tasksToRender: Task[], options?: { groupKey?: string; totalCount?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
              <TaskCardSkeleton key={`skeleton-${i}`} />
          ))
      ) : (
        <>
          {tasksToRender.map(task => (
              <TaskCard 
                  key={task.id}
                  task={task} 
                  onTaskDelete={onTaskDelete} 
                  onTaskUpdate={onTaskUpdate} 
                  uiConfig={uiConfig}
                  developers={developers}
                  testers={testers}
                  selectedTaskIds={selectedTaskIds}
                  setSelectedTaskIds={setSelectedTaskIds}
                  isSelectMode={isSelectMode}
                  pinnedTaskIds={pinnedTaskIds}
                  onPinToggle={onPinToggle}
                  currentQueryString={currentQueryString}
              />
          ))}

          {options?.groupKey && options.totalCount && loadingGroupKey !== options.groupKey ? (() => {
            const remainingCount = options.totalCount - tasksToRender.length;
            const nextCount = Math.min(PAGE_SIZE, remainingCount);
            const canShowFewer = tasksToRender.length > Math.min(PAGE_SIZE, options.totalCount);
            if (remainingCount <= 0 && !canShowFewer) return null;
            return (
            <Card className="group overflow-hidden border-dashed border-border/70 bg-background/60 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/80">
              <CardContent className="flex h-full min-h-[272px] flex-col items-center justify-center gap-4 p-5 text-center">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">
                    {remainingCount > 0 ? getShowMoreLabel(nextCount) : 'Showing expanded tasks'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {remainingCount > 0
                      ? `${remainingCount} more in this status group.`
                      : 'Collapse back to the first 7 tasks any time.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {canShowFewer ? (
                    <Button
                      variant="ghost"
                      onClick={() => handleShowFewer(options.groupKey!, options.totalCount!)}
                      className="rounded-2xl px-5 text-muted-foreground hover:text-foreground"
                    >
                      Show fewer
                    </Button>
                  ) : null}
                  {remainingCount > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => handleShowMore(options.groupKey!, options.totalCount!)}
                      className="rounded-2xl px-5 shadow-sm"
                    >
                      <ChevronDown className="mr-2 h-4 w-4" />
                      {getShowMoreLabel(nextCount)}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            );
          })() : null}

          {options?.groupKey && loadingGroupKey === options.groupKey
            ? Array.from({ length: loadingBatchCount }).map((_, index) => (
                <div
                  key={`${options.groupKey}-loading-${index}`}
                  className={cn(
                    'animate-in fade-in slide-in-from-bottom-2 duration-300'
                  )}
                >
                  <TaskCardSkeleton />
                </div>
              ))
            : null}
        </>
      )}
    </div>
  );

  // In loading state, we just show one group with skeletons
  if (isLoading) {
      return (
        <div className="space-y-4 px-4 py-3">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold tracking-tight">{firstGroupTitle}</h2>
                <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            {renderGrid([])}
        </div>
      );
  }

  return (
    <Accordion
      type="multiple"
      className="w-full space-y-2"
      value={openGroups}
      onValueChange={setOpenGroups}
    >
      {groups.map(({ key, title, tasks: tasksInGroup }) => {
        const visibleCount = visibleCounts[key] ?? Math.min(PAGE_SIZE, tasksInGroup.length);
        const visibleTasks = tasksInGroup.slice(0, visibleCount);

        return (
        <AccordionItem key={key} value={key} className="border-none">
            <AccordionTrigger className="text-xl font-semibold tracking-tight text-foreground hover:no-underline rounded-lg px-4 py-3 hover:bg-muted/50 data-[state=open]:[&>svg]:text-primary">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                    <Badge className="shrink-0 bg-border text-foreground">{tasksInGroup.length}</Badge>
                    {loadingGroupKey === key ? (
                      <span className="inline-flex items-center text-xs font-medium text-primary">
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Loading more
                      </span>
                    ) : null}
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 overflow-hidden">
                {renderGrid(visibleTasks, { groupKey: key, totalCount: tasksInGroup.length })}
            </AccordionContent>
        </AccordionItem>
      )})}
    </Accordion>
  );
});
