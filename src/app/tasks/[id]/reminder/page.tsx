'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getTaskById, getUiConfig, updateTask } from '@/lib/data';
import type { Task, UiConfig } from '@/lib/types';
import { 
    ArrowLeft, 
    BellRing, 
    Pin, 
    PinOff, 
    CalendarIcon, 
    Loader2, 
    Trash2, 
    Check,
    Save
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const reminderSchema = z.object({
  reminder: z.string().max(500, "Reminder cannot exceed 500 characters.").nullable(),
  autoDisappear: z.boolean(),
  expiresAt: z.date().optional().nullable(),
}).refine(data => {
    if (data.autoDisappear && !data.expiresAt) return false;
    return true;
}, {
    message: 'Please select an expiration date.',
    path: ['expiresAt'],
});

type ReminderFormData = z.infer<typeof reminderSchema>;

export default function TaskReminderPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const taskId = params.id as string;
    
    const [task, setTask] = useState<Task | null>(null);
    const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    
    const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';

    const form = useForm<ReminderFormData>({
        resolver: zodResolver(reminderSchema),
        defaultValues: {
            reminder: '',
            autoDisappear: false,
            expiresAt: null,
        },
    });

    useEffect(() => {
        const foundTask = getTaskById(taskId);
        const config = getUiConfig();
        if (foundTask) {
            setTask(foundTask);
            setUiConfig(config);
            
            const pinnedIds = JSON.parse(localStorage.getItem(PINNED_TASKS_STORAGE_KEY) || '[]');
            const isCurrentlyPinned = pinnedIds.includes(foundTask.id);
            setIsPinned(!foundTask.reminder ? true : isCurrentlyPinned);

            form.reset({
                reminder: foundTask.reminder || '',
                autoDisappear: !!foundTask.reminderExpiresAt,
                expiresAt: foundTask.reminderExpiresAt ? new Date(foundTask.reminderExpiresAt) : null,
            });
        }
        window.dispatchEvent(new Event('navigation-end'));
    }, [taskId]);

    const handleSave = (data: ReminderFormData) => {
        if (!task) return;
        setIsPending(true);
        try {
            const newReminder = data.reminder?.trim() ? data.reminder.trim() : null;
            const newExpiresAt = data.autoDisappear ? (data.expiresAt ? data.expiresAt.toISOString() : null) : null;
            
            updateTask(task.id, { 
                reminder: newReminder,
                reminderExpiresAt: newExpiresAt,
            });
            
            // Sync Pin state
            const pinnedIds = JSON.parse(localStorage.getItem(PINNED_TASKS_STORAGE_KEY) || '[]');
            let newPinnedIds = [...pinnedIds];
            if (newReminder && isPinned) {
                if (!newPinnedIds.includes(task.id)) newPinnedIds.push(task.id);
            } else {
                newPinnedIds = newPinnedIds.filter(id => id !== task.id);
            }
            localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinnedIds));

            toast({ variant: 'success', title: 'Reminder saved' });
            router.back();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error saving reminder' });
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = () => {
        if (!task) return;
        setIsPending(true);
        try {
            updateTask(task.id, { reminder: null, reminderExpiresAt: null });
            const pinnedIds = JSON.parse(localStorage.getItem(PINNED_TASKS_STORAGE_KEY) || '[]');
            const newPinnedIds = pinnedIds.filter((id: string) => id !== task.id);
            localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinnedIds));
            
            toast({ variant: 'success', title: 'Reminder removed' });
            router.back();
        } finally {
            setIsPending(false);
        }
    };

    if (!task || !uiConfig) return null;

    const timeFormat = uiConfig.timeFormat || '12h';
    const timeFormatString = timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';

    return (
        <div className="bg-background min-h-0 pb-6">
            {/* Header */}
            <div className="px-6 pt-10 pb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 -ml-2 rounded-full shrink-0">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight truncate">{task.title}</h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Set Reminder Note</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsPinned(!isPinned)}
                    className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center transition-all border",
                        isPinned ? "bg-amber-500/10 border-amber-500/20 text-amber-600 shadow-sm" : "bg-muted/30 border-transparent text-muted-foreground"
                    )}
                >
                    {isPinned ? <Pin className="h-5 w-5 fill-current" /> : <PinOff className="h-5 w-5" />}
                </button>
            </div>

            <div className="px-4 space-y-6">
                <Card className="border-none shadow-xl rounded-3xl bg-card overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sticky Note Content</Label>
                            <Textarea 
                                placeholder="Jot down important context for this task..."
                                className="min-h-[200px] rounded-2xl bg-muted/10 text-lg leading-relaxed border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                                value={form.watch('reminder') || ''}
                                onChange={e => form.setValue('reminder', e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-dashed">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold">Auto-Clear Reminder</Label>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Automatically remove after date</p>
                                </div>
                                <Switch 
                                    checked={form.watch('autoDisappear')} 
                                    onCheckedChange={checked => {
                                        form.setValue('autoDisappear', checked);
                                        if (checked && !form.getValues('expiresAt')) {
                                            form.setValue('expiresAt', new Date());
                                        }
                                    }} 
                                />
                            </div>

                            {form.watch('autoDisappear') && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full h-12 justify-start rounded-xl font-medium px-4 bg-muted/5 border-muted-foreground/10">
                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                <span className="flex min-w-0 flex-col items-start leading-tight">
                                                    <span>{form.watch('expiresAt') ? format(form.watch('expiresAt')!, timeFormatString) : 'Pick expiry time'}</span>
                                                    <span className="text-[11px] font-normal text-muted-foreground">
                                                        {timeFormat === '24h' ? 'Calendar + 24h time' : 'Calendar + 12h time'}
                                                    </span>
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 flex flex-col rounded-[1.5rem] border-white/10 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.8)]">
                                            <Calendar 
                                                mode="single" 
                                                selected={form.watch('expiresAt') || undefined} 
                                                onSelect={d => {
                                                    const current = form.getValues('expiresAt') || new Date();
                                                    if (d) {
                                                        d.setHours(current.getHours(), current.getMinutes());
                                                        form.setValue('expiresAt', d);
                                                    }
                                                }}
                                            />
                                            <div className="space-y-3 border-t bg-muted/5 p-3">
                                                <div className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                    <span>Hour</span>
                                                    <span>Min</span>
                                                    <span className={cn(timeFormat !== '12h' && "opacity-0")}>Mode</span>
                                                </div>
                                                <div className="flex gap-2">
                                                <Select onValueChange={h => {
                                                    const d = form.getValues('expiresAt') || new Date();
                                                    const nextHour = parseInt(h);
                                                    if (timeFormat === '12h') {
                                                        const isPM = d.getHours() >= 12;
                                                        let normalized = nextHour;
                                                        if (isPM && nextHour !== 12) normalized = nextHour + 12;
                                                        else if (!isPM && nextHour === 12) normalized = 0;
                                                        d.setHours(normalized);
                                                    } else {
                                                        d.setHours(nextHour);
                                                    }
                                                    form.setValue('expiresAt', new Date(d));
                                                }}>
                                                    <SelectTrigger className="h-9 border-white/10 bg-background/80"><SelectValue placeholder="Hour" /></SelectTrigger>
                                                    <SelectContent>
                                                        {timeFormat === '12h'
                                                            ? Array.from({length: 12}, (_, i) => {
                                                                const value = String(i + 1);
                                                                return <SelectItem key={value} value={value}>{value}</SelectItem>;
                                                            })
                                                            : Array.from({length: 24}, (_, i) => (
                                                                <SelectItem key={i} value={String(i)}>{String(i).padStart(2,'0')}</SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                                <Select onValueChange={m => {
                                                    const d = form.getValues('expiresAt') || new Date();
                                                    d.setMinutes(parseInt(m));
                                                    form.setValue('expiresAt', new Date(d));
                                                }}>
                                                    <SelectTrigger className="h-9 border-white/10 bg-background/80"><SelectValue placeholder="Min" /></SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from({length: 60}, (_, i) => i).map(m => (
                                                            <SelectItem key={m} value={String(m)}>{String(m).padStart(2,'0')}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {timeFormat === '12h' && (
                                                    <Select
                                                        value={(form.watch('expiresAt') || new Date()).getHours() >= 12 ? 'pm' : 'am'}
                                                        onValueChange={period => {
                                                            const d = form.getValues('expiresAt') || new Date();
                                                            const currentHour = d.getHours();
                                                            if (period === 'pm' && currentHour < 12) d.setHours(currentHour + 12);
                                                            if (period === 'am' && currentHour >= 12) d.setHours(currentHour - 12);
                                                            form.setValue('expiresAt', new Date(d));
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-9 border-white/10 bg-background/80"><SelectValue placeholder="AM/PM" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="am">AM</SelectItem>
                                                            <SelectItem value="pm">PM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border-white/10 bg-background/70 text-xs font-semibold" onClick={() => {
                                                        const d = form.getValues('expiresAt') || new Date();
                                                        d.setHours(9, 0, 0, 0);
                                                        form.setValue('expiresAt', new Date(d));
                                                    }}>9 AM</Button>
                                                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border-white/10 bg-background/70 text-xs font-semibold" onClick={() => {
                                                        const d = form.getValues('expiresAt') || new Date();
                                                        d.setHours(13, 0, 0, 0);
                                                        form.setValue('expiresAt', new Date(d));
                                                    }}>1 PM</Button>
                                                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border-white/10 bg-background/70 text-xs font-semibold" onClick={() => {
                                                        const d = form.getValues('expiresAt') || new Date();
                                                        d.setHours(18, 0, 0, 0);
                                                        form.setValue('expiresAt', new Date(d));
                                                    }}>6 PM</Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-2 pb-10">
                    <Button 
                        size="lg" 
                        className="w-full h-14 rounded-2xl font-bold shadow-2xl shadow-primary/30"
                        onClick={form.handleSubmit(handleSave)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save Reminder
                    </Button>
                    {task.reminder && (
                        <Button 
                            variant="ghost" 
                            size="lg" 
                            className="w-full h-12 rounded-2xl font-bold text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove Note
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
