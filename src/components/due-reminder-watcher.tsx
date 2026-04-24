'use client';

import { useEffect, useRef } from 'react';

import { addLog, getTasks, getUiConfig, getUserPreferences } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { parseTaskDate } from '@/lib/task-planning';
import { formatTimestamp } from '@/lib/utils';

const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
const FIRED_REMINDERS_STORAGE_KEY = 'taskflow_due_reminders_fired';

function readFiredReminderMap() {
  try {
    const raw = window.localStorage.getItem(FIRED_REMINDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeFiredReminderMap(map: Record<string, string>) {
  window.localStorage.setItem(FIRED_REMINDERS_STORAGE_KEY, JSON.stringify(map));
}

function readPinnedTaskIds() {
  try {
    const raw = window.localStorage.getItem(PINNED_TASKS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function pinTask(taskId: string) {
  const pinned = readPinnedTaskIds();
  if (pinned.includes(taskId)) return;
  const next = [taskId, ...pinned];
  window.localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new StorageEvent('storage', { key: PINNED_TASKS_STORAGE_KEY, newValue: JSON.stringify(next) }));
}

function playReminderSound() {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.48);
  } catch {
    // Ignore audio failures.
  }
}

async function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = Notification.permission;
    }
  }

  if (permission === 'granted') {
    new Notification(title, {
      body,
      tag: `due-reminder-${title}`,
    });
  }
}

export function DueReminderWatcher() {
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const checkDueReminders = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const uiConfig = getUiConfig();
        if (!uiConfig?.remindersEnabled) return;

        const now = new Date();
        const tasks = getTasks();
        const firedReminderMap = readFiredReminderMap();
        let didUpdateFiredMap = false;

        for (const task of tasks) {
          if (task.dueCompletedAt) continue;

          const dueReminderAt = parseTaskDate(task.dueReminderAt);

          if (!dueReminderAt) {
            if (firedReminderMap[task.id]) {
              delete firedReminderMap[task.id];
              didUpdateFiredMap = true;
            }
            continue;
          }

          if (firedReminderMap[task.id] && firedReminderMap[task.id] !== task.dueReminderAt) {
            delete firedReminderMap[task.id];
            didUpdateFiredMap = true;
          }

          if (dueReminderAt > now) continue;
          if (firedReminderMap[task.id] === task.dueReminderAt) continue;

          firedReminderMap[task.id] = task.dueReminderAt || dueReminderAt.toISOString();
          didUpdateFiredMap = true;

          pinTask(task.id);

          const reminderTimeLabel = formatTimestamp(dueReminderAt, uiConfig.timeFormat);
          const dueLabel = task.dueAt
            ? `Due ${formatTimestamp(task.dueAt, uiConfig.timeFormat)}`
            : 'No due date set';
          const notificationTitle = 'Due reminder reached';
          const notificationBody = `"${task.title}" alerted at ${reminderTimeLabel}. ${dueLabel}.`;

          toast({
            title: notificationTitle,
            description: notificationBody,
            duration: 6000,
          });

          if (getUserPreferences().notificationSounds !== false) {
            playReminderSound();
          }

          await showBrowserNotification(notificationTitle, notificationBody);
          addLog({
            message: `Due reminder alerted for "**${task.title}**" at *${reminderTimeLabel}* and the task was pinned for visibility.`,
            taskId: task.id,
          });
        }

        if (didUpdateFiredMap) {
          writeFiredReminderMap(firedReminderMap);
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkDueReminders();
    const intervalId = window.setInterval(checkDueReminders, 30000);
    window.addEventListener('focus', checkDueReminders);
    document.addEventListener('visibilitychange', checkDueReminders);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', checkDueReminders);
      document.removeEventListener('visibilitychange', checkDueReminders);
    };
  }, []);

  return null;
}
