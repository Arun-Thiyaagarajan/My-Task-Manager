
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
    // Prevent toggling if there's only one reminder
    if (reminders.length <= 1) return;
    setIsExpanded(prev => !prev);
  }, [reminders.length]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (stackRef.current && !stackRef.current.contains(event.target as Node)) {
      setIsExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, handleClickOutside]);

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
    <div
      ref={stackRef}
      className={cn(
        "relative mb-6 w-full max-w-2xl mx-auto transition-all duration-500 ease-in-out",
        isExpanded ? `h-[${reminders.length * 95}px]` : `h-[90px]`,
        isExiting && "opacity-0 -translate-y-4"
      )}
      onClick={handleToggleExpand}
      aria-label={`${reminders.length} pinned reminders`}
    >
      {reminders.map((task, index) => {
         if (!isExpanded && index >= MAX_VISIBLE_STACKED) {
            return null;
         }

        return (
          <div
            key={task.id}
            className={cn(
              'absolute w-full rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-4 shadow-md transition-all duration-500 ease-in-out',
              isExpanded
                ? 'cursor-default'
                : 'cursor-pointer hover:scale-105 hover:-translate-y-1',
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
              <div className="flex items-start gap-3 flex-1 min-w-0" onClick={(e) => handleTaskClick(e, task.id)}>
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
  );
}
