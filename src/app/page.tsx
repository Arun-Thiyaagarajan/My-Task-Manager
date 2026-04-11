'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester, moveMultipleTasksToBin, getAppData, setAppData, getLogs, addLog, restoreMultipleTasks, clearExpiredReminders, deleteGeneralReminder, getGeneralReminders, addEnvironment, DATA_KEY, getAuthMode, importWorkspaceData, getUserPreferences, updateUserPreferences, isInitialSyncComplete, getActiveCompanyId, prepareTaskForExport, prepareUiConfigForExport } from '@/lib/data';
import { getCachedBinnedTasks as getBinnedTasks, getCachedDuplicates as findExistingDuplicates, getCachedTasks as getTasks } from '@/lib/cached-data';
import { TasksGrid } from '@/components/tasks-grid';
import { TasksTable } from '@/components/tasks-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutGrid,
  List,
  Plus,
  Download,
  Upload,
  FolderSearch,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckSquare,
  X,
  HelpCircle,
  History,
  Heart,
  BellRing,
  Tag,
  Loader2,
  AlertCircle,
  Filter,
  ArrowDownWideNarrow,
  ChevronDown,
  Check,
  User,
  GitMerge,
  FileText,
  CalendarIcon,
  AlertTriangle,
  Fingerprint,
  Globe,
  FileSpreadsheet,
  BookmarkPlus,
  FolderKanban,
  RefreshCw,
} from 'lucide-react';
import { cn, fuzzySearch, formatTimestamp } from '@/lib/utils';
import { getOrderedTaskStatusGroups, getSortedStatusOptions, getStatusDisplayName, getStatusGroupConfigs, getStatusGroupId, resolveStatusConfig } from '@/lib/status-config';
import type { Task, Person, UiConfig, RepositoryConfig, Log, GeneralReminder, BackupFrequency, Environment, UserPreferences, AuthMode, SavedTaskView, SavedTaskViewState } from '@/lib/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  subYears,
  addYears,
  isValid,
} from 'date-fns';
import { useActiveCompany } from '@/hooks/use-active-company';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { generateTaskPdf, generateTasksText } from '@/lib/share-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { ToastAction } from '@/components/ui/toast';
import { ReminderStack } from '@/components/reminder-stack';
import { Badge } from '@/components/ui/badge';
import { MultiSelect, type SelectOption } from '@/components/ui/multi-select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { triggerTransfer } from '@/components/file-transfer-indicator';
import { isRepositoryFieldActive } from '@/lib/repository-config';
import { openGlobalSpotlightSearch } from '@/components/global-spotlight-search';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTaskFiltering } from '@/hooks/use-task-filtering';
import { TasksCalendarView } from '@/components/tasks-calendar-view';
import { DesktopNotesShortcut } from '@/components/desktop-notes-shortcut';
import { appendExcelExportMetadataSheet, buildExcelExportRows } from '@/lib/task-excel';
import { BulkSelectionBar } from '@/components/home/bulk-selection-bar';
import { DeletedMatchesSection } from '@/components/home/deleted-matches-section';
import { DesktopFiltersSheet } from '@/components/home/desktop-filters-sheet';
import {
  buildHomeViewStateFromUrl,
  buildHomeViewStateSnapshot,
  buildLegacyHomeViewState,
  normalizeSavedViewState,
  type HomeDateView,
  type HomeViewMode,
} from '@/components/home/home-view-state';
import { MobileFiltersSheet } from '@/components/home/mobile-filters-sheet';
import { PinnedSavedViewsStrip } from '@/components/home/pinned-saved-views-strip';
import { SavedViewDialogs } from '@/components/home/saved-view-dialogs';
import { SavedViewsMenuContent } from '@/components/home/saved-views-menu-content';
import { StarterWorkspaceCallout } from '@/components/home/starter-workspace-callout';
import { TaskSearchInput } from '@/components/home/task-search-input';
import { TaskSortMenuContent } from '@/components/home/task-sort-menu-content';

type ViewMode = HomeViewMode;
type DateView = HomeDateView;

const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
const LAST_BACKUP_KEY = 'taskflow_last_auto_backup';
const HOME_SKELETON_DELAY_MS = 250;
const HOME_RETURN_SKELETON_KEY = 'taskflow_show_home_skeleton_once';
const HOME_RETURN_SKELETON_MS = 220;

function normalizeSavedTaskView(view: SavedTaskView, fallbackDateIso: string): SavedTaskView {
  return {
    ...view,
    pinned: Boolean(view.pinned),
    state: normalizeSavedViewState(view.state, fallbackDateIso),
  };
}

export default function Home() {
  const { user, isUserLoading } = useFirebase();
  const activeCompanyId = useActiveCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [binnedTasks, setBinnedTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [generalReminders, setGeneralReminders] = useState<GeneralReminder[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentAuthMode, setCurrentAuthMode] = useState<AuthMode>('localStorage');
  
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [dateView, setDateView] = useState<DateView>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sortDescriptor, setSortDescriptor] = useState('status-asc');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusGroupFilter, setStatusGroupFilter] = useState<string[]>([]);
  const [repoFilter, setRepoFilter] = useState<string[]>([]);
  const [deploymentFilter, setDeploymentFilter] = useState<string[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [dueStateFilter, setDueStateFilter] = useState<string[]>([]);
  const [reminderNoteFilter, setReminderNoteFilter] = useState<string[]>([]);
  const [dueReminderFilter, setDueReminderFilter] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [executedSearchQuery, setExecutedSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [isDesktopFiltersOpen, setIsDesktopFiltersOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [desktopStatusFilterDraft, setDesktopStatusFilterDraft] = useState<string[]>([]);
  const [desktopStatusGroupFilterDraft, setDesktopStatusGroupFilterDraft] = useState<string[]>([]);
  const [desktopRepoFilterDraft, setDesktopRepoFilterDraft] = useState<string[]>([]);
  const [desktopDeploymentFilterDraft, setDesktopDeploymentFilterDraft] = useState<string[]>([]);
  const [desktopTagsFilterDraft, setDesktopTagsFilterDraft] = useState<string[]>([]);
  const [desktopPriorityFilterDraft, setDesktopPriorityFilterDraft] = useState<string[]>([]);
  const [desktopDueStateFilterDraft, setDesktopDueStateFilterDraft] = useState<string[]>([]);
  const [desktopReminderNoteFilterDraft, setDesktopReminderNoteFilterDraft] = useState<string[]>([]);
  const [desktopDueReminderFilterDraft, setDesktopDueReminderFilterDraft] = useState<string[]>([]);
  const [hasPreservedFilterDraftNotice, setHasPreservedFilterDraftNotice] = useState(false);
  const suppressNextFilterSheetCloseRef = useRef(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [isReminderStackOpen, setIsReminderStackOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [spotlightShortcutKey, setSpotlightShortcutKey] = useState('Ctrl');
  
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [tagsToApply, setTagsToApply] = useState<string[]>([]);
  const [isBulkTagApplying, setIsBulkTagApplying] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [showSlowSearchMessage, setShowSlowSearchMessage] = useState(false);

  const [importSummary, setImportSummary] = useState<{ importedCount: number; skippedDuplicates: any[]; warnings: string[] } | null>(null);
  const importInFlightRef = useRef(false);
  const hasInitializedGroupStateRef = useRef(false);
  const hasVisibleTaskDataRef = useRef(false);

  const [existingDuplicates, setExistingDuplicates] = useState<{ fieldLabel: string; value: string; tasks: Task[] }[]>([]);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const tutorialOpenedSelectModeRef = useRef(false);
  const [showDelayedSkeleton, setShowDelayedSkeleton] = useState(false);
  const [showReturnSkeleton, setShowReturnSkeleton] = useState(false);
  const [isRefreshingTaskCards, setIsRefreshingTaskCards] = useState(false);
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [savedTaskViews, setSavedTaskViews] = useState<SavedTaskView[]>([]);
  const [isSaveViewDialogOpen, setIsSaveViewDialogOpen] = useState(false);
  const [isManageViewsDialogOpen, setIsManageViewsDialogOpen] = useState(false);
  const [newSavedViewName, setNewSavedViewName] = useState('');
  const [dismissedActiveSavedViewId, setDismissedActiveSavedViewId] = useState<string | null>(null);
  const [starterContentAvailable, setStarterContentAvailable] = useState(false);
  const [pendingSavedViewState, setPendingSavedViewState] = useState<SavedTaskViewState | null>(null);
  const [isFilterSaveSuggestionDismissed, setIsFilterSaveSuggestionDismissed] = useState(false);
  const [isFilterSaveSuggestionVisible, setIsFilterSaveSuggestionVisible] = useState(false);
  const hasConsumedStarterCalloutRef = useRef(false);
  
  useEffect(() => {
    setMounted(true);
    setCurrentAuthMode(getAuthMode());
    if (typeof window !== 'undefined') {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      setSpotlightShortcutKey(isMac ? '⌘' : 'Ctrl');

      try {
        const storedPinnedIds = window.localStorage.getItem(PINNED_TASKS_STORAGE_KEY);
        if (storedPinnedIds) {
          const parsedPinnedIds = JSON.parse(storedPinnedIds);
          if (Array.isArray(parsedPinnedIds)) {
            setPinnedTaskIds(parsedPinnedIds.filter((id): id is string => typeof id === 'string'));
          }
        }
      } catch {
        window.localStorage.removeItem(PINNED_TASKS_STORAGE_KEY);
      }
    }
    
    const prefs = getUserPreferences();
    const fallbackDateIso = new Date().toISOString();
    const persistedHomeViewState = prefs.lastHomeViewState
      ? normalizeSavedViewState(prefs.lastHomeViewState, fallbackDateIso)
      : buildLegacyHomeViewState(prefs, fallbackDateIso);
    const { state: resolvedHomeViewState } = buildHomeViewStateFromUrl(searchParams, persistedHomeViewState, fallbackDateIso);

    setViewMode(resolvedHomeViewState.viewMode);
    setDateView(resolvedHomeViewState.dateView);
    setSortDescriptor(resolvedHomeViewState.sortDescriptor);
    setFavoritesOnly(resolvedHomeViewState.favoritesOnly);
    setSearchQuery(resolvedHomeViewState.searchQuery);
    setExecutedSearchQuery(resolvedHomeViewState.searchQuery);
    setOpenGroups(resolvedHomeViewState.openGroups);
    setSavedTaskViews(
      Array.isArray(prefs.savedTaskViews)
        ? prefs.savedTaskViews.map((view) => normalizeSavedTaskView(view, fallbackDateIso))
        : []
    );

    const shouldShowStarterCallout =
      Boolean(prefs.starterContentAvailable) &&
      (!prefs.starterHomeCalloutSeen || hasConsumedStarterCalloutRef.current);
    setStarterContentAvailable(shouldShowStarterCallout);

    if (Boolean(prefs.starterContentAvailable) && !prefs.starterHomeCalloutSeen && !hasConsumedStarterCalloutRef.current) {
      hasConsumedStarterCalloutRef.current = true;
      void updateUserPreferences({ starterHomeCalloutSeen: true });
    }

    setStatusFilter(resolvedHomeViewState.filters.status);
    setStatusGroupFilter(resolvedHomeViewState.filters.statusGroup);
    setRepoFilter(resolvedHomeViewState.filters.repo);
    setDeploymentFilter(resolvedHomeViewState.filters.deployment);
    setTagsFilter(resolvedHomeViewState.filters.tags);
    setPriorityFilter(resolvedHomeViewState.filters.priority);
    setDueStateFilter(resolvedHomeViewState.filters.dueState);
    setReminderNoteFilter(resolvedHomeViewState.filters.reminderNote);
    setDueReminderFilter(resolvedHomeViewState.filters.dueReminder);

    const resolvedDate = resolvedHomeViewState.selectedDate ? new Date(resolvedHomeViewState.selectedDate) : new Date();
    setSelectedDate(isValid(resolvedDate) ? resolvedDate : new Date());

  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams();
    
    if (executedSearchQuery) params.set('search', executedSearchQuery);
    if (sortDescriptor) params.set('sort', sortDescriptor);
    if (viewMode) params.set('viewMode', viewMode);
    if (dateView) params.set('dateView', dateView);
    if (selectedDate) params.set('date', selectedDate.toISOString());
    if (favoritesOnly) params.set('favorites', 'true');
    
    statusFilter.forEach(s => params.append('status', s));
    statusGroupFilter.forEach(groupId => params.append('statusGroup', groupId));
    repoFilter.forEach(r => params.append('repo', r));
    deploymentFilter.forEach(d => params.append('deployment', d));
    tagsFilter.forEach(t => params.append('tags', t));
    priorityFilter.forEach(priority => params.append('priority', priority));
    dueStateFilter.forEach(value => params.append('dueState', value));
    reminderNoteFilter.forEach(value => params.append('reminderNote', value));
    dueReminderFilter.forEach(value => params.append('dueReminder', value));

    const currentQuery = searchParams.toString();
    const newQuery = params.toString();

    if (currentQuery !== newQuery) {
        router.push(`${pathname}?${newQuery}`, { scroll: false });
    }

    const currentHomeViewState = buildHomeViewStateSnapshot({
      viewMode,
      sortDescriptor,
      dateView,
      favoritesOnly,
      openGroups,
      searchQuery: executedSearchQuery,
      selectedDate: selectedDate?.toISOString(),
      filters: {
        status: statusFilter,
        statusGroup: statusGroupFilter,
        repo: repoFilter,
        deployment: deploymentFilter,
        tags: tagsFilter,
        priority: priorityFilter,
        dueState: dueStateFilter,
        reminderNote: reminderNoteFilter,
        dueReminder: dueReminderFilter,
      },
    });

    updateUserPreferences({
        viewMode,
        sortDescriptor,
        dateView,
        favoritesOnly,
        lastHomeViewState: currentHomeViewState,
        taskOpenGroups: openGroups,
        taskFilters: {
            status: statusFilter,
            statusGroup: statusGroupFilter,
            repo: repoFilter,
            deployment: deploymentFilter,
            tags: tagsFilter,
            priority: priorityFilter,
            dueState: dueStateFilter,
            reminderNote: reminderNoteFilter,
            dueReminder: dueReminderFilter,
        },
    });
  }, [executedSearchQuery, sortDescriptor, viewMode, dateView, selectedDate, favoritesOnly, openGroups, statusFilter, statusGroupFilter, repoFilter, deploymentFilter, tagsFilter, priorityFilter, dueStateFilter, reminderNoteFilter, dueReminderFilter, router, pathname, searchParams, mounted]);

  const persistSavedTaskViews = useCallback((nextViews: SavedTaskView[]) => {
    const fallbackDateIso = new Date().toISOString();
    const normalizedViews = nextViews.map((view) => normalizeSavedTaskView(view, fallbackDateIso));

    setSavedTaskViews(normalizedViews);
    updateUserPreferences({
      savedTaskViews: normalizedViews,
    });
  }, []);

  const buildSavedViewState = useCallback((overrides?: Partial<SavedTaskViewState>): SavedTaskViewState => buildHomeViewStateSnapshot({
    viewMode,
    sortDescriptor,
    dateView,
    favoritesOnly,
    openGroups,
    searchQuery: executedSearchQuery,
    selectedDate: selectedDate?.toISOString(),
    filters: {
      status: statusFilter,
      statusGroup: statusGroupFilter,
      repo: repoFilter,
      deployment: deploymentFilter,
      tags: tagsFilter,
      priority: priorityFilter,
      dueState: dueStateFilter,
      reminderNote: reminderNoteFilter,
      dueReminder: dueReminderFilter,
    },
    overrides,
  }), [
    viewMode,
    sortDescriptor,
    dateView,
    favoritesOnly,
    openGroups,
    executedSearchQuery,
    selectedDate,
    statusFilter,
    statusGroupFilter,
    repoFilter,
    deploymentFilter,
    tagsFilter,
    priorityFilter,
    dueStateFilter,
    reminderNoteFilter,
    dueReminderFilter,
  ]);
  const buildCurrentSavedViewState = useCallback((): SavedTaskViewState => buildSavedViewState(), [buildSavedViewState]);

  const applySavedTaskView = useCallback((view: SavedTaskView) => {
    const fallbackDateIso = selectedDate?.toISOString() || new Date().toISOString();
    const state = normalizeSavedViewState(view.state, fallbackDateIso);
    const nextFilters = state.filters;

    setIsSearching(true);
    if (state.dateView === 'calendar') {
      setIsSelectMode(false);
      setSelectedTaskIds([]);
    }
    setViewMode(state.viewMode);
    setSortDescriptor(state.sortDescriptor);
    setDateView(state.dateView);
    setFavoritesOnly(state.favoritesOnly);
    setOpenGroups(Array.isArray(state.openGroups) ? state.openGroups : []);
    setSearchQuery(state.searchQuery || '');
    setExecutedSearchQuery(state.searchQuery || '');
    setStatusFilter(nextFilters.status);
    setStatusGroupFilter(nextFilters.statusGroup);
    setRepoFilter(nextFilters.repo);
    setDeploymentFilter(nextFilters.deployment);
    setTagsFilter(nextFilters.tags);
    setPriorityFilter(nextFilters.priority);
    setDueStateFilter(nextFilters.dueState);
    setReminderNoteFilter(nextFilters.reminderNote);
    setDueReminderFilter(nextFilters.dueReminder);

    const nextDate = state.selectedDate ? new Date(state.selectedDate) : new Date();
    setSelectedDate(isValid(nextDate) ? nextDate : new Date());
    setDismissedActiveSavedViewId(null);
    setIsManageViewsDialogOpen(false);

    toast({
      variant: 'success',
      title: 'Saved view applied',
      description: `"${view.name}" is now active.`,
      duration: 2200,
    });
  }, [toast]);

  const handleSaveCurrentView = useCallback(() => {
    const trimmedName = newSavedViewName.trim();
    const stateToSave = pendingSavedViewState || buildCurrentSavedViewState();
    const filtersToSave = stateToSave.filters || {
      status: [],
      statusGroup: [],
      repo: [],
      deployment: [],
      tags: [],
      priority: [],
      dueState: [],
      reminderNote: [],
      dueReminder: [],
    };
    const hasAnySelectedFilters =
      filtersToSave.status.length > 0 ||
      filtersToSave.statusGroup.length > 0 ||
      filtersToSave.repo.length > 0 ||
      filtersToSave.deployment.length > 0 ||
      filtersToSave.tags.length > 0 ||
      filtersToSave.priority.length > 0 ||
      filtersToSave.dueState.length > 0 ||
      filtersToSave.reminderNote.length > 0 ||
      filtersToSave.dueReminder.length > 0 ||
      stateToSave.searchQuery.trim().length > 0;

    if (!trimmedName) {
      toast({
        variant: 'warning',
        title: 'Add a view name',
        description: 'Name this saved view so you can find it later.',
      });
      return;
    }

    if (!hasAnySelectedFilters) {
      toast({
        variant: 'warning',
        title: 'No filters selected',
        description: 'Add a search or at least one filter before saving this view.',
      });
      return;
    }

    const now = new Date().toISOString();
    const existingView = savedTaskViews.find(view => view.name.trim().toLowerCase() === trimmedName.toLowerCase());

    const nextViews = existingView
      ? savedTaskViews.map(view => view.id === existingView.id ? { ...view, name: trimmedName, updatedAt: now, state: stateToSave } : view)
      : [
          {
            id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `saved_view_${Date.now()}`,
            name: trimmedName,
            createdAt: now,
            updatedAt: now,
            pinned: savedTaskViews.length === 0,
            state: stateToSave,
          },
          ...savedTaskViews,
        ];

    persistSavedTaskViews(nextViews);
    setIsSaveViewDialogOpen(false);
    setNewSavedViewName('');
    setPendingSavedViewState(null);
    toast({
      variant: 'success',
      title: existingView ? 'Saved view updated' : 'Saved view created',
      description: `"${trimmedName}" is ready to reuse.`,
      duration: 2200,
    });
  }, [buildCurrentSavedViewState, newSavedViewName, pendingSavedViewState, persistSavedTaskViews, savedTaskViews, toast]);

  const handleToggleSavedViewPin = useCallback((viewId: string) => {
    const nextViews = savedTaskViews.map(view =>
      view.id === viewId
        ? { ...view, pinned: !view.pinned, updatedAt: new Date().toISOString() }
        : view
    );
    persistSavedTaskViews(nextViews);
  }, [persistSavedTaskViews, savedTaskViews]);

  const handleDeleteSavedView = useCallback((viewId: string) => {
    const nextViews = savedTaskViews.filter(view => view.id !== viewId);
    persistSavedTaskViews(nextViews);
    toast({
      title: 'Saved view removed',
      duration: 1800,
    });
  }, [persistSavedTaskViews, savedTaskViews, toast]);

  const handleClearAllTaskFilters = useCallback(() => {
    setIsSearching(true);
    setStatusFilter([]);
    setRepoFilter([]);
    setDeploymentFilter([]);
    setTagsFilter([]);
    setStatusGroupFilter([]);
    setPriorityFilter([]);
    setDueStateFilter([]);
    setReminderNoteFilter([]);
    setDueReminderFilter([]);
    setSearchQuery('');
    setExecutedSearchQuery('');
  }, []);

  const handleClearActiveSavedView = useCallback((viewId: string) => {
    setDismissedActiveSavedViewId(viewId);
    handleClearAllTaskFilters();
  }, [handleClearAllTaskFilters]);

  useEffect(() => {
    setDesktopStatusFilterDraft(statusFilter);
    setDesktopStatusGroupFilterDraft(statusGroupFilter);
    setDesktopRepoFilterDraft(repoFilter);
    setDesktopDeploymentFilterDraft(deploymentFilter);
    setDesktopTagsFilterDraft(tagsFilter);
    setDesktopPriorityFilterDraft(priorityFilter);
    setDesktopDueStateFilterDraft(dueStateFilter);
    setDesktopReminderNoteFilterDraft(reminderNoteFilter);
    setDesktopDueReminderFilterDraft(dueReminderFilter);
    setHasPreservedFilterDraftNotice(false);
  }, [
    statusFilter,
    statusGroupFilter,
    repoFilter,
    deploymentFilter,
    tagsFilter,
    priorityFilter,
    dueStateFilter,
    reminderNoteFilter,
    dueReminderFilter,
  ]);

  const handleApplyDesktopFilters = useCallback(() => {
    suppressNextFilterSheetCloseRef.current = true;
    setIsSearching(true);
    setHasPreservedFilterDraftNotice(false);
    setStatusFilter(desktopStatusFilterDraft);
    setStatusGroupFilter(desktopStatusGroupFilterDraft);
    setRepoFilter(desktopRepoFilterDraft);
    setDeploymentFilter(desktopDeploymentFilterDraft);
    setTagsFilter(desktopTagsFilterDraft);
    setPriorityFilter(desktopPriorityFilterDraft);
    setDueStateFilter(desktopDueStateFilterDraft);
    setReminderNoteFilter(desktopReminderNoteFilterDraft);
    setDueReminderFilter(desktopDueReminderFilterDraft);
    setIsDesktopFiltersOpen(false);
  }, [
    desktopStatusFilterDraft,
    desktopStatusGroupFilterDraft,
    desktopRepoFilterDraft,
    desktopDeploymentFilterDraft,
    desktopTagsFilterDraft,
    desktopPriorityFilterDraft,
    desktopDueStateFilterDraft,
    desktopReminderNoteFilterDraft,
    desktopDueReminderFilterDraft,
  ]);

  const handleApplyMobileFilters = useCallback(() => {
    suppressNextFilterSheetCloseRef.current = true;
    setIsSearching(true);
    setHasPreservedFilterDraftNotice(false);
    setStatusFilter(desktopStatusFilterDraft);
    setStatusGroupFilter(desktopStatusGroupFilterDraft);
    setRepoFilter(desktopRepoFilterDraft);
    setDeploymentFilter(desktopDeploymentFilterDraft);
    setTagsFilter(desktopTagsFilterDraft);
    setPriorityFilter(desktopPriorityFilterDraft);
    setDueStateFilter(desktopDueStateFilterDraft);
    setReminderNoteFilter(desktopReminderNoteFilterDraft);
    setDueReminderFilter(desktopDueReminderFilterDraft);
    setIsMobileFiltersOpen(false);
  }, [
    desktopStatusFilterDraft,
    desktopStatusGroupFilterDraft,
    desktopRepoFilterDraft,
    desktopDeploymentFilterDraft,
    desktopTagsFilterDraft,
    desktopPriorityFilterDraft,
    desktopDueStateFilterDraft,
    desktopReminderNoteFilterDraft,
    desktopDueReminderFilterDraft,
  ]);

  const handleResetDesktopFilterDraft = useCallback(() => {
    setHasPreservedFilterDraftNotice(false);
    setIsSearching(true);
    setDesktopStatusFilterDraft([]);
    setDesktopStatusGroupFilterDraft([]);
    setDesktopRepoFilterDraft([]);
    setDesktopDeploymentFilterDraft([]);
    setDesktopTagsFilterDraft([]);
    setDesktopPriorityFilterDraft([]);
    setDesktopDueStateFilterDraft([]);
    setDesktopReminderNoteFilterDraft([]);
    setDesktopDueReminderFilterDraft([]);
    setStatusFilter([]);
    setStatusGroupFilter([]);
    setRepoFilter([]);
    setDeploymentFilter([]);
    setTagsFilter([]);
    setPriorityFilter([]);
    setDueStateFilter([]);
    setReminderNoteFilter([]);
    setDueReminderFilter([]);
  }, []);

  const handleResetMobileFilterDraft = useCallback(() => {
    suppressNextFilterSheetCloseRef.current = true;
    setHasPreservedFilterDraftNotice(false);
    setIsSearching(true);
    setDesktopStatusFilterDraft([]);
    setDesktopStatusGroupFilterDraft([]);
    setDesktopRepoFilterDraft([]);
    setDesktopDeploymentFilterDraft([]);
    setDesktopTagsFilterDraft([]);
    setDesktopPriorityFilterDraft([]);
    setDesktopDueStateFilterDraft([]);
    setDesktopReminderNoteFilterDraft([]);
    setDesktopDueReminderFilterDraft([]);
    setStatusFilter([]);
    setStatusGroupFilter([]);
    setRepoFilter([]);
    setDeploymentFilter([]);
    setTagsFilter([]);
    setPriorityFilter([]);
    setDueStateFilter([]);
    setReminderNoteFilter([]);
    setDueReminderFilter([]);
    setIsMobileFiltersOpen(false);
  }, []);

  const handleDiscardPreservedFilterDraft = useCallback(() => {
    setHasPreservedFilterDraftNotice(false);
    setDesktopStatusFilterDraft(statusFilter);
    setDesktopStatusGroupFilterDraft(statusGroupFilter);
    setDesktopRepoFilterDraft(repoFilter);
    setDesktopDeploymentFilterDraft(deploymentFilter);
    setDesktopTagsFilterDraft(tagsFilter);
    setDesktopPriorityFilterDraft(priorityFilter);
    setDesktopDueStateFilterDraft(dueStateFilter);
    setDesktopReminderNoteFilterDraft(reminderNoteFilter);
    setDesktopDueReminderFilterDraft(dueReminderFilter);
  }, [
    deploymentFilter,
    dueReminderFilter,
    dueStateFilter,
    priorityFilter,
    reminderNoteFilter,
    repoFilter,
    statusFilter,
    statusGroupFilter,
    tagsFilter,
  ]);


  const handlePreviousDate = useCallback(() => {
      setIsSearching(true);
      if (dateView === 'monthly' || dateView === 'calendar') {
          setSelectedDate(subMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(subYears(selectedDate, 1));
      }
  }, [dateView, selectedDate]);

  const handleNextDate = useCallback(() => {
      setIsSearching(true);
      if (dateView === 'monthly' || dateView === 'calendar') {
          setSelectedDate(addMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(addYears(selectedDate, 1));
      }
  }, [dateView, selectedDate]);

  const refreshData = useCallback(() => {
    const authMode = getAuthMode();
    const companyId = getActiveCompanyId();
    const shouldWaitForCloudData = authMode === 'authenticate' && (!companyId || !isInitialSyncComplete(companyId));
    
    setCurrentAuthMode(authMode);
    if (isUserLoading) return;
    if (shouldWaitForCloudData && hasVisibleTaskDataRef.current) return;

    if (companyId) {
        clearExpiredReminders();
        const appData = getAppData();
        const prefs = getUserPreferences();
        const companyStarterContentAvailable = Boolean(appData.companyData[companyId]?.starterContent?.isAvailable);
        const starterAvailableForUser = Boolean(prefs.starterContentAvailable || companyStarterContentAvailable);
        const shouldShowStarterCallout =
          starterAvailableForUser &&
          (!prefs.starterHomeCalloutSeen || hasConsumedStarterCalloutRef.current);

        setStarterContentAvailable(shouldShowStarterCallout);

        if (starterAvailableForUser && !prefs.starterHomeCalloutSeen && !hasConsumedStarterCalloutRef.current) {
            hasConsumedStarterCalloutRef.current = true;
            void updateUserPreferences({ starterHomeCalloutSeen: true });
        }
        const nextTasks = getTasks();
        const nextBinnedTasks = getBinnedTasks();
        setTasks(nextTasks);
        setBinnedTasks(nextBinnedTasks);
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        setGeneralReminders(getGeneralReminders());
        const config = getUiConfig();
        setUiConfig(config);
        document.title = config.appName || 'My Task Manager';
        setSelectedTaskIds((currentSelected) => {
            if (currentSelected.length === 0) return currentSelected;
            const validTaskIds = new Set(nextTasks.map(task => task.id));
            const nextSelected = currentSelected.filter(id => validTaskIds.has(id));
            return nextSelected.length === currentSelected.length ? currentSelected : nextSelected;
        });
        
        // Detect duplicates for resolution
        const duplicates = findExistingDuplicates();
        setExistingDuplicates(duplicates);
        if (duplicates.length > 0) setIsResolutionOpen(true);

        if (authMode === 'authenticate' && !isInitialSyncComplete(companyId)) {
            return;
        }
        
        setIsLoading(false);
        window.dispatchEvent(new Event('navigation-end'));
    }
  }, [isUserLoading]);

  const showRepositoryFilter = useMemo(() => isRepositoryFieldActive(uiConfig), [uiConfig]);

  const {
    filteredTasks,
    filteredBinnedTasks,
    searchError,
    setSearchError,
    hasInitialized,
    searchSuggestions,
  } = useTaskFiltering({
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
    priorityFilter,
    dueStateFilter,
    reminderNoteFilter,
    dueReminderFilter,
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
  });

  useEffect(() => {
    if (tasks.length > 0 || filteredTasks.length > 0 || filteredBinnedTasks.length > 0) {
      hasVisibleTaskDataRef.current = true;
    }
  }, [tasks.length, filteredTasks.length, filteredBinnedTasks.length]);

  useEffect(() => {
    if (!uiConfig) return;

    const configuredGroupIds = getStatusGroupConfigs(uiConfig).map(group => group.id);
    const visibleGroupIds = getOrderedTaskStatusGroups(
      filteredTasks.length > 0 ? filteredTasks : tasks,
      uiConfig,
      favoritesOnly
    ).map(group => group.key);

    if (configuredGroupIds.length === 0) {
      setOpenGroups([]);
      return;
    }

    setOpenGroups((current) => {
      if (!hasInitializedGroupStateRef.current) {
        hasInitializedGroupStateRef.current = true;
        const preferred = current.filter(groupId => configuredGroupIds.includes(groupId));
        if (preferred.length > 0) return preferred;
        return visibleGroupIds.length > 0 ? visibleGroupIds : configuredGroupIds;
      }

      const stillValid = current.filter(groupId => configuredGroupIds.includes(groupId));
      return stillValid.length === current.length ? current : stillValid;
    });
  }, [favoritesOnly, filteredTasks, tasks, uiConfig]);

  useEffect(() => {
    refreshData();
    
    const storageHandler = (event: StorageEvent) => {
        if (event.key === DATA_KEY) {
            refreshData();
        }
    };

    window.addEventListener('storage', storageHandler);
    window.addEventListener('config-changed', refreshData);
    window.addEventListener('company-changed', refreshData);
    window.addEventListener('sync-complete', refreshData);
    window.addEventListener('reminders-expired', refreshData);
    const reminderExpiryInterval = window.setInterval(() => {
      refreshData();
    }, 30000);
    
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('config-changed', refreshData);
      window.removeEventListener('company-changed', refreshData);
      window.removeEventListener('sync-complete', refreshData);
      window.removeEventListener('reminders-expired', refreshData);
      window.clearInterval(reminderExpiryInterval);
    };
  }, [refreshData]);

  useEffect(() => {
    if (!mounted || pathname !== '/') return;
    refreshData();
  }, [mounted, pathname, searchParams, refreshData]);

  useEffect(() => {
    const tutorialBulkSelectors = new Set([
      '#home-select-multiple-trigger',
      '#select-all-tasks',
      '#bulk-tags-trigger',
      '#bulk-copy-trigger',
      '#bulk-pdf-trigger',
      '#bulk-delete-trigger',
    ]);

    const handleTutorialStepHighlighted = (event: Event) => {
      const selector = (event as CustomEvent<{ selector?: string }>).detail?.selector;
      const shouldShowBulkBar = !!selector && tutorialBulkSelectors.has(selector);

      if (shouldShowBulkBar && !isSelectMode) {
        tutorialOpenedSelectModeRef.current = true;
        setIsSelectMode(true);
        setSelectedTaskIds([]);
        return;
      }

      if (!shouldShowBulkBar && tutorialOpenedSelectModeRef.current) {
        tutorialOpenedSelectModeRef.current = false;
        setIsSelectMode(false);
        setSelectedTaskIds([]);
      }
    };

    const handleTutorialClosed = () => {
      if (!tutorialOpenedSelectModeRef.current) return;
      tutorialOpenedSelectModeRef.current = false;
      setIsSelectMode(false);
      setSelectedTaskIds([]);
    };

    window.addEventListener('tutorial-step-highlighted', handleTutorialStepHighlighted as EventListener);
    window.addEventListener('tutorial-closed', handleTutorialClosed);

    return () => {
      window.removeEventListener('tutorial-step-highlighted', handleTutorialStepHighlighted as EventListener);
      window.removeEventListener('tutorial-closed', handleTutorialClosed);
    };
  }, [isSelectMode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching) {
        timer = setTimeout(() => showSlowSearchMessage && setShowSlowSearchMessage(true), 3000);
    } else {
        setShowSlowSearchMessage(false);
    }
    return () => clearTimeout(timer);
  }, [isSearching, showSlowSearchMessage]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        triggerSearch();
    }
  };

  const triggerSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === executedSearchQuery.trim()) {
        setIsSearching(false);
        return;
    }

    setSearchError(null);
    setIsSearchFocused(false);
    window.dispatchEvent(new Event('sync-start'));
    
    setTimeout(() => {
        setExecutedSearchQuery(trimmed);
    }, 50);
  }, [searchQuery, executedSearchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setExecutedSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const showTagsFilter = useMemo(
    () => (uiConfig?.fields || []).find((field) => field.key === 'tags')?.isActive,
    [uiConfig]
  );
  const statusGroupOptions = useMemo(
    () => getStatusGroupConfigs(uiConfig).map((group) => ({ value: group.id, label: group.name })),
    [uiConfig]
  );
  const sortedStatusOptions = useMemo(
    () => getSortedStatusOptions(uiConfig).map((option) => ({ value: option.value, label: option.label })),
    [uiConfig]
  );
  const repositoryOptions = useMemo(
    () => (uiConfig?.repositoryConfigs || []).map((repository) => ({ value: repository.name, label: repository.name })),
    [uiConfig]
  );
  const tagOptions = useMemo(
    () => [...new Set(tasks.flatMap((task) => task.tags || []))].map((tag) => ({ value: tag, label: tag })),
    [tasks]
  );
  const deploymentOptions = useMemo(
    () => (uiConfig?.environments || []).flatMap((env) => [
      { value: env.name, label: `On ${env.name}` },
      { value: `not_${env.name}`, label: `Not on ${env.name}` },
    ]),
    [uiConfig]
  );
  const priorityOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
    []
  );
  const dueStateOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'overdue', label: 'Overdue' },
      { value: 'today', label: 'Due today' },
      { value: 'tomorrow', label: 'Due tomorrow' },
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'no_due_date', label: 'No due date' },
    ],
    []
  );
  const binaryReminderOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'has', label: 'Has reminder' },
      { value: 'none', label: 'No reminder' },
    ],
    []
  );

  const handleExport = useCallback(async (exportType: 'current_view' | 'all_tasks') => {
    const allDevelopers = getDevelopers();
    const allTesters = getTesters();
    const currentUiConfig = getUiConfig();
    const customFieldDefinitions = currentUiConfig.fields.filter(f => f.isCustom);
    const yieldToBrowser = () =>
      new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const appNamePrefix = currentUiConfig.appName?.replace(/\s+/g, '_') || 'MyTaskManager';
    const dateSuffix = format(new Date(), "do MMM yyyy");
    
    let activeTasksToExport: Task[] = [];
    let binnedTasksToExport: Task[] = [];
    let logsToExport: Log[] = [];

    if (exportType === 'all_tasks') {
        activeTasksToExport = getTasks();
        binnedTasksToExport = getBinnedTasks();
        logsToExport = getLogs();
    } else {
        activeTasksToExport = isSelectMode && selectedTaskIds.length > 0
            ? getTasks().filter(t => selectedTaskIds.includes(t.id))
            : filteredTasks;
        
        const taskIdsInView = new Set(activeTasksToExport.map(t => t.id));
        const allLogs = getLogs();
        logsToExport = allLogs.filter(log => log.taskId && taskIdsInView.has(log.taskId));
    }
    
    const hasData = activeTasksToExport.length > 0 || binnedTasksToExport.length > 0 || logsToExport.length > 0;

    if (!hasData) {
      if (exportType === 'current_view') {
        toast({
            variant: 'warning',
            title: 'Nothing to Export',
            description: 'There are no tasks in the current view to export.',
        });
      }
      return;
    }

    const fileName = `${appNamePrefix} ${dateSuffix}.json`;
    const activeTasksWithNames = activeTasksToExport.map(task => ({
      ...prepareTaskForExport(task, currentUiConfig, allDevelopers, allTesters),
      isFavorite: task.isFavorite || false,
    }));
    const binnedTasksWithNames = binnedTasksToExport.map(task => ({
      ...prepareTaskForExport(task, currentUiConfig, allDevelopers, allTesters),
      isFavorite: task.isFavorite || false,
    }));

    const cleanPerson = (p: Person) => ({ name: p.name, email: p.email || '', phone: p.phone || '', additionalFields: p.additionalFields || [] });

    const exportUiConfig = prepareUiConfigForExport(currentUiConfig, allDevelopers, allTesters);

    const exportData: any = {
        appName: exportUiConfig.appName,
        appIcon: exportUiConfig.appIcon,
        fields: exportUiConfig.fields,
        repositoryConfigs: exportUiConfig.repositoryConfigs,
        environments: exportUiConfig.environments,
        statusGroups: exportUiConfig.statusGroups || [],
        statusConfigs: exportUiConfig.statusConfigs || [],
        taskStatuses: exportUiConfig.taskStatuses || [],
        customFieldDefinitions: customFieldDefinitions,
        developers: allDevelopers.map(cleanPerson),
        testers: allTesters.map(cleanPerson),
        tasks: activeTasksWithNames,
        logs: logsToExport,
    };
    
    if (binnedTasksWithNames.length > 0) {
        exportData.trash = binnedTasksWithNames;
    }

    await yieldToBrowser();
    const jsonString = JSON.stringify(exportData, null, 2);
    await yieldToBrowser();
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    
    toast({
        variant: 'success',
        title: 'Export Successful',
        description: `${activeTasksToExport.length} active tasks exported.`,
    });
    
    if (exportType === 'all_tasks') {
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    }
  }, [isSelectMode, selectedTaskIds, filteredTasks, toast]);

  const handleExcelExport = useCallback(async (exportType: 'current_view' | 'all_tasks') => {
    if (isExcelExporting) return;

    setIsExcelExporting(true);

    try {
      const { utils, writeFile } = await import('xlsx');
      const appNamePrefix = (getUiConfig().appName || 'My Task Manager').trim().replace(/\s+/g, '_');
      const activeTasksToExport = exportType === 'current_view'
        ? (isSelectMode ? filteredTasks.filter(task => selectedTaskIds.includes(task.id)) : filteredTasks)
        : getTasks();

      if (activeTasksToExport.length === 0) {
        toast({
          title: 'Nothing to Export',
          description: 'There are no tasks in the current view to export.',
        });
        return;
      }

      const workbook = utils.book_new();
      const taskRows = buildExcelExportRows(activeTasksToExport, getUiConfig(), getDevelopers(), getTesters());
      utils.book_append_sheet(workbook, utils.json_to_sheet(taskRows), 'Tasks');

      if (exportType === 'all_tasks') {
        const trashRows = buildExcelExportRows(getBinnedTasks(), getUiConfig(), getDevelopers(), getTesters());
        if (trashRows.length > 0) {
          utils.book_append_sheet(workbook, utils.json_to_sheet(trashRows), 'Bin Tasks');
        }
      }

      const metadataRows = [
        { Key: 'App Name', Value: getUiConfig().appName || 'My Task Manager' },
        { Key: 'Export Type', Value: exportType === 'current_view' ? 'Current View' : 'Full Workspace' },
        { Key: 'Exported At', Value: new Date().toISOString() },
        { Key: 'Task Count', Value: String(activeTasksToExport.length) },
      ];
      utils.book_append_sheet(workbook, utils.json_to_sheet(metadataRows), 'Summary');
      appendExcelExportMetadataSheet(workbook, utils, {
        appName: getUiConfig().appName || 'My Task Manager',
        exportType: exportType === 'current_view' ? 'Current View' : 'Full Workspace',
        primarySheet: 'Tasks',
        taskCount: activeTasksToExport.length,
      });

      const fileName = `${appNamePrefix}_${exportType === 'current_view' ? 'Current_View' : 'Full_Workspace'}.xlsx`;
      writeFile(workbook, fileName);

      toast({
        variant: 'success',
        title: 'Excel Export Successful',
        description: `${activeTasksToExport.length} active tasks exported.`,
      });

      if (exportType === 'all_tasks') {
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Excel export failed',
        description: 'The workbook could not be generated.',
      });
    } finally {
      setIsExcelExporting(false);
    }
  }, [filteredTasks, isExcelExporting, isSelectMode, selectedTaskIds, toast]);

  const handlePinToggle = useCallback((taskIdToToggle: string) => {
    setPinnedTaskIds(currentIds => {
      const newPinnedIds = currentIds.includes(taskIdToToggle)
        ? currentIds.filter(id => id !== taskIdToToggle)
        : [...currentIds, taskIdToToggle];
      localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinnedIds));
      return newPinnedIds;
    });
  }, []);

  const handleUnpinFromStack = useCallback((taskId: string) => {
    handlePinToggle(taskId);
    toast({ title: 'Reminder Unpinned' });
  }, [handlePinToggle, toast]);
  
  const handleDismissGeneralReminder = useCallback((reminderId: string) => {
    if (deleteGeneralReminder(reminderId)) {
      setGeneralReminders(prev => prev.filter(r => r.id !== reminderId));
      toast({ title: 'Reminder Dismissed' });
    }
  }, [toast]);
  
  const handleToggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => !prev);
    setSelectedTaskIds([]);
  }, []);
  
  const handleFavoritesToggle = useCallback(() => {
    setIsSearching(true);
    setFavoritesOnly(prev => !prev);
  }, []);
  
  const handleDateViewChange = useCallback((mode: DateView) => {
      setIsSearching(true);
      if (mode === 'calendar') {
        setIsSelectMode(false);
        setSelectedTaskIds([]);
      }
      setDateView(mode);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
      setIsSearching(true);
      setViewMode(mode);
  }, []);

  const handleContentViewChange = useCallback((mode: ViewMode | 'calendar') => {
      if (mode === 'calendar') {
        handleDateViewChange('calendar');
        return;
      }

      if (dateView === 'calendar') {
        setIsSearching(true);
        setDateView('monthly');
      }

      setIsSearching(true);
      setViewMode(mode);
  }, [dateView, handleDateViewChange]);

  const handleSortChange = useCallback((val: string) => {
      setIsSearching(true);
      setSortDescriptor(val);
  }, []);

  const handleToggleSelectAll = useCallback((checked: boolean | 'indeterminate') => {
    setSelectedTaskIds(checked === true ? filteredTasks.map(t => t.id) : []);
  }, [filteredTasks]);

  const handleDownloadTemplate = useCallback(() => {
      const currentUiConfig = getUiConfig();
      const appNamePrefix = currentUiConfig.appName?.replace(/\s+/g, '_') || 'MyTaskManager';
      const fileName = `${appNamePrefix}_Import_Template.json`;

      const templateData = {
          appName: "My Awesome Project",
          appIcon: "🚀",
          repositoryConfigs: [
              { id: 'repo_1', name: "UI-Dashboard", baseUrl: "https://github.com/org/ui-dashboard/pull/" }
          ],
          environments: [
              { id: 'env_1', name: 'dev', color: '#3b82f6' }
          ],
          developers: [
              { name: "Grace Hopper", email: "grace@example.com" }
          ],
          tasks: [
            {
              title: "Sample Task",
              description: "Example description",
              status: "To Do",
              repositories: ["UI-Dashboard"],
              developers: ["Grace Hopper"]
            }
          ]
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(templateData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = fileName;
      link.click();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (importInFlightRef.current) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
        toast({
            variant: 'destructive',
            title: 'Invalid File',
            description: 'Please select a valid .json file for import.'
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const transferId = `import-${Date.now()}`;
    triggerTransfer({
        id: transferId,
        filename: file.name,
        kind: 'import',
        status: 'preparing',
        progress: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
        importInFlightRef.current = true;
        try {
            const text = e.target?.result as string;
            const parsedJson = JSON.parse(text);
            const mode = getAuthMode();

            window.dispatchEvent(new Event('sync-start'));
            triggerTransfer({ id: transferId, filename: file.name, kind: 'import', status: 'uploading', progress: 5 });

            try {
                const result = await importWorkspaceData(parsedJson, (progress) => {
                    triggerTransfer({ id: transferId, filename: file.name, kind: 'import', status: 'uploading', progress: Math.max(5, progress) });
                });
                
                if (result.success) {
                    triggerTransfer({ id: transferId, filename: file.name, kind: 'import', status: 'complete', progress: 100 });
                    if (result.skippedDuplicates.length > 0 || result.warnings.length > 0) {
                        setImportSummary({ 
                            importedCount: result.importedCount, 
                            skippedDuplicates: result.skippedDuplicates,
                            warnings: result.warnings,
                        });
                    } else {
                        // toast({ 
                        //     variant: 'success', 
                        //     title: 'Import Complete', 
                        //     description: `Successfully imported ${result.importedCount} tasks.` 
                        // });
                    }
                }
            } catch (error: any) {
                triggerTransfer({ id: transferId, filename: file.name, kind: 'import', status: 'error', progress: 0, error: 'Import failed' });
                toast({ 
                    variant: 'destructive', 
                    title: 'Import Failed', 
                    description: error.message || 'Some tasks could not be imported.' 
                });
            }
            refreshData();
            
        } catch (error: any) {
            console.error("Error importing file:", error);
            triggerTransfer({ id: transferId, filename: file.name, kind: 'import', status: 'error', progress: 0, error: 'Invalid format' });
            toast({ variant: 'destructive', title: 'Import Failed', description: "The imported file is invalid or corrupted." });
        } finally {
            importInFlightRef.current = false;
            if(fileInputRef.current) { fileInputRef.current.value = ''; }
            window.dispatchEvent(new Event('sync-end'));
        }
    };

    reader.onerror = () => {
        importInFlightRef.current = false;
        if (fileInputRef.current) fileInputRef.current.value = '';
        window.dispatchEvent(new Event('sync-end'));
        toast({ variant: 'destructive', title: 'Import Failed', description: 'Unable to read the selected file.' });
    };

    reader.readAsText(file);
  };
  
  const handleBulkDelete = useCallback(() => {
    const idsToRestore = [...selectedTaskIds];
    moveMultipleTasksToBin(idsToRestore);
    
    const { id, dismiss, update } = toast({
        variant: 'default',
        title: 'Tasks Moved to Bin',
        description: `${idsToRestore.length} tasks have been moved.`,
        duration: 10000,
    });

    update({
      id,
      action: (
        <ToastAction
          altText="Undo move"
          onClick={() => {
            restoreMultipleTasks(idsToRestore);
            refreshData();
            dismiss();
            toast({ variant: 'success', title: 'Tasks restored!' });
          }}
        >
          <History className="mr-2 h-4 w-4" />
          Undo
        </ToastAction>
      ),
    });

    refreshData();
    setIsSelectMode(false);
  }, [selectedTaskIds, toast, refreshData]);

  const handleBulkApplyTags = useCallback(async () => {
    if (selectedTaskIds.length === 0 || tagsToApply.length === 0 || isBulkTagApplying) return;

    setIsBulkTagApplying(true);
    setIsTagsDialogOpen(false);

    const total = selectedTaskIds.length;
    const batchSize = total > 300 ? 40 : 20;
    const { id, update, dismiss } = toast({
      variant: 'default',
      title: 'Applying tags',
      description: `0 of ${total} tasks updated`,
      duration: 60000,
    });

    try {
      for (let index = 0; index < selectedTaskIds.length; index += batchSize) {
        const batch = selectedTaskIds.slice(index, index + batchSize);

        batch.forEach((taskId) => {
          const existingTask = getTasks().find((item) => item.id === taskId);
          if (!existingTask) return;
          const nextTags = Array.from(new Set([...(existingTask.tags || []), ...tagsToApply]));
          updateTask(taskId, { tags: nextTags }, true);
        });

        const completed = Math.min(index + batch.length, total);
        update({
          id,
          title: completed === total ? 'Finalizing tags' : 'Applying tags',
          description: `${completed} of ${total} tasks updated`,
        });

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
      }

      addLog({ message: `Applied tags [${tagsToApply.join(', ')}] to **${total}** task(s).` });
      refreshData();
      update({
        id,
        variant: 'success',
        title: 'Tags applied',
        description: `${tagsToApply.length} tag(s) applied to ${total} task(s).`,
        duration: 4000,
      });
      window.setTimeout(() => dismiss(), 4200);
      setTagsToApply([]);
    } catch (error) {
      update({
        id,
        variant: 'destructive',
        title: 'Could not apply tags',
        description: error instanceof Error ? error.message : 'Something went wrong during the bulk update.',
        duration: 5000,
      });
    } finally {
      setIsBulkTagApplying(false);
    }
  }, [isBulkTagApplying, refreshData, selectedTaskIds, tagsToApply, toast]);

  const handleBulkCopyText = useCallback(() => {
    if (!uiConfig) return;
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    const textContent = generateTasksText(selectedTasks, uiConfig, developers, testers);
    navigator.clipboard.writeText(textContent).then(() => {
        toast({ variant: 'success', title: 'Copied to Clipboard' });
    });
  }, [selectedTaskIds, tasks, uiConfig, developers, testers, toast]);

  const handleBulkExportPdf = useCallback(async () => {
    if (!uiConfig) return;
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    const transferId = `pdf-${Date.now()}`;
    const filename = selectedTasks.length === 1 ? `TF_${selectedTasks[0].title}.pdf` : `TF_Bulk_Export_${selectedTasks.length}_Tasks.pdf`;
    
    triggerTransfer({
        id: transferId,
        filename,
        status: 'generating',
        progress: 0
    });

    try {
        await generateTaskPdf(selectedTasks, uiConfig, developers, testers, 'save', filename, (p) => {
            triggerTransfer({ id: transferId, filename, status: 'generating', progress: p });
        });
        triggerTransfer({ id: transferId, filename, status: 'complete', progress: 100 });
        toast({ variant: 'success', title: 'PDF Exported', description: `Download for ${selectedTasks.length} task(s) is ready.` });
    } catch (e) {
        triggerTransfer({ id: transferId, filename, status: 'error', progress: 0, error: 'Export failed' });
        toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'There was an error generating your document.' });
    }
  }, [selectedTaskIds, tasks, uiConfig, developers, testers, toast]);

  const handleNavigateNewTask = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event('navigation-start'));
    router.push('/tasks/new');
  };

  const activeCompanyIdForSync = getActiveCompanyId();
  const hasAnyLoadedTasks = tasks.length > 0 || binnedTasks.length > 0;
  const hasRenderableTaskData = filteredTasks.length > 0 || filteredBinnedTasks.length > 0 || hasAnyLoadedTasks;
  const isCloudDataPending = currentAuthMode === 'authenticate' && (!activeCompanyIdForSync || !isInitialSyncComplete(activeCompanyIdForSync));
  const isInitialBlockingLoad = mounted && !hasRenderableTaskData && (isLoading || isUserLoading || isCloudDataPending || !hasInitialized);
  const shouldShowDelayedSkeleton = mounted && showDelayedSkeleton && isInitialBlockingLoad;
  const shouldShowListSkeleton = shouldShowDelayedSkeleton || showReturnSkeleton || isRefreshingTaskCards;
  const shouldRenderEmptyState = mounted && !isInitialBlockingLoad && !shouldShowListSkeleton && !isUserLoading && !isCloudDataPending && hasInitialized && dateView !== 'calendar' && filteredTasks.length === 0 && filteredBinnedTasks.length === 0;

  const handleRefreshTaskCards = useCallback(() => {
    if (isRefreshingTaskCards) return;

    setIsRefreshingTaskCards(true);
    window.setTimeout(() => {
      refreshData();
      window.setTimeout(() => {
        setIsRefreshingTaskCards(false);
      }, 220);
    }, 0);
  }, [isRefreshingTaskCards, refreshData]);

  useEffect(() => {
    if (!isInitialBlockingLoad) {
      setShowDelayedSkeleton(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowDelayedSkeleton(true);
    }, HOME_SKELETON_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isInitialBlockingLoad]);

  useEffect(() => {
    if (!mounted || pathname !== '/' || typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(HOME_RETURN_SKELETON_KEY) !== '1') return;

    window.sessionStorage.removeItem(HOME_RETURN_SKELETON_KEY);

    // Only use the short return skeleton when the home list already has renderable
    // data cached. If data still needs to load, fall back to the normal initial
    // skeleton path so we do not get stuck in an awkward empty-loading state.
    if (!hasRenderableTaskData || isInitialBlockingLoad) {
      return;
    }

    setShowReturnSkeleton(true);
  }, [mounted, pathname, searchParams, hasRenderableTaskData, isInitialBlockingLoad]);

  useEffect(() => {
    if (!showReturnSkeleton || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      setShowReturnSkeleton(false);
      window.dispatchEvent(new Event('navigation-end'));
    }, HOME_RETURN_SKELETON_MS);

    return () => window.clearTimeout(timer);
  }, [showReturnSkeleton]);

  const handleSuggestionClick = (taskId: string) => {
    setIsSearchFocused(false);
    window.dispatchEvent(new Event('navigation-start'));
    router.push(`/tasks/${taskId}`);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val) {
        clearSearch();
    }
  };

  const isSearchActive = searchQuery.trim().length >= 2;

  const activeFilterCount =
    statusFilter.length +
    statusGroupFilter.length +
    repoFilter.length +
    deploymentFilter.length +
    tagsFilter.length +
    priorityFilter.length +
    dueStateFilter.length +
    reminderNoteFilter.length +
    dueReminderFilter.length;
  const totalActiveFilters = activeFilterCount + (executedSearchQuery ? 1 : 0);
  const desktopDraftFilterCount =
    desktopStatusFilterDraft.length +
    desktopStatusGroupFilterDraft.length +
    desktopRepoFilterDraft.length +
    desktopDeploymentFilterDraft.length +
    desktopTagsFilterDraft.length +
    desktopPriorityFilterDraft.length +
    desktopDueStateFilterDraft.length +
    desktopReminderNoteFilterDraft.length +
    desktopDueReminderFilterDraft.length;

  const areStringArraysEqual = (left: string[] = [], right: string[] = []) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

  const hasUnappliedFilterDraftChanges =
    !areStringArraysEqual(desktopStatusFilterDraft, statusFilter) ||
    !areStringArraysEqual(desktopStatusGroupFilterDraft, statusGroupFilter) ||
    !areStringArraysEqual(desktopRepoFilterDraft, repoFilter) ||
    !areStringArraysEqual(desktopDeploymentFilterDraft, deploymentFilter) ||
    !areStringArraysEqual(desktopTagsFilterDraft, tagsFilter) ||
    !areStringArraysEqual(desktopPriorityFilterDraft, priorityFilter) ||
    !areStringArraysEqual(desktopDueStateFilterDraft, dueStateFilter) ||
    !areStringArraysEqual(desktopReminderNoteFilterDraft, reminderNoteFilter) ||
    !areStringArraysEqual(desktopDueReminderFilterDraft, dueReminderFilter);
  const draftSavedViewState = useMemo(() => buildSavedViewState({
    filters: {
      status: desktopStatusFilterDraft,
      statusGroup: desktopStatusGroupFilterDraft,
      repo: desktopRepoFilterDraft,
      deployment: desktopDeploymentFilterDraft,
      tags: desktopTagsFilterDraft,
      priority: desktopPriorityFilterDraft,
      dueState: desktopDueStateFilterDraft,
      reminderNote: desktopReminderNoteFilterDraft,
      dueReminder: desktopDueReminderFilterDraft,
    },
  }), [
    buildSavedViewState,
    desktopDeploymentFilterDraft,
    desktopRepoFilterDraft,
    desktopStatusFilterDraft,
    desktopStatusGroupFilterDraft,
    desktopTagsFilterDraft,
    desktopPriorityFilterDraft,
    desktopDueStateFilterDraft,
    desktopReminderNoteFilterDraft,
    desktopDueReminderFilterDraft,
  ]);

  const doesDraftHaveAnyFilters =
    draftSavedViewState.filters.status.length > 0 ||
    draftSavedViewState.filters.statusGroup.length > 0 ||
    draftSavedViewState.filters.repo.length > 0 ||
    draftSavedViewState.filters.deployment.length > 0 ||
    draftSavedViewState.filters.tags.length > 0 ||
    draftSavedViewState.filters.priority.length > 0 ||
    draftSavedViewState.filters.dueState.length > 0 ||
    draftSavedViewState.filters.reminderNote.length > 0 ||
    draftSavedViewState.filters.dueReminder.length > 0 ||
    draftSavedViewState.searchQuery.trim().length > 0;

  const showPreservedFilterDraftNotice = hasPreservedFilterDraftNotice && hasUnappliedFilterDraftChanges;
  const handleDesktopFiltersOpenChange = useCallback((open: boolean) => {
    const shouldRevealSaveSuggestion =
      open &&
      hasUnappliedFilterDraftChanges &&
      doesDraftHaveAnyFilters &&
      !isFilterSaveSuggestionDismissed &&
      !savedTaskViews.some((view) => {
        const viewFilters = normalizeSavedViewState(view.state, draftSavedViewState.selectedDate).filters;

        return (
          areStringArraysEqual(viewFilters.status, draftSavedViewState.filters.status) &&
          areStringArraysEqual(viewFilters.statusGroup, draftSavedViewState.filters.statusGroup) &&
          areStringArraysEqual(viewFilters.repo, draftSavedViewState.filters.repo) &&
          areStringArraysEqual(viewFilters.deployment, draftSavedViewState.filters.deployment) &&
          areStringArraysEqual(viewFilters.tags, draftSavedViewState.filters.tags) &&
          areStringArraysEqual(viewFilters.priority, draftSavedViewState.filters.priority) &&
          areStringArraysEqual(viewFilters.dueState, draftSavedViewState.filters.dueState) &&
          areStringArraysEqual(viewFilters.reminderNote, draftSavedViewState.filters.reminderNote) &&
          areStringArraysEqual(viewFilters.dueReminder, draftSavedViewState.filters.dueReminder)
        );
      });

    if (!open && suppressNextFilterSheetCloseRef.current) {
      suppressNextFilterSheetCloseRef.current = false;
      setIsDesktopFiltersOpen(false);
      setIsFilterSaveSuggestionVisible(false);
      return;
    }
    if (!open && hasUnappliedFilterDraftChanges) {
      setHasPreservedFilterDraftNotice(true);
    }
    if (!open) {
      setIsFilterSaveSuggestionVisible(false);
    } else if (shouldRevealSaveSuggestion) {
      setIsFilterSaveSuggestionVisible(true);
      setIsFilterSaveSuggestionDismissed(true);
    }
    setIsDesktopFiltersOpen(open);
  }, [doesDraftHaveAnyFilters, draftSavedViewState.filters.deployment, draftSavedViewState.filters.repo, draftSavedViewState.filters.status, draftSavedViewState.filters.statusGroup, draftSavedViewState.filters.tags, draftSavedViewState.filters.priority, draftSavedViewState.filters.dueState, draftSavedViewState.filters.reminderNote, draftSavedViewState.filters.dueReminder, hasUnappliedFilterDraftChanges, isFilterSaveSuggestionDismissed, savedTaskViews]);

  const handleMobileFiltersOpenChange = useCallback((open: boolean) => {
    const shouldRevealSaveSuggestion =
      open &&
      hasUnappliedFilterDraftChanges &&
      doesDraftHaveAnyFilters &&
      !isFilterSaveSuggestionDismissed &&
      !savedTaskViews.some((view) => {
        const viewFilters = normalizeSavedViewState(view.state, draftSavedViewState.selectedDate).filters;

        return (
          areStringArraysEqual(viewFilters.status, draftSavedViewState.filters.status) &&
          areStringArraysEqual(viewFilters.statusGroup, draftSavedViewState.filters.statusGroup) &&
          areStringArraysEqual(viewFilters.repo, draftSavedViewState.filters.repo) &&
          areStringArraysEqual(viewFilters.deployment, draftSavedViewState.filters.deployment) &&
          areStringArraysEqual(viewFilters.tags, draftSavedViewState.filters.tags) &&
          areStringArraysEqual(viewFilters.priority, draftSavedViewState.filters.priority) &&
          areStringArraysEqual(viewFilters.dueState, draftSavedViewState.filters.dueState) &&
          areStringArraysEqual(viewFilters.reminderNote, draftSavedViewState.filters.reminderNote) &&
          areStringArraysEqual(viewFilters.dueReminder, draftSavedViewState.filters.dueReminder)
        );
      });

    if (!open && suppressNextFilterSheetCloseRef.current) {
      suppressNextFilterSheetCloseRef.current = false;
      setIsMobileFiltersOpen(false);
      setIsFilterSaveSuggestionVisible(false);
      return;
    }
    if (!open && hasUnappliedFilterDraftChanges) {
      setHasPreservedFilterDraftNotice(true);
    }
    if (!open) {
      setIsFilterSaveSuggestionVisible(false);
    } else if (shouldRevealSaveSuggestion) {
      setIsFilterSaveSuggestionVisible(true);
      setIsFilterSaveSuggestionDismissed(true);
    }
    setIsMobileFiltersOpen(open);
  }, [doesDraftHaveAnyFilters, draftSavedViewState.filters.deployment, draftSavedViewState.filters.repo, draftSavedViewState.filters.status, draftSavedViewState.filters.statusGroup, draftSavedViewState.filters.tags, draftSavedViewState.filters.priority, draftSavedViewState.filters.dueState, draftSavedViewState.filters.reminderNote, draftSavedViewState.filters.dueReminder, hasUnappliedFilterDraftChanges, isFilterSaveSuggestionDismissed, savedTaskViews]);
  const currentSavedViewState = buildCurrentSavedViewState();

  const doesSavedViewStateMatch = useCallback((view: SavedTaskView, candidateState: SavedTaskViewState) => {
    const normalizedViewState = normalizeSavedViewState(view.state, candidateState.selectedDate);
    const viewFilters = normalizedViewState.filters;
    const currentFilters = candidateState.filters;

    return (
      normalizedViewState.viewMode === candidateState.viewMode &&
      normalizedViewState.sortDescriptor === candidateState.sortDescriptor &&
      normalizedViewState.dateView === candidateState.dateView &&
      normalizedViewState.favoritesOnly === candidateState.favoritesOnly &&
      normalizedViewState.searchQuery === candidateState.searchQuery &&
      (normalizedViewState.selectedDate || '') === (candidateState.selectedDate || '') &&
      areStringArraysEqual(normalizedViewState.openGroups, candidateState.openGroups) &&
      areStringArraysEqual(viewFilters.status, currentFilters.status) &&
      areStringArraysEqual(viewFilters.statusGroup, currentFilters.statusGroup) &&
      areStringArraysEqual(viewFilters.repo, currentFilters.repo) &&
      areStringArraysEqual(viewFilters.deployment, currentFilters.deployment) &&
      areStringArraysEqual(viewFilters.tags, currentFilters.tags) &&
      areStringArraysEqual(viewFilters.priority, currentFilters.priority) &&
      areStringArraysEqual(viewFilters.dueState, currentFilters.dueState) &&
      areStringArraysEqual(viewFilters.reminderNote, currentFilters.reminderNote) &&
      areStringArraysEqual(viewFilters.dueReminder, currentFilters.dueReminder)
    );
  }, []);

  const doSavedViewFiltersMatchDraft = useCallback((view: SavedTaskView, draftFilters: SavedTaskViewState['filters']) => {
    const viewFilters = normalizeSavedViewState(view.state).filters;

    return (
      areStringArraysEqual(viewFilters.status, draftFilters.status) &&
      areStringArraysEqual(viewFilters.statusGroup, draftFilters.statusGroup) &&
      areStringArraysEqual(viewFilters.repo, draftFilters.repo) &&
      areStringArraysEqual(viewFilters.deployment, draftFilters.deployment) &&
      areStringArraysEqual(viewFilters.tags, draftFilters.tags) &&
      areStringArraysEqual(viewFilters.priority, draftFilters.priority) &&
      areStringArraysEqual(viewFilters.dueState, draftFilters.dueState) &&
      areStringArraysEqual(viewFilters.reminderNote, draftFilters.reminderNote) &&
      areStringArraysEqual(viewFilters.dueReminder, draftFilters.dueReminder)
    );
  }, []);

  const isSavedViewActive = (view: SavedTaskView) => doesSavedViewStateMatch(view, currentSavedViewState);

  const buildFilterSummary = (values: string[]) => {
    if (values.length === 0) return null;
    return values.join(', ');
  };

  const getSavedViewPreviewGroups = useCallback((view: SavedTaskView) => {
    const normalizedViewState = normalizeSavedViewState(view.state);
    const viewFilters = normalizedViewState.filters;

    return [
      normalizedViewState.searchQuery ? { label: 'Search', values: [normalizedViewState.searchQuery] } : null,
      viewFilters.status.length > 0 ? { label: 'Status', values: viewFilters.status } : null,
      viewFilters.statusGroup.length > 0 ? {
        label: 'Status Group',
        values: viewFilters.statusGroup.map((groupId) => statusGroupOptions.find((option) => option.value === groupId)?.label || groupId),
      } : null,
      viewFilters.repo.length > 0 ? { label: 'Repository', values: viewFilters.repo } : null,
      viewFilters.tags.length > 0 ? { label: 'Tags', values: viewFilters.tags } : null,
      viewFilters.priority.length > 0 ? { label: 'Priority', values: viewFilters.priority.map((value) => value.charAt(0).toUpperCase() + value.slice(1)) } : null,
      viewFilters.dueState.length > 0 ? { label: 'Due', values: viewFilters.dueState.map((value) => value.replace(/_/g, ' ')) } : null,
      viewFilters.reminderNote.length > 0 ? { label: 'Note', values: viewFilters.reminderNote.map((value) => value === 'has' ? 'Has reminder note' : 'No reminder note') } : null,
      viewFilters.dueReminder.length > 0 ? { label: 'Due Alert', values: viewFilters.dueReminder.map((value) => value === 'has' ? 'Has due reminder' : 'No due reminder') } : null,
      viewFilters.deployment.length > 0 ? {
        label: 'Deployment',
        values: viewFilters.deployment.map((value) => value.startsWith('not_') ? `Not ${value.replace(/^not_/, '')}` : value),
      } : null,
      normalizedViewState.favoritesOnly ? { label: 'Mode', values: ['Favorites only'] } : null,
    ].filter((group): group is { label: string; values: string[] } => !!group && group.values.length > 0);
  }, [statusGroupOptions]);

  const activeFilterSections = [
    { label: 'Status', values: desktopStatusFilterDraft },
    { label: 'Group', values: desktopStatusGroupFilterDraft.map((groupId) => statusGroupOptions.find(option => option.value === groupId)?.label || groupId) },
    { label: 'Repo', values: desktopRepoFilterDraft },
    { label: 'Tags', values: desktopTagsFilterDraft },
    { label: 'Priority', values: desktopPriorityFilterDraft.map((value) => value.charAt(0).toUpperCase() + value.slice(1)) },
    { label: 'Due', values: desktopDueStateFilterDraft.map((value) => value.replace(/_/g, ' ')) },
    { label: 'Note', values: desktopReminderNoteFilterDraft.map((value) => value === 'has' ? 'Has reminder note' : 'No reminder note') },
    { label: 'Alert', values: desktopDueReminderFilterDraft.map((value) => value === 'has' ? 'Has due reminder' : 'No due reminder') },
    { label: 'Deploy', values: desktopDeploymentFilterDraft.map((value) => value.startsWith('not_') ? `Not ${value.replace(/^not_/, '')}` : value) },
  ].filter(section => section.values.length > 0);
  const visibleActiveFilterSections = activeFilterSections.slice(0, 3);
  const hiddenActiveFilterSectionsCount = Math.max(activeFilterSections.length - visibleActiveFilterSections.length, 0);

  const getSavedViewSummary = (view: SavedTaskView) => {
    const normalizedViewState = normalizeSavedViewState(view.state);
    const filters = normalizedViewState.filters;
    const filtersCount =
      filters.status.length +
      filters.statusGroup.length +
      filters.repo.length +
      filters.deployment.length +
      filters.tags.length +
      filters.priority.length +
      filters.dueState.length +
      filters.reminderNote.length +
      filters.dueReminder.length +
      (normalizedViewState.searchQuery ? 1 : 0);

    if (normalizedViewState.dateView === 'calendar') {
      return `${filtersCount} filter${filtersCount === 1 ? '' : 's'} · Calendar`;
    }

    if (normalizedViewState.dateView === 'monthly') {
      return `${filtersCount} filter${filtersCount === 1 ? '' : 's'} · Monthly`;
    }

    if (normalizedViewState.dateView === 'yearly') {
      return `${filtersCount} filter${filtersCount === 1 ? '' : 's'} · Yearly`;
    }

    return `${filtersCount} filter${filtersCount === 1 ? '' : 's'} · ${normalizedViewState.favoritesOnly ? 'Favorites' : 'All tasks'}`;
  };
  const isDraftAlreadySaved = savedTaskViews.some((view) => doSavedViewFiltersMatchDraft(view, draftSavedViewState.filters));
  const canShowFilterSaveSuggestion =
    hasUnappliedFilterDraftChanges &&
    doesDraftHaveAnyFilters &&
    !isDraftAlreadySaved &&
    !isFilterSaveSuggestionDismissed;
  const currentFilterViewLabel =
    dateView === 'calendar'
      ? `Calendar · ${format(selectedDate, 'MMM yyyy')}`
      : dateView === 'monthly'
        ? `Monthly · ${format(selectedDate, 'MMM yyyy')}`
        : dateView === 'yearly'
          ? `Yearly · ${format(selectedDate, 'yyyy')}`
          : favoritesOnly
            ? 'Favorites'
            : 'All Tasks';

  const matchingSavedView = savedTaskViews.find((view) => isSavedViewActive(view)) || null;
  const activeSavedView = matchingSavedView?.id === dismissedActiveSavedViewId ? null : matchingSavedView;

  useEffect(() => {
    if (!dismissedActiveSavedViewId) return;
    if (!matchingSavedView || matchingSavedView.id !== dismissedActiveSavedViewId) {
      setDismissedActiveSavedViewId(null);
    }
  }, [dismissedActiveSavedViewId, matchingSavedView]);

  const handleStartSaveCurrentView = useCallback(() => {
    if (activeSavedView) {
      toast({
        variant: 'warning',
        title: 'View already saved',
        description: `"${activeSavedView.name}" already matches the current filters.`,
        duration: 2200,
      });
      return;
    }

    if (activeFilterCount === 0 && !executedSearchQuery.trim()) {
      toast({
        variant: 'warning',
        title: 'Nothing to save yet',
        description: 'Add a search or at least one filter before creating a saved view.',
        duration: 2400,
      });
      return;
    }

    setPendingSavedViewState(null);
    setNewSavedViewName('');
    setIsSaveViewDialogOpen(true);
  }, [activeFilterCount, activeSavedView, executedSearchQuery, toast]);

  const handleStartSaveDraftView = useCallback(() => {
    if (!doesDraftHaveAnyFilters) {
      toast({
        variant: 'warning',
        title: 'Nothing to save yet',
        description: 'Add at least one filter before saving this view.',
        duration: 2400,
      });
      return;
    }

    if (savedTaskViews.some((view) => doesSavedViewStateMatch(view, draftSavedViewState))) {
      const existingView = savedTaskViews.find((view) => doesSavedViewStateMatch(view, draftSavedViewState));
      toast({
        variant: 'warning',
        title: 'View already saved',
        description: existingView ? `"${existingView.name}" already matches these filters.` : 'These filters already exist in your saved views.',
        duration: 2200,
      });
      return;
    }

    setPendingSavedViewState(draftSavedViewState);
    setNewSavedViewName('');
    setIsSaveViewDialogOpen(true);
  }, [doesDraftHaveAnyFilters, doesSavedViewStateMatch, draftSavedViewState, savedTaskViews, toast]);

  const handleSaveViewDialogOpenChange = useCallback((open: boolean) => {
    setIsSaveViewDialogOpen(open);
    if (!open) {
      setPendingSavedViewState(null);
    }
  }, []);

  const handleCloseSaveDialog = useCallback(() => {
    setIsSaveViewDialogOpen(false);
    setPendingSavedViewState(null);
  }, []);

  const handleStartUpdateSavedView = useCallback((view: SavedTaskView) => {
    if (activeFilterCount === 0 && !executedSearchQuery.trim()) {
      toast({
        variant: 'warning',
        title: 'Nothing to update yet',
        description: 'Add a search or at least one filter before updating this saved view.',
        duration: 2400,
      });
      return;
    }

    setNewSavedViewName(view.name);
    setIsManageViewsDialogOpen(false);
    setIsSaveViewDialogOpen(true);
  }, [activeFilterCount, executedSearchQuery, toast]);

  const pinnedSavedTaskViews = useMemo(() => {
    return [...savedTaskViews]
      .filter((view) => view.pinned)
      .sort((a, b) => {
        const aPriority = a.id === activeSavedView?.id ? 1 : 0;
        const bPriority = b.id === activeSavedView?.id ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [activeSavedView?.id, savedTaskViews]);

  const visiblePinnedSavedTaskViews = useMemo(() => {
    const visibleViews = pinnedSavedTaskViews.slice(0, 3);

    if (
      activeSavedView &&
      !activeSavedView.pinned &&
      !visibleViews.some((view) => view.id === activeSavedView.id)
    ) {
      return [activeSavedView, ...visibleViews].slice(0, 3);
    }

    return visibleViews;
  }, [activeSavedView, pinnedSavedTaskViews]);

  const sortOptions = useMemo(() => ([
    { value: 'status-asc', label: 'Status (Asc)' },
    { value: 'status-desc', label: 'Status (Desc)' },
    { value: 'priority-desc', label: 'Priority (High to Low)' },
    { value: 'priority-asc', label: 'Priority (Low to High)' },
    { value: 'due-asc', label: 'Nearest Due Date' },
    { value: 'due-desc', label: 'Farthest Due Date' },
    { value: 'overdue-first', label: 'Overdue First' },
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'updated-desc', label: 'Recently Updated' },
    { value: 'updated-asc', label: 'Oldest Updated' },
    { value: 'created-desc', label: 'Newest Created' },
    { value: 'created-asc', label: 'Oldest Created' },
    { value: 'start-asc', label: 'Nearest Start Date' },
  ]), []);

  const selectedSortLabel = sortOptions.find((option) => option.value === sortDescriptor)?.label || 'Status (Asc)';
  const hasCustomSort = sortDescriptor !== 'status-asc';

  const draftFilterControlsContent = (
    <div className="grid gap-4 md:grid-cols-2">
      <MultiSelect
        selected={desktopStatusFilterDraft}
        className={cn(desktopStatusFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopStatusFilterDraft}
        options={sortedStatusOptions}
        placeholder="Status..."
        maxVisible={1}
      />
      <MultiSelect
        selected={desktopStatusGroupFilterDraft}
        className={cn(desktopStatusGroupFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopStatusGroupFilterDraft}
        options={statusGroupOptions}
        placeholder="Status Group..."
        maxVisible={1}
      />
      {showRepositoryFilter && (
        <MultiSelect
          selected={desktopRepoFilterDraft}
          className={cn(desktopRepoFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
          onChange={setDesktopRepoFilterDraft}
          options={repositoryOptions}
          placeholder="Repository..."
          maxVisible={1}
        />
      )}
      {showTagsFilter && (
        <MultiSelect
          selected={desktopTagsFilterDraft}
          className={cn(desktopTagsFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
          onChange={setDesktopTagsFilterDraft}
          options={tagOptions}
          placeholder="Tags..."
          maxVisible={1}
        />
      )}
      <MultiSelect
        selected={desktopPriorityFilterDraft}
        className={cn(desktopPriorityFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopPriorityFilterDraft}
        options={priorityOptions}
        placeholder="Priority..."
        maxVisible={1}
      />
      <MultiSelect
        selected={desktopDueStateFilterDraft}
        className={cn(desktopDueStateFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopDueStateFilterDraft}
        options={dueStateOptions}
        placeholder="Due state..."
        maxVisible={1}
      />
      <MultiSelect
        selected={desktopReminderNoteFilterDraft}
        className={cn(desktopReminderNoteFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopReminderNoteFilterDraft}
        options={binaryReminderOptions}
        placeholder="Reminder note..."
        maxVisible={1}
      />
      <MultiSelect
        selected={desktopDueReminderFilterDraft}
        className={cn(desktopDueReminderFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopDueReminderFilterDraft}
        options={binaryReminderOptions}
        placeholder="Due reminder..."
        maxVisible={1}
      />
      <MultiSelect
        selected={desktopDeploymentFilterDraft}
        className={cn(desktopDeploymentFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopDeploymentFilterDraft}
        options={deploymentOptions}
        placeholder="Deployment..."
        maxVisible={1}
      />
    </div>
  );

  const mobileDraftFilterControlsContent = (
    <div className="space-y-4">
      <MultiSelect
        selected={desktopStatusFilterDraft}
        className={cn(desktopStatusFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopStatusFilterDraft}
        options={sortedStatusOptions}
        placeholder="Status..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
      <MultiSelect
        selected={desktopStatusGroupFilterDraft}
        className={cn(desktopStatusGroupFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopStatusGroupFilterDraft}
        options={statusGroupOptions}
        placeholder="Status Group..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
      {showRepositoryFilter && (
        <MultiSelect
          selected={desktopRepoFilterDraft}
          className={cn(desktopRepoFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
          onChange={setDesktopRepoFilterDraft}
          options={repositoryOptions}
          placeholder="Repository..."
          maxVisible={1}
          mobileBehavior="popover"
          popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
        />
      )}
      {showTagsFilter && (
        <MultiSelect
          selected={desktopTagsFilterDraft}
          className={cn(desktopTagsFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
          onChange={setDesktopTagsFilterDraft}
          options={tagOptions}
          placeholder="Tags..."
          maxVisible={1}
          mobileBehavior="popover"
          popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
        />
      )}
      <MultiSelect
        selected={desktopPriorityFilterDraft}
        className={cn(desktopPriorityFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopPriorityFilterDraft}
        options={priorityOptions}
        placeholder="Priority..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
      <MultiSelect
        selected={desktopDueStateFilterDraft}
        className={cn(desktopDueStateFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopDueStateFilterDraft}
        options={dueStateOptions}
        placeholder="Due state..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
      <MultiSelect
        selected={desktopReminderNoteFilterDraft}
        className={cn(desktopReminderNoteFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopReminderNoteFilterDraft}
        options={binaryReminderOptions}
        placeholder="Reminder note..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
      <MultiSelect
        selected={desktopDueReminderFilterDraft}
        className={cn(desktopDueReminderFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopDueReminderFilterDraft}
        options={binaryReminderOptions}
        placeholder="Due reminder..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
      <MultiSelect
        selected={desktopDeploymentFilterDraft}
        className={cn(desktopDeploymentFilterDraft.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
        onChange={setDesktopDeploymentFilterDraft}
        options={deploymentOptions}
        placeholder="Deployment..."
        maxVisible={1}
        mobileBehavior="popover"
        popoverContentClassName="w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)]"
      />
    </div>
  );

  const selectionBarContent = (
    <BulkSelectionBar
      filteredTasksCount={filteredTasks.length}
      selectedTaskIds={selectedTaskIds}
      onToggleSelectAll={handleToggleSelectAll}
      onOpenTagsDialog={() => setIsTagsDialogOpen(true)}
      onBulkCopyText={handleBulkCopyText}
      onBulkExportPdf={handleBulkExportPdf}
      onBulkDelete={handleBulkDelete}
    />
  );

  const searchInputContent = (
    <TaskSearchInput
      searchInputRef={searchInputRef}
      searchQuery={searchQuery}
      executedSearchQuery={executedSearchQuery}
      isSearchFocused={isSearchFocused}
      isSearchActive={isSearchActive}
      isMobile={isMobile}
      searchSuggestions={searchSuggestions}
      onSearchQueryChange={handleSearchInputChange}
      onSearchFocus={() => setIsSearchFocused(true)}
      onSearchBlur={() => setIsSearchFocused(false)}
      onSearchKeyDown={handleSearchKeyDown}
      onClearSearch={clearSearch}
      onSuggestionClick={handleSuggestionClick}
    />
  );

  const deletedMatchesSection = executedSearchQuery.trim() !== '' && filteredBinnedTasks.length > 0 && (
    <DeletedMatchesSection
      filteredBinnedTasks={filteredBinnedTasks}
      timeFormat={uiConfig?.timeFormat}
      onTaskOpen={(taskId) => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push(`/tasks/${taskId}`);
      }}
    />
  );

  if (!mounted) {
    return <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8"><LoadingSpinner /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Import Summary Dialog */}
      <Dialog open={!!importSummary} onOpenChange={(open) => !open && setImportSummary(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col border-none shadow-2xl">
            <div className="p-6 pb-4 shrink-0">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <Download className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold">Import summary</DialogTitle>
                    </div>
                    <DialogDescription className="font-normal text-sm leading-relaxed">
                        Processed {importSummary?.importedCount} tasks successfully. 
                        {importSummary && importSummary.skippedDuplicates.length > 0 && ` ${importSummary.skippedDuplicates.length} items were omitted due to uniqueness constraints.`}
                        {importSummary && importSummary.warnings.length > 0 && ` ${importSummary.warnings.length} values need review.`}
                    </DialogDescription>
                </DialogHeader>
            </div>
            
            <div className="flex-1 overflow-y-auto overscroll-contain px-6">
                <div className="pb-6">
                    {importSummary && importSummary.skippedDuplicates.length > 0 && (
                        <>
                            <p className="mb-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                <Fingerprint className="h-3 w-3" />
                                Omitted duplicates
                            </p>
                            <div className="border rounded-2xl bg-muted/20 overflow-hidden shadow-inner">
                                <div className="divide-y divide-border/50">
                                    {importSummary.skippedDuplicates.map((item, i) => (
                                        <div key={i} className="p-3 bg-background/50 hover:bg-background transition-colors">
                                            <p className="text-sm font-bold truncate">{item.taskTitle}</p>
                                            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                                                Duplicate {item.field}: <span className="text-primary font-bold">{item.value}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {importSummary && importSummary.warnings.length > 0 && (
                        <>
                            <p className="mb-3 mt-5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                <AlertTriangle className="h-3 w-3" />
                                Mapping warnings
                            </p>
                            <div className="border rounded-2xl bg-muted/20 overflow-hidden shadow-inner">
                                <div className="divide-y divide-border/50">
                                    {importSummary.warnings.map((warning, i) => (
                                        <div key={`${warning}-${i}`} className="p-3 bg-background/50 hover:bg-background transition-colors">
                                            <p className="text-sm font-medium">{warning}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <DialogFooter className="p-4 bg-muted/10 shrink-0">
                <Button onClick={() => setImportSummary(null)} className="w-full font-bold h-11 rounded-xl shadow-lg">Close Summary</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Resolution Dialog */}
      <Dialog open={isResolutionOpen} onOpenChange={setIsResolutionOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-amber-500 p-6 text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Fingerprint className="h-24 w-24 rotate-12" />
                </div>
                <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="border-none bg-white/20 text-[10px] font-medium text-white">Action required</Badge>
                    </div>
                    <DialogTitle className="text-2xl font-bold">Resolve duplicate conflicts</DialogTitle>
                    <DialogDescription className="text-white/80 text-sm font-medium">
                        Existing tasks have conflicting values in unique fields. Please clean up these duplicates to ensure data integrity.
                    </DialogDescription>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain bg-background">
                <div className="p-6 space-y-8">
                    {existingDuplicates.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                                <h3 className="text-sm font-semibold text-muted-foreground">
                                    {group.fieldLabel}: <span className="text-foreground">{group.value}</span>
                                </h3>
                            </div>
                            <div className="grid gap-3">
                                {group.tasks.map(task => (
                                    <Card key={task.id} className="border-muted/60 bg-muted/5 hover:bg-muted/10 transition-all">
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold truncate">{task.title}</p>
                                                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                                                    Added {format(new Date(task.createdAt), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 rounded-lg px-3 text-[10px] font-medium"
                                                    onClick={() => router.push(`/tasks/${task.id}`)}
                                                >
                                                    View
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-3xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-bold">Delete Duplicate Task?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-sm font-normal">
                                                                This task will be moved to the bin. This value ("{group.value}") will then be available for other tasks.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="pt-4 gap-2">
                                                            <AlertDialogCancel className="rounded-xl font-medium">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold"
                                                                onClick={() => {
                                                                    moveMultipleTasksToBin([task.id]);
                                                                    refreshData();
                                                                }}
                                                            >
                                                                Delete Task
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <DialogFooter className="p-6 bg-muted/30 border-t shrink-0 flex flex-row items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground hidden sm:block">
                    {existingDuplicates.length} Conflict Group(s) Remaining
                </p>
                <Button onClick={() => setIsResolutionOpen(false)} className="w-full sm:w-auto px-8 shadow-lg rounded-xl">
                    I'll Resolve Later
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center md:mb-6 gap-6">
        <div className="flex w-full flex-col gap-1 md:w-auto">
            <div className="flex w-full items-center justify-between gap-3 md:justify-start">
                <div className="flex min-w-0 items-center gap-3">
                    <h1 className="text-3xl font-semibold text-foreground">Tasks</h1>
                    <Badge variant="outline" className={cn(mounted && currentAuthMode === 'authenticate' ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground", "h-6 px-3 text-xs font-medium")}>
                        {mounted ? (currentAuthMode === 'authenticate' ? 'Cloud Sync' : 'Local Storage') : 'Verifying...'}
                    </Badge>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 min-h-0 shrink-0 rounded-full px-3 py-0 text-xs shadow-sm md:hidden"
                                onClick={openGlobalSpotlightSearch}
                                aria-label="Open global search"
                            >
                                <Globe className="mr-1.5 h-4 w-4" />
                                Search
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <span>Open global search</span>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {uiConfig?.appName && <p className="text-muted-foreground text-sm font-medium">{uiConfig.appName}</p>}
        </div>
        
        <div className="flex flex-col items-stretch mb-2 sm:flex-row sm:items-center sm:gap-3 w-full md:w-auto">
            {uiConfig?.remindersEnabled && (pinnedTaskIds.length + generalReminders.length) > 0 && (
              <Button 
                variant="outline" 
                className="h-12 rounded-2xl border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(245,158,11,0.08))] px-4 text-amber-700 shadow-[0_16px_36px_-28px_rgba(245,158,11,0.8)] hover:bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.12))] hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 transition-all w-full sm:w-auto justify-between sm:justify-center font-semibold mb-2 sm:mb-0" 
                onClick={() => setIsReminderStackOpen(true)}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/16 ring-1 ring-amber-500/20">
                    <BellRing className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="truncate">Important Reminders</span>
                </span>
                <Badge variant="secondary" className="ml-3 rounded-xl bg-amber-500/18 px-2.5 py-1 text-amber-800 dark:text-amber-200 border-none shadow-none font-semibold">{pinnedTaskIds.length + generalReminders.length}</Badge>
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                id="global-search-option"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={openGlobalSpotlightSearch}
                                className="w-full sm:w-auto h-11 rounded-2xl px-5 font-medium shadow-sm shadow-black/5 transition-all hover:shadow-md hover:shadow-black/10"
                                aria-label="Open global search"
                            >
                                <Globe className="mr-2 h-4 w-4" />
                                Search
                                <span className="ml-2 inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    <span>{spotlightShortcutKey}</span>
                                    <span>K</span>
                                </span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <span>Global search for tasks, notes, settings, and more</span>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <DesktopNotesShortcut />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button id="home-export-trigger" variant="outline" size="sm" className="w-full sm:w-auto h-11 rounded-2xl px-5 font-medium shadow-sm shadow-black/5 transition-all hover:shadow-md hover:shadow-black/10">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={10}
                        className="w-[min(24rem,calc(100vw-2rem))] rounded-3xl border-border/60 bg-background/95 p-2 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl"
                    >
                        <DropdownMenuLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                            Export Options
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="mx-2 my-2 bg-border/60" />
                        <DropdownMenuItem
                            onSelect={() => handleExport('current_view')}
                            className="group rounded-2xl px-3 py-3.5 focus:bg-primary/8 dark:focus:bg-primary/12"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-focus:scale-[1.03]">
                                <FolderSearch className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-foreground">Export JSON current view</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Download only the tasks matching your current filters and screen context as JSON.
                                </p>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => handleExport('all_tasks')}
                            className="group rounded-2xl px-3 py-3.5 focus:bg-primary/8 dark:focus:bg-primary/12"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400 transition-transform group-focus:scale-[1.03]">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-foreground">Export JSON full workspace</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Save all tasks into one JSON backup for sharing or restoring later.
                                </p>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="mx-2 my-2 bg-border/60" />
                        <DropdownMenuItem
                            onSelect={() => handleExcelExport('current_view')}
                            disabled={isExcelExporting}
                            className="group rounded-2xl px-3 py-3.5 focus:bg-primary/8 dark:focus:bg-primary/12"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/15 dark:text-sky-400 transition-transform group-focus:scale-[1.03]">
                                {isExcelExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-foreground">Export Excel current view</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Download the visible task set as an Excel workbook.
                                </p>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => handleExcelExport('all_tasks')}
                            disabled={isExcelExporting}
                            className="group rounded-2xl px-3 py-3.5 focus:bg-primary/8 dark:focus:bg-primary/12"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/15 dark:text-cyan-400 transition-transform group-focus:scale-[1.03]">
                                {isExcelExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-foreground">Export Excel full workspace</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Save all active tasks, plus bin tasks, into Excel sheets.
                                </p>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button id="home-import-trigger" variant="outline" size="sm" className="w-full sm:w-auto h-11 rounded-2xl px-5 font-medium shadow-sm shadow-black/5 transition-all hover:shadow-md hover:shadow-black/10">
                            <Upload className="mr-2 h-4 w-4" />
                            Import
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={10}
                        className="w-[min(24rem,calc(100vw-2rem))] rounded-3xl border-border/60 bg-background/95 p-2 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl"
                    >
                        <DropdownMenuLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                            Import Options
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="mx-2 my-2 bg-border/60" />
                        <DropdownMenuItem
                            onSelect={() => fileInputRef.current?.click()}
                            className="group rounded-2xl px-3 py-3.5 focus:bg-primary/8 dark:focus:bg-primary/12"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-focus:scale-[1.03]">
                                <Upload className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-foreground">Import JSON</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Bring in a JSON backup using the current import flow.
                                </p>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => router.push('/tasks/import/excel')}
                            className="group rounded-2xl px-3 py-3.5 focus:bg-primary/8 dark:focus:bg-primary/12"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/15 dark:text-sky-400 transition-transform group-focus:scale-[1.03]">
                                <FileSpreadsheet className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-foreground">Import Excel</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Open the desktop review workspace for spreadsheet imports.
                                </p>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                
                <Button onClick={handleNavigateNewTask} id="new-task-btn" className="w-full sm:w-auto h-11 rounded-2xl px-6 shadow-[0_12px_30px_-14px_rgba(79,70,229,0.85)] font-medium active:scale-95 transition-all hover:shadow-[0_16px_34px_-14px_rgba(79,70,229,0.95)]">
                    <Plus className="mr-2 h-5 w-5" /> New Task
                </Button>
            </div>
        </div>
      </div>
      
      <div className="space-y-4 md:space-y-6">
          <div className="space-y-3">
              {/* MOBILE ONLY TOOLS - Preserved Strict Order from Reference */}
              <div className="md:hidden flex flex-col gap-4 mb-2">
                  {/* 1. Export / Import Buttons */}
                  <div className="grid grid-cols-2 gap-2 px-1">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="h-11 rounded-xl shadow-sm font-semibold gap-2">
                                  <Download className="h-4 w-4" /> Export JSON
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                              align="center"
                              sideOffset={10}
                              className="w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.75rem] border-border/60 bg-background/95 p-2 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.6)] backdrop-blur-xl"
                          >
                              <DropdownMenuLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                                  Export Options
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="mx-2 my-2 bg-border/60" />
                              <DropdownMenuItem
                                  onSelect={() => handleExport('current_view')}
                                  className="group rounded-2xl px-3 py-3 focus:bg-primary/8 dark:focus:bg-primary/12"
                              >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-focus:scale-[1.03]">
                                      <FolderSearch className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                      <p className="text-sm font-semibold text-foreground">Export current view</p>
                                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                                          Save only what you are currently viewing.
                                      </p>
                                  </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onSelect={() => handleExport('all_tasks')}
                                  className="group rounded-2xl px-3 py-3 focus:bg-primary/8 dark:focus:bg-primary/12"
                              >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-400 transition-transform group-focus:scale-[1.03]">
                                      <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                      <p className="text-sm font-semibold text-foreground">Export full workspace</p>
                                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                                          Download a full JSON backup of your tasks.
                                      </p>
                                  </div>
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="h-11 rounded-xl shadow-sm font-semibold gap-2"
                      >
                          <Upload className="h-4 w-4" /> Import JSON
                      </Button>
                  </div>

                  {/* 2. Date navigation (if monthly/yearly) */}
                  {(dateView === 'monthly' || dateView === 'calendar' || dateView === 'yearly') && !favoritesOnly && (
                      <div className="flex items-center justify-between gap-2 w-full px-1">
                          <Button variant="outline" size="icon" onClick={handlePreviousDate} className="h-11 w-11 shrink-0 shadow-sm rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" className="text-sm font-bold flex-1 h-11 shadow-sm rounded-xl">
                                      {dateView === 'yearly' ? format(selectedDate, 'yyyy') : format(selectedDate, 'MMMM yyyy')}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="center">
                                  <div className="p-3 w-[280px] space-y-4">
                                      <div className="flex items-center justify-between gap-2">
                                          <Button 
                                              variant="outline" 
                                              size="icon" 
                                              className="h-8 w-8 rounded-lg"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handlePreviousDate();
                                              }}
                                          >
                                              <ChevronLeft className="h-4 w-4" />
                                          </Button>
                                          <Select 
                                              value={String(selectedDate.getFullYear())}
                                              onValueChange={(val) => {
                                                  setIsSearching(true);
                                                  const d = new Date(selectedDate);
                                                  d.setFullYear(parseInt(val));
                                                  setSelectedDate(d);
                                              }}
                                          >
                                              <SelectTrigger className="h-8 flex-1 font-bold border-none hover:bg-muted transition-colors rounded-lg">
                                                  <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-60">
                                                  {Array.from({ length: 101 }, (_, i) => 2000 + i).map(y => (
                                                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          <Button 
                                              variant="outline" 
                                              size="icon" 
                                              className="h-8 w-8 rounded-lg"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleNextDate();
                                              }}
                                          >
                                              <ChevronRight className="h-4 w-4" />
                                          </Button>
                                      </div>

                                      {(dateView === 'monthly' || dateView === 'calendar') && (
                                          <div className="grid grid-cols-3 gap-2">
                                              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, idx) => (
                                                  <Button
                                                      key={month}
                                                      variant={selectedDate.getMonth() === idx ? "default" : "ghost"}
                                                      className={cn(
                                                          "h-9 text-xs font-semibold rounded-lg",
                                                          selectedDate.getMonth() === idx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                                      )}
                                                      onClick={() => {
                                                          setIsSearching(true);
                                                          const d = new Date(selectedDate);
                                                          d.setMonth(idx);
                                                          setSelectedDate(d);
                                                      }}
                                                  >
                                                      {month}
                                                  </Button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </PopoverContent>
                          </Popover>
                          <Button variant="outline" size="icon" onClick={handleNextDate} className="h-11 w-11 shrink-0 shadow-sm rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
                      </div>
                  )}

                  {/* 3. Results heading */}
                  <div className="px-2">
                      <div className="flex items-center justify-between gap-3">
                          <h2 className="min-w-0 truncate text-xl font-bold leading-tight text-foreground/90">
                              {favoritesOnly ? 'Favorite Tasks' : `${filteredTasks.length} Results`}
                          </h2>
                          {totalActiveFilters > 0 && (
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleClearAllTaskFilters}
                                  className="h-8 shrink-0 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                              >
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Clear
                              </Button>
                          )}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground/70 mt-0.5 whitespace-nowrap">
                          {favoritesOnly 
                              ? `Showing ${filteredTasks.length} favorited items.` 
                              : (dateView === 'all' ? 'Based on active filters.' : dateView === 'calendar' ? `Calendar month ${format(selectedDate, 'MMM yyyy')}` : dateView === 'monthly' ? `Start date in ${format(selectedDate, 'MMM yyyy')}` : `Start date in ${format(selectedDate, 'yyyy')}`)}
                      </p>
                  </div>

                  {/* 4. Mobile view/date toggles row */}
                  <div className="flex items-center justify-between gap-2 px-1 pb-1 w-full md:hidden">
                      <div className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl border bg-muted/50 p-1 shadow-sm">
                          <button
                              onClick={() => handleDateViewChange('all')}
                              className={cn(
                                  "inline-flex min-w-0 flex-1 items-center justify-center h-8 px-2.5 rounded-lg text-[11px] font-medium transition-all",
                                  dateView === 'all' ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                              )}
                          >
                              All
                          </button>
                          <button
                              onClick={() => handleDateViewChange('monthly')}
                              className={cn(
                                  "inline-flex min-w-0 flex-1 items-center justify-center h-8 px-2.5 rounded-lg text-[11px] font-medium transition-all",
                                  dateView === 'monthly' ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                              )}
                          >
                              Monthly
                          </button>
                      </div>

                      <div className="flex h-10 shrink-0 items-center justify-center rounded-xl border bg-muted/50 p-1 shadow-sm">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 rounded-lg text-muted-foreground transition-all",
                                    dateView !== 'calendar' && viewMode === 'grid' && 'bg-background text-primary shadow-sm ring-1 ring-black/5'
                                  )}
                                  onClick={() => handleContentViewChange('grid')}
                              >
                                  <LayoutGrid className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Grid view</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 rounded-lg text-muted-foreground transition-all",
                                    dateView === 'calendar' && 'bg-background text-primary shadow-sm ring-1 ring-black/5'
                                  )}
                                  onClick={() => handleContentViewChange('calendar')}
                              >
                                  <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Calendar view</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                  </div>

                  {/* 5. Sort / Favourites / Select / Saved Views / Filters row */}
                  <div className="flex flex-nowrap items-center gap-2 px-1 w-full md:hidden">
                      {dateView !== 'calendar' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                  variant={favoritesOnly ? 'secondary' : 'outline'} 
                                  size="icon" 
                                  onClick={handleFavoritesToggle} 
                                  className="h-11 w-11 shrink-0 rounded-xl shadow-sm"
                              >
                                  <Heart className={cn("h-5 w-5", favoritesOnly && "fill-red-500 text-red-500")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{favoritesOnly ? 'All tasks' : 'Favorites only'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <DropdownMenuTrigger asChild>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="relative h-11 w-11 shrink-0 rounded-xl shadow-sm">
                                  <ArrowDownWideNarrow className="h-4.5 w-4.5" />
                                  {hasCustomSort && (
                                    <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                                  )}
                                  <span className="sr-only">Sort tasks</span>
                                </Button>
                              </TooltipTrigger>
                            </DropdownMenuTrigger>
                            <TooltipContent side="top">
                              <p>Sort tasks</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TaskSortMenuContent
                          align="start"
                          selectedSortLabel={selectedSortLabel}
                          sortDescriptor={sortDescriptor}
                          sortOptions={sortOptions}
                          onSortChange={handleSortChange}
                        />
                      </DropdownMenu>

                      {dateView !== 'calendar' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                  variant={isSelectMode ? 'secondary' : 'outline'} 
                                  id="home-select-multiple-trigger-mobile"
                                  onClick={handleToggleSelectMode} 
                                  className={cn(
                                      "h-11 min-w-0 flex-1 rounded-xl px-3 shadow-sm transition-all active:scale-95 text-xs font-medium",
                                      isSelectMode ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                                  )}
                              >
                                  {isSelectMode ? (
                                    <>
                                      <X className="mr-1.5 h-4 w-4 shrink-0" />
                                      <span className="truncate">Cancel</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckSquare className="mr-1.5 h-4 w-4 shrink-0" />
                                      <span className="truncate">Select multiple</span>
                                    </>
                                  )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{isSelectMode ? 'Cancel multi-select' : 'Select multiple tasks'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <DropdownMenuTrigger asChild>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 rounded-xl shadow-sm transition-all duration-300"
                                >
                                  <BookmarkPlus className="h-4.5 w-4.5" />
                                  <span className="sr-only">Saved views</span>
                                </Button>
                              </TooltipTrigger>
                            </DropdownMenuTrigger>
                            <TooltipContent side="top">
                              <p>Saved views</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <SavedViewsMenuContent
                          align="end"
                          onSaveCurrentView={handleStartSaveCurrentView}
                          onOpenManageViews={() => setIsManageViewsDialogOpen(true)}
                        />
                      </DropdownMenu>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              id="task-filters-mobile"
                              variant="outline"
                              size="icon"
                              onClick={() => setIsMobileFiltersOpen(true)}
                              className="relative h-11 w-11 shrink-0 rounded-xl shadow-sm text-muted-foreground"
                            >
                              <Filter className="h-4.5 w-4.5" />
                              {activeFilterCount > 0 && (
                                <>
                                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-primary/80" />
                                </>
                              )}
                              <span className="sr-only">Open filters</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Filters</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                  </div>

                  {/* 6.5 STRICT FIX: Select Multiple actions container (Mobile Only) */}
                  {isSelectMode && dateView !== 'calendar' && (
                      <div className="px-1 animate-in slide-in-from-top-2 duration-300">
                          {selectionBarContent}
                      </div>
                  )}

                  {/* 7. Search Input Field */}
                  <div className="px-1 animate-in fade-in slide-in-from-top-2 duration-500">
                      {searchInputContent}
                  </div>
              </div>

              <div className="mb-4 hidden md:grid md:grid-cols-12 md:items-center md:gap-4">
                <div className="md:col-span-3">
                  {searchInputContent}
                </div>

                <div className="md:col-span-9">
                  <PinnedSavedViewsStrip
                    savedTaskViewsCount={savedTaskViews.length}
                    visiblePinnedSavedTaskViews={visiblePinnedSavedTaskViews}
                    activeSavedViewId={activeSavedView?.id || null}
                    activeSavedViewIsPinned={Boolean(activeSavedView?.pinned)}
                    onApplySavedTaskView={applySavedTaskView}
                    onClearActiveSavedView={handleClearActiveSavedView}
                    getSavedViewSummary={getSavedViewSummary}
                    getSavedViewPreviewGroups={getSavedViewPreviewGroups}
                    isLoading={shouldShowListSkeleton}
                    skeletonCount={visiblePinnedSavedTaskViews.length > 0 ? visiblePinnedSavedTaskViews.length : Math.min(savedTaskViews.length, 3)}
                  />
                </div>
              </div>
          </div>
          
           {searchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Search failed</AlertTitle>
                    <AlertDescription className="font-normal">{searchError}</AlertDescription>
                </Alert>
           )}

           <StarterWorkspaceCallout isVisible={starterContentAvailable} />

           <div className="flex flex-col gap-4">
                <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-4 lg:gap-6">
                    <div className="min-w-0 md:col-span-6 lg:col-span-6 flex items-center gap-3 lg:gap-4">
                        {(dateView === 'monthly' || dateView === 'calendar' || dateView === 'yearly') && !favoritesOnly && (
                            <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
                                <Button variant="outline" size="icon" onClick={handlePreviousDate} className="h-11 w-11 shrink-0 shadow-sm rounded-xl active:scale-95 transition-transform"><ChevronLeft className="h-5 w-5" /></Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-11 min-w-[168px] lg:min-w-[196px] whitespace-nowrap rounded-xl shadow-sm text-base font-semibold lg:text-lg">
                                            {dateView === 'yearly' ? format(selectedDate, 'yyyy') : format(selectedDate, 'MMMM yyyy')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <div className="p-3 w-[280px] space-y-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-lg"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePreviousDate();
                                                    }}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <Select 
                                                    value={String(selectedDate.getFullYear())}
                                                    onValueChange={(val) => {
                                                        setIsSearching(true);
                                                        const d = new Date(selectedDate);
                                                        d.setFullYear(parseInt(val));
                                                        setSelectedDate(d);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 flex-1 font-bold border-none hover:bg-muted transition-colors rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        {Array.from({ length: 101 }, (_, i) => 2000 + i).map(y => (
                                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-lg"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNextDate();
                                                    }}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {(dateView === 'monthly' || dateView === 'calendar') && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, idx) => (
                                                        <Button
                                                            key={month}
                                                            variant={selectedDate.getMonth() === idx ? "default" : "ghost"}
                                                            className={cn(
                                                                "h-9 text-xs font-semibold rounded-lg",
                                                                selectedDate.getMonth() === idx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                            onClick={() => {
                                                                setIsSearching(true);
                                                                const d = new Date(selectedDate);
                                                                d.setMonth(idx);
                                                                setSelectedDate(d);
                                                            }}
                                                        >
                                                            {month}
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={handleNextDate} className="h-11 w-11 shrink-0 shadow-sm rounded-xl active:scale-95 transition-transform"><ChevronRight className="h-5 w-5" /></Button>
                            </div>
                        )}
                        
                        <div className="hidden min-w-0 md:block">
                            <div className="flex items-center gap-2 lg:gap-3">
                                <h2 className="truncate text-base font-bold leading-tight text-foreground/90 lg:text-lg">
                                    {favoritesOnly ? 'Favorite Tasks' : `${filteredTasks.length} Results`}
                                </h2>
                                {totalActiveFilters > 0 && (
                                    <div className="flex min-w-0 items-center gap-1.5 animate-in fade-in zoom-in duration-300 lg:gap-2">
                                        <Badge variant="secondary" className="h-5 shrink-0 rounded-full border-primary/20 bg-primary/10 px-2 text-[10px] font-medium text-primary lg:text-xs">
                                            {totalActiveFilters} {totalActiveFilters === 1 ? 'Filter' : 'Filters'} Active
                                        </Badge>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={handleClearAllTaskFilters}
                                            className="h-5 shrink-0 rounded-md px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                                        >
                                            <X className="h-3 w-3 mr-1" />
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground/70 lg:text-[11px]">
                                {favoritesOnly 
                                    ? `Showing ${filteredTasks.length} favorited items.` 
                                    : (dateView === 'all' ? 'Based on active filters.' : dateView === 'calendar' ? `Calendar month ${format(selectedDate, 'MMM yyyy')}` : dateView === 'monthly' ? `Start date in ${format(selectedDate, 'MMM yyyy')}` : `Start date in ${format(selectedDate, 'yyyy')}`)}
                            </p>
                        </div>
                    </div>

                    <div id="view-mode-toggle" className="min-w-0 md:col-span-6 lg:col-span-6">
                        <div className="hidden md:flex items-center justify-end gap-2 lg:gap-3">
                            <DropdownMenu>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" className="relative h-11 w-11 rounded-xl shadow-sm">
                                        <ArrowDownWideNarrow className="h-4.5 w-4.5" />
                                        {hasCustomSort && (
                                          <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                                        )}
                                        <span className="sr-only">Sort tasks</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Sort tasks</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TaskSortMenuContent
                                align="end"
                                selectedSortLabel={selectedSortLabel}
                                sortDescriptor={sortDescriptor}
                                sortOptions={sortOptions}
                                onSortChange={handleSortChange}
                              />
                            </DropdownMenu>

                            <div className="hidden md:flex h-11 items-center justify-center rounded-xl bg-muted/50 p-1 border shadow-sm shrink-0">
                                <button
                                    onClick={() => handleDateViewChange('all')}
                                    className={cn(
                                        "inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-all lg:px-4 lg:text-sm",
                                        dateView === 'all' 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-black/5" 
                                            : "text-muted-foreground hover:bg-background/50"
                                    )}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => handleDateViewChange('monthly')}
                                    className={cn(
                                        "inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-all lg:px-4 lg:text-sm",
                                        dateView === 'monthly' 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-black/5" 
                                            : "text-muted-foreground hover:bg-background/50"
                                    )}
                                >
                                    Monthly
                                </button>
                            </div>

                            <div className="hidden md:flex h-11 items-center justify-center rounded-xl bg-muted p-1 border shadow-sm">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", dateView !== 'calendar' && viewMode === 'grid' && 'bg-card text-foreground shadow-sm')} onClick={() => handleContentViewChange('grid')}><LayoutGrid className="h-4 w-4" /></Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>Grid view</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", dateView !== 'calendar' && viewMode === 'table' && 'bg-card text-foreground shadow-sm')} onClick={() => handleContentViewChange('table')}><List className="h-4 w-4" /></Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>List view</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", dateView === 'calendar' && 'bg-card text-primary shadow-sm')} onClick={() => handleContentViewChange('calendar')}><CalendarIcon className="h-4 w-4" /></Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>Calendar view</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
                            <div className="hidden md:flex items-center gap-2">
                                {dateView !== 'calendar' && (
                                  <TooltipProvider>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <Button 
                                                  variant={favoritesOnly ? 'secondary' : 'outline'} 
                                                  size="icon" 
                                                  onClick={handleFavoritesToggle} 
                                                  className="h-11 w-11 rounded-xl shadow-sm"
                                              >
                                                  <Heart className={cn("h-5 w-5", favoritesOnly && "fill-red-500 text-red-500")} />
                                              </Button>
                                          </TooltipTrigger>
                                          <TooltipContent><p>{favoritesOnly ? 'All tasks' : 'Favorites only'}</p></TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                                )}

                                {dateView !== 'calendar' && (
                                  <TooltipProvider>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <Button 
                                                  id="home-select-multiple-trigger"
                                                  variant={isSelectMode ? 'secondary' : 'outline'} 
                                                  size="icon"
                                                  onClick={handleToggleSelectMode} 
                                                  className={cn(
                                                      "h-11 w-11 rounded-xl shadow-sm transition-all active:scale-95",
                                                      isSelectMode ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                                                  )}
                                              >
                                                  {isSelectMode ? <X className="h-4.5 w-4.5" /> : <CheckSquare className="h-4.5 w-4.5" />}
                                              </Button>
                                          </TooltipTrigger>
                                          <TooltipContent><p>{isSelectMode ? 'Cancel multi-select' : 'Select multiple tasks'}</p></TooltipContent>
                                      </Tooltip>
                                  </TooltipProvider>
                                )}

                                <DropdownMenu>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <DropdownMenuTrigger asChild>
                                        <TooltipTrigger asChild>
                                          <Button
                                            id="home-saved-views-trigger"
                                            variant="outline"
                                            size="icon"
                                            className="h-11 w-11 rounded-xl shadow-sm transition-all duration-300"
                                          >
                                            <BookmarkPlus className="h-4.5 w-4.5" />
                                            <span className="sr-only">Saved views</span>
                                          </Button>
                                        </TooltipTrigger>
                                      </DropdownMenuTrigger>
                                      <TooltipContent><p>Saved views</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <SavedViewsMenuContent
                                    align="end"
                                    onSaveCurrentView={handleStartSaveCurrentView}
                                    onOpenManageViews={() => setIsManageViewsDialogOpen(true)}
                                  />
                                </DropdownMenu>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        id="task-cards-refresh"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleRefreshTaskCards}
                                        disabled={isRefreshingTaskCards}
                                        className="h-11 w-11 rounded-xl shadow-sm text-muted-foreground"
                                      >
                                        <RefreshCw className={cn("h-4.5 w-4.5", isRefreshingTaskCards && "animate-spin")} />
                                        <span className="sr-only">Refresh Task Cards</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Refresh task cards</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        id="task-filters"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsDesktopFiltersOpen(true)}
                                        className="relative h-11 w-11 rounded-xl shadow-sm text-muted-foreground"
                                      >
                                        <Filter className="h-4.5 w-4.5" />
                                        {activeFilterCount > 0 && (
                                          <>
                                            <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                                            <span className="animate-ping absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary/80" />
                                          </>
                                        )}
                                        <span className="sr-only">Open filters</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Filters</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DESKTOP/TABLET SELECTION BAR - Positioned below the control row */}
                {isSelectMode && dateView !== 'calendar' && (
                    <div className="hidden md:block animate-in slide-in-from-top-2 duration-300">
                        {selectionBarContent}
                    </div>
                )}
            </div>
            
            <div className="relative">
                <div className={cn(
                    "transform-gpu transition-all duration-500 ease-out",
                    isSearching ? "translate-y-2 opacity-45 blur-[0.4px]" : "translate-y-0 opacity-100"
                )}>
                    {(dateView === 'calendar' || filteredTasks.length > 0 || filteredBinnedTasks.length > 0 || shouldShowListSkeleton || !shouldRenderEmptyState) ? (
                        <div>
                            {(filteredTasks.length > 0 || shouldShowListSkeleton || dateView === 'calendar') ? (
                                dateView === 'calendar' ? (
                                    <TasksCalendarView
                                        tasks={filteredTasks}
                                        selectedDate={selectedDate}
                                        onSelectedDateChange={setSelectedDate}
                                        uiConfig={uiConfig}
                                        currentQueryString={searchParams.toString()}
                                    />
                                ) : viewMode === 'grid' ? (
                                    <TasksGrid tasks={filteredTasks} onTaskDelete={refreshData} onTaskUpdate={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} pinnedTaskIds={pinnedTaskIds} onPinToggle={handlePinToggle} currentQueryString={searchParams.toString()} favoritesOnly={favoritesOnly} isLoading={shouldShowListSkeleton} />
                                ) : (
                                    <TasksTable tasks={filteredTasks} onTaskDelete={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} currentQueryString={searchParams.toString()} favoritesOnly={favoritesOnly} isLoading={shouldShowListSkeleton} />
                                )
                            ) : null}
                            {deletedMatchesSection}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                            {favoritesOnly ? (
                                <>
                                    <Heart className="h-16 w-16 mb-4 opacity-20 text-red-500" />
                                    <p className="text-lg font-semibold">No favorite tasks found.</p>
                                    <p className="text-sm mt-1 max-w-xs mx-auto text-center font-normal">Tap the heart icon on any task card to add it to your personal favorites list.</p>
                                    <div className="flex gap-2 mt-6">
                                        <Button variant="outline" size="sm" onClick={() => setFavoritesOnly(false)} className="font-medium">View All Tasks</Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <FolderSearch className="h-16 w-16 mb-4 opacity-50"/>
                                    <p className="text-lg font-semibold">No tasks found.</p>
                                    <Button asChild className="mt-4 font-medium" size="sm"><Link href="/tasks/new"><Plus className="mr-2 h-4 w-4" /> Create Task</Link></Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
      </div>

      {uiConfig?.remindersEnabled && (pinnedTaskIds.length + generalReminders.length) > 0 && (
        <ReminderStack reminders={tasks.filter(t => pinnedTaskIds.includes(t.id))} generalReminders={generalReminders} uiConfig={uiConfig} onUnpin={handleUnpinFromStack} onDismissGeneralReminder={handleDismissGeneralReminder} isOpen={isReminderStackOpen} onOpenChange={setIsReminderStackOpen} />
     )}

     <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <DialogTitle>Apply Tags</DialogTitle>
                </div>
                <DialogDescription className="font-normal text-sm">
                    Select tags to apply to the <strong>{selectedTaskIds.length}</strong> selected task(s).
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <MultiSelect
                    selected={tagsToApply}
                    onChange={setTagsToApply}
                    options={tasks.flatMap(t => t.tags || []).reduce((acc, tag) => {
                        if (!acc.some(o => o.value === tag)) acc.push({ value: tag, label: tag });
                        return acc;
                    }, [] as SelectOption[])}
                    placeholder="Search or create tags..."
                    creatable
                />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
                <Button variant="ghost" onClick={() => setIsTagsDialogOpen(false)} disabled={isBulkTagApplying} className="font-medium">Cancel</Button>
                <Button onClick={handleBulkApplyTags} disabled={tagsToApply.length === 0 || isBulkTagApplying} className="font-bold px-6">
                    {isBulkTagApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply to {selectedTaskIds.length} Tasks
                </Button>
            </DialogFooter>
        </DialogContent>
     </Dialog>

     <SavedViewDialogs
        isSaveViewDialogOpen={isSaveViewDialogOpen}
        onSaveViewDialogOpenChange={handleSaveViewDialogOpenChange}
        isManageViewsDialogOpen={isManageViewsDialogOpen}
        onManageViewsDialogOpenChange={setIsManageViewsDialogOpen}
        newSavedViewName={newSavedViewName}
        onNewSavedViewNameChange={setNewSavedViewName}
        onSaveCurrentView={handleSaveCurrentView}
        onCloseSaveDialog={handleCloseSaveDialog}
        savedTaskViews={savedTaskViews}
        isSavedViewActive={isSavedViewActive}
        getSavedViewSummary={getSavedViewSummary}
        onApplySavedTaskView={applySavedTaskView}
        onToggleSavedViewPin={handleToggleSavedViewPin}
        onStartUpdateSavedView={handleStartUpdateSavedView}
        onDeleteSavedView={handleDeleteSavedView}
        onStartCreateSavedView={() => {
          setPendingSavedViewState(null);
          setNewSavedViewName('');
          setIsManageViewsDialogOpen(false);
          setIsSaveViewDialogOpen(true);
        }}
        onCloseManageDialog={() => setIsManageViewsDialogOpen(false)}
     />

     <DesktopFiltersSheet
        isOpen={isDesktopFiltersOpen}
        onOpenChange={handleDesktopFiltersOpenChange}
        appliedFilterCount={activeFilterCount}
        currentViewLabel={currentFilterViewLabel}
        desktopDraftFilterCount={desktopDraftFilterCount}
        canApplyFilters={desktopDraftFilterCount > 0 || activeFilterCount > 0}
        canSaveView={doesDraftHaveAnyFilters}
        hasUnappliedChanges={showPreservedFilterDraftNotice}
        showSaveSuggestion={isFilterSaveSuggestionVisible}
        activeFilterSections={activeFilterSections}
        hiddenActiveFilterSectionsCount={hiddenActiveFilterSectionsCount}
        buildFilterSummary={buildFilterSummary}
        controls={draftFilterControlsContent}
        onResetSelections={handleResetDesktopFilterDraft}
        onApplyFilters={handleApplyDesktopFilters}
        onSaveView={handleStartSaveDraftView}
        onDismissSaveSuggestion={() => setIsFilterSaveSuggestionVisible(false)}
        onDiscardUnappliedChanges={handleDiscardPreservedFilterDraft}
     />

     <MobileFiltersSheet
        isOpen={isMobileFiltersOpen}
        onOpenChange={handleMobileFiltersOpenChange}
        appliedFilterCount={activeFilterCount}
        currentViewLabel={currentFilterViewLabel}
        desktopDraftFilterCount={desktopDraftFilterCount}
        canApplyFilters={desktopDraftFilterCount > 0 || activeFilterCount > 0}
        canSaveView={doesDraftHaveAnyFilters}
        hasUnappliedChanges={showPreservedFilterDraftNotice}
        showSaveSuggestion={isFilterSaveSuggestionVisible}
        activeFilterSections={activeFilterSections}
        hiddenActiveFilterSectionsCount={hiddenActiveFilterSectionsCount}
        buildFilterSummary={buildFilterSummary}
        controls={mobileDraftFilterControlsContent}
        onResetSelections={handleResetMobileFilterDraft}
        onApplyFilters={handleApplyMobileFilters}
        onSaveView={handleStartSaveDraftView}
        onDismissSaveSuggestion={() => setIsFilterSaveSuggestionVisible(false)}
        onDiscardUnappliedChanges={handleDiscardPreservedFilterDraft}
     />
    </div>
  );
}
