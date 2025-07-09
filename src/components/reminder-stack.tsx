
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


  if ((reminders.length + generalReminders.length) === 0) {
      return null;
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      
      <div
        className={cn(
         "fixed inset-0 z-50 flex flex-col items-center justify-start pt-16 sm:pt-24 pointer-events-none",
         !isOpen && "hidden"
        )}
      >
        <div
         className={cn(
           "w-full max-w-2xl transition-all duration-500 ease-in-out pointer-events-auto px-4",
           isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
         )}
        >
          <div className="w-full flex justify-center items-center relative mb-4">
            <h2 className="text-xl font-bold text-background">Important Reminders</h2>
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0 text-background/70 hover:text-background h-8 w-8 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:ring-offset-0" 
                onClick={() => onOpenChange(false)}
            >
                <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-150px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {generalReminders.length > 0 && (
                <div className='space-y-3'>
                    <h3 className="font-semibold text-background/80 pl-2">General</h3>
                    {generalReminders.map((reminder, index) => (
                      <div
                          key={reminder.id}
                          className={cn(
                            'w-full rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-4 shadow-lg transition-all duration-500 ease-out',
                            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12',
                            unpinningIds.has(reminder.id) && '!opacity-0 !scale-90 !-translate-y-4'
                          )}
                          style={{ borderColor: 'hsl(var(--primary) / 0.2)', transitionDelay: isOpen ? `${index * 60}ms` : '0ms' }}
                      >
                           <div className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-3 flex-1 min-w-0">
                                   <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                   <div className="text-sm flex-1"><p className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap">{reminder.text}</p></div>
                               </div>
                                <Button
                                    variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex-shrink-0"
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
                <Separator className="bg-background/20" />
              )}

              {reminders.length > 0 && (
                <div className='space-y-3'>
                    <h3 className="font-semibold text-background/80 pl-2">Tasks</h3>
                    {reminders.map((task, index) => (
                      <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(e, task.id)}
                          className={cn(
                            'w-full rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-4 shadow-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all duration-500 ease-out',
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
                                <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <div className="text-sm flex-1">
                                <p className="font-semibold text-amber-800 dark:text-amber-200 truncate">
                                    {task.title}
                                </p>
                                <p className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap truncate">
                                    {task.reminder}
                                </p>
                                {task.reminderExpiresAt && (
                                    <span className="block text-xs italic mt-1 text-amber-600 dark:text-amber-400">
                                        (Expires {format(new Date(task.reminderExpiresAt), timeFormatString)})
                                    </span>
                                )}
                                </div>
                            </div>
                            <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex-shrink-0"
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
    </>
  );
}
