import { endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns';

import type { Task, UiConfig } from '@/lib/types';
import { fuzzySearch } from '@/lib/utils';
import { getStatusDisplayName, getStatusGroupId, resolveStatusConfig } from '@/lib/status-config';

type DateView = 'all' | 'monthly' | 'calendar' | 'yearly';

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

export function matchesTaskSearchQuery(
  task: Task,
  query: string,
  developersById: Map<string, string>,
  testersById: Map<string, string>
) {
  if (query.trim() === '') return true;

  return (
    fuzzySearch(query, task.title) ||
    fuzzySearch(query, task.description) ||
    fuzzySearch(query, task.id) ||
    (task.azureWorkItemId ? fuzzySearch(query, task.azureWorkItemId) : false) ||
    task.developers?.some((devId) => fuzzySearch(query, developersById.get(devId) || '')) ||
    task.testers?.some((testerId) => fuzzySearch(query, testersById.get(testerId) || '')) ||
    (Array.isArray(task.repositories) && task.repositories.some((repo) => fuzzySearch(query, repo)))
  );
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
  const searchMatch = matchesTaskSearchQuery(task, query, developersById, testersById);
  const dateMatch = matchesTaskDateView(task, dateView, selectedDate);
  const deploymentMatch =
    deploymentFilter.length === 0 ||
    deploymentFilter.every((filter) => {
      const isNegative = filter.startsWith('not_');
      const env = isNegative ? filter.substring(4) : filter;
      const isDeployed = task.deploymentStatus?.[env] ?? false;
      return isNegative ? !isDeployed : isDeployed;
    });

  return statusMatch && statusGroupMatch && repoMatch && tagsMatch && searchMatch && dateMatch && deploymentMatch;
}
