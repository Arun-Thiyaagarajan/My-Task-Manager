
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  getGeneralReminders,
  addGeneralReminder,
  updateGeneralReminder,
  deleteGeneralReminder,
} from '@/lib/data';
import type { GeneralReminder } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit, Bell, X, Check } from 'lucide-react';
import { Form, FormControl, FormField, FormItem } from './ui/form';
import { Textarea } from './ui/textarea';
import { formatDistanceToNow } from 'date-fns';

const reminderSchema = z.object({
  text: z.string().min(1, 'Reminder text cannot be empty.').max(500, 'Reminder cannot exceed 500 characters.'),
});
type ReminderFormData = z.infer<typeof reminderSchema>;

interface EditReminderFormProps {
    reminderToEdit: Partial<GeneralReminder> | null;
    onSave: (data: ReminderFormData) => void;
    onCancel: () => void;
    isPending: boolean;
}

function EditReminderForm({ reminderToEdit, onSave, onCancel, isPending }: EditReminderFormProps) {
    const form = useForm<ReminderFormData>({
        resolver: zodResolver(reminderSchema),
        defaultValues: { text: reminderToEdit?.text || '' },
    });
    
    useEffect(() => {
        form.reset({ text: reminderToEdit?.text || '' });
    }, [reminderToEdit, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                <FormField control={form.control} name="text" render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Type your reminder..."
                              className="no-scrollbar min-h-[120px] max-h-[min(36vh,14rem)] overflow-y-auto resize-none rounded-[1.35rem] border-white/10 bg-muted/20 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_40px_-34px_rgba(0,0,0,0.75)]"
                            />
                        </FormControl>
                    </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCancel}
                      disabled={isPending}
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-5 font-medium text-foreground/80 hover:bg-white/[0.06] hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="h-11 rounded-2xl px-5 shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.72)]"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {reminderToEdit ? <><Check className="mr-2 h-4 w-4" /> Save</> : <><PlusCircle className="mr-2 h-4 w-4" /> Add</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

interface GeneralRemindersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneralRemindersDialog({ isOpen, onOpenChange }: GeneralRemindersDialogProps) {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<GeneralReminder[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState<GeneralReminder | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const refreshReminders = () => setReminders(getGeneralReminders());

  useEffect(() => {
    if (isOpen) {
      refreshReminders();
    }
  }, [isOpen]);

  const handleOpenEdit = (reminder: GeneralReminder) => {
    setReminderToEdit(reminder);
    setIsAdding(false);
  };
  
  const handleOpenAdd = () => {
    setIsAdding(true);
    setReminderToEdit(null);
  }

  const handleCancelEdit = () => {
    setReminderToEdit(null);
    setIsAdding(false);
  };

  const handleSave = (data: ReminderFormData) => {
    setIsPending(true);
    requestAnimationFrame(() => {
      try {
        const isEditing = !!reminderToEdit;
        if (isEditing) {
          updateGeneralReminder(reminderToEdit.id, data.text);
        } else {
          addGeneralReminder(data.text);
        }
        toast({ variant: 'success', title: `Reminder ${isEditing ? 'Updated' : 'Added'}` });
        refreshReminders();
        handleCancelEdit();
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Something went wrong.' });
      } finally {
        setIsPending(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    setIsPending(true);
    requestAnimationFrame(() => {
      try {
        if (deleteGeneralReminder(id)) {
          toast({ variant: 'success', title: 'Reminder Removed' });
          refreshReminders();
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not remove reminder.' });
        }
      } finally {
        setIsPending(false);
      }
    });
  };
  
  const handleDialogClose = () => {
    onOpenChange(false);
    handleCancelEdit();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="flex max-h-[min(88vh,48rem)] w-[calc(100vw-1rem)] max-w-[44rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-background/95 p-0 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.78)] backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))] px-6 pb-5 pt-6 text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/18 bg-amber-500/12 text-amber-400 shadow-[0_18px_36px_-28px_rgba(245,158,11,0.6)]">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold tracking-tight">
                General Reminders
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">
                Add, edit, or remove global reminders that are not tied to any specific task.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="border-b border-white/10 pb-5">
                {reminders.length > 0 ? (
                    <div className="space-y-3">
                        {reminders.map((reminder) => (
                            <div key={reminder.id} className="group flex items-start gap-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.025))] p-4 shadow-[0_16px_36px_-30px_rgba(245,158,11,0.35)]">
                                {reminderToEdit?.id === reminder.id ? (
                                    <div className="flex-1">
                                        <EditReminderForm
                                            reminderToEdit={reminderToEdit}
                                            onSave={handleSave}
                                            onCancel={handleCancelEdit}
                                            isPending={isPending}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/18 bg-amber-500/10 text-amber-400">
                                          <Bell className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{reminder.text}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">{formatDistanceToNow(new Date(reminder.createdAt), { addSuffix: true })}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.03]" onClick={() => handleOpenEdit(reminder)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.03] text-destructive hover:text-destructive" disabled={isPending}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-[1.75rem] border-white/10">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this reminder. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(reminder.id)} className="rounded-xl bg-destructive hover:bg-destructive/90">
                                                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                      Delete
                                                    </AlertDialogAction>
                                                    
                                                </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-muted/10 px-6 py-10 text-center">
                      <Bell className="mx-auto mb-3 h-10 w-10 text-amber-400/60" />
                      <p className="text-sm font-semibold text-foreground">No general reminders yet.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Create one to keep shared workspace notes visible.</p>
                    </div>
                )}
            </div>
            
            {!isAdding && !reminderToEdit && (
                <Button onClick={handleOpenAdd} className="mt-5 h-12 w-full rounded-2xl shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.72)]">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
                </Button>
            )}

            {isAdding && !reminderToEdit && (
                 <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-muted/10 p-4">
                     <h3 className="mb-3 text-sm font-semibold">New Reminder</h3>
                     <EditReminderForm
                        reminderToEdit={null}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                        isPending={isPending}
                    />
                 </div>
            )}
        </div>
        <DialogFooter className="border-t border-white/10 bg-muted/10 px-6 py-4">
            <Button variant="outline" onClick={handleDialogClose} className="rounded-2xl border-white/10 bg-white/[0.03] px-5">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
