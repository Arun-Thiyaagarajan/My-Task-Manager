
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BellRing, PinOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

interface ReminderStackProps {
  reminders: Task[];
  uiConfig: UiConfig | null;
  onUnpin: (taskId: string) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ReminderStack({ reminders, uiConfig, onUnpin, isOpen, onOpenChange }: ReminderStackProps) {
  const [unpinningIds, setUnpinningIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { prompt } = useUnsavedChanges();
  
  const timeFormatString = uiConfig?.timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p';

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    prompt(() => router.push(`/tasks/${taskId}`));
  };
  
  const handleUnpinClick = (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      
      if (unpinningIds.has(taskId)) return;

      setUnpinningIds(prev => new Set(prev).add(taskId));

      setTimeout(() => {
          onUnpin(taskId);
      }, 500); // Match animation duration
  };

  // When all reminders are gone, close the dialog
  useEffect(() => {
   if (reminders.length === 0 && isOpen) {
      onOpenChange(false);
    }
  }, [reminders.length, isOpen, onOpenChange]);


  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
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
         "fixed inset-0 z-50 flex flex-col items-center justify-start pt-24 transition-all duration-300 ease-in-out",
          !isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <div
         className={cn(
           "w-full max-w-2xl transition-all duration-300 ease-in-out",
           isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
         )}
        >
          {/* Expanded State Header */}
          <div className={cn(
            "w-full flex justify-center items-center relative mb-4"
          )}>
            <h2 className="text-xl font-bold text-background">Important Reminders</h2>
            <Button variant="ghost" size="icon" className="absolute right-0 text-background/70 hover:text-background h-8 w-8" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {reminders.map((task, index) => {
                  return (
                      <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(e, task.id)}
                          className={cn(
                          'w-full rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-4 shadow-lg transition-all duration-500 ease-in-out cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40',
                          unpinningIds.has(task.id) && 'opacity-0 scale-90 -translate-y-4'
                          )}
                          style={{
                              borderColor: 'hsl(var(--primary) / 0.2)',
                          }}
                      >
                          <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                              <BellRing className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
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
                              onClick={(e) => handleUnpinClick(e, task.id)}
                          >
                              <PinOff className="h-4 w-4" />
                              <span className="sr-only">Unpin this reminder</span>
                          </Button>
                          </div>
                      </div>
                  )
              })}
          </div>
        </div>
      </div>
    </>
  );
}
