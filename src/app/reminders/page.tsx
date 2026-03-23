'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    getGeneralReminders, 
    addGeneralReminder, 
    updateGeneralReminder, 
    deleteGeneralReminder 
} from '@/lib/data';
import type { GeneralReminder } from '@/lib/types';
import { 
    ArrowLeft, 
    PlusCircle, 
    Trash2, 
    Edit, 
    Bell, 
    Check, 
    X, 
    Loader2, 
    History,
    Megaphone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';

const reminderSchema = z.object({
  text: z.string().min(1, 'Reminder text cannot be empty.').max(500, 'Reminder cannot exceed 500 characters.'),
});
type ReminderFormData = z.infer<typeof reminderSchema>;

export default function RemindersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [reminders, setReminders] = useState<GeneralReminder[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newText, setNewText] = useState('');

    const refreshReminders = () => setReminders(getGeneralReminders());

    useEffect(() => {
        refreshReminders();
        window.dispatchEvent(new Event('navigation-end'));
    }, []);

    const handleSave = (id: string | null) => {
        if (!newText.trim()) return;
        setIsPending(true);
        try {
            if (id) {
                updateGeneralReminder(id, newText.trim());
                toast({ title: 'Reminder updated' });
            } else {
                addGeneralReminder(newText.trim());
                toast({ title: 'Reminder added' });
            }
            refreshReminders();
            setEditingId(null);
            setIsAdding(false);
            setNewText('');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error saving reminder' });
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = (id: string) => {
        if (deleteGeneralReminder(id)) {
            toast({ title: 'Reminder removed' });
            refreshReminders();
        }
    };

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.back();
    };

    return (
        <div id="reminders-page" className="bg-background min-h-0 pb-6">
            {/* Mobile Header */}
            <div className="px-6 pt-10 pb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 -ml-2 rounded-full shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">General Reminders</h1>
                        <p className="text-xs text-muted-foreground font-medium">Global workspace notes.</p>
                    </div>
                </div>
                {!isAdding && (
                    <Button onClick={() => { setIsAdding(true); setEditingId(null); setNewText(''); }} size="icon" className="h-10 w-10 rounded-full shadow-lg">
                        <PlusCircle className="h-6 w-6" />
                    </Button>
                )}
            </div>

            <div className="px-4 space-y-4">
                {isAdding && (
                    <Card className="border-primary/20 bg-primary/5 rounded-3xl shadow-lg animate-in slide-in-from-top-2 duration-300">
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Reminder</Label>
                                <Textarea 
                                    placeholder="Type your reminder..." 
                                    className="min-h-[120px] bg-background rounded-2xl"
                                    value={newText}
                                    onChange={e => setNewText(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1 h-11 rounded-xl font-bold" onClick={() => handleSave(null)}>Save</Button>
                                <Button variant="ghost" className="flex-1 h-11 rounded-xl font-medium" onClick={() => setIsAdding(false)}>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div id="reminders-list" className="bg-card border rounded-3xl shadow-sm overflow-hidden divide-y">
                    {reminders.map((reminder) => (
                        <div key={reminder.id} className="p-5 space-y-3">
                            {editingId === reminder.id ? (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <Textarea 
                                        className="min-h-[100px] bg-muted/20 rounded-2xl"
                                        value={newText}
                                        onChange={e => setNewText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 h-9 rounded-lg font-bold" onClick={() => handleSave(reminder.id)}>Update</Button>
                                        <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-lg font-medium" onClick={() => setEditingId(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                            <Megaphone className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{reminder.text}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-2">
                                                Added {formatDistanceToNow(new Date(reminder.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold" onClick={() => { setEditingId(reminder.id); setNewText(reminder.text); }}>
                                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-3xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
                                                    <AlertDialogDescription>This action is permanent.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-4 gap-2">
                                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive rounded-xl font-bold" onClick={() => handleDelete(reminder.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {reminders.length === 0 && !isAdding && (
                        <div className="py-20 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-bold tracking-tight">No active reminders</p>
                            <p className="text-sm px-10">Add global workspace notes to keep your team informed.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
