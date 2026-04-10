import { isValid } from 'date-fns';

import type { SavedTaskViewState, UserPreferences } from '@/lib/types';

export type HomeViewMode = 'grid' | 'table';
export type HomeDateView = 'all' | 'monthly' | 'calendar' | 'yearly';

export interface HomeStateSearchParams {
  get: (name: string) => string | null;
  getAll: (name: string) => string[];
  has: (name: string) => boolean;
}

export const DEFAULT_HOME_DATE_VIEW: HomeDateView = 'all';
export const DEFAULT_HOME_VIEW_MODE: HomeViewMode = 'grid';
export const DEFAULT_HOME_SORT = 'status-asc';

export function normalizeSavedViewState(
  state: Partial<SavedTaskViewState> | null | undefined,
  fallbackDateIso?: string
): SavedTaskViewState {
  return {
    viewMode: state?.viewMode === 'table' ? 'table' : 'grid',
    sortDescriptor: state?.sortDescriptor || DEFAULT_HOME_SORT,
    dateView: state?.dateView || DEFAULT_HOME_DATE_VIEW,
    favoritesOnly: Boolean(state?.favoritesOnly),
    openGroups: Array.isArray(state?.openGroups) ? state.openGroups : [],
    searchQuery: state?.searchQuery || '',
    selectedDate: state?.selectedDate || fallbackDateIso,
    filters: {
      status: Array.isArray(state?.filters?.status) ? state.filters.status : [],
      statusGroup: Array.isArray(state?.filters?.statusGroup) ? state.filters.statusGroup : [],
      repo: Array.isArray(state?.filters?.repo) ? state.filters.repo : [],
      deployment: Array.isArray(state?.filters?.deployment) ? state.filters.deployment : [],
      tags: Array.isArray(state?.filters?.tags) ? state.filters.tags : [],
    },
  };
}

export function buildLegacyHomeViewState(prefs: UserPreferences, fallbackDateIso: string): SavedTaskViewState {
  return normalizeSavedViewState({
    viewMode: prefs.viewMode || DEFAULT_HOME_VIEW_MODE,
    sortDescriptor: prefs.sortDescriptor || DEFAULT_HOME_SORT,
    dateView: prefs.dateView || DEFAULT_HOME_DATE_VIEW,
    favoritesOnly: prefs.favoritesOnly || false,
    openGroups: Array.isArray(prefs.taskOpenGroups) ? prefs.taskOpenGroups : [],
    searchQuery: '',
    selectedDate: fallbackDateIso,
    filters: {
      status: prefs.taskFilters?.status || [],
      statusGroup: prefs.taskFilters?.statusGroup || [],
      repo: prefs.taskFilters?.repo || [],
      deployment: prefs.taskFilters?.deployment || [],
      tags: prefs.taskFilters?.tags || [],
    },
  }, fallbackDateIso);
}

export function buildHomeViewStateSnapshot(input: {
  viewMode: HomeViewMode;
  sortDescriptor: string;
  dateView: HomeDateView;
  favoritesOnly: boolean;
  openGroups: string[];
  searchQuery: string;
  selectedDate?: string;
  filters?: Partial<SavedTaskViewState['filters']>;
  overrides?: Partial<SavedTaskViewState>;
}): SavedTaskViewState {
  return normalizeSavedViewState({
    viewMode: input.overrides?.viewMode ?? input.viewMode,
    sortDescriptor: input.overrides?.sortDescriptor ?? input.sortDescriptor,
    dateView: input.overrides?.dateView ?? input.dateView,
    favoritesOnly: input.overrides?.favoritesOnly ?? input.favoritesOnly,
    openGroups: input.overrides?.openGroups ?? input.openGroups,
    searchQuery: input.overrides?.searchQuery ?? input.searchQuery,
    selectedDate: input.overrides?.selectedDate ?? input.selectedDate,
    filters: {
      status: input.overrides?.filters?.status ?? input.filters?.status ?? [],
      statusGroup: input.overrides?.filters?.statusGroup ?? input.filters?.statusGroup ?? [],
      repo: input.overrides?.filters?.repo ?? input.filters?.repo ?? [],
      deployment: input.overrides?.filters?.deployment ?? input.filters?.deployment ?? [],
      tags: input.overrides?.filters?.tags ?? input.filters?.tags ?? [],
    },
  }, input.selectedDate);
}

export function buildHomeViewStateFromUrl(
  searchParams: HomeStateSearchParams,
  baseState: SavedTaskViewState,
  fallbackDateIso: string
): { state: SavedTaskViewState; hasRelevantParams: boolean } {
  const nextState = normalizeSavedViewState(baseState, fallbackDateIso);
  let hasRelevantParams = false;

  const urlViewMode = searchParams.get('viewMode');
  if (urlViewMode === 'grid' || urlViewMode === 'table') {
    nextState.viewMode = urlViewMode;
    hasRelevantParams = true;
  }

  const urlDateView = searchParams.get('dateView');
  if (urlDateView === 'all' || urlDateView === 'monthly' || urlDateView === 'calendar' || urlDateView === 'yearly') {
    nextState.dateView = urlDateView;
    hasRelevantParams = true;
  }

  const urlSort = searchParams.get('sort');
  if (urlSort) {
    nextState.sortDescriptor = urlSort;
    hasRelevantParams = true;
  }

  if (searchParams.has('favorites')) {
    nextState.favoritesOnly = searchParams.get('favorites') === 'true';
    hasRelevantParams = true;
  }

  if (searchParams.has('search')) {
    nextState.searchQuery = searchParams.get('search') || '';
    hasRelevantParams = true;
  }

  const urlStatus = searchParams.getAll('status');
  if (urlStatus.length > 0) {
    nextState.filters.status = urlStatus;
    hasRelevantParams = true;
  }

  const urlStatusGroup = searchParams.getAll('statusGroup');
  if (urlStatusGroup.length > 0) {
    nextState.filters.statusGroup = urlStatusGroup;
    hasRelevantParams = true;
  }

  const urlRepo = searchParams.getAll('repo');
  if (urlRepo.length > 0) {
    nextState.filters.repo = urlRepo;
    hasRelevantParams = true;
  }

  const urlDeployment = searchParams.get('deployment');
  if (urlDeployment) {
    nextState.filters.deployment = [urlDeployment];
    hasRelevantParams = true;
  }

  const urlTags = searchParams.getAll('tags');
  if (urlTags.length > 0) {
    nextState.filters.tags = urlTags;
    hasRelevantParams = true;
  }

  if (searchParams.has('date')) {
    const rawDate = searchParams.get('date');
    const parsedDate = rawDate ? new Date(rawDate) : null;
    nextState.selectedDate = parsedDate && isValid(parsedDate) ? parsedDate.toISOString() : fallbackDateIso;
    hasRelevantParams = true;
  }

  return { state: nextState, hasRelevantParams };
}
