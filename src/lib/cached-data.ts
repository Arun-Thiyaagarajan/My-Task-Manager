'use client';

import type { Note, Task } from './types';
import {
  findExistingDuplicates,
  getActiveCompanyId,
  getAuthMode,
  getBinnedTasks,
  getNotes,
  getTaskById,
  getTasks,
  getTasksUsingField,
} from './data';
import { buildReadCacheKey, buildReadCacheScope, getOrCompute } from './read-cache';

const LIST_TTL_MS = 45_000;
const DETAIL_TTL_MS = 90_000;

function getCurrentScopeKey() {
  return buildReadCacheScope(getAuthMode(), getActiveCompanyId());
}

export function getCachedTasks(): Task[] {
  const scopeKey = getCurrentScopeKey();
  return getOrCompute(buildReadCacheKey(scopeKey, 'tasks'), LIST_TTL_MS, () => getTasks(), { scopeKey });
}

export function getCachedTaskById(id: string): Task | undefined {
  const scopeKey = getCurrentScopeKey();
  return getOrCompute(buildReadCacheKey(scopeKey, 'task', id), DETAIL_TTL_MS, () => getTaskById(id), { scopeKey });
}

export function getCachedBinnedTasks(): Task[] {
  const scopeKey = getCurrentScopeKey();
  return getOrCompute(buildReadCacheKey(scopeKey, 'tasks', 'binned'), LIST_TTL_MS, () => getBinnedTasks(), { scopeKey });
}

export function getCachedNotes(): Note[] {
  const scopeKey = getCurrentScopeKey();
  return getOrCompute(buildReadCacheKey(scopeKey, 'notes'), LIST_TTL_MS, () => getNotes(), { scopeKey });
}

export function getCachedTasksUsingField(key: string): Task[] {
  const scopeKey = getCurrentScopeKey();
  return getOrCompute(
    buildReadCacheKey(scopeKey, 'tasks-by-field', key),
    LIST_TTL_MS,
    () => getTasksUsingField(key),
    { scopeKey }
  );
}

export function getCachedDuplicates(): { fieldLabel: string; value: string; tasks: Task[] }[] {
  const scopeKey = getCurrentScopeKey();
  return getOrCompute(buildReadCacheKey(scopeKey, 'duplicates'), LIST_TTL_MS, () => findExistingDuplicates(), { scopeKey });
}
