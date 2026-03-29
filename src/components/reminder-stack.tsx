
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, UiConfig, GeneralReminder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BellRing, PinOff, X, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { Separator } from './ui/separator';

interface ReminderStackProps {
  reminders: Task[];
  generalReminders: GeneralReminder[];
  uiConfig: UiConfig | null;
  onUnpin: (taskId: string) => void;
  onDismissGeneralReminder: (reminderId: string) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ReminderStack({ 
  reminders, 
  generalReminders,
  uiConfig, 
  onUnpin,
  onDismissGeneralReminder, 
  isOpen, 
  onOpenChange 
}: ReminderStackProps) {
  const [unpinningIds, setUnpinningIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { prompt } = useUnsavedChanges();
  
  const timeFormatString = uiConfig?.timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    prompt(() => router.push(`/tasks/${taskId}`));
  };
  
  const handleUnpinClick = (e: React.MouseEvent, id: string, type: 'task' | 'general') => {
      e.stopPropagation();
      
      if (unpinningIds.has(id)) return;

      setUnpinningIds(prev => new Set(prev).add(id));

      setTimeout(() => {
          if (type === 'task') {
            onUnpin(id);
          } else {
            onDismissGeneralReminder(id);
          }
          setUnpinningIds(currentIds => {
              const newIds = new Set(currentIds);
              newIds.delete(id);
              return newIds;
          });
      }, 500); // Match animation duration
  };

  useEffect(() => {
    if ((reminders.length + generalReminders.length) === 0 && isOpen) {
      onOpenChange(false);
    }
  }, [reminders.length, generalReminders.length, isOpen, onOpenChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpenChange]);


  if (!isOpen && (reminders.length + generalReminders.length) === 0) {
      return null;
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[160] bg-black/50 backdrop-blur-sm transition-opacity duration-500 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      
      <div
        className={cn(
         "fixed inset-0 z-[170] flex items-end justify-center px-0 pb-0 pt-6 sm:items-start sm:px-4 sm:pb-4 sm:pt-20 pointer-events-none",
         !isOpen && "hidden"
        )}
      >
        <div
         className={cn(
           "w-full transition-all duration-500 ease-in-out pointer-events-auto sm:max-w-2xl",
           isOpen ? 'opacity-100 translate-y-0 sm:translate-y-0' : 'opacity-0 translate-y-8 sm:-translate-y-4'
         )}
        >
          <div className="overflow-hidden rounded-t-[2rem] border border-white/10 bg-[linear-gradient(180deg,hsl(var(--background)/0.98)_0%,hsl(var(--card)/0.97)_100%)] shadow-[0_30px_90px_-38px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:rounded-[2rem]">
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
              <div className="mb-3 flex items-center justify-center sm:hidden">
                <div className="h-1.5 w-14 rounded-full bg-foreground/10" />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/14 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-300">
                      <BellRing className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Important Reminders</h2>
                      <p className="text-xs font-medium text-muted-foreground sm:text-sm">Pinned notes and reminders that need attention.</p>
                    </div>
                  </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] text-foreground/70 hover:bg-white/[0.08] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0" 
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

          <div className="space-y-4 max-h-[min(72vh,38rem)] overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:max-h-[calc(100vh-220px)] sm:px-5 sm:py-5">
              {generalReminders.length > 0 && (
                <div className='space-y-3'>
                    <h3 className="pl-1 text-xs font-black uppercase tracking-[0.22em] text-muted-foreground/70">General</h3>
                    {generalReminders.map((reminder, index) => (
                      <div
                          key={reminder.id}
                          className={cn(
                            'w-full rounded-[1.35rem] border border-amber-500/14 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.045))] p-4 shadow-[0_12px_28px_-24px_rgba(245,158,11,0.32)] transition-all duration-500 ease-out',
                            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12',
                            unpinningIds.has(reminder.id) && '!opacity-0 !scale-90 !-translate-y-4'
                          )}
                          style={{ borderColor: 'hsl(var(--primary) / 0.2)', transitionDelay: isOpen ? `${index * 60}ms` : '0ms' }}
                      >
                           <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-3 flex-1 min-w-0">
                                   <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/18 dark:text-amber-300">
                                     <Megaphone className="h-4 w-4 flex-shrink-0" />
                                   </span>
                                   <div className="min-w-0 flex-1 text-sm"><p className="break-words text-amber-900/90 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">{reminder.text}</p></div>
                               </div>
                                <Button
                                    variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 flex-shrink-0"
                                    onClick={(e) => handleUnpinClick(e, reminder.id, 'general')}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Dismiss this reminder</span>
                                </Button>
                           </div>
                      </div>
                    ))}
                </div>
              )}

              {generalReminders.length > 0 && reminders.length > 0 && (
                <Separator className="bg-border/70" />
              )}

              {reminders.length > 0 && (
                <div className='space-y-3'>
                    <h3 className="pl-1 text-xs font-black uppercase tracking-[0.22em] text-muted-foreground/70">Tasks</h3>
                    {reminders.map((task, index) => (
                      <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(e, task.id)}
                          className={cn(
                            'w-full rounded-[1.35rem] border border-amber-500/14 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))] p-4 shadow-[0_12px_28px_-24px_rgba(245,158,11,0.32)] cursor-pointer hover:bg-[linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.06))] transition-all duration-500 ease-out',
                            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12',
                            unpinningIds.has(task.id) && '!opacity-0 !scale-90 !-translate-y-4'
                          )}
                          style={{
                              borderColor: 'hsl(var(--primary) / 0.2)',
                              transitionDelay: isOpen ? `${(generalReminders.length + index) * 60}ms` : '0ms'
                          }}
                      >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/18 dark:text-amber-300">
                                  <BellRing className="h-4 w-4 flex-shrink-0" />
                                </span>
                                <div className="min-w-0 flex-1 text-sm">
                                <p className="break-words font-semibold text-amber-900 dark:text-amber-100 line-clamp-2">
                                    {task.title}
                                </p>
                                <p className="break-words text-amber-900/75 dark:text-amber-200/90 whitespace-pre-wrap line-clamp-4">
                                    {task.reminder}
                                </p>
                                {task.reminderExpiresAt && (
                                    <span className="mt-1 block text-xs font-medium italic text-amber-700/80 dark:text-amber-300/90">
                                        (Expires {format(new Date(task.reminderExpiresAt), timeFormatString)})
                                    </span>
                                )}
                                </div>
                            </div>
                            <Button
                                variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 flex-shrink-0"
                                onClick={(e) => handleUnpinClick(e, task.id, 'task')}
                            >
                                <PinOff className="h-4 w-4" />
                                <span className="sr-only">Unpin this reminder</span>
                            </Button>
                          </div>
                      </div>
                  ))}
                </div>
              )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
