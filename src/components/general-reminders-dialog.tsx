
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
                            <Textarea {...field} placeholder="Type your reminder..." className="min-h-[100px]" />
                        </FormControl>
                    </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
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
  };

  const handleDelete = (id: string) => {
    if (deleteGeneralReminder(id)) {
      toast({ variant: 'success', title: 'Reminder Removed' });
      refreshReminders();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove reminder.' });
    }
  };
  
  const handleDialogClose = () => {
    onOpenChange(false);
    handleCancelEdit();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            General Reminders
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove general reminders. These are not tied to any specific task.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
            <div className="my-2 max-h-[40vh] overflow-y-auto pr-2 border-b">
                {reminders.length > 0 ? (
                    <div className="space-y-2 pb-4">
                        {reminders.map((reminder) => (
                            <div key={reminder.id} className="group flex items-start gap-3 p-3 rounded-md bg-muted/50">
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
                                        <div className="flex-1 space-y-2">
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{reminder.text}</p>
                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(reminder.createdAt), { addSuffix: true })}</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(reminder)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this reminder. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(reminder.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
                    <p className="text-center text-sm text-muted-foreground py-8">No general reminders yet.</p>
                )}
            </div>
            
            {!isAdding && !reminderToEdit && (
                <Button onClick={handleOpenAdd} className="mt-4 w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
                </Button>
            )}

            {isAdding && !reminderToEdit && (
                 <div className="mt-4">
                     <h3 className="text-sm font-medium mb-2">New Reminder</h3>
                     <EditReminderForm
                        reminderToEdit={null}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                        isPending={isPending}
                    />
                 </div>
            )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
