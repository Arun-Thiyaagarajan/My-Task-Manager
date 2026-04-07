'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Person, Task, UiConfig } from '@/lib/types';
import type { SearchSuggestion } from '@/components/home/types';
import { fuzzySearch } from '@/lib/utils';
import { getDeploymentScore, matchesTaskFilters, matchesTaskSearchQuery } from '@/lib/task-filtering';
import { getStatusDisplayName } from '@/lib/status-config';
import { getAuthMode, getActiveCompanyId, isInitialSyncComplete } from '@/lib/data';
import { FileText, GitMerge, Tag, User } from 'lucide-react';

type DateView = 'all' | 'monthly' | 'calendar' | 'yearly';

interface UseTaskFilteringOptions {
  tasks: Task[];
  binnedTasks: Task[];
  developers: Person[];
  testers: Person[];
  executedSearchQuery: string;
  searchQuery: string;
  statusFilter: string[];
  statusGroupFilter: string[];
  repoFilter: string[];
  tagsFilter: string[];
  deploymentFilter: string[];
  favoritesOnly: boolean;
  sortDescriptor: string;
  uiConfig: UiConfig | null;
  dateView: DateView;
  selectedDate: Date;
  mounted: boolean;
  isUserLoading: boolean;
  showRepositoryFilter: boolean;
  setIsSearching: (value: boolean) => void;
}

export function useTaskFiltering({
  tasks,
  binnedTasks,
  developers,
  testers,
  executedSearchQuery,
  searchQuery,
  statusFilter,
  statusGroupFilter,
  repoFilter,
  tagsFilter,
  deploymentFilter,
  favoritesOnly,
  sortDescriptor,
  uiConfig,
  dateView,
  selectedDate,
  mounted,
  isUserLoading,
  showRepositoryFilter,
  setIsSearching,
}: UseTaskFilteringOptions) {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filteredBinnedTasks, setFilteredBinnedTasks] = useState<Task[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const developersById = useMemo(
    () => new Map(developers.map((developer) => [developer.id, developer.name])),
    [developers]
  );

  const testersById = useMemo(
    () => new Map(testers.map((tester) => [tester.id, tester.name])),
    [testers]
  );

  useEffect(() => {
    const filterAndProcess = () => {
      try {
        if (isUserLoading || !mounted) return;

        const results = tasks.filter((task) =>
          matchesTaskFilters(task, {
            favoritesOnly,
            statusFilter,
            statusGroupFilter,
            repoFilter,
            tagsFilter,
            deploymentFilter,
            showRepositoryFilter,
            query: executedSearchQuery,
            dateView,
            selectedDate,
            uiConfig,
            developersById,
            testersById,
          })
        );

        const sorted = [...results].sort((a, b) => {
          const [sortBy, sortDirection] = sortDescriptor.split('-');
          const taskStatuses = uiConfig?.taskStatuses || [];

          if (sortBy === 'title') {
            return sortDirection === 'asc'
              ? a.title.localeCompare(b.title)
              : b.title.localeCompare(a.title);
          }

          if (sortBy === 'status') {
            const aIndex = taskStatuses.indexOf(getStatusDisplayName(a.status, uiConfig));
            const bIndex = taskStatuses.indexOf(getStatusDisplayName(b.status, uiConfig));
            return sortDirection === 'asc' ? aIndex - bIndex : bIndex - aIndex;
          }

          if (sortBy === 'deployment') {
            const scoreA = getDeploymentScore(a);
            const scoreB = getDeploymentScore(b);
            return sortDirection === 'asc' ? scoreA - scoreB : scoreB - scoreA;
          }

          return 0;
        });

        setFilteredTasks(sorted);

        if (executedSearchQuery.trim() === '') {
          setFilteredBinnedTasks([]);
        } else {
          const deletedMatches = binnedTasks.filter((task) =>
            matchesTaskSearchQuery(task, executedSearchQuery, developersById, testersById)
          );
          setFilteredBinnedTasks(deletedMatches);
        }

        setSearchError(null);

        const mode = getAuthMode();
        if (mode === 'authenticate') {
          const activeCompanyId = getActiveCompanyId();
          if (!activeCompanyId || !isInitialSyncComplete(activeCompanyId)) {
            return;
          }
        }

        setHasInitialized(true);
      } catch (error) {
        console.error('Filtering logic failed:', error);
        setSearchError('Search temporarily unavailable. Please try again later.');
      } finally {
        setTimeout(() => {
          setIsSearching(false);
          window.dispatchEvent(new Event('sync-end'));
        }, 300);
      }
    };

    const rafId = requestAnimationFrame(filterAndProcess);
    return () => cancelAnimationFrame(rafId);
  }, [
    tasks,
    binnedTasks,
    favoritesOnly,
    statusFilter,
    statusGroupFilter,
    repoFilter,
    tagsFilter,
    deploymentFilter,
    showRepositoryFilter,
    executedSearchQuery,
    dateView,
    selectedDate,
    uiConfig,
    developersById,
    testersById,
    sortDescriptor,
    isUserLoading,
    mounted,
    setIsSearching,
  ]);

  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const allTasksForSearch = [
      ...tasks.map((task) => ({ ...task, isBinned: false })),
      ...binnedTasks.map((task) => ({ ...task, isBinned: true })),
    ];

    allTasksForSearch.forEach((task) => {
      if (fuzzySearch(q, task.title)) {
        suggestions.push({
          id: `task-title-${task.id}`,
          title: task.title,
          subLabel: task.status,
          type: 'task',
          icon: FileText,
          taskId: task.id,
          matchType: 'title',
          isBinned: task.isBinned,
        });
        return;
      }

      const matchedDev = task.developers?.find((id) => fuzzySearch(q, developersById.get(id) || ''));
      if (matchedDev) {
        suggestions.push({
          id: `task-dev-${task.id}`,
          title: task.title,
          subLabel: `Assigned to: ${developersById.get(matchedDev)}`,
          type: 'user',
          icon: User,
          taskId: task.id,
          matchType: 'user',
          isBinned: task.isBinned,
        });
        return;
      }

      const matchedTag = task.tags?.find((tag) => fuzzySearch(q, tag));
      if (matchedTag) {
        suggestions.push({
          id: `task-tag-${task.id}`,
          title: task.title,
          subLabel: `Tagged with: ${matchedTag}`,
          type: 'tag',
          icon: Tag,
          taskId: task.id,
          matchType: 'tag',
          isBinned: task.isBinned,
        });
        return;
      }

      const matchedRepo = Array.isArray(task.repositories) && task.repositories.find((repo) => fuzzySearch(q, repo));
      if (matchedRepo) {
        suggestions.push({
          id: `task-repo-${task.id}`,
          title: task.title,
          subLabel: `In Repository: ${matchedRepo}`,
          type: 'repo',
          icon: GitMerge,
          taskId: task.id,
          matchType: 'repo',
          isBinned: task.isBinned,
        });
        return;
      }

      if (fuzzySearch(q, task.description)) {
        suggestions.push({
          id: `task-desc-${task.id}`,
          title: task.title,
          subLabel: 'Matched in description',
          type: 'task',
          icon: FileText,
          taskId: task.id,
          matchType: 'description',
          isBinned: task.isBinned,
        });
      }
    });

    return suggestions.slice(0, 10);
  }, [searchQuery, tasks, binnedTasks, developersById]);

  return {
    filteredTasks,
    filteredBinnedTasks,
    searchError,
    setSearchError,
    hasInitialized,
    searchSuggestions,
    developersById,
    testersById,
  };
}
