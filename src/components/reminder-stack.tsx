
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BellRing, PinOff, X, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

interface ReminderStackProps {
  reminders: Task[];
  uiConfig: UiConfig | null;
  onUnpin: (taskId: string) => void;
}

export function ReminderStack({ reminders, uiConfig, onUnpin }: ReminderStackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [unpinningIds, setUnpinningIds] = useState<Set<string>>(new Set());
  const stackRef = useRef<HTMLDivElement>(null);
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
  
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // When all reminders are gone, animate out the container
  useEffect(() => {
    if (reminders.length === 0) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        // This could be used to inform the parent to remove the component fully
      }, 500); // match animation duration
      return () => clearTimeout(timer);
    } else {
      setIsExiting(false);
    }
  }, [reminders.length]);


  if (reminders.length === 0 && !isExiting) {
    return null;
  }
  
  const MAX_VISIBLE_STACKED = 3;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ease-in-out',
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsExpanded(false)}
        aria-hidden="true"
      />
      
      <div
        ref={stackRef}
        className={cn(
          "relative mb-6 w-full max-w-2xl mx-auto transition-all duration-500 ease-in-out z-50",
          isExpanded ? `h-[${reminders.length * 95}px]` : `h-[${(Math.min(reminders.length, MAX_VISIBLE_STACKED) * 8) + 82}px]`,
          isExiting && "opacity-0 -translate-y-4"
        )}
        aria-label={`${reminders.length} pinned reminders`}
      >
        {/* Expanded State Header */}
        <div className={cn(
          "absolute -top-12 left-1/2 -translate-x-1/2 w-full flex justify-center items-center transition-all duration-300 ease-in-out",
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}>
           <h2 className="text-xl font-bold text-background">Important Reminders</h2>
           <Button variant="ghost" size="icon" className="absolute right-0 text-background/70 hover:text-background h-8 w-8" onClick={() => setIsExpanded(false)}>
              <X className="h-5 w-5" />
           </Button>
        </div>

        {reminders.map((task, index) => {
         if (!isExpanded && index >= MAX_VISIBLE_STACKED) {
            return null;
         }

        return (
          <div
            key={task.id}
            onClick={(e) => {
              if (isExpanded) {
                handleTaskClick(e, task.id);
              }
            }}
            className={cn(
              'absolute w-full rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-4 shadow-lg transition-all duration-500 ease-in-out',
              isExpanded
                ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40'
                : 'cursor-default',
              isExiting && 'opacity-0 scale-95',
              unpinningIds.has(task.id) && 'opacity-0 scale-90 -translate-y-4'
            )}
            style={{
              transform: isExpanded
                ? `translateY(${index * 95}px)`
                : `translateY(${index * 8}px) scale(${1 - index * 0.05})`,
              zIndex: reminders.length - index,
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
       {reminders.length > 0 && !isExpanded && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ zIndex: reminders.length + 1 }}>
            <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full shadow-lg"
                onClick={handleToggleExpand}
            >
                <ChevronsUpDown className="h-4 w-4 mr-2" />
                Show {reminders.length > 1 ? `${reminders.length} Reminders` : 'Reminder'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
