'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getUiConfig, updateTask } from '@/lib/data';
import type { Task, UiConfig } from '@/lib/types';
import { Loader2, Trash2, Pin, PinOff, CalendarIcon, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from './ui/form';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

const reminderSchema = z.object({
  reminder: z.string().max(500, "Reminder cannot exceed 500 characters.").nullable(),
  autoDisappear: z.boolean(),
  expiresAt: z.date().optional().nullable(),
}).refine(data => {
  if (data.autoDisappear && !data.expiresAt) {
    return false;
  }
  return true;
}, {
  message: 'Please select an expiration date.',
  path: ['expiresAt'],
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface ReminderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSuccess: () => void;
  pinnedTaskIds: string[];
  onPinToggle: (taskId: string) => void;
}

export function ReminderDialog({ isOpen, onOpenChange, task, onSuccess, pinnedTaskIds, onPinToggle }: ReminderDialogProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isPending, setIsPending] = useState(false);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      reminder: '',
      autoDisappear: false,
      expiresAt: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setUiConfig(getUiConfig());

      const hasReminder = !!task.reminder;
      const isCurrentlyPinned = pinnedTaskIds.includes(task.id);
      setIsPinned(!hasReminder ? true : isCurrentlyPinned);

      form.reset({
        reminder: task.reminder || '',
        autoDisappear: !!task.reminderExpiresAt,
        expiresAt: task.reminderExpiresAt ? new Date(task.reminderExpiresAt) : null,
      });
    }
  }, [form, isOpen, pinnedTaskIds, task]);

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const newPinState = !isPinned;
    onPinToggle(task.id);
    setIsPinned(newPinState);

    toast({
      title: newPinState ? 'Reminder Pinned' : 'Reminder Unpinned',
      description: `This reminder will ${newPinState ? 'now' : 'no longer'} appear on the main page.`,
      duration: 2000,
    });
  };

  const onSubmit = (data: ReminderFormData) => {
    setIsPending(true);
    requestAnimationFrame(() => {
      try {
        const newReminder = data.reminder?.trim() ? data.reminder.trim() : null;
        const newExpiresAt = data.autoDisappear ? (data.expiresAt ? data.expiresAt.toISOString() : null) : null;

        updateTask(task.id, {
          reminder: newReminder,
          reminderExpiresAt: newExpiresAt,
        });

        if (newReminder && isPinned && !pinnedTaskIds.includes(task.id)) {
          onPinToggle(task.id);
        }

        toast({
          variant: 'success',
          title: 'Reminder Saved',
          description: `The reminder for "${task.title}" has been updated.`,
        });

        onSuccess();
        onOpenChange(false);
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reminder.' });
      } finally {
        setIsPending(false);
      }
    });
  };

  const handleDelete = () => {
    setIsPending(true);
    requestAnimationFrame(() => {
      try {
        updateTask(task.id, { reminder: null, reminderExpiresAt: null });

        if (isPinned) {
          onPinToggle(task.id);
        }

        toast({
          variant: 'success',
          title: 'Reminder Removed',
          description: `The reminder for "${task.title}" has been removed.`,
        });
        onSuccess();
        onOpenChange(false);
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove reminder.' });
      } finally {
        setIsPending(false);
      }
    });
  };

  const autoDisappearEnabled = form.watch('autoDisappear');
  const timeFormat = uiConfig?.timeFormat || '12h';
  const timeFormatString = timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';
  const hasReminderText = !!form.watch('reminder')?.trim();

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          {isMobile && (
            <div className="mb-3 flex justify-center">
              <div className="h-1.5 w-14 rounded-full bg-foreground/10" />
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/18 dark:text-amber-300">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {isMobile ? (
                <SheetTitle className="text-lg font-bold tracking-tight">Reminder Note</SheetTitle>
              ) : (
                <DialogTitle className="text-lg font-bold tracking-tight">Reminder Note</DialogTitle>
              )}
              {isMobile ? (
                <SheetDescription className="mt-1 text-sm leading-relaxed">
                  Set or edit a reminder. Pinned notes appear on the main page.
                </SheetDescription>
              ) : (
                <DialogDescription className="mt-1 text-sm leading-relaxed">
                  Set or edit a reminder. Pinned notes appear on the main page.
                </DialogDescription>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handlePinClick}
                    disabled={!hasReminderText}
                    className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.04]"
                  >
                    {isPinned ? <Pin className="h-4 w-4 fill-amber-500 text-amber-500" /> : <PinOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPinned ? "Unpin from main page" : "Pin to main page"}</p>
                </TooltipContent>
              </Tooltip>
              {!isMobile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.04] text-foreground/70 hover:bg-white/[0.08] hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <FormField
            control={form.control}
            name="reminder"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Reminder Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Type your important note here..."
                    className="no-scrollbar min-h-[140px] max-h-[min(42vh,20rem)] overflow-y-auto resize-none rounded-[1.35rem] border-white/10 bg-muted/20 px-4 py-3 text-sm shadow-inner"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoDisappear"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-[1.35rem] border border-white/10 bg-muted/20 p-4 shadow-[0_20px_40px_-34px_rgba(0,0,0,0.65)]">
                <div className="space-y-0.5 pr-3">
                  <FormLabel className="text-sm font-semibold">Auto-Disappear</FormLabel>
                  <FormDescription className="text-xs leading-relaxed">
                    Set a date and time for this reminder to be cleared automatically.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked && !form.getValues('expiresAt')) {
                        form.setValue('expiresAt', new Date());
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {autoDisappearEnabled && (
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2 rounded-[1.35rem] border border-white/10 bg-muted/20 p-4">
                  <FormLabel className="text-sm font-semibold">Expiration Time</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 w-full justify-start rounded-2xl border-white/10 bg-background/70 text-left font-medium shadow-sm",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, timeFormatString) : <span>Pick a date and time</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="flex w-[calc(100vw-2rem)] flex-col rounded-[1.5rem] border-white/10 p-0 sm:w-auto sm:flex-row">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(day) => {
                          const newDate = day || new Date();
                          const currentVal = field.value || new Date();
                          newDate.setHours(currentVal.getHours());
                          newDate.setMinutes(currentVal.getMinutes());
                          field.onChange(newDate);
                        }}
                        initialFocus
                      />
                      <div className="flex flex-row justify-around gap-2 border-t p-3 sm:flex-col sm:justify-center sm:border-l sm:border-t-0">
                        <Select
                          value={
                            timeFormat === '12h'
                              ? String(((field.value?.getHours() ?? 0) + 11) % 12 + 1)
                              : String(field.value?.getHours() ?? 0).padStart(2, '0')
                          }
                          onValueChange={(hStr) => {
                            const h = Number(hStr);
                            const newDate = field.value || new Date();
                            const isPM = newDate.getHours() >= 12;

                            let newHour = h;
                            if (timeFormat === '12h') {
                              if (isPM && h !== 12) newHour = h + 12;
                              else if (!isPM && h === 12) newHour = 0;
                              else if (isPM && h === 12) newHour = 12;
                            }
                            newDate.setHours(newHour);
                            field.onChange(new Date(newDate));
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent position="popper" className="max-h-48">
                            {timeFormat === '12h'
                              ? Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)
                              : Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                        <Select
                          value={String(field.value?.getMinutes() ?? 0).padStart(2, '0')}
                          onValueChange={(m) => {
                            const newDate = field.value || new Date();
                            newDate.setMinutes(Number(m));
                            field.onChange(new Date(newDate));
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent position="popper" className="max-h-48">
                            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {timeFormat === '12h' && (
                          <Select
                            value={field.value && field.value.getHours() >= 12 ? 'pm' : 'am'}
                            onValueChange={(val) => {
                              const newDate = field.value || new Date();
                              const currentHour = newDate.getHours();
                              if (val === 'pm' && currentHour < 12) {
                                newDate.setHours(currentHour + 12);
                              } else if (val === 'am' && currentHour >= 12) {
                                newDate.setHours(currentHour - 12);
                              }
                              field.onChange(new Date(newDate));
                            }}
                          >
                            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="am">AM</SelectItem>
                              <SelectItem value="pm">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="border-t border-white/10 bg-muted/10 px-5 py-4 sm:px-6">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending || !task.reminder} className="h-11 w-full rounded-2xl sm:w-auto">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="h-11 flex-1 rounded-2xl sm:flex-none">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="h-11 flex-1 rounded-2xl shadow-[0_16px_34px_-18px_hsl(var(--primary)/0.7)] sm:flex-none">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex max-h-[min(92dvh,52rem)] flex-col rounded-t-[2rem] border-white/10 bg-background/98 p-0 shadow-[0_-24px_80px_-34px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="flex max-h-[min(88vh,48rem)] w-[calc(100vw-1rem)] max-w-[42rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-background/95 p-0 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.78)] backdrop-blur-xl"
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
