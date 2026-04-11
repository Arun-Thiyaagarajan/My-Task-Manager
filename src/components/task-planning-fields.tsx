'use client';

import { useEffect, useMemo } from 'react';
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { CalendarClock, BellRing, Flag, Clock3, X } from 'lucide-react';
import { format } from 'date-fns';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  deriveDueReminderAt,
  getDueReminderPresetLabel,
  getTaskDueLabel,
  getTaskDueToneClassName,
  getTaskPriorityLabel,
  TASK_DUE_REMINDER_PRESETS,
  TASK_PRIORITY_OPTIONS,
  type TaskDueReminderPreset,
} from '@/lib/task-planning';

interface TaskPlanningFieldsProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  premiumFieldClassName?: string;
  premiumOutlineButtonClassName?: string;
  premiumSurfaceFocusClassName?: string;
}

export function TaskPlanningFields({
  control,
  watch,
  setValue,
  premiumFieldClassName = '',
  premiumOutlineButtonClassName = '',
  premiumSurfaceFocusClassName = '',
}: TaskPlanningFieldsProps) {
  const dueAt = watch('dueAt') as Date | null | undefined;
  const dueReminderPreset = (watch('dueReminderPreset') as TaskDueReminderPreset | null | undefined) || null;
  const dueReminderAt = watch('dueReminderAt') as Date | null | undefined;
  const dueLabel = useMemo(() => getTaskDueLabel({ dueAt: dueAt?.toISOString() }), [dueAt]);
  const derivedReminderAt = useMemo(
    () => deriveDueReminderAt(dueAt, dueReminderPreset, dueReminderAt),
    [dueAt, dueReminderAt, dueReminderPreset]
  );

  useEffect(() => {
    if (!dueReminderPreset || dueReminderPreset === 'custom') return;

    const nextReminderAt = deriveDueReminderAt(dueAt, dueReminderPreset, null);
    setValue('dueReminderAt', nextReminderAt, { shouldDirty: true, shouldValidate: true });
  }, [dueAt, dueReminderPreset, setValue]);

  const setDueDate = (nextDate: Date | null) => {
    const nextValue = nextDate ? new Date(nextDate) : null;
    setValue('dueAt', nextValue, { shouldDirty: true, shouldValidate: true });

    if (!nextValue) {
      setValue('dueReminderPreset', null, { shouldDirty: true, shouldValidate: true });
      setValue('dueReminderAt', null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (dueReminderPreset && dueReminderPreset !== 'custom') {
      setValue('dueReminderAt', deriveDueReminderAt(nextValue, dueReminderPreset, null), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const updateDueReminderPreset = (preset: TaskDueReminderPreset) => {
    setValue('dueReminderPreset', preset, { shouldDirty: true, shouldValidate: true });
    setValue(
      'dueReminderAt',
      deriveDueReminderAt(dueAt, preset, dueReminderAt),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  return (
    <Card className="scroll-mt-32 overflow-hidden border-none bg-card shadow-xl lg:border lg:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight uppercase tracking-wide">
          <CalendarClock className="h-5 w-5 text-primary" />
          Planning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Priority</FormLabel>
                <Select value={field.value || 'medium'} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={cn('font-normal shadow-sm', premiumOutlineButtonClassName)}>
                      <div className="flex min-w-0 items-center gap-2">
                        <Flag className="h-4 w-4 text-primary" />
                        <SelectValue placeholder="Select priority" />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TASK_PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {getTaskPriorityLabel(field.value)} priority helps you sort and focus faster.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="dueAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Due Date</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value instanceof Date && !Number.isNaN(field.value.getTime()) ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(event) => setDueDate(event.target.value ? new Date(event.target.value) : null)}
                      className={cn('font-normal shadow-sm', premiumFieldClassName)}
                    />
                  </FormControl>
                  {field.value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDueDate(null)}
                      className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear due date</span>
                    </Button>
                  ) : null}
                </div>
                <div className={cn('rounded-2xl border px-3 py-2 text-xs font-medium', getTaskDueToneClassName({ dueAt: dueAt?.toISOString() }))}>
                  {dueLabel}
                </div>
                <FormDescription className="text-xs">
                  Set the task deadline once and derive reminders from it.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={cn('space-y-4 rounded-[1.35rem] border border-border/60 bg-muted/[0.18] p-4', premiumSurfaceFocusClassName)}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BellRing className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Due-Date Reminder</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                This alert is scheduled from the due date and stays separate from your reminder note.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={control}
              name="dueReminderPreset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Reminder Timing</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => updateDueReminderPreset(value as TaskDueReminderPreset)}
                  >
                    <FormControl>
                      <SelectTrigger className={cn('font-normal shadow-sm', premiumOutlineButtonClassName)}>
                        <div className="flex min-w-0 items-center gap-2">
                          <Clock3 className="h-4 w-4 text-primary" />
                          <SelectValue placeholder="Choose reminder timing" />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_DUE_REMINDER_PRESETS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={!dueAt && option.value !== 'custom'}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {!dueAt && dueReminderPreset !== 'custom'
                      ? 'Add a due date first to unlock due-based reminder presets.'
                      : 'Choose when the due-date alert should trigger.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="dueReminderAt"
              render={({ field }) => {
                const isCustom = dueReminderPreset === 'custom';
                const readOnlyValue = derivedReminderAt ? format(derivedReminderAt, 'PPP p') : 'No due reminder scheduled';

                return (
                  <FormItem>
                    <FormLabel className="font-medium">Reminder Time</FormLabel>
                    {isCustom ? (
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value instanceof Date && !Number.isNaN(field.value.getTime()) ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                          onChange={(event) => {
                            const rawValue = event.target.value;
                            field.onChange(rawValue ? new Date(rawValue) : null);
                          }}
                          className={cn('font-normal shadow-sm', premiumFieldClassName)}
                        />
                      </FormControl>
                    ) : (
                      <div className="flex min-h-11 items-center rounded-2xl border border-border/60 bg-background/90 px-3 text-sm text-muted-foreground shadow-sm">
                        {readOnlyValue}
                      </div>
                    )}
                    <FormDescription className="text-xs">
                      {isCustom
                        ? 'Set an exact reminder time manually.'
                        : dueReminderPreset
                          ? `${getDueReminderPresetLabel(dueReminderPreset)} is calculated from the current due date.`
                          : 'No due-date reminder has been configured yet.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
