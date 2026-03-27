'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getTasks, addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester, moveMultipleTasksToBin, getBinnedTasks, getAppData, setAppData, getLogs, addLog, restoreMultipleTasks, clearExpiredReminders, deleteGeneralReminder, getGeneralReminders, addTagsToMultipleTasks, addEnvironment, DATA_KEY, getAuthMode, importWorkspaceData, getUserPreferences, updateUserPreferences, isInitialSyncComplete, getActiveCompanyId, findExistingDuplicates } from '@/lib/data';
import { TasksGrid } from '@/components/tasks-grid';
import { TasksTable } from '@/components/tasks-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Download,
  Upload,
  FolderSearch,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckSquare,
  Copy,
  X,
  HelpCircle,
  History,
  Heart,
  BellRing,
  GraduationCap,
  Tag,
  Loader2,
  AlertCircle,
  CornerDownLeft,
  Filter,
  ChevronDown,
  Save,
  Check,
  User,
  GitMerge,
  FileText,
  ChevronRight as ChevronRightIcon,
  SearchX,
  CalendarIcon,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';
import { cn, fuzzySearch } from '@/lib/utils';
import { getSortedStatusOptions, getStatusDisplayName } from '@/lib/status-config';
import type { Task, Person, UiConfig, RepositoryConfig, Log, GeneralReminder, BackupFrequency, Environment, UserPreferences, AuthMode } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { ToastAction } from '@/components/ui/toast';
import { ReminderStack } from '@/components/reminder-stack';
import { Badge } from '@/components/ui/badge';
import { useTutorial } from '@/hooks/use-tutorial';
import { MultiSelect, type SelectOption } from '@/components/ui/multi-select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase } from '@/firebase';
import { triggerTransfer } from '@/components/file-transfer-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewMode = 'grid' | 'table';
type DateView = 'all' | 'monthly' | 'yearly';

const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
const LAST_BACKUP_KEY = 'taskflow_last_auto_backup';

interface SearchSuggestion {
    id: string;
    title: string;
    subLabel: string;
    type: 'task' | 'user' | 'tag' | 'repo';
    icon: any;
    taskId: string;
    matchType: string;
    isBinned?: boolean;
}

export default function Home() {
  const { user, isUserLoading } = useFirebase();
  const activeCompanyId = useActiveCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [generalReminders, setGeneralReminders] = useState<GeneralReminder[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
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
  const [repoFilter, setRepoFilter] = useState<string[]>([]);
  const [deploymentFilter, setDeploymentFilter] = useState<string[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [executedSearchQuery, setExecutedSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['priority', 'completed', 'other', 'hold']);
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [isReminderStackOpen, setIsReminderStackOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [commandKey, setCommandKey] = useState('Ctrl');
  
  const { startTutorial } = useTutorial();
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [tagsToApply, setTagsToApply] = useState<string[]>([]);

  const [isSearching, setIsSearching] = useState(false);
  const [showSlowSearchMessage, setShowSlowSearchMessage] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [importSummary, setImportSummary] = useState<{ importedCount: number; skippedDuplicates: any[] } | null>(null);

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [existingDuplicates, setExistingDuplicates] = useState<{ fieldLabel: string; value: string; tasks: Task[] }[]>([]);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const tutorialOpenedSelectModeRef = useRef(false);
  
  useEffect(() => {
    setMounted(true);
    setCurrentAuthMode(getAuthMode());
    
    const prefs = getUserPreferences();
    
    const urlViewMode = searchParams.get('viewMode') as ViewMode;
    const urlDateView = searchParams.get('dateView') as DateView;
    const urlSort = searchParams.get('sort');
    const urlFavs = searchParams.get('favorites') === 'true';
    const urlSearch = searchParams.get('search') || '';
    
    setViewMode(urlViewMode || prefs.viewMode || 'grid');
    setDateView(urlDateView || prefs.dateView || 'all');
    setSortDescriptor(urlSort || prefs.sortDescriptor || 'status-asc');
    setFavoritesOnly(urlFavs || prefs.favoritesOnly || false);
    setSearchQuery(urlSearch);
    setExecutedSearchQuery(urlSearch);

    const urlStatus = searchParams.getAll('status');
    setStatusFilter(urlStatus.length > 0 ? urlStatus : (prefs.taskFilters?.status || []));
    
    const urlRepo = searchParams.getAll('repo');
    setRepoFilter(urlRepo.length > 0 ? urlRepo : (prefs.taskFilters?.repo || []));
    
    const urlDeployment = searchParams.get('deployment');
    setDeploymentFilter(urlDeployment ? [urlDeployment] : (prefs.taskFilters?.deployment || []));
    
    const urlTags = searchParams.getAll('tags');
    setTagsFilter(urlTags.length > 0 ? urlTags : (prefs.taskFilters?.tags || []));

    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : new Date();
    setSelectedDate(isValid(date) ? date : new Date());
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
    repoFilter.forEach(r => params.append('repo', r));
    deploymentFilter.forEach(d => params.append('deployment', d));
    tagsFilter.forEach(t => params.append('tags', t));

    const currentQuery = searchParams.toString();
    const newQuery = params.toString();

    if (currentQuery !== newQuery) {
        router.push(`${pathname}?${newQuery}`, { scroll: false });
    }

    updateUserPreferences({
        viewMode,
        sortDescriptor,
        dateView,
        favoritesOnly,
        taskFilters: {
            status: statusFilter,
            repo: repoFilter,
            deployment: deploymentFilter,
            tags: tagsFilter
        }
    });
  }, [executedSearchQuery, sortDescriptor, viewMode, dateView, selectedDate, favoritesOnly, statusFilter, repoFilter, deploymentFilter, tagsFilter, router, pathname, searchParams, mounted]);

  const handlePreviousDate = useCallback(() => {
      setIsSearching(true);
      if (dateView === 'monthly') {
          setSelectedDate(subMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(subYears(selectedDate, 1));
      }
  }, [dateView, selectedDate]);

  const handleNextDate = useCallback(() => {
      setIsSearching(true);
      if (dateView === 'monthly') {
          setSelectedDate(addMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(addYears(selectedDate, 1));
      }
  }, [dateView, selectedDate]);

  const refreshData = useCallback(() => {
    const authMode = getAuthMode();
    const companyId = getActiveCompanyId();
    
    if (isUserLoading) return;

    if (companyId) {
        setTasks(getTasks());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        setGeneralReminders(getGeneralReminders());
        const config = getUiConfig();
        setUiConfig(config);
        document.title = config.appName || 'My Task Manager';
        setSelectedTaskIds([]);
        
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
    
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('config-changed', refreshData);
      window.removeEventListener('company-changed', refreshData);
      window.removeEventListener('sync-complete', refreshData);
    };
  }, [refreshData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        setCommandKey(isMac ? '⌘' : 'Ctrl');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInputRef.current?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const getDeploymentScore = (task: Task) => {
    const deploymentOrder = ['production', 'stage', 'dev'];
    for (let i = 0; i < deploymentOrder.length; i++) {
      const env = deploymentOrder[i];
      if (task.deploymentStatus?.[env]) {
        return deploymentOrder.length - i;
      }
    }
    return 0;
  };

  useEffect(() => {
    const filterAndProcess = () => {
        try {
            if (isUserLoading || !mounted) return;

            const results = tasks.filter((task: Task) => {
                if (favoritesOnly && !task.isFavorite) return false;

                const resolvedStatus = getStatusDisplayName(task.status, uiConfig);
                const statusMatch = statusFilter.length === 0 || statusFilter.includes(resolvedStatus);
                const repoMatch = repoFilter.length === 0 || (Array.isArray(task.repositories) && task.repositories?.some(repo => repoFilter.includes(repo)) || false);
                const tagsMatch = tagsFilter.length === 0 || (task.tags?.some(tag => tagsFilter.includes(tag)) ?? false);

                const developersById = new Map(developers.map(d => [d.id, d.name]));
                const testersById = new Map(testers.map(t => [t.id, t.name]));

                const searchMatch =
                executedSearchQuery.trim() === '' ||
                fuzzySearch(executedSearchQuery, task.title) ||
                fuzzySearch(executedSearchQuery, task.description) ||
                fuzzySearch(executedSearchQuery, task.id) ||
                (task.azureWorkItemId && fuzzySearch(executedSearchQuery, task.azureWorkItemId)) ||
                task.developers?.some((devId) => fuzzySearch(executedSearchQuery, developersById.get(devId) || '')) ||
                task.testers?.some((testerId) => fuzzySearch(executedSearchQuery, testersById.get(testerId) || '')) ||
                (Array.isArray(task.repositories) && task.repositories?.some((repo) => fuzzySearch(executedSearchQuery, repo)));

                const dateMatch = (() => {
                if (dateView === 'all') return true;
                if (dateView === 'monthly') {
                    if (!task.devStartDate) return false;
                    const taskDate = new Date(task.devStartDate);
                    const start = startOfMonth(selectedDate);
                    const end = endOfMonth(selectedDate);
                    return taskDate >= start && taskDate <= end;
                }
                if (dateView === 'yearly') {
                    if (!task.devStartDate) return false;
                    const taskDate = new Date(task.devStartDate);
                    const start = startOfYear(selectedDate);
                    const end = endOfYear(selectedDate);
                    return taskDate >= start && taskDate <= end;
                }
                return true;
                })();
                
                const deploymentMatch = deploymentFilter.length === 0 || deploymentFilter.every(filter => {
                const isNegative = filter.startsWith('not_');
                const env = isNegative ? filter.substring(4) : filter;
                const isDeployed = task.deploymentStatus?.[env] ?? false;
                return isNegative ? !isDeployed : isDeployed;
                });

                return statusMatch && repoMatch && searchMatch && dateMatch && deploymentMatch && tagsMatch;
            });

            const sorted = [...results].sort((a, b) => {
                const [sortBy, sortDirection] = sortDescriptor.split('-');
                const taskStatuses = uiConfig?.taskStatuses || [];

                if (sortBy === 'title') {
                    if (sortDirection === 'asc') return a.title.localeCompare(b.title);
                    return b.title.localeCompare(a.title);
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
            setSearchError(null);
            
            const mode = getAuthMode();
            if (mode === 'authenticate') {
                const activeCompanyId = getActiveCompanyId();
                if (!activeCompanyId || !isInitialSyncComplete(activeCompanyId)) {
                    return;
                }
            }
            
            setHasInitialized(true);
        } catch (e) {
            console.error("Filtering logic failed:", e);
            setSearchError("Search temporarily unavailable. Please try again later.");
        } finally {
            // Artificial delay to make transition smooth and visible
            setTimeout(() => {
                setIsSearching(false);
                window.dispatchEvent(new Event('sync-end'));
            }, 300);
        }
    };

    const rafId = requestAnimationFrame(filterAndProcess);
    return () => cancelAnimationFrame(rafId);
  }, [tasks, statusFilter, repoFilter, tagsFilter, developers, testers, executedSearchQuery, dateView, selectedDate, deploymentFilter, favoritesOnly, sortDescriptor, uiConfig, viewMode, isUserLoading, mounted]);

  const handleExport = useCallback((exportType: 'current_view' | 'all_tasks') => {
    const allDevelopers = getDevelopers();
    const allTesters = getTesters();
    const currentUiConfig = getUiConfig();
    const customFieldDefinitions = currentUiConfig.fields.filter(f => f.isCustom);

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
    const devIdToName = new Map(allDevelopers.map(d => [d.id, d.name]));
    const testerIdToName = new Map(allTesters.map(t => [t.id, t.name]));
    
    const mapPersonIdsToNames = (task: Task) => {
        const { developers, testers, ...restOfTask } = task;
        return {
            ...restOfTask,
            isFavorite: task.isFavorite || false,
            developers: (developers || []).map(id => devIdToName.get(id)).filter((name): name is string => !!name),
            testers: (testers || []).map(id => testerIdToName.get(id)).filter((name): name is string => !!name),
        };
    };

    const activeTasksWithNames = activeTasksToExport.map(mapPersonIdsToNames);
    const binnedTasksWithNames = binnedTasksToExport.map(mapPersonIdsToNames);

    const cleanPerson = (p: Person) => ({ name: p.name, email: p.email || '', phone: p.phone || '', additionalFields: p.additionalFields || [] });

    const exportData: any = {
        appName: currentUiConfig.appName,
        appIcon: currentUiConfig.appIcon,
        repositoryConfigs: currentUiConfig.repositoryConfigs,
        environments: currentUiConfig.environments,
        customFieldDefinitions: customFieldDefinitions,
        developers: allDevelopers.map(cleanPerson),
        testers: allTesters.map(cleanPerson),
        tasks: activeTasksWithNames,
        logs: logsToExport,
    };
    
    if (binnedTasksWithNames.length > 0) {
        exportData.trash = binnedTasksWithNames;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = fileName;
    link.click();
    
    toast({
        variant: 'success',
        title: 'Export Successful',
        description: `${activeTasksToExport.length} active tasks exported.`,
    });
    
    if (exportType === 'all_tasks') {
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    }
  }, [isSelectMode, selectedTaskIds, filteredTasks, toast]);

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
      setDateView(mode);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
      setViewMode(mode);
  }, []);

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
        status: 'preparing',
        progress: 0
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const parsedJson = JSON.parse(text);
            const mode = getAuthMode();

            window.dispatchEvent(new Event('sync-start'));
            triggerTransfer({ id: transferId, filename: file.name, status: 'uploading', progress: 5 });

            try {
                const result = await importWorkspaceData(parsedJson, (progress) => {
                    triggerTransfer({ id: transferId, filename: file.name, status: 'uploading', progress: Math.max(5, progress) });
                });
                
                if (result.success) {
                    triggerTransfer({ id: transferId, filename: file.name, status: 'complete', progress: 100 });
                    if (result.skippedDuplicates.length > 0) {
                        setImportSummary({ 
                            importedCount: result.importedCount, 
                            skippedDuplicates: result.skippedDuplicates 
                        });
                    } else {
                        toast({ 
                            variant: 'success', 
                            title: 'Import Complete', 
                            description: `Successfully imported ${result.importedCount} tasks.` 
                        });
                    }
                }
            } catch (error: any) {
                triggerTransfer({ id: transferId, filename: file.name, status: 'error', progress: 0, error: 'Import failed' });
                toast({ 
                    variant: 'destructive', 
                    title: 'Import Failed', 
                    description: error.message || 'Some tasks could not be imported.' 
                });
            }
            refreshData();
            
        } catch (error: any) {
            console.error("Error importing file:", error);
            triggerTransfer({ id: transferId, filename: file.name, status: 'error', progress: 0, error: 'Invalid format' });
            toast({ variant: 'destructive', title: 'Import Failed', description: "The imported file is invalid or corrupted." });
        } finally {
            if(fileInputRef.current) { fileInputRef.current.value = ''; }
            window.dispatchEvent(new Event('sync-end'));
        }
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

  const handleBulkApplyTags = useCallback(() => {
    addTagsToMultipleTasks(selectedTaskIds, tagsToApply);
    toast({ variant: 'success', title: 'Tags Applied' });
    refreshData();
    setIsTagsDialogOpen(false);
    setTagsToApply([]);
  }, [selectedTaskIds, tagsToApply, toast, refreshData]);

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
  const isSyncing = currentAuthMode === 'authenticate' && (!activeCompanyIdForSync || !isInitialSyncComplete(activeCompanyIdForSync));
  const activeSkeletons = !mounted || isLoading || isSearching || isUserLoading || isSyncing || !hasInitialized;

  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const devsById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]).map(([id, name]) => [id, { id, name } as Person]));

    const allTasksForSearch = [
        ...tasks.map(t => ({ ...t, isBinned: false })),
        ...getBinnedTasks().map(t => ({ ...t, isBinned: true }))
    ];

    allTasksForSearch.forEach(task => {
        if (fuzzySearch(q, task.title)) {
            suggestions.push({
                id: `task-title-${task.id}`,
                title: task.title,
                subLabel: task.status,
                type: 'task',
                icon: FileText,
                taskId: task.id,
                matchType: 'title',
                isBinned: task.isBinned
            });
            return;
        }

        const matchedDev = task.developers?.find(id => fuzzySearch(q, devsById.get(id) || ''));
        if (matchedDev) {
            suggestions.push({
                id: `task-dev-${task.id}`,
                title: task.title,
                subLabel: `Assigned to: ${devsById.get(matchedDev)}`,
                type: 'user',
                icon: User,
                taskId: task.id,
                matchType: 'user',
                isBinned: task.isBinned
            });
            return;
        }

        const matchedTag = task.tags?.find(t => fuzzySearch(q, t));
        if (matchedTag) {
            suggestions.push({
                id: `task-tag-${task.id}`,
                title: task.title,
                subLabel: `Tagged with: ${matchedTag}`,
                type: 'tag',
                icon: Tag,
                taskId: task.id,
                matchType: 'tag',
                isBinned: task.isBinned
            });
            return;
        }

        const matchedRepo = Array.isArray(task.repositories) && task.repositories.find(r => fuzzySearch(q, r));
        if (matchedRepo) {
            suggestions.push({
                id: `task-repo-${task.id}`,
                title: task.title,
                subLabel: `In Repository: ${matchedRepo}`,
                type: 'repo',
                icon: GitMerge,
                taskId: task.id,
                matchType: 'repo',
                isBinned: task.isBinned
            });
            return;
        }

        if (fuzzySearch(q, task.description)) {
            suggestions.push({
                id: `task-desc-${task.id}`,
                title: task.title,
                subLabel: "Matched in description",
                type: 'task',
                icon: FileText,
                taskId: task.id,
                matchType: 'description',
                isBinned: task.isBinned
            });
        }
    });

    return suggestions.slice(0, 10);
  }, [searchQuery, tasks, developers, testers]);

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

  const totalActiveFilters = statusFilter.length + repoFilter.length + deploymentFilter.length + tagsFilter.length + (executedSearchQuery ? 1 : 0);

  const selectionBarContent = (
    <Card className="border-primary/50 bg-background/90 backdrop-blur-sm shadow-lg overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <Checkbox 
                    id="select-all-tasks" 
                    checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length} 
                    onCheckedChange={handleToggleSelectAll}
                    className="h-5 w-5"
                />
                <Label htmlFor="select-all-tasks" className="text-sm font-semibold whitespace-nowrap cursor-pointer text-foreground">
                    {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} Selected` : `Select All`}
                </Label>
                
                {/* Desktop/Tablet Action buttons pulled to the right */}
                <div className={cn(
                    'hidden md:flex md:flex-row md:items-center items-stretch justify-end gap-2 w-full transition-opacity duration-300 ml-auto', 
                    selectedTaskIds.length > 0 ? 'opacity-100' : 'opacity-40 pointer-events-none'
                )}>
                    <Button id="bulk-tags-trigger" variant="outline" size="sm" onClick={() => setIsTagsDialogOpen(true)} className="font-medium h-10 px-3">
                        <Tag className="mr-2 h-4 w-4" /> Tags
                    </Button>
                    <Button id="bulk-copy-trigger" variant="outline" size="sm" onClick={handleBulkCopyText} className="font-medium h-10 px-3">
                        <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button id="bulk-pdf-trigger" variant="outline" size="sm" onClick={handleBulkExportPdf} className="font-medium h-10 px-3">
                        <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button id="bulk-delete-trigger" variant="destructive" size="sm" className="font-semibold h-10 px-3">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-semibold">Move to Bin?</AlertDialogTitle>
                                <AlertDialogDescription className="font-normal text-sm leading-relaxed">
                                    You are about to move {selectedTaskIds.length} task(s) to the bin. You can restore them for up to 30 days.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 pt-4">
                                <AlertDialogCancel className="font-medium rounded-lg">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 font-bold rounded-lg px-6">
                                    Delete Tasks
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Mobile Action buttons stacked below */}
            <div className={cn(
                'grid grid-cols-2 gap-2 md:hidden transition-opacity duration-300', 
                selectedTaskIds.length > 0 ? 'opacity-100' : 'opacity-40 pointer-events-none'
            )}>
                <Button variant="outline" size="sm" onClick={() => setIsTagsDialogOpen(true)} className="font-medium h-10 px-3">
                    <Tag className="mr-2 h-4 w-4" /> Tags
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkCopyText} className="font-medium h-10 px-3">
                    <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkExportPdf} className="font-medium h-10 px-3">
                    <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="font-semibold h-10 px-3">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-semibold">Move to Bin?</AlertDialogTitle>
                            <AlertDialogDescription className="font-normal text-sm leading-relaxed">
                                You are about to move {selectedTaskIds.length} task(s) to the bin. You can restore them for up to 30 days.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 pt-4">
                            <AlertDialogCancel className="font-medium rounded-lg">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 font-bold rounded-lg px-6">
                                Delete Tasks
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
    </Card>
  );

  const searchInputContent = (
    <div className="relative flex flex-col w-full">
        <div className="relative flex items-center w-full">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input 
                ref={searchInputRef}
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={handleSearchKeyDown}
                className={cn(
                    "w-full pl-10 pr-24 h-11 font-normal transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40",
                    executedSearchQuery && "border-primary/40 bg-primary/5 shadow-sm"
                )}
            />
            <div className="absolute right-0 flex items-center h-full pr-1.5 gap-1">
                {searchQuery && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={clearSearch}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground cursor-help">
                                <span className="text-xs">{commandKey}</span>K
                            </kbd>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <div className="flex items-center gap-2 font-normal">
                                <CornerDownLeft className="h-3 w-3" />
                                <span>Press Enter to search</span>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>

        {isSearchFocused && isSearchActive && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 w-full max-w-[calc(100vw-2rem)] mx-auto sm:max-w-none">
                <div className="px-4 py-2 border-b bg-muted/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Suggestions</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    {searchSuggestions.length > 0 ? (
                        searchSuggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => handleSuggestionClick(suggestion.taskId)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted active:bg-muted/80 transition-colors text-left border-b last:border-0 group"
                            >
                                <div className={cn(
                                    "p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors",
                                    suggestion.type === 'task' ? "text-primary" : 
                                    suggestion.type === 'user' ? "text-amber-500" :
                                    suggestion.type === 'tag' ? "text-green-500" : "text-blue-500"
                                )}>
                                    <suggestion.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{suggestion.title}</p>
                                        {suggestion.isBinned && (
                                            <Badge variant="secondary" className="bg-zinc-500/10 text-zinc-500 border-none h-4 px-1.5 text-[8px] font-bold shrink-0">Bin</Badge>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-tight">{suggestion.subLabel}</p>
                                </div>
                                <ChevronRightIcon className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))
                    ) : (
                        <div className="p-8 text-center animate-in zoom-in-95 duration-300">
                            <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                                <SearchX className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-bold text-foreground/80">No matches found</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Try a different keyword</p>
                        </div>
                    )}
                </div>
                {searchSuggestions.length > 0 && (
                    <div className="p-3 bg-muted/10 text-center border-t">
                        <p className="text-[10px] text-muted-foreground font-medium">Press <span className="font-bold">Enter</span> for all results</p>
                    </div>
                )}
            </div>
        )}
    </div>
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
                        <DialogTitle className="text-xl font-bold tracking-tight">Import Summary</DialogTitle>
                    </div>
                    <DialogDescription className="font-normal text-sm leading-relaxed">
                        Processed {importSummary?.importedCount} tasks successfully. 
                        {importSummary && importSummary.skippedDuplicates.length > 0 && ` ${importSummary.skippedDuplicates.length} items were omitted due to uniqueness constraints.`}
                    </DialogDescription>
                </DialogHeader>
            </div>
            
            <div className="flex-1 overflow-y-auto overscroll-contain px-6">
                <div className="pb-6">
                    {importSummary && importSummary.skippedDuplicates.length > 0 && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
                                <Fingerprint className="h-3 w-3" />
                                Omitted Duplicates
                            </p>
                            <div className="border rounded-2xl bg-muted/20 overflow-hidden shadow-inner">
                                <div className="divide-y divide-border/50">
                                    {importSummary.skippedDuplicates.map((item, i) => (
                                        <div key={i} className="p-3 bg-background/50 hover:bg-background transition-colors">
                                            <p className="text-sm font-bold truncate">{item.taskTitle}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-0.5">
                                                Duplicate {item.field}: <span className="text-primary font-bold">{item.value}</span>
                                            </p>
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
                        <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase text-[10px] font-black tracking-widest">Action Required</Badge>
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Resolve Duplicate Conflicts</DialogTitle>
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
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                                    {group.fieldLabel}: <span className="text-foreground">{group.value}</span>
                                </h3>
                            </div>
                            <div className="grid gap-3">
                                {group.tasks.map(task => (
                                    <Card key={task.id} className="border-muted/60 bg-muted/5 hover:bg-muted/10 transition-all">
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold truncate">{task.title}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-0.5">
                                                    Added {format(new Date(task.createdAt), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest px-3 rounded-lg"
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
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest hidden sm:block">
                    {existingDuplicates.length} Conflict Group(s) Remaining
                </p>
                <Button onClick={() => setIsResolutionOpen(false)} className="w-full sm:w-auto px-8 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg rounded-xl">
                    I'll Resolve Later
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center md:mb-6 gap-6">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tasks</h1>
                <Badge variant="outline" className={cn(mounted && currentAuthMode === 'authenticate' ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground", "h-6 px-3 text-[10px] font-medium uppercase tracking-wider")}>
                    {mounted ? (currentAuthMode === 'authenticate' ? 'Cloud Sync' : 'Local Storage') : 'Verifying...'}
                </Badge>
            </div>
            {uiConfig?.appName && <p className="text-muted-foreground text-sm font-medium">{uiConfig.appName}</p>}
        </div>
        
        <div className="flex flex-col items-stretch sm:items-center sm:flex-row gap-3 w-full md:w-auto">
            <Dialog open={showTutorialPrompt} onOpenChange={(open) => {
                if (!open) {
                    updateUserPreferences({ tutorialSeen: true });
                }
                setShowTutorialPrompt(open);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center text-center">
                        <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                           <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-semibold">Welcome!</DialogTitle>
                        <DialogDescription className="font-normal">
                            Start with a quick tour now, and use the compass tutorial button on each page anytime you want page-specific guidance.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-row justify-center sm:justify-center gap-2 pt-4">
                        <Button variant="ghost" onClick={() => {
                            setShowTutorialPrompt(false);
                            updateUserPreferences({ tutorialSeen: true });
                        }} className="font-normal">Maybe later</Button>
                        <Button onClick={() => {
                            setShowTutorialPrompt(false);
                            updateUserPreferences({ tutorialSeen: true });
                            startTutorial();
                        }} className="font-medium">Start Tutorial</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {uiConfig?.remindersEnabled && (pinnedTaskIds.length + generalReminders.length) > 0 && (
              <Button 
                variant="outline" 
                className="h-11 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 transition-all w-full sm:w-auto font-medium" 
                onClick={() => setIsReminderStackOpen(true)}
              >
                <BellRing className="mr-2 h-4 w-4 shrink-0" />
                 <span className="truncate">Important Reminders</span>
                <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none shadow-none font-medium">{pinnedTaskIds.length + generalReminders.length}</Badge>
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button id="home-export-trigger" variant="outline" size="sm" className="w-full sm:w-auto h-11 font-medium">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleExport('current_view')} className="font-normal">Export Current View</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleExport('all_tasks')} className="font-normal">Export All Tasks</DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleDownloadTemplate} className="font-normal">Download Import Template</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button id="home-import-trigger" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto h-11 font-medium">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                
                <Button onClick={handleNavigateNewTask} id="new-task-btn" className="w-full sm:w-auto h-11 shadow-lg font-medium active:scale-95 transition-transform">
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
                                  <Download className="h-4 w-4" /> Export
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-[calc(100vw-3rem)]">
                              <DropdownMenuItem onSelect={() => handleExport('current_view')}>Export Current View</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleExport('all_tasks')}>Export All Tasks</DropdownMenuItem>
                              <DropdownMenuItem onSelect={handleDownloadTemplate}>Download Template</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="h-11 rounded-xl shadow-sm font-semibold gap-2"
                      >
                          <Upload className="h-4 w-4" /> Import
                      </Button>
                  </div>

                  {/* 2. Filters Toggle Button */}
                  <div className="px-1">
                      <Button 
                        variant="secondary" 
                        className="w-full flex items-center justify-between h-12 px-4 font-semibold shadow-sm border rounded-xl"
                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                      >
                        <span className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                            {(statusFilter.length > 0 || repoFilter.length > 0 || deploymentFilter.length > 0 || tagsFilter.length > 0) && (
                                <Badge className="bg-primary text-primary-foreground h-5 px-1.5 min-w-5 font-bold">
                                    {statusFilter.length + repoFilter.length + deploymentFilter.length + tagsFilter.length}
                                </Badge>
                            )}
                        </span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isFiltersOpen && "rotate-180")} />
                      </Button>

                      {/* Filter Grid - Mobile Positioning Fix (Directly below trigger) */}
                      <div className={cn(
                          "transition-all duration-300 overflow-hidden mt-2",
                          isFiltersOpen ? "opacity-100 max-h-[1000px] mb-4" : "opacity-0 max-h-0 pointer-events-none"
                      )}>
                        <Card className="border shadow-lg bg-card">
                            <CardContent className="p-4 space-y-4">
                                <MultiSelect 
                                    selected={statusFilter} 
                                    className={cn(statusFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
                                    onChange={(val) => { setIsSearching(true); setStatusFilter(val); }} 
                                    options={getSortedStatusOptions(uiConfig).map(option => ({ value: option.value, label: option.label }))} 
                                    placeholder="Status..." 
                                />
                                <MultiSelect 
                                    selected={repoFilter} 
                                    className={cn(repoFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
                                    onChange={(val) => { setIsSearching(true); setRepoFilter(val); }} 
                                    options={(uiConfig?.repositoryConfigs || []).map(r => ({ value: r.name, label: r.name }))} 
                                    placeholder="Repository..." 
                                />
                                {(uiConfig?.fields || []).find(f => f.key === 'tags')?.isActive && (
                                    <MultiSelect 
                                        selected={tagsFilter} 
                                        className={cn(tagsFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
                                        onChange={(val) => { setIsSearching(true); setTagsFilter(val); }} 
                                        options={[...new Set(tasks.flatMap(t => t.tags || []))].map(t => ({value: t, label: t}))} 
                                        placeholder="Tags..." 
                                    />
                                )}
                                <MultiSelect 
                                    selected={deploymentFilter} 
                                    className={cn(deploymentFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")}
                                    onChange={(val) => { setIsSearching(true); setDeploymentFilter(val); }} 
                                    options={(uiConfig?.environments || []).flatMap(env => [{ value: env.name, label: `On ${env.name}` }, { value: `not_${env.name}`, label: `Not on ${env.name}` }])} 
                                    placeholder="Deployment..." 
                                />
                            </CardContent>
                        </Card>
                      </div>
                  </div>

                  {/* 3. Date navigation (if monthly/yearly) */}
                  {(dateView === 'monthly' || dateView === 'yearly') && !favoritesOnly && (
                      <div className="flex items-center justify-between gap-2 w-full px-1">
                          <Button variant="outline" size="icon" onClick={handlePreviousDate} className="h-11 w-11 shrink-0 shadow-sm rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" className="text-sm font-bold flex-1 h-11 shadow-sm rounded-xl">
                                      {dateView === 'monthly' ? format(selectedDate, 'MMMM yyyy') : format(selectedDate, 'yyyy')}
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

                                      {dateView === 'monthly' && (
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

                  {/* 4. Results heading */}
                  <div className="px-2">
                      <h2 className="text-xl font-bold tracking-tight text-foreground/90 leading-tight">
                          {favoritesOnly ? 'Favorite Tasks' : `${filteredTasks.length} Results`}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-0.5 whitespace-nowrap">
                          {favoritesOnly 
                              ? `Showing ${filteredTasks.length} favorited items.` 
                              : (dateView === 'all' ? 'Based on active filters.' : dateView === 'monthly' ? `Start date in ${format(selectedDate, 'MMM yyyy')}` : `Start date in ${format(selectedDate, 'yyyy')}`)}
                      </p>
                  </div>

                  {/* 5. Sort & View toggles row */}
                  <div className="flex items-center gap-2 w-full px-1 overflow-x-auto no-scrollbar pb-1">
                      <Select value={sortDescriptor} onValueChange={handleSortChange}>
                          <SelectTrigger className="flex-1 min-w-[140px] h-11 font-bold rounded-xl shadow-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="status-asc" className="font-bold">Status (Asc)</SelectItem>
                              <SelectItem value="status-desc" className="font-bold">Status (Desc)</SelectItem>
                              <SelectItem value="title-asc" className="font-bold">Title (A-Z)</SelectItem>
                              <SelectItem value="title-desc" className="font-bold">Title (Z-A)</SelectItem>
                          </SelectContent>
                      </Select>

                      <div className="flex h-11 items-center justify-center rounded-xl bg-muted/50 p-1 border shadow-sm shrink-0">
                          <button
                              onClick={() => handleDateViewChange('all')}
                              className={cn(
                                  "inline-flex items-center justify-center h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                  dateView === 'all' ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                              )}
                          >
                              All
                          </button>
                          <button
                              onClick={() => handleDateViewChange('monthly')}
                              className={cn(
                                  "inline-flex items-center justify-center h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                  dateView === 'monthly' ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                              )}
                          >
                              Monthly
                          </button>
                      </div>
                  </div>

                  {/* 6. Favourites / Select Toggle row */}
                  <div className="flex items-center gap-2 px-1 w-full">
                      <Button 
                          variant={favoritesOnly ? 'secondary' : 'outline'} 
                          size="icon" 
                          onClick={handleFavoritesToggle} 
                          className="h-11 w-11 rounded-xl shadow-sm shrink-0"
                      >
                          <Heart className={cn("h-5 w-5", favoritesOnly && "fill-red-500 text-red-500")} />
                      </Button>

                      <Button 
                          variant={isSelectMode ? 'secondary' : 'outline'} 
                          onClick={handleToggleSelectMode} 
                          className={cn(
                              "flex-1 h-11 rounded-xl shadow-sm transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest",
                              isSelectMode ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground"
                          )}
                      >
                          {isSelectMode ? (
                              <>
                                  <X className="h-4 w-4 mr-2" />
                                  CANCEL
                              </>
                          ) : (
                              <>
                                  <CheckSquare className="h-4 w-4 mr-2" />
                                  SELECT MULTIPLE
                              </>
                          )}
                      </Button>
                  </div>

                  {/* 6.5 STRICT FIX: Select Multiple actions container (Mobile Only) */}
                  {isSelectMode && (
                      <div className="px-1 animate-in slide-in-from-top-2 duration-300">
                          {selectionBarContent}
                      </div>
                  )}

                  {/* 7. Search Input Field */}
                  <div className="px-1 animate-in fade-in slide-in-from-top-2 duration-500">
                      {searchInputContent}
                  </div>
              </div>

              {/* DESKTOP FILTER BAR - Restored to be persistently visible */}
              <div className="hidden md:block overflow-visible mb-4">
                <Card id="task-filters" className="border-none bg-transparent overflow-visible">
                    <CardContent className="p-0 overflow-visible">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="hidden md:flex flex-col w-full col-span-1 sm:col-span-2 md:col-span-1">
                                {searchInputContent}
                            </div>
                            <MultiSelect selected={statusFilter} className={cn(statusFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")} onChange={(val) => { setIsSearching(true); setStatusFilter(val); }} options={getSortedStatusOptions(uiConfig).map(option => ({ value: option.value, label: option.label }))} placeholder="Status..." />
                            <MultiSelect selected={repoFilter} className={cn(repoFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")} onChange={(val) => { setIsSearching(true); setRepoFilter(val); }} options={(uiConfig?.repositoryConfigs || []).map(r => ({ value: r.name, label: r.name }))} placeholder="Repository..." />
                            {(uiConfig?.fields || []).find(f => f.key === 'tags')?.isActive && (
                                <MultiSelect selected={tagsFilter} className={cn(tagsFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")} onChange={(val) => { setIsSearching(true); setTagsFilter(val); }} options={[...new Set(tasks.flatMap(t => t.tags || []))].map(t => ({value: t, label: t}))} placeholder="Tags..." />
                            )}
                            <MultiSelect selected={deploymentFilter} className={cn(deploymentFilter.length > 0 && "border-primary/40 bg-primary/5 shadow-sm")} onChange={(val) => { setIsSearching(true); setDeploymentFilter(val); }} options={(uiConfig?.environments || []).flatMap(env => [{ value: env.name, label: `On ${env.name}` }, { value: `not_${env.name}`, label: `Not on ${env.name}` }])} placeholder="Deployment..." />
                        </div>
                    </CardContent>
                </Card>
              </div>
          </div>
          
           {searchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Search failed</AlertTitle>
                    <AlertDescription className="font-normal">{searchError}</AlertDescription>
                </Alert>
           )}

           <div className="flex flex-col gap-4">
                <div className="hidden md:flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center md:justify-between gap-4 md:gap-6">
                    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-4 md:gap-6">
                        {(dateView === 'monthly' || dateView === 'yearly') && !favoritesOnly && (
                            <div className="hidden md:flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                                <Button variant="outline" size="icon" onClick={handlePreviousDate} className="h-11 w-11 shrink-0 shadow-sm rounded-xl active:scale-95 transition-transform"><ChevronLeft className="h-5 w-5" /></Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="text-base font-bold flex-1 sm:w-48 whitespace-nowrap h-11 shadow-sm rounded-xl tracking-tight">
                                            {dateView === 'monthly' ? format(selectedDate, 'MMMM yyyy') : format(selectedDate, 'yyyy')}
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

                                            {dateView === 'monthly' && (
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
                        
                        <div className="hidden md:block px-1 md:px-0">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold tracking-tight text-foreground/90 leading-tight">
                                    {favoritesOnly ? 'Favorite Tasks' : `${filteredTasks.length} Results`}
                                </h2>
                                {totalActiveFilters > 0 && (
                                    <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-5 px-2 text-[10px] font-black uppercase tracking-wider rounded-full">
                                            {totalActiveFilters} {totalActiveFilters === 1 ? 'Filter' : 'Filters'} Active
                                        </Badge>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => {
                                                setIsSearching(true);
                                                setStatusFilter([]);
                                                setRepoFilter([]);
                                                setDeploymentFilter([]);
                                                setTagsFilter([]);
                                                setSearchQuery('');
                                                setExecutedSearchQuery('');
                                            }}
                                            className="h-5 px-1.5 text-[9px] font-bold uppercase tracking-tight text-muted-foreground hover:text-destructive transition-colors rounded-md"
                                        >
                                            <X className="h-3 w-3 mr-1" />
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5 whitespace-nowrap">
                                {favoritesOnly 
                                    ? `Showing ${filteredTasks.length} favorited items.` 
                                    : (dateView === 'all' ? 'Based on active filters.' : dateView === 'monthly' ? `Start date in ${format(selectedDate, 'MMM yyyy')}` : `Start date in ${format(selectedDate, 'yyyy')}`)}
                            </p>
                        </div>
                    </div>

                    <div id="view-mode-toggle" className="flex flex-col md:flex-row md:flex-wrap items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 w-full md:auto overflow-x-auto md:overflow-visible md:flex-wrap pb-1 no-scrollbar md:pb-0">
                            <Select value={sortDescriptor} onValueChange={handleSortChange}>
                                <SelectTrigger className="flex-1 min-w-[140px] sm:w-[180px] h-11 font-bold rounded-xl shadow-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="status-asc" className="font-bold">Status (Asc)</SelectItem>
                                    <SelectItem value="status-desc" className="font-bold">Status (Desc)</SelectItem>
                                    <SelectItem value="title-asc" className="font-bold">Title (A-Z)</SelectItem>
                                    <SelectItem value="title-desc" className="font-bold">Title (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="hidden md:flex h-11 items-center justify-center rounded-xl bg-muted/50 p-1 border shadow-sm shrink-0">
                                <button
                                    onClick={() => handleDateViewChange('all')}
                                    className={cn(
                                        "flex-1 md:flex-none inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
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
                                        "flex-1 md:flex-none inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        dateView === 'monthly' 
                                            ? "bg-background text-primary shadow-sm ring-1 ring-black/5" 
                                            : "text-muted-foreground hover:bg-background/50"
                                    )}
                                >
                                    Monthly
                                </button>
                            </div>

                            <div className="hidden md:flex h-11 items-center justify-center rounded-xl bg-muted p-1 border shadow-sm">
                                <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' && 'bg-card text-foreground shadow-sm')} onClick={() => handleViewModeChange('grid')}><LayoutGrid className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === 'table' && 'bg-card text-foreground shadow-sm')} onClick={() => handleViewModeChange('table')}><List className="h-4 w-4" /></Button>
                            </div>
                            
                            <div className="hidden md:flex items-center gap-2">
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
                                        <TooltipContent className="font-bold"><p>{favoritesOnly ? 'All tasks' : 'Favorites only'}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

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
                                    {isSelectMode ? <X className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DESKTOP/TABLET SELECTION BAR - Positioned below the control row */}
                {isSelectMode && (
                    <div className="hidden md:block animate-in slide-in-from-top-2 duration-300">
                        {selectionBarContent}
                    </div>
                )}
            </div>
            
            <div className="relative">
                <div className={cn(
                    "transition-all duration-500",
                    isSearching ? "opacity-40 grayscale-[0.5] blur-[0.5px]" : "opacity-100"
                )}>
                    {(filteredTasks.length > 0 || activeSkeletons) ? (
                        <div>
                        {viewMode === 'grid' ? (
                            <TasksGrid tasks={filteredTasks} onTaskDelete={refreshData} onTaskUpdate={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} pinnedTaskIds={pinnedTaskIds} onPinToggle={handlePinToggle} currentQueryString={searchParams.toString()} favoritesOnly={favoritesOnly} isLoading={activeSkeletons} />
                        ) : (
                            <TasksTable tasks={filteredTasks} onTaskDelete={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} currentQueryString={searchParams.toString()} favoritesOnly={favoritesOnly} isLoading={activeSkeletons} />
                        )}
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
                    Select tags to apply to the **{selectedTaskIds.length}** selected task(s).
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
                <Button variant="ghost" onClick={() => setIsTagsDialogOpen(false)} className="font-medium">Cancel</Button>
                <Button onClick={handleBulkApplyTags} disabled={tagsToApply.length === 0} className="font-bold px-6">
                    Apply to {selectedTaskIds.length} Tasks
                </Button>
            </DialogFooter>
        </DialogContent>
     </Dialog>
    </div>
  );
}
