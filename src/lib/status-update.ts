'use client';

import type { MutableRefObject } from 'react';
import type { Task, TaskStatus } from './types';
import { updateTask } from './data';

type ScheduleStatusUpdateArgs = {
  task: Task;
  newStatus: TaskStatus;
  debounceRef: MutableRefObject<number | null>;
  requestRef: MutableRefObject<number>;
  applyOptimistic: (task: Task) => void;
  onPersisted?: (task: Task) => void;
  onError?: (previousTask: Task) => void;
  debounceMs?: number;
};

export function scheduleStatusUpdate({
  task,
  newStatus,
  debounceRef,
  requestRef,
  applyOptimistic,
  onPersisted,
  onError,
  debounceMs = 140,
}: ScheduleStatusUpdateArgs) {
  if (debounceRef.current) {
    window.clearTimeout(debounceRef.current);
  }

  const previousTask = task;
  const optimisticTask: Task = {
    ...task,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  applyOptimistic(optimisticTask);

  const requestId = requestRef.current + 1;
  requestRef.current = requestId;

  debounceRef.current = window.setTimeout(() => {
    const persistedTask = updateTask(task.id, { status: newStatus });

    if (requestRef.current !== requestId) return;

    if (persistedTask) {
      applyOptimistic(persistedTask);
      onPersisted?.(persistedTask);
      return;
    }

    applyOptimistic(previousTask);
    onError?.(previousTask);
  }, debounceMs);
}
