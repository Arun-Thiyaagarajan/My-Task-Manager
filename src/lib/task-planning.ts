import { addDays, addHours, addMinutes, format, isAfter, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';

import type { Task } from '@/lib/types';

export const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export const TASK_DUE_REMINDER_PRESETS = [
  { value: 'at_due', label: 'At due time' },
  { value: '15m_before', label: '15 min before' },
  { value: '1h_before', label: '1 hour before' },
  { value: '1d_before', label: '1 day before' },
  { value: 'custom', label: 'Custom time' },
] as const;

export type TaskPriorityValue = (typeof TASK_PRIORITY_OPTIONS)[number]['value'];
export type TaskDueReminderPreset = (typeof TASK_DUE_REMINDER_PRESETS)[number]['value'];
export type TaskDueState = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'no_due_date';
export type TaskDueCompletionState = 'completed_on_time' | 'completed_late' | 'completed_without_due_date' | 'not_completed';

const PRIORITY_SCORE: Record<TaskPriorityValue, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export function getTaskPriorityValue(priority?: string | null): TaskPriorityValue {
  if (priority === 'low' || priority === 'high' || priority === 'urgent') {
    return priority;
  }

  return 'medium';
}

export function getTaskPriorityLabel(priority?: string | null): string {
  return TASK_PRIORITY_OPTIONS.find((option) => option.value === getTaskPriorityValue(priority))?.label || 'Medium';
}

export function getTaskPriorityScore(priority?: string | null): number {
  return PRIORITY_SCORE[getTaskPriorityValue(priority)];
}

export function getTaskPriorityBadgeClassName(priority?: string | null): string {
  switch (getTaskPriorityValue(priority)) {
    case 'low':
      return 'border-emerald-500/15 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
    case 'high':
      return 'border-amber-500/15 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
    case 'urgent':
      return 'border-rose-500/18 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300';
    default:
      return 'border-sky-500/15 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300';
  }
}

export function parseTaskDate(value?: string | null): Date | null {
  if (!value) return null;

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function hasReminderNote(task: Pick<Task, 'reminder'> | null | undefined): boolean {
  return Boolean(task?.reminder?.trim());
}

export function hasDueReminder(task: Pick<Task, 'dueReminderAt'> | null | undefined): boolean {
  return Boolean(task?.dueReminderAt);
}

export function hasParkedDueReminder(
  task: Pick<Task, 'dueCompletedAt' | 'dueReminderBackupAt' | 'dueReminderBackupPreset'> | null | undefined
): boolean {
  return Boolean(task?.dueCompletedAt && (task?.dueReminderBackupAt || task?.dueReminderBackupPreset));
}

export function hasCompletedDue(task: Pick<Task, 'dueCompletedAt'> | null | undefined): boolean {
  return Boolean(task?.dueCompletedAt);
}

export function getTaskDueState(task: Pick<Task, 'dueAt'> | null | undefined, now = new Date()): TaskDueState {
  const dueDate = parseTaskDate(task?.dueAt);
  if (!dueDate) return 'no_due_date';

  if (isBefore(dueDate, now) && !isSameDay(dueDate, now)) {
    return 'overdue';
  }

  if (isBefore(dueDate, now) && isSameDay(dueDate, now)) {
    return 'overdue';
  }

  if (isSameDay(dueDate, now)) return 'today';
  if (isSameDay(dueDate, addDays(now, 1))) return 'tomorrow';
  return 'upcoming';
}

export function getTaskDueLabel(task: Pick<Task, 'dueAt' | 'dueCompletedAt'> | null | undefined, now = new Date()): string {
  const completionState = getTaskDueCompletionState(task);
  if (completionState === 'completed_on_time') return 'Completed on time';
  if (completionState === 'completed_late') return 'Completed late';
  if (completionState === 'completed_without_due_date') return 'Completed';

  const dueDate = parseTaskDate(task?.dueAt);
  if (!dueDate) return 'No due date';

  const state = getTaskDueState(task, now);
  if (state === 'overdue') return `Overdue · ${format(dueDate, 'PPP p')}`;
  if (state === 'today') return `Due today · ${format(dueDate, 'p')}`;
  if (state === 'tomorrow') return `Due tomorrow · ${format(dueDate, 'p')}`;
  return format(dueDate, 'PPP p');
}

export function getTaskDueBadgeLabel(task: Pick<Task, 'dueAt' | 'dueCompletedAt'> | null | undefined, now = new Date()): string {
  const completionState = getTaskDueCompletionState(task);
  if (completionState === 'completed_on_time') return 'Completed on time';
  if (completionState === 'completed_late') return 'Completed late';
  if (completionState === 'completed_without_due_date') return 'Completed';

  const dueDate = parseTaskDate(task?.dueAt);
  if (!dueDate) return 'No due date';

  const state = getTaskDueState(task, now);
  if (state === 'overdue') return 'Overdue';
  if (state === 'today') return 'Due today';
  if (state === 'tomorrow') return 'Due tomorrow';
  return format(dueDate, 'MMM d');
}

export function getTaskDueToneClassName(task: Pick<Task, 'dueAt' | 'dueCompletedAt'> | null | undefined, now = new Date()): string {
  const completionState = getTaskDueCompletionState(task);
  if (completionState === 'completed_on_time' || completionState === 'completed_without_due_date') {
    return 'border-emerald-500/16 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300';
  }
  if (completionState === 'completed_late') {
    return 'border-rose-500/16 bg-rose-500/[0.07] text-rose-700 dark:text-rose-300';
  }

  const state = getTaskDueState(task, now);
  if (state === 'overdue') return 'border-rose-500/16 bg-rose-500/[0.07] text-rose-700 dark:text-rose-300';
  if (state === 'today') return 'border-amber-500/16 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300';
  if (state === 'tomorrow') return 'border-sky-500/16 bg-sky-500/[0.07] text-sky-700 dark:text-sky-300';
  if (state === 'upcoming') return 'border-border/60 bg-muted/[0.35] text-muted-foreground';
  return 'border-border/60 bg-muted/[0.22] text-muted-foreground';
}

export function getTaskDueCompletionState(
  task: Pick<Task, 'dueAt' | 'dueCompletedAt'> | null | undefined
): TaskDueCompletionState {
  const dueCompletedAt = parseTaskDate(task?.dueCompletedAt);
  if (!dueCompletedAt) return 'not_completed';

  const dueAt = parseTaskDate(task?.dueAt);
  if (!dueAt) return 'completed_without_due_date';
  if (dueCompletedAt.getTime() <= dueAt.getTime()) return 'completed_on_time';
  return 'completed_late';
}

export function getTaskDueCompletionLabel(
  task: Pick<Task, 'dueAt' | 'dueCompletedAt'> | null | undefined
): string {
  const state = getTaskDueCompletionState(task);
  if (state === 'completed_on_time') return 'Completed on time';
  if (state === 'completed_late') return 'Completed late';
  if (state === 'completed_without_due_date') return 'Completed';
  return 'Not completed';
}

export function buildDueCompletionUpdate(
  task: Pick<Task, 'dueReminderAt' | 'dueReminderPreset' | 'dueReminderBackupAt' | 'dueReminderBackupPreset'>,
  dueCompletedAt: string | null
): Pick<Task, 'dueCompletedAt' | 'dueReminderAt' | 'dueReminderPreset' | 'dueReminderBackupAt' | 'dueReminderBackupPreset'> {
  if (dueCompletedAt) {
    return {
      dueCompletedAt,
      dueReminderAt: null,
      dueReminderPreset: null,
      dueReminderBackupAt: task.dueReminderAt ?? task.dueReminderBackupAt ?? null,
      dueReminderBackupPreset: task.dueReminderPreset ?? task.dueReminderBackupPreset ?? null,
    };
  }

  return {
    dueCompletedAt: null,
    dueReminderAt: task.dueReminderBackupAt ?? task.dueReminderAt ?? null,
    dueReminderPreset: task.dueReminderBackupPreset ?? task.dueReminderPreset ?? null,
    dueReminderBackupAt: null,
    dueReminderBackupPreset: null,
  };
}

export function deriveDueReminderAt(
  dueAt: Date | null | undefined,
  preset: TaskDueReminderPreset | null | undefined,
  customReminderAt: Date | null | undefined
): Date | null {
  if (preset === 'custom') return customReminderAt || null;
  if (!dueAt || !preset) return null;

  if (preset === 'at_due') return dueAt;
  if (preset === '15m_before') return addMinutes(dueAt, -15);
  if (preset === '1h_before') return addHours(dueAt, -1);
  if (preset === '1d_before') return addDays(dueAt, -1);

  return null;
}

export function getDueReminderPresetLabel(preset?: string | null): string {
  return TASK_DUE_REMINDER_PRESETS.find((option) => option.value === preset)?.label || 'Custom time';
}

export function matchesTaskDueStateFilter(task: Pick<Task, 'dueAt'>, filter: string, now = new Date()): boolean {
  const state = getTaskDueState(task, now);
  return state === filter;
}

export function compareTasksByDueDate(left: Pick<Task, 'dueAt'>, right: Pick<Task, 'dueAt'>, direction: 'asc' | 'desc' = 'asc'): number {
  const leftTime = parseTaskDate(left.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightTime = parseTaskDate(right.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;

  return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}

export function compareTasksOverdueFirst(left: Pick<Task, 'dueAt'>, right: Pick<Task, 'dueAt'>, now = new Date()): number {
  const stateRank = (task: Pick<Task, 'dueAt'>) => {
    switch (getTaskDueState(task, now)) {
      case 'overdue':
        return 0;
      case 'today':
        return 1;
      case 'tomorrow':
        return 2;
      case 'upcoming':
        return 3;
      default:
        return 4;
    }
  };

  const rankDifference = stateRank(left) - stateRank(right);
  if (rankDifference !== 0) return rankDifference;

  return compareTasksByDueDate(left, right, 'asc');
}

export function isReminderNoteExpired(task: Pick<Task, 'reminderExpiresAt'> | null | undefined, now = new Date()): boolean {
  const expiresAt = parseTaskDate(task?.reminderExpiresAt);
  return Boolean(expiresAt && isAfter(now, expiresAt));
}

export function getDueDateQuickValue(value?: string | null): Date | null {
  const parsed = parseTaskDate(value);
  return parsed ? new Date(parsed) : null;
}

export function getDefaultDueDateTime(date: Date): Date {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next;
}

export function isDueDateOnPastDay(value?: string | null): boolean {
  const parsed = parseTaskDate(value);
  if (!parsed) return false;

  return isBefore(startOfDay(parsed), startOfDay(new Date()));
}
