import { endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns';

import type { Task, UiConfig } from '@/lib/types';
import { fuzzySearch } from '@/lib/utils';
import { getStatusDisplayName, getStatusGroupId, resolveStatusConfig } from '@/lib/status-config';
import { getTaskPriorityValue, hasDueReminder, hasReminderNote, matchesTaskDueStateFilter } from '@/lib/task-planning';

type DateView = 'all' | 'monthly' | 'calendar' | 'yearly';
const MAX_SEARCH_PARTS = 500;
const MAX_SEARCH_PART_LENGTH = 500;
const MAX_SEARCH_QUERY_LENGTH = 160;

function addSearchPart(parts: string[], value: string) {
  if (parts.length >= MAX_SEARCH_PARTS) return;

  const trimmed = value.trim();
  if (!trimmed) return;

  parts.push(trimmed.length > MAX_SEARCH_PART_LENGTH ? trimmed.slice(0, MAX_SEARCH_PART_LENGTH) : trimmed);
}

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ').slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function getDeploymentScore(task: Task) {
  const deploymentOrder = ['production', 'stage', 'dev'];
  for (let i = 0; i < deploymentOrder.length; i++) {
    const env = deploymentOrder[i];
    if (task.deploymentStatus?.[env]) {
      return deploymentOrder.length - i;
    }
  }
  return 0;
}

function collectSearchableValues(value: unknown, parts: string[], seen = new WeakSet<object>()) {
  if (parts.length >= MAX_SEARCH_PARTS) return;
  if (value === null || typeof value === 'undefined') return;

  if (typeof value === 'string') {
    addSearchPart(parts, value);
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    addSearchPart(parts, String(value));
    return;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) addSearchPart(parts, value.toISOString());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectSearchableValues(item, parts, seen));
    return;
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return;
    seen.add(value);

    let entries: Array<[string, unknown]> = [];
    try {
      entries = Object.entries(value as Record<string, unknown>);
    } catch {
      return;
    }

    entries.forEach(([key, entryValue]) => {
      addSearchPart(parts, key);
      collectSearchableValues(entryValue, parts, seen);
    });
  }
}

export function getTaskSearchableParts(
  task: Task,
  developersById: Map<string, string>,
  testersById: Map<string, string>,
  uiConfig?: UiConfig | null
) {
  const parts: string[] = [];

  collectSearchableValues(task, parts);

  addSearchPart(parts, getStatusDisplayName(task.status, uiConfig));
  if (task.priority) addSearchPart(parts, getTaskPriorityValue(task.priority));

  task.developers?.forEach((devId) => {
    addSearchPart(parts, devId);
    const developerName = developersById.get(devId);
    if (developerName) addSearchPart(parts, developerName);
  });

  task.testers?.forEach((testerId) => {
    addSearchPart(parts, testerId);
    const testerName = testersById.get(testerId);
    if (testerName) addSearchPart(parts, testerName);
  });

  Object.keys(task.deploymentStatus || {}).forEach((environment) => {
    const status = task.deploymentStatus?.[environment];
    addSearchPart(parts, environment);
    addSearchPart(parts, status ? `${environment} deployed` : `${environment} not deployed`);
  });

  Object.keys(task.customFields || {}).forEach((fieldKey) => {
    const fieldConfig = uiConfig?.fields.find((field) => field.key === fieldKey);
    if (!fieldConfig) return;

    addSearchPart(parts, fieldConfig.key);
    addSearchPart(parts, fieldConfig.label);
    addSearchPart(parts, fieldConfig.type);
    addSearchPart(parts, fieldConfig.group);
    const rawValueParts: string[] = [];
    collectSearchableValues(task.customFields?.[fieldKey], rawValueParts);
    const rawValueSet = new Set(rawValueParts.map((part) => part.trim().toLowerCase()).filter(Boolean));

    fieldConfig.options?.forEach((option) => {
      const optionValue = typeof option?.value === 'string' ? option.value.trim() : '';
      const optionLabel = typeof option?.label === 'string' ? option.label.trim() : '';

      if (
        (optionValue && rawValueSet.has(optionValue.toLowerCase())) ||
        (optionLabel && rawValueSet.has(optionLabel.toLowerCase()))
      ) {
        addSearchPart(parts, optionLabel);
        addSearchPart(parts, optionValue);
      }
    });
  });

  return [...new Set(parts.map(part => part.trim()).filter(Boolean))].slice(0, MAX_SEARCH_PARTS);
}

export function matchesTaskSearchQuery(
  task: Task,
  query: string,
  developersById: Map<string, string>,
  testersById: Map<string, string>,
  uiConfig?: UiConfig | null
) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery === '') return true;

  return getTaskSearchableParts(task, developersById, testersById, uiConfig)
    .some((part) => fuzzySearch(normalizedQuery, part));
}

export function matchesTaskDateView(task: Task, dateView: DateView, selectedDate: Date) {
  if (dateView === 'all') return true;

  const calendarAnchor = task.devStartDate || task.qaStartDate || task.createdAt;
  if (!calendarAnchor) return false;

  const taskDate = new Date(calendarAnchor);

  if (dateView === 'monthly' || dateView === 'calendar') {
    return taskDate >= startOfMonth(selectedDate) && taskDate <= endOfMonth(selectedDate);
  }

  if (dateView === 'yearly') {
    return taskDate >= startOfYear(selectedDate) && taskDate <= endOfYear(selectedDate);
  }

  return true;
}

export function matchesTaskFilters(
  task: Task,
  {
    favoritesOnly,
    statusFilter,
    statusGroupFilter,
    repoFilter,
    tagsFilter,
    priorityFilter,
    dueStateFilter,
    reminderNoteFilter,
    dueReminderFilter,
    deploymentFilter,
    showRepositoryFilter,
    query,
    dateView,
    selectedDate,
    uiConfig,
    developersById,
    testersById,
  }: {
    favoritesOnly: boolean;
    statusFilter: string[];
    statusGroupFilter: string[];
    repoFilter: string[];
    tagsFilter: string[];
    priorityFilter: string[];
    dueStateFilter: string[];
    reminderNoteFilter: string[];
    dueReminderFilter: string[];
    deploymentFilter: string[];
    showRepositoryFilter: boolean;
    query: string;
    dateView: DateView;
    selectedDate: Date;
    uiConfig: UiConfig | null;
    developersById: Map<string, string>;
    testersById: Map<string, string>;
  }
) {
  if (favoritesOnly && !task.isFavorite) return false;

  const resolvedStatus = getStatusDisplayName(task.status, uiConfig);
  const resolvedStatusConfig = resolveStatusConfig(task.status, uiConfig);
  const statusMatch = statusFilter.length === 0 || statusFilter.includes(resolvedStatus);
  const statusGroupMatch =
    statusGroupFilter.length === 0 ||
    statusGroupFilter.includes(
      getStatusGroupId(resolvedStatusConfig.group, uiConfig, resolvedStatusConfig)
    );
  const repoMatch =
    !showRepositoryFilter ||
    repoFilter.length === 0 ||
    (Array.isArray(task.repositories) && task.repositories.some((repo) => repoFilter.includes(repo))) ||
    false;
  const tagsMatch = tagsFilter.length === 0 || (task.tags?.some((tag) => tagsFilter.includes(tag)) ?? false);
  const priorityMatch = priorityFilter.length === 0 || priorityFilter.includes(getTaskPriorityValue(task.priority));
  const dueStateMatch = dueStateFilter.length === 0 || dueStateFilter.some((value) => matchesTaskDueStateFilter(task, value));
  const reminderNoteMatch =
    reminderNoteFilter.length === 0 ||
    reminderNoteFilter.some((value) => (value === 'has' ? hasReminderNote(task) : !hasReminderNote(task)));
  const dueReminderMatch =
    dueReminderFilter.length === 0 ||
    dueReminderFilter.some((value) => (value === 'has' ? hasDueReminder(task) : !hasDueReminder(task)));
  const searchMatch = matchesTaskSearchQuery(task, query, developersById, testersById, uiConfig);
  const dateMatch = matchesTaskDateView(task, dateView, selectedDate);
  const deploymentMatch =
    deploymentFilter.length === 0 ||
    deploymentFilter.every((filter) => {
      const isNegative = filter.startsWith('not_');
      const env = isNegative ? filter.substring(4) : filter;
      const isDeployed = task.deploymentStatus?.[env] ?? false;
      return isNegative ? !isDeployed : isDeployed;
    });

  return statusMatch && statusGroupMatch && repoMatch && tagsMatch && priorityMatch && dueStateMatch && reminderNoteMatch && dueReminderMatch && searchMatch && dateMatch && deploymentMatch;
}
