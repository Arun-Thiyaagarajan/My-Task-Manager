
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getUiConfig, updateTask } from '@/lib/data';
import type { Task, UiConfig } from '@/lib/types';
import { Loader2, Trash2, Pin, PinOff, CalendarIcon } from 'lucide-react';
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

const reminderSchema = z.object({
  reminder: z.string().max(500, "Reminder cannot exceed 500 characters.").nullable(),
  isPinned: z.boolean(),
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
  const [isPending, setIsPending] = useState(false);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  
  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      reminder: task.reminder || '',
      isPinned: false, // will be set in useEffect
      autoDisappear: false,
      expiresAt: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setUiConfig(getUiConfig());
      const isCurrentlyPinned = pinnedTaskIds.includes(task.id);
      form.reset({
        reminder: task.reminder || '',
        isPinned: task.reminder ? isCurrentlyPinned : true,
        autoDisappear: !!task.reminderExpiresAt,
        expiresAt: task.reminderExpiresAt ? new Date(task.reminderExpiresAt) : null,
      });
    }
  }, [isOpen, task, form, pinnedTaskIds]);

  const onSubmit = (data: ReminderFormData) => {
    setIsPending(true);
    try {
      const newReminder = data.reminder?.trim() ? data.reminder.trim() : null;
      const newExpiresAt = data.autoDisappear ? (data.expiresAt ? data.expiresAt.toISOString() : null) : null;
      
      updateTask(task.id, { 
        reminder: newReminder,
        reminderExpiresAt: newExpiresAt,
      });
      
      const canBePinned = !!newReminder;
      const shouldBePinned = canBePinned && data.isPinned;
      const isCurrentlyPinned = pinnedTaskIds.includes(task.id);

      if (shouldBePinned !== isCurrentlyPinned) {
        onPinToggle(task.id);
      }
      
      toast({ 
        variant: 'success', 
        title: 'Reminder Saved', 
        description: `The reminder for "${task.title}" has been updated.` 
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save reminder.' });
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = () => {
    setIsPending(true);
    try {
      updateTask(task.id, { reminder: null, reminderExpiresAt: null });

      const isCurrentlyPinned = pinnedTaskIds.includes(task.id);
      if (isCurrentlyPinned) {
        onPinToggle(task.id);
      }
      
      toast({ 
        variant: 'success', 
        title: 'Reminder Removed', 
        description: `The reminder for "${task.title}" has been removed.` 
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove reminder.' });
    } finally {
      setIsPending(false);
    }
  };

  const autoDisappearEnabled = form.watch('autoDisappear');
  const timeFormat = uiConfig?.timeFormat || '12h';
  const timeFormatString = timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reminder Note</DialogTitle>
          <DialogDescription>
            Set or edit a reminder. Pinned notes appear on the main page.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="reminder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Reminder Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your important note here..."
                      className="min-h-[120px] resize-y"
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-Disappear</FormLabel>
                    <FormDescription className="text-xs">
                      Set a date and time for this reminder to be cleared automatically.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if(checked && !form.getValues('expiresAt')) {
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
                        <FormItem className="flex flex-col gap-2 rounded-lg border p-3">
                            <FormLabel>Expiration Time</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, timeFormatString) : <span>Pick a date and time</span>}
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex">
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
                                    <div className="p-2 border-l flex flex-col justify-center gap-2">
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
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent position="popper" className="max-h-48">
                                                {timeFormat === '12h'
                                                    ? Array.from({length: 12}, (_, i) => String(i+1)).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)
                                                    : Array.from({length: 24}, (_, i) => String(i).padStart(2,'0')).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)
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
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent position="popper" className="max-h-48">
                                                {Array.from({length: 60}, (_, i) => String(i).padStart(2,'0')).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
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
                                                <SelectTrigger><SelectValue/></SelectTrigger>
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

            <DialogFooter className="gap-2 sm:justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending || !task.reminder}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Remove
                </Button>
                <FormField
                    control={form.control}
                    name="isPinned"
                    render={({ field }) => (
                        <FormItem>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => field.onChange(!field.value)}
                                    disabled={!form.watch('reminder')}
                                >
                                    {field.value ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>{field.value ? "Unpin from main page" : "Pin to main page"}</p>
                            </TooltipContent>
                        </Tooltip>
                        </FormItem>
                    )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
