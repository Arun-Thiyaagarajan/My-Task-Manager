
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
import { updateTask } from '@/lib/data';
import type { Task } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from './ui/form';
import { Switch } from './ui/switch';

const reminderSchema = z.object({
  reminder: z.string().max(500, "Reminder cannot exceed 500 characters.").nullable(),
  isPinned: z.boolean(),
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
  
  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      reminder: task.reminder || '',
      isPinned: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const isCurrentlyPinned = pinnedTaskIds.includes(task.id);
      form.reset({
        reminder: task.reminder || '',
        // If creating a new reminder, default pin to true. Otherwise, reflect current state.
        isPinned: task.reminder ? isCurrentlyPinned : true,
      });
    }
  }, [isOpen, task, form, pinnedTaskIds]);

  const onSubmit = (data: ReminderFormData) => {
    setIsPending(true);
    try {
      const newReminder = data.reminder?.trim() ? data.reminder.trim() : null;
      updateTask(task.id, { reminder: newReminder });
      
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
      updateTask(task.id, { reminder: null });

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reminder Note</DialogTitle>
          <DialogDescription>
            Set or edit the reminder note for this task. Pinned notes appear on the main page.
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
              name="isPinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Pin to Main Page</FormLabel>
                    <FormDescription>
                      Show this note at the top of the tasks list.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!form.watch('reminder')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending || !task.reminder}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Remove
              </Button>
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
