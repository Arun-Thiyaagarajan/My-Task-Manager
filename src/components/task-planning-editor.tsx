'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, Flag, Loader2, RotateCcw } from 'lucide-react';

import type { Task } from '@/lib/types';
import { addLog, getUiConfig, updateTask } from '@/lib/data';
import {
  buildDueCompletionUpdate,
  deriveDueReminderAt,
  getDueReminderPresetLabel,
  getTaskDueCompletionLabel,
  getTaskDueCompletionState,
  getTaskDueLabel,
  getTaskPriorityLabel,
  TASK_DUE_REMINDER_PRESETS,
  TASK_PRIORITY_OPTIONS,
  type TaskDueReminderPreset,
} from '@/lib/task-planning';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatTimestamp } from '@/lib/utils';

interface TaskPlanningEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSuccess: (task: Task | null) => void;
}

export function TaskPlanningEditor({ open, onOpenChange, task, onSuccess }: TaskPlanningEditorProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [dueReminderPreset, setDueReminderPreset] = useState<TaskDueReminderPreset | null>(null);
  const [dueReminderAt, setDueReminderAt] = useState<Date | null>(null);
  const [dueCompletedAt, setDueCompletedAt] = useState<Date | null>(null);
  const [reminder, setReminder] = useState('');
  const [reminderExpiresAt, setReminderExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    setPriority(task.priority || 'medium');
    setDueAt(task.dueAt ? new Date(task.dueAt) : null);
    setDueReminderPreset(((task.dueReminderPreset || task.dueReminderBackupPreset) as TaskDueReminderPreset | null | undefined) || null);
    setDueReminderAt(task.dueReminderAt ? new Date(task.dueReminderAt) : task.dueReminderBackupAt ? new Date(task.dueReminderBackupAt) : null);
    setDueCompletedAt(task.dueCompletedAt ? new Date(task.dueCompletedAt) : null);
    setReminder(task.reminder || '');
    setReminderExpiresAt(task.reminderExpiresAt ? new Date(task.reminderExpiresAt) : null);
  }, [open, task]);

  const uiConfig = useMemo(() => getUiConfig(), []);
  const dueLabel = useMemo(() => getTaskDueLabel({ dueAt: dueAt?.toISOString() || null }), [dueAt]);
  const effectiveReminderAt = useMemo(
    () => deriveDueReminderAt(dueAt, dueReminderPreset, dueReminderAt),
    [dueAt, dueReminderAt, dueReminderPreset]
  );
  const dueCompletionState = useMemo(
    () => getTaskDueCompletionState({ dueAt: dueAt?.toISOString() || null, dueCompletedAt: dueCompletedAt?.toISOString() || null }),
    [dueAt, dueCompletedAt]
  );

  const savePlanning = () => {
    setIsPending(true);
    try {
      const nextReminderAt = deriveDueReminderAt(dueAt, dueReminderPreset, dueReminderAt);
      const dueCompletionPayload = dueCompletedAt
        ? {
            dueCompletedAt: dueCompletedAt.toISOString(),
            dueReminderAt: null,
            dueReminderPreset: null,
            dueReminderBackupAt: nextReminderAt ? nextReminderAt.toISOString() : null,
            dueReminderBackupPreset: dueReminderPreset ?? null,
          }
        : {
            ...buildDueCompletionUpdate(task, null),
            dueReminderAt: nextReminderAt ? nextReminderAt.toISOString() : null,
            dueReminderPreset: dueReminderPreset ?? null,
          };
      const updatedTask = updateTask(task.id, {
        priority: priority || 'medium',
        dueAt: dueAt ? dueAt.toISOString() : null,
        ...dueCompletionPayload,
        reminder: reminder.trim() || null,
        reminderExpiresAt: reminderExpiresAt ? reminderExpiresAt.toISOString() : null,
      });

      if (updatedTask) {
        const dueLabelForLog = updatedTask.dueAt ? formatTimestamp(updatedTask.dueAt, uiConfig.timeFormat) : 'No due date';
        const reminderLabelForLog = updatedTask.dueCompletedAt
          ? 'Due reminder paused until due completion is undone'
          : updatedTask.dueReminderAt
            ? formatTimestamp(updatedTask.dueReminderAt, uiConfig.timeFormat)
            : 'No due reminder';
        const noteLabelForLog = updatedTask.reminder
          ? updatedTask.reminderExpiresAt
            ? `Reminder note kept until ${formatTimestamp(updatedTask.reminderExpiresAt, uiConfig.timeFormat)}`
            : 'Reminder note kept without auto-clear'
          : 'No reminder note';

        addLog({
          taskId: updatedTask.id,
          message: `Planning saved for "**${updatedTask.title}**". Due: *${dueLabelForLog}*. Reminder: *${reminderLabelForLog}*. Notes: *${noteLabelForLog}*.`,
        });
      }

      toast({
        variant: 'success',
        title: 'Planning updated',
        description: updatedTask?.dueCompletedAt
          ? `Planning was saved and the due reminder is paused until you undo due completion.`
          : `Planning details for "${task.title}" were saved.`,
      });
      onSuccess(updatedTask);
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save planning',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsPending(false);
    }
  };

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04))] px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
        <div className="space-y-1">
          {isMobile ? (
            <SheetTitle className="text-lg font-bold tracking-tight">Edit Planning</SheetTitle>
          ) : (
            <DialogTitle className="text-lg font-bold tracking-tight">Edit Planning</DialogTitle>
          )}
          {isMobile ? (
            <SheetDescription className="text-sm leading-relaxed">
              Update due date, reminder timing, and priority without leaving the task detail view.
            </SheetDescription>
          ) : (
            <DialogDescription className="text-sm leading-relaxed">
              Update due date, reminder timing, and priority without leaving the task detail view.
            </DialogDescription>
          )}
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.35rem] border border-border/60 bg-background/96 p-4 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.28)]">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Status Priority
            </label>
            <div className="mt-2">
              <Select value={priority || 'medium'} onValueChange={(value) => setPriority(value as Task['priority'])}>
                <SelectTrigger className="h-12 rounded-2xl font-normal">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="Select priority" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {getTaskPriorityLabel(priority)}
            </p>
          </div>

          <div className="rounded-[1.35rem] border border-border/60 bg-background/96 p-4 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.28)]">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Due Date
            </label>
            <div className="mt-2">
              <DateTimePicker
                value={dueAt}
                onChange={(nextValue) => {
                  setDueAt(nextValue);
                  if (!nextValue) {
                    setDueReminderPreset(null);
                    setDueReminderAt(null);
                  } else if (dueReminderPreset && dueReminderPreset !== 'custom') {
                    setDueReminderAt(deriveDueReminderAt(nextValue, dueReminderPreset, null));
                  }
                }}
                timeFormat={uiConfig.timeFormat}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{dueLabel}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={dueCompletedAt ? 'secondary' : 'outline'}
                onClick={() => setDueCompletedAt((current) => (current ? null : new Date()))}
                className="rounded-xl"
              >
                {dueCompletedAt ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Undo due complete
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark due complete
                  </>
                )}
              </Button>
              {dueCompletedAt ? (
                <span
                  className={cn(
                    'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-medium',
                    dueCompletionState === 'completed_late'
                      ? 'border-rose-500/18 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300'
                      : 'border-emerald-500/18 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  {getTaskDueCompletionLabel({ dueAt: dueAt?.toISOString() || null, dueCompletedAt: dueCompletedAt.toISOString() })}
                </span>
              ) : null}
            </div>
            {dueCompletedAt ? (
              <div className="mt-4 space-y-2 rounded-[1rem] border border-border/60 bg-muted/[0.22] p-3">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Completed Time
                </label>
                <DateTimePicker
                  value={dueCompletedAt}
                  onChange={(nextValue) => setDueCompletedAt(nextValue)}
                  timeFormat={uiConfig.timeFormat}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => setDueCompletedAt(new Date())}>
                    Set to now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {dueCompletionState === 'completed_late'
                      ? 'This completion time lands after the due date, so it will show as completed late.'
                      : 'This completion time lands on or before the due date, so it will show as completed on time.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Mark this when the due work is finished. You can fine-tune the completion date and time after turning it on.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-muted/[0.16] p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.3)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BellRing className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Due Reminder</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                When the reminder time arrives, the app can notify you, play a sound, and pin the task.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Reminder Timing
              </label>
              <Select
                value={dueReminderPreset || 'none'}
                disabled={!!dueCompletedAt}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setDueReminderPreset(null);
                    setDueReminderAt(null);
                    return;
                  }

                  const nextPreset = value as TaskDueReminderPreset;
                  setDueReminderPreset(nextPreset);
                  setDueReminderAt(deriveDueReminderAt(dueAt, nextPreset, dueReminderAt));
                }}
              >
                <SelectTrigger className="h-12 rounded-2xl font-normal">
                  <SelectValue placeholder="Choose reminder timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminder</SelectItem>
                  {TASK_DUE_REMINDER_PRESETS.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={!dueAt && option.value !== 'custom'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {!dueAt && dueReminderPreset !== 'custom'
                  ? 'Choose a due date first for due-based reminder presets.'
                  : dueReminderPreset
                    ? getDueReminderPresetLabel(dueReminderPreset)
                    : 'No due reminder configured.'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Reminder Time
              </label>
              {dueReminderPreset === 'custom' ? (
                <DateTimePicker
                  value={dueReminderAt}
                  onChange={setDueReminderAt}
                  timeFormat={uiConfig.timeFormat}
                  disabled={!!dueCompletedAt}
                />
              ) : (
                <div className="flex min-h-12 items-center rounded-2xl border border-border/60 bg-background/90 px-4 text-sm text-muted-foreground">
                  {effectiveReminderAt
                    ? formatTimestamp(effectiveReminderAt, uiConfig.timeFormat)
                    : 'No due reminder scheduled'}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {dueCompletedAt
                  ? 'The due reminder is parked while this task is marked due-complete. Undo due completion to bring it back.'
                  : effectiveReminderAt
                  ? `Alerts at ${formatTimestamp(effectiveReminderAt, uiConfig.timeFormat)}`
                  : 'This task will stay quiet until you add a reminder.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-muted/[0.16] p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.3)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Reminder Note</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep a pinned note with optional auto-clear time in the same planning popup.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Note
              </label>
              <Textarea
                value={reminder}
                onChange={(event) => setReminder(event.target.value)}
                placeholder="Add a reminder note for this task..."
                className="min-h-[110px] font-normal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Auto-Clear Note
              </label>
              <DateTimePicker
                value={reminderExpiresAt}
                onChange={setReminderExpiresAt}
                timeFormat={uiConfig.timeFormat}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the reminder note until you clear it manually.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-muted/10 px-4 py-4 sm:px-6">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="h-11 rounded-2xl">
            Cancel
          </Button>
          <Button type="button" onClick={savePlanning} disabled={isPending} className="h-11 rounded-2xl">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Planning
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          hideClose
          className="flex h-[100dvh] w-[min(100vw-0.35rem,34rem)] max-w-none flex-col rounded-l-[1.75rem] border-white/10 bg-background/98 p-0 shadow-[-24px_0_80px_-34px_rgba(0,0,0,0.85)]"
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          "flex max-h-[min(88vh,46rem)] w-[calc(100vw-1rem)] max-w-[44rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-background/95 p-0 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.78)]"
        )}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
