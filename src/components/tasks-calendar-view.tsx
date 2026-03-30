'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid,
  isToday,
} from 'date-fns';
import { CalendarDays, ChevronRight, Clock3, Loader2, MoreHorizontal } from 'lucide-react';
import type { Task, UiConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStatusDisplayName, getStatusStyles } from '@/lib/status-config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface TasksCalendarViewProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectedDateChange: (date: Date) => void;
  uiConfig: UiConfig | null;
  currentQueryString: string;
}

function getTaskCalendarDate(task: Task): Date | null {
  const candidate = task.devStartDate || task.qaStartDate || task.createdAt;
  if (!candidate) return null;
  const parsed = parseISO(candidate);
  return isValid(parsed) ? parsed : null;
}

export function TasksCalendarView({
  tasks,
  selectedDate,
  onSelectedDateChange,
  uiConfig,
  currentQueryString,
}: TasksCalendarViewProps) {
  const router = useRouter();
  const [expandedDayDate, setExpandedDayDate] = useState<Date | null>(null);
  const [navigatingTaskId, setNavigatingTaskId] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [selectedDate]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const taskDate = getTaskCalendarDate(task);
      if (!taskDate) return;
      const key = format(taskDate, 'yyyy-MM-dd');
      const existing = grouped.get(key) || [];
      existing.push(task);
      grouped.set(key, existing);
    });

    grouped.forEach((group) => {
      group.sort((a, b) => a.title.localeCompare(b.title));
    });

    return grouped;
  }, [tasks]);

  const selectedDayTasks = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDay.get(key) || [];
  }, [selectedDate, tasksByDay]);

  const visibleAgendaDateLabel = format(selectedDate, 'EEEE, do MMMM');
  const expandedDayTasks = useMemo(() => {
    if (!expandedDayDate) return [];
    return tasksByDay.get(format(expandedDayDate, 'yyyy-MM-dd')) || [];
  }, [expandedDayDate, tasksByDay]);

  const getTaskHref = (taskId: string) =>
    currentQueryString ? `/tasks/${taskId}?${currentQueryString}` : `/tasks/${taskId}`;

  const handleTaskNavigate = (taskId: string) => {
    const href = getTaskHref(taskId);
    setNavigatingTaskId(taskId);
    startNavigation(() => {
      router.push(href);
    });
  };

  const openDayPreview = (day: Date) => {
    onSelectedDateChange(day);
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayTasks = tasksByDay.get(dayKey) || [];
    if (dayTasks.length > 0) {
      setExpandedDayDate(day);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_26px_70px_-42px_rgba(15,23,42,0.7)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <CalendarDays className="h-5 w-5 text-primary" />
                Calendar View
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap a day to see its tasks. Calendar placement follows each task&apos;s start date.
              </p>
            </div>
            <Badge
              variant="outline"
              className="hidden rounded-full border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary md:inline-flex"
            >
              {tasks.length} Tasks
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/80 md:gap-2 md:text-[11px]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(key) || [];
              const isActive = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const inCurrentMonth = isSameMonth(day, selectedDate);
              const previewTasks = dayTasks.slice(0, 3);
              const hiddenCount = Math.max(dayTasks.length - previewTasks.length, 0);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openDayPreview(day)}
                  className={cn(
                    'group flex min-h-[4.75rem] flex-col rounded-2xl border px-2 py-2 text-left transition-all duration-200 md:min-h-[9rem] md:px-2.5 md:py-2.5',
                    inCurrentMonth
                      ? 'border-border/60 bg-card/70 hover:border-primary/25 hover:bg-card'
                      : 'border-border/35 bg-muted/20 text-muted-foreground/70 hover:bg-muted/30',
                    isCurrentDay &&
                      !isActive &&
                      'border-sky-500/35 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(56,189,248,0.04))] shadow-[0_16px_34px_-28px_rgba(56,189,248,0.55)]',
                    isActive &&
                      'border-primary/35 bg-primary/[0.08] shadow-[0_16px_38px_-26px_hsl(var(--primary)/0.75)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 text-left">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold md:h-8 md:w-8 md:text-sm',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isCurrentDay
                            ? 'bg-sky-500/15 text-sky-500 ring-1 ring-sky-500/25 dark:text-sky-300'
                          : inCurrentMonth
                            ? 'bg-muted/60 text-foreground'
                            : 'bg-transparent text-muted-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="hidden rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary md:inline-flex md:px-2">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {dayTasks.length > 0 && (
                    <div className="mt-1 md:hidden">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[9px] font-bold text-primary">
                        {dayTasks.length}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 hidden space-y-1.5 md:block">
                    {previewTasks.map((task) => {
                      const statusStyles = getStatusStyles(task.status, uiConfig);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors group-hover:bg-black/5 dark:group-hover:bg-white/5"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${String(statusStyles.defaultStyle.color)} 10%, transparent)`,
                          }}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: String(statusStyles.defaultStyle.color) }}
                          />
                          <span className="truncate text-xs font-medium text-foreground/90">{task.title}</span>
                        </div>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <div className="flex h-7 items-center rounded-xl px-2 text-[11px] font-semibold text-muted-foreground">
                        <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
                        +{hiddenCount} more
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-2 md:hidden">
                    {dayTasks.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {previewTasks.map((task) => {
                          const statusStyles = getStatusStyles(task.status, uiConfig);
                          return (
                            <span
                              key={task.id}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: String(statusStyles.defaultStyle.color) }}
                            />
                          );
                        })}
                        {hiddenCount > 0 && (
                          <span className="rounded-full bg-muted/55 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
                            …
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground/70">No tasks</span>
                    )}
                  </div>

                  {dayTasks.length === 0 && (
                    <div className="mt-auto hidden pt-3 md:flex md:flex-col md:items-start md:gap-2">
                      <div className="h-px w-8 rounded-full bg-border/50" />
                      <p className="text-[11px] font-medium leading-5 text-muted-foreground/70">
                        No tasks
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-card/90 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.7)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">{visibleAgendaDateLabel}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDayTasks.length === 0
                  ? 'No tasks scheduled for this day.'
                  : `${selectedDayTasks.length} scheduled ${selectedDayTasks.length === 1 ? 'task' : 'tasks'}.`}
              </p>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-border/60 bg-muted/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
            >
              Agenda
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          {selectedDayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-border/60 bg-muted/15 px-6 py-10 text-center">
              <Clock3 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">Nothing planned here yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick another date in the month grid, or create a task with a start date to place it on the calendar.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {selectedDayTasks.map((task) => {
                const statusStyles = getStatusStyles(task.status, uiConfig);
                const href = getTaskHref(task.id);

                return (
                  <Link
                    key={task.id}
                    href={href}
                    className="group rounded-[1.35rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 transition-all duration-200 hover:border-primary/20 hover:bg-card hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.6)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: String(statusStyles.defaultStyle.color) }}
                          />
                          <p className="truncate text-base font-semibold text-foreground">{task.title}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={statusStyles.defaultStyle}
                          >
                            {getStatusDisplayName(task.status, uiConfig)}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            {format(getTaskCalendarDate(task) || selectedDate, 'p')}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {task.summary || task.description}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!expandedDayDate} onOpenChange={(open) => !open && setExpandedDayDate(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl overflow-hidden rounded-[1.75rem] border-border/70 bg-background/96 p-0 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-5">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {expandedDayDate ? format(expandedDayDate, 'EEEE, do MMMM') : ''}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {expandedDayDate
                ? `${expandedDayTasks.length} ${expandedDayTasks.length === 1 ? 'task' : 'tasks'} scheduled for this day.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="no-scrollbar max-h-[min(65vh,28rem)] overflow-y-auto px-3 py-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {expandedDayTasks.map((task) => {
                const statusStyles = getStatusStyles(task.status, uiConfig);
                const isPending = navigatingTaskId === task.id && isNavigating;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleTaskNavigate(task.id)}
                    disabled={isNavigating}
                    className={cn(
                      "group w-full rounded-[1.25rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3.5 text-left transition-all duration-200 hover:border-primary/20 hover:bg-card hover:shadow-[0_18px_38px_-26px_rgba(15,23,42,0.7)]",
                      isPending && "border-primary/30 bg-primary/[0.07] shadow-[0_18px_38px_-26px_hsl(var(--primary)/0.55)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                            style={{ backgroundColor: String(statusStyles.defaultStyle.color) }}
                          />
                          <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={statusStyles.defaultStyle}
                          >
                            {getStatusDisplayName(task.status, uiConfig)}
                          </Badge>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {format(getTaskCalendarDate(task) || selectedDate, 'p')}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {task.summary || task.description}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/35 transition-colors group-hover:bg-primary/10",
                          isPending && "bg-primary/12 text-primary"
                        )}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
