

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getTasks, addTask, addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester, updateDeveloper, updateTester, updateUiConfig, moveMultipleTasksToBin, getBinnedTasks, getAppData, setAppData, getLogs, addLog, restoreMultipleTasks, clearExpiredReminders, deleteGeneralReminder, getGeneralReminders, addTagsToMultipleTasks, addEnvironment } from '@/lib/data';
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { INITIAL_REPOSITORY_CONFIGS } from '@/lib/constants';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Calendar as CalendarIcon,
  Download,
  Upload,
  FolderSearch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  CheckSquare,
  Copy,
  X,
  HelpCircle,
  History,
  Heart,
  StickyNote,
  PinOff,
  BellRing,
  MoreVertical,
  GraduationCap,
  Tag,
  CalendarDays,
} from 'lucide-react';
import { cn, fuzzySearch, formatTimestamp } from '@/lib/utils';
import type { Task, Person, UiConfig, RepositoryConfig, FieldConfig, Log, GeneralReminder, BackupFrequency, Environment } from '@/lib/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  subYears,
  addYears,
  setMonth,
  getYear,
  set,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useActiveCompany } from '@/hooks/use-active-company';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { taskSchema } from '@/lib/validators';
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
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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


type ViewMode = 'grid' | 'table';
type DateView = 'all' | 'monthly' | 'yearly';

const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
const TUTORIAL_PROMPTED_KEY = 'taskflow_tutorial_prompted';
const LAST_BACKUP_KEY = 'taskflow_last_auto_backup';

const FILTER_STORAGE_KEYS = {
    search: 'taskflow_filter_searchQuery',
    status: 'taskflow_filter_status',
    repo: 'taskflow_filter_repo',
    deployment: 'taskflow_filter_deployment',
    date: 'taskflow_filter_date',
    favorites: 'taskflow_filter_favoritesOnly',
    tags: 'taskflow_filter_tags',
};

// Helper function to safely get item from localStorage
const getInitialStateFromStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    const savedValue = localStorage.getItem(key);
    if (savedValue && savedValue !== 'undefined') {
        try {
            return JSON.parse(savedValue);
        } catch (e) {
            console.error(`Failed to parse ${key} from localStorage`, e);
            return defaultValue;
        }
    }
    return defaultValue;
};

const getInitialDateView = (): DateView => {
    if (typeof window !== 'undefined') {
        const savedValue = localStorage.getItem('taskflow_date_view');
        // Handle old format (plain string) and new format (JSON string)
        if (savedValue) {
            try {
                const parsed = JSON.parse(savedValue);
                if (['all', 'monthly', 'yearly'].includes(parsed)) {
                    return parsed;
                }
            } catch {
                // It's likely a plain string from the old version
                if (['all', 'monthly', 'yearly'].includes(savedValue)) {
                    return savedValue as DateView;
                }
            }
        }
    }
    return 'all';
}


export default function Home() {
  const activeCompanyId = useActiveCompany();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [generalReminders, setGeneralReminders] = useState<GeneralReminder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(() => getInitialStateFromStorage(FILTER_STORAGE_KEYS.status, []));
  const [repoFilter, setRepoFilter] = useState<string[]>(() => getInitialStateFromStorage(FILTER_STORAGE_KEYS.repo, []));
  const [deploymentFilter, setDeploymentFilter] = useState<string[]>(() => getInitialStateFromStorage(FILTER_STORAGE_KEYS.deployment, []));
  const [searchQuery, setSearchQuery] = useState(() => getInitialStateFromStorage(FILTER_STORAGE_KEYS.search, ''));
  const [tagsFilter, setTagsFilter] = useState<string[]>(() => getInitialStateFromStorage(FILTER_STORAGE_KEYS.tags, []));
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(() => {
    const savedDate = getInitialStateFromStorage<{from?: string; to?: string} | undefined>(FILTER_STORAGE_KEYS.date, undefined);
    if (savedDate?.from) {
        return {
            from: new Date(savedDate.from),
            to: savedDate.to ? new Date(savedDate.to) : undefined,
        };
    }
    return undefined;
  });
  const [sortDescriptor, setSortDescriptor] = useState('status-asc');
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { prompt } = useUnsavedChanges();
  
  const [dateView, setDateView] = useState<DateView>(getInitialDateView);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['priority', 'completed', 'other', 'hold']);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(() => getInitialStateFromStorage(FILTER_STORAGE_KEYS.favorites, false));
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [isReminderStackOpen, setIsReminderStackOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [commandKey, setCommandKey] = useState('Ctrl');
  
  const { startTutorial } = useTutorial();
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [tagsToApply, setTagsToApply] = useState<string[]>([]);

  const previousDateViewRef = useRef<DateView>('all');

  const handlePreviousDate = () => {
      if (dateView === 'monthly') {
          setSelectedDate(subMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(subYears(selectedDate, 1));
      }
  };
  const handleNextDate = () => {
      if (dateView === 'monthly') {
          setSelectedDate(addMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(addYears(selectedDate, 1));
      }
  };

  const refreshData = () => {
    if (activeCompanyId) {
        setTasks(getTasks());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        setGeneralReminders(getGeneralReminders());
        const config = getUiConfig();
        setUiConfig(config);
        document.title = config.appName || 'My Task Manager';
        setSelectedTaskIds([]);
    }
  };
  
  // Save filters to localStorage whenever they change
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.search, JSON.stringify(searchQuery)); }, [searchQuery]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.status, JSON.stringify(statusFilter)); }, [statusFilter]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.repo, JSON.stringify(repoFilter)); }, [repoFilter]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.deployment, JSON.stringify(deploymentFilter)); }, [deploymentFilter]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.date, JSON.stringify(dateFilter)); }, [dateFilter]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.favorites, JSON.stringify(favoritesOnly)); }, [favoritesOnly]);
  useEffect(() => { localStorage.setItem(FILTER_STORAGE_KEYS.tags, JSON.stringify(tagsFilter)); }, [tagsFilter]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        setCommandKey(navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl');
        
        // Restore state on initial load
        const navStateRaw = sessionStorage.getItem('taskflow_nav_state');
        if (navStateRaw) {
            try {
                const navState = JSON.parse(navStateRaw);
                if (navState.view) setDateView(navState.view);
                if (navState.date) setSelectedDate(new Date(navState.date));
                // Clear the state after using it to prevent it from affecting future navigations
                sessionStorage.removeItem('taskflow_nav_state');
            } catch (e) {
                console.error("Could not parse navigation state:", e);
                sessionStorage.removeItem('taskflow_nav_state');
            }
        }
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

  const getDeploymentScore = (task: Task) => {
    // The order of importance for sorting
    const deploymentOrder = ['production', 'stage', 'dev'];
    for (let i = 0; i < deploymentOrder.length; i++) {
      const env = deploymentOrder[i];
      if (task.deploymentStatus?.[env]) {
        // Higher score for more important environments
        return deploymentOrder.length - i;
      }
    }
    return 0; // No deployment
  };

  const filteredTasks = tasks.filter((task: Task) => {
    if (favoritesOnly && !task.isFavorite) {
      return false;
    }

    const statusMatch = statusFilter.length === 0 || statusFilter.includes(task.status);
    
    const repoMatch = repoFilter.length === 0 || (Array.isArray(task.repositories) && task.repositories?.some(repo => repoFilter.includes(repo)) || false);

    const tagsMatch = tagsFilter.length === 0 || (task.tags?.some(tag => tagsFilter.includes(tag)) ?? false);

    const developersById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]));

    const searchMatch =
      searchQuery.trim() === '' ||
      fuzzySearch(searchQuery, task.title) ||
      fuzzySearch(searchQuery, task.description) ||
      fuzzySearch(searchQuery, task.id) ||
      (task.azureWorkItemId && fuzzySearch(searchQuery, task.azureWorkItemId)) ||
      task.developers?.some((devId) => fuzzySearch(searchQuery, developersById.get(devId) || '')) ||
      task.testers?.some((testerId) => fuzzySearch(searchQuery, testersById.get(testerId) || '')) ||
      (Array.isArray(task.repositories) && task.repositories?.some((repo) => fuzzySearch(searchQuery, repo)));

    const dateMatch = (() => {
      if (dateView === 'all') {
          // Date range picker logic for 'all' view
          if (!dateFilter?.from) return true;
          if (!task.devStartDate) return false;
          const taskDate = new Date(task.devStartDate);
          const from = startOfDay(dateFilter.from);
          const to = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from);
          return taskDate >= from && taskDate <= to;
      }
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

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const [sortBy, sortDirection] = sortDescriptor.split('-');
    const taskStatuses = uiConfig?.taskStatuses || [];

    if (sortBy === 'title') {
      if (sortDirection === 'asc') {
        return a.title.localeCompare(b.title);
      } else {
        return b.title.localeCompare(a.title);
      }
    }

    if (sortBy === 'status') {
      const aIndex = taskStatuses.indexOf(a.status);
      const bIndex = taskStatuses.indexOf(b.status);
      if (sortDirection === 'asc') {
        return aIndex - bIndex;
      } else {
        return bIndex - aIndex;
      }
    }

    if (sortBy === 'deployment') {
      const scoreA = getDeploymentScore(a);
      const scoreB = getDeploymentScore(b);
      const aIndex = taskStatuses.indexOf(a.status); // Fallback for equal scores

      if (sortDirection === 'asc') {
        return scoreA - scoreB;
      } else {
        return scoreB - aIndex;
      }
    }

    return 0;
  });

  const handleExport = useCallback((exportType: 'current_view' | 'all_tasks') => {
    const allDevelopers = getDevelopers();
    const allTesters = getTesters();
    const currentUiConfig = getUiConfig();
    const customFieldDefinitions = currentUiConfig.fields.filter(f => f.isCustom);

    const appNamePrefix = currentUiConfig.appName?.replace(/\s+/g, '_') || 'MyTaskManager';
    const dateSuffix = format(new Date(), "do MMM yyyy");
    const fileName = `${appNamePrefix} ${dateSuffix}.json`;

    let activeTasksToExport: Task[] = [];
    let binnedTasksToExport: Task[] = [];
    let logsToExport: Log[] = [];

    if (exportType === 'all_tasks') {
        activeTasksToExport = getTasks();
        binnedTasksToExport = getBinnedTasks();
        logsToExport = getLogs();
    } else { // 'current_view'
        activeTasksToExport = isSelectMode && selectedTaskIds.length > 0
            ? getTasks().filter(t => selectedTaskIds.includes(t.id))
            : sortedTasks;
        
        const taskIdsInView = new Set(activeTasksToExport.map(t => t.id));
        const allLogs = getLogs();
        logsToExport = allLogs.filter(log => log.taskId && taskIdsInView.has(log.taskId));
    }
    
    if (activeTasksToExport.length === 0 && binnedTasksToExport.length === 0) {
        toast({
            variant: 'warning',
            title: 'Nothing to Export',
            description: 'There are no tasks in the current view to export.',
        });
        return;
    }

    const allTasksForPeopleMapping = [...activeTasksToExport, ...binnedTasksToExport];
    
    const devIdsInExport = new Set<string>();
    const testerIdsInExport = new Set<string>();
    allTasksForPeopleMapping.forEach(task => {
        (task.developers || []).forEach(id => devIdsInExport.add(id));
        (task.testers || []).forEach(id => testerIdsInExport.add(id));
    });

    const developersToExport = allDevelopers.filter(d => devIdsInExport.has(d.id));
    const testersToExport = allTesters.filter(t => testerIdsInExport.has(t.id));

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
        developers: developersToExport.map(cleanPerson),
        testers: testersToExport.map(cleanPerson),
        tasks: activeTasksWithNames,
        logs: logsToExport,
    };
    
    if (binnedTasksWithNames.length > 0) {
        exportData.trash = binnedTasksWithNames;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
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
  }, [isSelectMode, selectedTaskIds, sortedTasks, toast]);

  useEffect(() => {
    if (!activeCompanyId) return;

    const config = getUiConfig();
    if (!config.tutorialEnabled) {
      localStorage.removeItem(TUTORIAL_PROMPTED_KEY);
    } else {
      const tutorialPrompted = localStorage.getItem(TUTORIAL_PROMPTED_KEY);
      if (!tutorialPrompted) {
        setTimeout(() => setShowTutorialPrompt(true), 1000);
      }
    }
    
    const savedViewMode = localStorage.getItem('taskflow_view_mode') as ViewMode;
    if (savedViewMode) setViewMode(savedViewMode);

    const savedSelectedDate = localStorage.getItem('taskflow_selected_date');
    if (savedSelectedDate) setSelectedDate(new Date(savedSelectedDate));

    const savedOpenGroups = localStorage.getItem('taskflow_open_groups');
    if (savedOpenGroups) {
      setOpenGroups(JSON.parse(savedOpenGroups));
    }
    
    const savedPinnedTasks = localStorage.getItem(PINNED_TASKS_STORAGE_KEY);
    if (savedPinnedTasks) {
      setPinnedTaskIds(JSON.parse(savedPinnedTasks));
    }
    
    const savedSortDescriptor = localStorage.getItem('taskflow_sort_descriptor');
    if (savedSortDescriptor) {
        setSortDescriptor(savedSortDescriptor);
    }
    
    // Reminder clearing logic
    const { updatedTaskIds, unpinnedTaskIds } = clearExpiredReminders();
    if (updatedTaskIds.length > 0) {
        toast({ title: `${updatedTaskIds.length} reminder(s) expired and were cleared.` });
        if (unpinnedTaskIds.length > 0) {
            const currentPinned = JSON.parse(localStorage.getItem(PINNED_TASKS_STORAGE_KEY) || '[]');
            const newPinned = currentPinned.filter((id: string) => !unpinnedTaskIds.includes(id));
            setPinnedTaskIds(newPinned);
            localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinned));
        }
    }

    refreshData();
    setIsLoading(false);
    
    const storageHandler = () => {
        refreshData();
    };

    window.addEventListener('storage', storageHandler);
    window.addEventListener('config-changed', storageHandler);
    window.addEventListener('company-changed', storageHandler);
    
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('config-changed', storageHandler);
      window.removeEventListener('company-changed', storageHandler);
    };
  }, [activeCompanyId, toast]);
  
  // Single effect for automatic backup logic
  useEffect(() => {
    if (isLoading || !uiConfig) return; // Don't run backup logic while still loading initial data
    
    const backupFrequency = uiConfig.autoBackupFrequency || 'off';
    if (backupFrequency === 'off') return;

    const lastBackupStr = localStorage.getItem(LAST_BACKUP_KEY);
    const now = new Date();
    
    let nextBackupDate: Date;
    
    if (!lastBackupStr) {
        // This is the first time the user is using the app with this feature.
        // Schedule the first backup for the *next* designated time.
        nextBackupDate = new Date(now);
    } else {
        nextBackupDate = new Date(lastBackupStr);
    }

    const backupHour = uiConfig.autoBackupTime ?? 6;
    let scheduleBackup = false;

    if (!lastBackupStr) {
        // First backup logic: set it for the next upcoming backup time.
        let firstBackupDate = new Date(now);
        firstBackupDate.setHours(backupHour, 0, 0, 0);
        if (now >= firstBackupDate) {
            // If the time has passed for today, schedule for tomorrow.
            firstBackupDate.setDate(firstBackupDate.getDate() + 1);
        }
        nextBackupDate = firstBackupDate;
        // Don't trigger a backup immediately, just set the date for the next check.
        // The backup will happen on the next app load *after* this scheduled time.
    } else {
        let proposedNextDate = new Date(lastBackupStr);
        switch (backupFrequency) {
            case 'daily': proposedNextDate.setDate(proposedNextDate.getDate() + 1); break;
            case 'weekly': proposedNextDate.setDate(proposedNextDate.getDate() + 7); break;
            case 'monthly': proposedNextDate = addMonths(proposedNextDate, 1); break;
            case 'yearly': proposedNextDate = addYears(proposedNextDate, 1); break;
        }
        proposedNextDate.setHours(backupHour, 0, 0, 0);
        nextBackupDate = proposedNextDate;
        
        if (now >= nextBackupDate) {
            scheduleBackup = true;
        }
    }
    
    if (scheduleBackup) {
        setTimeout(() => {
            handleExport('all_tasks');
            toast({
                title: 'Automatic Backup',
                description: `A ${backupFrequency} backup of all your tasks has been downloaded.`,
                duration: 10000,
            });
        }, 2000); // Small delay to allow the UI to settle
    }
  }, [isLoading, uiConfig, handleExport, toast]);

  const handlePinToggle = (taskIdToToggle: string) => {
    setPinnedTaskIds(currentIds => {
      const newPinnedIds = currentIds.includes(taskIdToToggle)
        ? currentIds.filter(id => id !== taskIdToToggle)
        : [...currentIds, taskIdToToggle];
      localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(newPinnedIds));
      return newPinnedIds;
    });
  };

  const handleUnpinFromStack = (taskId: string) => {
    handlePinToggle(taskId);
    toast({
        title: 'Reminder Unpinned',
        description: 'The reminder will no longer appear on the main page.',
    });
  };
  
  const handleDismissGeneralReminder = (reminderId: string) => {
    if (deleteGeneralReminder(reminderId)) {
      setGeneralReminders(prev => prev.filter(r => r.id !== reminderId));
      toast({
        title: 'Reminder Dismissed',
        description: 'The general reminder has been removed.',
      });
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'grid' || mode === 'table') {
      localStorage.setItem('taskflow_view_mode', mode);
      setViewMode(mode);
    }
  };
  
  const handleToggleSelectMode = () => {
    setIsSelectMode(prev => !prev);
    setSelectedTaskIds([]); // Clear selection when toggling mode
  };
  
  const handleFavoritesToggle = () => {
    const willBeOn = !favoritesOnly;
    if (willBeOn) {
        previousDateViewRef.current = dateView;
        setDateView('all');
    } else {
        setDateView(previousDateViewRef.current);
    }
    setFavoritesOnly(willBeOn);
  };
  
  const handleSortChange = (value: string) => {
      setSortDescriptor(value);
      localStorage.setItem('taskflow_sort_descriptor', value);
  };

  useEffect(() => {
    localStorage.setItem('taskflow_date_view', JSON.stringify(dateView));
    localStorage.setItem('taskflow_selected_date', selectedDate.toISOString());
    localStorage.setItem('taskflow_open_groups', JSON.stringify(openGroups));
  }, [dateView, selectedDate, openGroups]);

  const pinnedReminders = tasks
    .filter(t => pinnedTaskIds.includes(t.id) && t.reminder)
    .sort((a, b) => pinnedTaskIds.indexOf(a.id) - pinnedTaskIds.indexOf(b.id));

  const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedTaskIds(checked === true ? sortedTasks.map(t => t.id) : []);
  };

  const handleDownloadTemplate = () => {
      const currentUiConfig = getUiConfig();
      const appNamePrefix = currentUiConfig.appName?.replace(/\s+/g, '_') || 'MyTaskManager';
      const fileName = `${appNamePrefix}_Import_Template.json`;

      const templateData = {
          appName: "My Awesome Project",
          appIcon: "🚀",
          repositoryConfigs: [
              { id: 'repo_1', name: "UI-Dashboard", baseUrl: "https://github.com/org/ui-dashboard/pull/" },
              { id: 'repo_2', name: "Backend-API", baseUrl: "https://github.com/org/backend-api/pull/" }
          ],
          environments: [
              { id: 'env_1', name: 'dev', color: '#3b82f6' },
              { id: 'env_2', name: 'stage', color: '#f59e0b' },
              { id: 'env_3', name: 'production', color: '#22c55e' },
          ],
          developers: [
              { name: "Grace Hopper", email: "grace@example.com", phone: "111-222-3333", additionalFields: [{ id: "field_1", label: "GitHub", value: "gracehopper", type: "url" }] }
          ],
          testers: [
              { name: "Ada Lovelace", email: "ada@example.com", phone: "444-555-6666" }
          ],
          tasks: [
            {
              title: "Sample Task: Refactor Login Page",
              description: "Update the login page to use the new authentication service and improve UI responsiveness.",
              status: "To Do",
              repositories: ["UI-Dashboard"],
              developers: ["Grace Hopper"],
              testers: ["Ada Lovelace"],
              azureWorkItemId: "101",
              isFavorite: true,
              deploymentStatus: { dev: true },
              deploymentDates: { dev: new Date().toISOString() },
            }
          ]
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(templateData, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = fileName;
      link.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const parsedJson = JSON.parse(text);

            let importedTasks: Partial<Task>[] = [];
            let importedBinnedTasks: Partial<Task>[] = [];
            let importedDevelopers: Partial<Omit<Person, 'id'>>[] = [];
            let importedTesters: Partial<Omit<Person, 'id'>>[] = [];
            let importedRepoConfigs: RepositoryConfig[] | undefined = undefined;
            let importedEnvironments: Environment[] | undefined = undefined;
            let importedAppName: string | undefined = undefined;
            let importedAppIcon: string | null | undefined = undefined;
            let importedCustomFieldDefs: FieldConfig[] = [];
            let importedLogs: Log[] = [];

            const isIdRegex = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (Array.isArray(parsedJson)) {
                importedTasks = parsedJson;
            } else if (parsedJson && typeof parsedJson === 'object') {
                importedTasks = parsedJson.tasks || [];
                importedBinnedTasks = parsedJson.trash || [];
                importedDevelopers = parsedJson.developers || [];
                importedTesters = parsedJson.testers || [];
                importedRepoConfigs = parsedJson.repositoryConfigs;
                importedEnvironments = parsedJson.environments;
                importedAppName = parsedJson.appName;
                importedAppIcon = parsedJson.appIcon;
                importedCustomFieldDefs = parsedJson.customFieldDefinitions || [];
                importedLogs = parsedJson.logs || [];
            } else {
                 throw new Error("Invalid format: The JSON file must be a valid JSON object or array.");
            }
            
            const allImportedTasks = [...importedTasks, ...importedBinnedTasks];
            
            // Auto-discover people from tasks if they are not in the main lists
            const devNames = new Set((importedDevelopers || []).map(d => d?.name?.toLowerCase()).filter(Boolean));
            const testerNames = new Set((importedTesters || []).map(t => t?.name?.toLowerCase()).filter(Boolean));
            allImportedTasks.forEach(task => {
                if (!task) return;
                (task.developers || []).forEach(nameOrId => { if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId) && !devNames.has(nameOrId.toLowerCase())) { importedDevelopers.push({ name: nameOrId }); devNames.add(nameOrId.toLowerCase()); }});
                (task.testers || []).forEach(nameOrId => { if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId) && !testerNames.has(nameOrId.toLowerCase())) { importedTesters.push({ name: nameOrId }); testerNames.add(nameOrId.toLowerCase()); }});
            });

            // --- BATCH PROCESSING ---
            const data = getAppData();
            const companyData = data.companyData[data.activeCompanyId];

            let configUpdated = false, devCreatedCount = 0, devUpdatedCount = 0,
                testerCreatedCount = 0, testerUpdatedCount = 0,
                createdCount = 0, updatedCount = 0, binnedCreatedCount = 0, 
                binnedUpdatedCount = 0, failedCount = 0, importedLogCount = 0,
                envCreatedCount = 0;

            // --- Discover and add new environments from tasks ---
            const existingEnvs = new Set(companyData.uiConfig.environments.map(e => e.name.toLowerCase()));
            const discoveredEnvs = new Set<string>();

            allImportedTasks.forEach(task => {
                if (!task) return;
                if(task.deploymentStatus) Object.keys(task.deploymentStatus).forEach(env => discoveredEnvs.add(env));
                if(task.deploymentDates) Object.keys(task.deploymentDates).forEach(env => discoveredEnvs.add(env));
                if(task.prLinks) Object.keys(task.prLinks).forEach(env => discoveredEnvs.add(env));
                if(task.relevantEnvironments) task.relevantEnvironments.forEach(env => discoveredEnvs.add(env));
            });

            const newEnvsToAdd: string[] = [];
            discoveredEnvs.forEach(envName => {
                if (envName && !existingEnvs.has(envName.toLowerCase())) {
                    if (addEnvironment(envName)) {
                        newEnvsToAdd.push(envName);
                        envCreatedCount++;
                    }
                }
            });

            if (newEnvsToAdd.length > 0) {
                configUpdated = true;
            }


            // --- Process Custom Field Definitions ---
            if (importedCustomFieldDefs.length > 0) {
                const existingFieldKeys = new Set(companyData.uiConfig.fields.map(f => f.key));
                let newFieldsAdded = false;

                importedCustomFieldDefs.forEach(importedField => {
                    if (importedField.isCustom && !existingFieldKeys.has(importedField.key)) {
                        const newField: FieldConfig = {
                            ...importedField,
                            group: importedField.group || 'Imported',
                            order: companyData.uiConfig.fields.length,
                        };
                        companyData.uiConfig.fields.push(newField);
                        existingFieldKeys.add(newField.key);
                        newFieldsAdded = true;
                    }
                });

                if (newFieldsAdded) {
                    configUpdated = true;
                }
            }
            
            // --- Config Update ---
            if (importedAppName || typeof importedAppIcon !== 'undefined') {
                companyData.uiConfig.appName = importedAppName || companyData.uiConfig.appName;
                companyData.uiConfig.appIcon = typeof importedAppIcon === 'undefined' ? companyData.uiConfig.appIcon : importedAppIcon;
                configUpdated = true;
            }
            if (importedRepoConfigs) {
                const existingRepoConfigsByName = new Map(companyData.uiConfig.repositoryConfigs.map(r => [r.name, r]));
                importedRepoConfigs.forEach(importedRepo => {
                    if (!importedRepo.name || !importedRepo.baseUrl) return;
                    const existingRepo = existingRepoConfigsByName.get(importedRepo.name);
                    if (existingRepo) { existingRepo.baseUrl = importedRepo.baseUrl; } 
                    else { companyData.uiConfig.repositoryConfigs.push({ id: `repo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, name: importedRepo.name, baseUrl: importedRepo.baseUrl }); }
                });
                const repoField = companyData.uiConfig.fields.find(f => f.key === 'repositories');
                if (repoField) { repoField.options = companyData.uiConfig.repositoryConfigs.map(r => ({ id: r.id, value: r.name, label: r.name })); }
                configUpdated = true;
            }
            if (importedEnvironments) {
                const existingEnvsByName = new Map(companyData.uiConfig.environments.map(e => [e.name, e]));
                importedEnvironments.forEach(importedEnv => {
                    if (!importedEnv.name || !importedEnv.color) return;
                    const existingEnv = existingEnvsByName.get(importedEnv.name);
                    if (existingEnv) {
                        existingEnv.color = importedEnv.color;
                    } else {
                        companyData.uiConfig.environments.push({ id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, name: importedEnv.name, color: importedEnv.color });
                    }
                });
                const envField = companyData.uiConfig.fields.find(f => f.key === 'relevantEnvironments');
                if (envField) {
                    envField.options = companyData.uiConfig.environments.map(e => ({ id: e.id, value: e.name, label: e.name }));
                }
                configUpdated = true;
            }
            
            // --- Log Processing ---
            if (importedLogs.length > 0) {
                const existingLogIds = new Set(companyData.logs.map(l => l.id));
                const newLogs = importedLogs.filter(log => !existingLogIds.has(log.id));
                if (newLogs.length > 0) {
                    companyData.logs.push(...newLogs);
                    // Re-sort logs by timestamp to maintain chronological order (newest first)
                    companyData.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    importedLogCount = newLogs.length;
                }
            }

            // --- People Update ---
            const existingDevsByName = new Map(companyData.developers.map(d => [d.name.toLowerCase(), d]));
            importedDevelopers.forEach(dev => {
                if (!dev?.name) return;
                const personData = { name: dev.name.trim(), email: dev.email || '', phone: dev.phone || '', additionalFields: dev.additionalFields || [] };
                const existingDev = existingDevsByName.get(personData.name.toLowerCase());
                if (!existingDev) {
                    const newDev = { id: `developer-${crypto.randomUUID()}`, ...personData };
                    companyData.developers.push(newDev);
                    existingDevsByName.set(newDev.name.toLowerCase(), newDev);
                    devCreatedCount++;
                } else {
                    Object.assign(existingDev, personData);
                    devUpdatedCount++;
                }
            });

            const existingTestersByName = new Map(companyData.testers.map(t => [t.name.toLowerCase(), t.id]));
            importedTesters.forEach(tester => {
                if (!tester?.name) return;
                const personData = { name: tester.name.trim(), email: tester.email || '', phone: tester.phone || '', additionalFields: tester.additionalFields || [] };
                const existingTester = existingTestersByName.get(personData.name.toLowerCase());
                if (!existingTester) {
                    const newTester = { id: `tester-${crypto.randomUUID()}`, ...personData };
                    companyData.testers.push(newTester);
                    existingTestersByName.set(newTester.name.toLowerCase(), newTester);
                    testerCreatedCount++;
                } else {
                    Object.assign(existingTester, personData);
                    testerUpdatedCount++;
                }
            });

            // --- Task Processing ---
            const allTasksById = new Map([...companyData.tasks, ...companyData.trash].map(t => [t.id, t]));
            const devsByName = new Map(companyData.developers.map(d => [d.name.toLowerCase(), d.id]));
            const allDevIds = new Set(companyData.developers.map(d => d.id));
            const testersByName = new Map(companyData.testers.map(t => [t.name.toLowerCase(), t.id]));
            const allTesterIds = new Set(companyData.testers.map(t => t.id));

            const processTaskArray = (tasksToProcess: Partial<Task>[], isBinned: boolean) => {
              let baseSchema: any = taskSchema;
              while (baseSchema._def && baseSchema._def.schema) {
                  baseSchema = baseSchema._def.schema;
              }
              const knownTaskKeys = new Set(Object.keys(baseSchema.shape));

              for (const taskData of tasksToProcess) {
                  if (!taskData || typeof taskData !== 'object') {
                      failedCount++;
                      continue;
                  }

                  const processedTaskData: Partial<Task> = {};
                  const customData: Record<string, any> = {};

                  for (const key in taskData) {
                      const typedKey = key as keyof Task;
                      if (knownTaskKeys.has(typedKey)) {
                          (processedTaskData as any)[typedKey] = (taskData as any)[typedKey];
                      } else {
                          customData[key] = (taskData as any)[typedKey];
                      }
                  }
                  
                  if (taskData.customFields && typeof taskData.customFields === 'object') {
                    Object.assign(customData, taskData.customFields);
                  }
                  
                  if (Object.keys(customData).length > 0) {
                      processedTaskData.customFields = customData;
                  }
                  
                  const validationResult = taskSchema.safeParse(processedTaskData);
                  if (!validationResult.success) {
                      const errorDetails = validationResult.error.flatten();
                      const firstErrorField = Object.keys(errorDetails.fieldErrors)[0];
                      const firstErrorMessage = firstErrorField
                          ? `${firstErrorField}: ${errorDetails.fieldErrors[firstErrorField]!.join(', ')}`
                          : (errorDetails.formErrors[0] || 'Unknown validation error.');

                      console.error("Task import validation failed:", errorDetails.fieldErrors, "for task data:", processedTaskData);
                      toast({
                          variant: 'destructive',
                          title: `Task "${(processedTaskData.title || 'Untitled').substring(0, 30)}" Failed`,
                          description: firstErrorMessage,
                          duration: 10000,
                      });
                      failedCount++;
                      continue;
                  }

                  const validatedData = validationResult.data;
                  if (validatedData.developers) { validatedData.developers = validatedData.developers.map(nameOrId => allDevIds.has(nameOrId) ? nameOrId : devsByName.get((nameOrId as string).toLowerCase()) || null).filter((id): id is string => !!id); }
                  if (validatedData.testers) { validatedData.testers = validatedData.testers.map(nameOrId => allTesterIds.has(nameOrId) ? nameOrId : testersByName.get((nameOrId as string).toLowerCase()) || null).filter((id): id is string => !!id); }

                  const now = new Date().toISOString();
                  if (validatedData.id && allTasksById.has(validatedData.id)) {
                        const existingTask = allTasksById.get(validatedData.id)!;
                        const wasBinned = companyData.trash.some(t => t.id === existingTask.id);
                        const shouldBeBinned = isBinned;

                        Object.assign(existingTask, validatedData);
                        existingTask.updatedAt = now;
                        
                        if (validatedData.deploymentDates) {
                            existingTask.deploymentDates = Object.entries(validatedData.deploymentDates).reduce((acc, [key, value]) => {
                                if (value) {
                                    acc[key] = new Date(value as any).toISOString();
                                } else {
                                    acc[key] = null;
                                }
                                return acc;
                            }, {} as { [key: string]: string | null });
                        }

                        if (wasBinned && !shouldBeBinned) {
                            const taskIndex = companyData.trash.findIndex(t => t.id === existingTask.id);
                            if(taskIndex > -1) {
                                const [taskToMove] = companyData.trash.splice(taskIndex, 1);
                                delete taskToMove.deletedAt;
                                companyData.tasks.unshift(taskToMove);
                            }
                            updatedCount++;
                        } else if (!wasBinned && shouldBeBinned) {
                            const taskIndex = companyData.tasks.findIndex(t => t.id === existingTask.id);
                            if(taskIndex > -1) {
                                const [taskToMove] = companyData.tasks.splice(taskIndex, 1);
                                taskToMove.deletedAt = validatedData.deletedAt || now;
                                companyData.trash.unshift(taskToMove);
                            }
                            binnedUpdatedCount++;
                        } else {
                            if (shouldBeBinned) {
                                existingTask.deletedAt = validatedData.deletedAt || now;
                                binnedUpdatedCount++;
                            } else {
                                delete existingTask.deletedAt;
                                updatedCount++;
                            }
                        }
                  } else {
                      const newTask: Task = {
                          id: validatedData.id || `task-${crypto.randomUUID()}`,
                          createdAt: validatedData.createdAt || now,
                          updatedAt: now,
                          title: validatedData.title || 'Untitled Task',
                          description: validatedData.description || '',
                          status: validatedData.status || 'To Do',
                          summary: validatedData.summary || null,
                          isFavorite: validatedData.isFavorite || false,
                          reminder: validatedData.reminder || null,
                          reminderExpiresAt: validatedData.reminderExpiresAt ? (validatedData.reminderExpiresAt as Date).toISOString() : null,
                          repositories: validatedData.repositories || [],
                          developers: validatedData.developers || [],
                          testers: validatedData.testers || [],
                          azureWorkItemId: validatedData.azureWorkItemId || '',
                          deploymentStatus: validatedData.deploymentStatus || {},
                          deploymentDates: validatedData.deploymentDates ? Object.entries(validatedData.deploymentDates).reduce((acc, [key, value]) => ({ ...acc, [key]: value ? new Date(value as any).toISOString() : null }), {}) : {},
                          relevantEnvironments: validatedData.relevantEnvironments || ['dev', 'stage', 'production'],
                          prLinks: validatedData.prLinks || {},
                          devStartDate: validatedData.devStartDate ? new Date(validatedData.devStartDate).toISOString() : null,
                          devEndDate: validatedData.devEndDate ? new Date(validatedData.devEndDate).toISOString() : null,
                          qaStartDate: validatedData.qaStartDate ? new Date(validatedData.qaStartDate).toISOString() : null,
                          qaEndDate: validatedData.qaEndDate ? new Date(validatedData.qaEndDate).toISOString() : null,
                          comments: validatedData.comments || [],
                          attachments: validatedData.attachments || [],
                          customFields: validatedData.customFields || {},
                          tags: validatedData.tags || [],
                      };
                      
                      let logMessage = '';
                      if (isBinned) {
                          newTask.deletedAt = validatedData.deletedAt || now;
                          companyData.trash.unshift(newTask);
                          binnedCreatedCount++;
                          logMessage = `Added new binned task via import: "${newTask.title}".`;
                      } else {
                          delete newTask.deletedAt;
                          companyData.tasks.unshift(newTask);
                          createdCount++;
                          logMessage = `Added new task via import: "${newTask.title}".`;
                      }
                      
                      companyData.logs.unshift({ id: `log-${crypto.randomUUID()}`, timestamp: now, message: logMessage, taskId: newTask.id });
                      allTasksById.set(newTask.id, newTask);
                  }
              }
            }

            processTaskArray(importedTasks, false);
            processTaskArray(importedBinnedTasks, true);

            // --- Finalize ---
            setAppData(data);

            if (configUpdated) {
                window.dispatchEvent(new Event('company-changed'));
            }
            refreshData();
            
            // --- Toast Summary ---
            let summaryParts: string[] = [];
            if (configUpdated) summaryParts.push('App settings updated.');
            if (envCreatedCount > 0) summaryParts.push(`${envCreatedCount} new environment(s) added.`);
            if (devCreatedCount > 0) summaryParts.push(`${devCreatedCount} dev(s) added.`);
            if (devUpdatedCount > 0) summaryParts.push(`${devUpdatedCount} dev(s) updated.`);
            if (testerCreatedCount > 0) summaryParts.push(`${testerCreatedCount} tester(s) added.`);
            if (testerUpdatedCount > 0) summaryParts.push(`${testerUpdatedCount} tester(s) updated.`);
            if (createdCount > 0) summaryParts.push(`${createdCount} active task(s) created.`);
            if (updatedCount > 0) summaryParts.push(`${updatedCount} active task(s) updated.`);
            if (binnedCreatedCount > 0) summaryParts.push(`${binnedCreatedCount} binned task(s) created.`);
            if (binnedUpdatedCount > 0) summaryParts.push(`${binnedUpdatedCount} binned task(s) updated.`);
            if (importedLogCount > 0) summaryParts.push(`${importedLogCount} log(s) imported.`);

            if (summaryParts.length > 0) {
                const logMessage = `Import successful: ${summaryParts.join(' ')}`;
                addLog({ message: logMessage });
                toast({ variant: 'success', title: 'Import Successful', description: summaryParts.join(' ') });
            } else if (allImportedTasks.length > 0 || importedDevelopers.length > 0 || importedTesters.length > 0) {
                addLog({ message: 'Import complete: No new data was added or existing data updated.' });
                toast({ variant: 'default', title: 'Import Complete', description: 'No new data was added or existing data updated.' });
            } else {
               toast({ variant: 'warning', title: 'Empty or Invalid File', description: 'The imported file contained no data to process.' });
            }
            
        } catch (error: any) {
            console.error("Error importing file:", error);
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'There was an error processing your file.' });
        } finally {
            if(fileInputRef.current) { fileInputRef.current.value = ''; }
        }
    };
    reader.readAsText(file);
  };
  
  const handleBulkDelete = () => {
    const idsToRestore = [...selectedTaskIds];
    const selectedTaskCount = idsToRestore.length;
    moveMultipleTasksToBin(idsToRestore);
    
    const { id, dismiss, update } = toast({
        variant: 'destructive',
        title: 'Tasks Moved to Bin',
        description: `${selectedTaskCount} tasks have been moved to the bin.`,
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
  };

  const handleBulkApplyTags = () => {
    addTagsToMultipleTasks(selectedTaskIds, tagsToApply);
    toast({
        variant: 'success',
        title: 'Tags Applied',
        description: `Tags have been added to ${selectedTaskIds.length} tasks.`,
    });
    refreshData();
    setIsTagsDialogOpen(false);
    setTagsToApply([]);
  };

  const handleBulkCopyText = () => {
    if (!uiConfig) return;
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    const textContent = generateTasksText(selectedTasks, uiConfig, developers, testers);
    navigator.clipboard.writeText(textContent).then(() => {
        toast({ variant: 'success', title: 'Copied to Clipboard', description: `${selectedTasks.length} tasks copied.` });
    }).catch(err => {
        toast({ variant: 'destructive', title: 'Failed to Copy' });
    });
  };

  const handleBulkExportPdf = async () => {
    if (!uiConfig) return;
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    await generateTaskPdf(selectedTasks, uiConfig, developers, testers, 'save');
    toast({
        variant: 'success',
        title: 'PDF Exported',
        description: `${selectedTasks.length} task(s) have been exported to a PDF.`,
    });
  };
  
    const handleDeploymentFilterChange = (newValues: string[]) => {
        const lastAdded = newValues[newValues.length - 1];
        let valuesToSet = newValues;

        if (lastAdded) {
            const isNegative = lastAdded.startsWith('not_');
            const baseEnv = isNegative ? lastAdded.substring(4) : lastAdded;
            const conflictingValue = isNegative ? baseEnv : `not_${baseEnv}`;

            if (newValues.includes(conflictingValue)) {
                // If the new value's conflict is already present, remove the conflict
                valuesToSet = newValues.filter(v => v !== conflictingValue);
            }
        }
        
        setDeploymentFilter(valuesToSet);
    };


  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading tasks..." />;
  }
  
  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
  const repoFieldConfig = uiConfig.fields.find(f => f.key === 'repositories');
  let REPOSITORIES = (repoFieldConfig?.options?.map(opt => opt.value) ?? uiConfig.repositoryConfigs?.map(r => r.name)) ?? INITIAL_REPOSITORY_CONFIGS.map(r => r.name);

  if (repoFieldConfig?.sortDirection === 'desc') {
    REPOSITORIES = [...REPOSITORIES].sort((a, b) => b.localeCompare(a));
  } else if (repoFieldConfig?.sortDirection === 'asc') {
    REPOSITORIES = [...REPOSITORIES].sort((a, b) => a.localeCompare(b));
  }
  
  const TASK_STATUSES = uiConfig.taskStatuses;
  const statusOptions: SelectOption[] = TASK_STATUSES.map(s => ({ value: s, label: s }));
  const repoOptions: SelectOption[] = REPOSITORIES.map(r => ({ value: r, label: r }));
  
  const tagsField = uiConfig.fields.find(f => f.key === 'tags');
  const allPredefinedTags = tagsField?.options?.map(opt => ({ value: opt.value, label: opt.label })) || [];
  const allDynamicTags = [...new Set(tasks.flatMap(t => t.tags || []))].map(t => ({value: t, label: t}));
  const combinedTags = [...allPredefinedTags];
  allDynamicTags.forEach(dynamicTag => {
    if (!combinedTags.some(t => t.value === dynamicTag.value)) {
        combinedTags.push(dynamicTag);
    }
  });
  const tagsOptions: SelectOption[] = combinedTags.sort((a, b) => a.label.localeCompare(b.label));

  const deploymentOptions: SelectOption[] = (uiConfig.environments || []).flatMap(env => [
    { value: env.name, label: `Deployed to ${env.name}` },
    { value: `not_${env.name}`, label: `Not Deployed to ${env.name}` }
  ]);

  const handleTaskLinkClick = (e: React.MouseEvent) => {
    if (dateView !== 'all') {
        const navState = { view: dateView, date: selectedDate.toISOString() };
        sessionStorage.setItem('taskflow_nav_state', JSON.stringify(navState));
    }
  };

  const handleNewTaskClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    handleTaskLinkClick(e);
    prompt(() => router.push('/tasks/new'));
  };

  const resultsDescription = (() => {
    switch (dateView) {
      case 'all': return 'Based on your current filters.';
      case 'monthly': return `Tasks with a start date in ${format(selectedDate, 'MMMM yyyy')}.`;
      case 'yearly': return `Tasks with a start date in ${format(selectedDate, 'yyyy')}.`;
    }
  })();

  const remindersCount = pinnedReminders.length + generalReminders.length;
  
  const handleStartTutorial = () => {
    setShowTutorialPrompt(false);
    localStorage.setItem(TUTORIAL_PROMPTED_KEY, 'true');
    startTutorial();
  };

  const handleDismissTutorialPrompt = () => {
    setShowTutorialPrompt(false);
    localStorage.setItem(TUTORIAL_PROMPTED_KEY, 'true');
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tasks
        </h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <Dialog open={showTutorialPrompt} onOpenChange={setShowTutorialPrompt}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center text-center">
                        <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                           <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">Welcome!</DialogTitle>
                        <DialogDescription>
                            Want a quick tour of this page to see how everything works?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-row justify-center sm:justify-center gap-2 pt-4">
                        <Button variant="ghost" onClick={handleDismissTutorialPrompt}>Maybe later</Button>
                        <Button onClick={handleStartTutorial}>Start Tutorial</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div id="tutorial-popover-anchor" className="relative">
              {showTutorialPrompt && !localStorage.getItem(TUTORIAL_PROMPTED_KEY) && uiConfig.tutorialEnabled && <div className="absolute inset-0 rounded-md animate-ping-slow bg-primary/50 -z-10" />}
            </div>
            
            {uiConfig.remindersEnabled && remindersCount > 0 && (
              <Button variant="outline" className="h-10 border-amber-500/50 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/50 dark:hover:bg-amber-900/40" onClick={() => setIsReminderStackOpen(true)}>
                <BellRing className="mr-2 h-4 w-4" />
                 Important Reminders
                <Badge variant="secondary" className="ml-2 bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100">{remindersCount}</Badge>
              </Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Export
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => handleExport('current_view')} className="flex justify-between items-center pr-1">
                  <span>Export Current View</span>
                  <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        Exports the {isSelectMode && selectedTaskIds.length > 0 ? selectedTaskIds.length : sortedTasks.length} task(s) currently
                        {isSelectMode && selectedTaskIds.length > 0 ? ' selected' : ' visible'}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  </TooltipProvider>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport('all_tasks')}>
                    Export All Tasks
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDownloadTemplate}>
                    Download Import Template
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Download className="mr-2 h-4 w-4" />
                Import
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".json"
            />
            
            <Button asChild size="sm" id="new-task-btn">
            <a href="/tasks/new" onClick={handleNewTaskClick}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
            </a>
            </Button>
        </div>
      </div>
      
      <div className="space-y-6">
          <Card id="task-filters">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:col-span-1 lg:grid-cols-5 gap-4">
                    <div className="relative flex items-center w-full col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-1">
                        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-20 h-10"
                        />
                        <div className="absolute right-0 flex items-center h-full pr-1.5">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">{commandKey}</span>K
                            </kbd>
                        </div>
                    </div>
                    <MultiSelect
                        selected={statusFilter}
                        onChange={setStatusFilter}
                        options={statusOptions}
                        placeholder={`Filter by ${fieldLabels.get('status') || 'Status'}...`}
                        />
                    <MultiSelect
                        selected={repoFilter}
                        onChange={setRepoFilter}
                        options={repoOptions}
                        placeholder={`Filter by ${fieldLabels.get('repositories') || 'Repository'}...`}
                    />
                    {tagsField && tagsField.isActive && (
                        <MultiSelect
                            selected={tagsFilter}
                            onChange={setTagsFilter}
                            options={tagsOptions}
                            placeholder={`Filter by ${fieldLabels.get('tags') || 'Tags'}...`}
                        />
                    )}
                    <MultiSelect
                        selected={deploymentFilter}
                        onChange={handleDeploymentFilterChange}
                        options={deploymentOptions}
                        placeholder={`Filter by ${fieldLabels.get('deploymentStatus') || 'Deployment'}...`}
                    />
                </div>
            </CardContent>
          </Card>
          
           <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
                <div className="flex items-center gap-4">
                    {(dateView === 'monthly' || dateView === 'yearly') && !favoritesOnly && (
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" onClick={handlePreviousDate} aria-label="Previous period" className="h-10 w-10">
                              <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                              <PopoverTrigger asChild>
                                  <Button
                                      variant="outline"
                                      className="text-base font-semibold text-foreground text-center w-36 md:w-44 whitespace-nowrap flex items-center gap-1 h-10"
                                  >
                                      {dateView === 'monthly' ? format(selectedDate, 'MMMM yyyy') : format(selectedDate, 'yyyy')}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                  {dateView === 'monthly' ? (
                                      <Calendar
                                          mode="single"
                                          selected={selectedDate}
                                          onSelect={(day) => { if(day) setSelectedDate(day); setIsDatePickerOpen(false); }}
                                          initialFocus
                                      />
                                  ) : (
                                      <div className="p-2">
                                            <div className="flex justify-between items-center pb-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setSelectedDate(subYears(selectedDate, 1))}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="font-semibold text-sm">{getYear(selectedDate)}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setSelectedDate(addYears(selectedDate, 1))}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const monthDate = setMonth(new Date(getYear(selectedDate), 0, 1), i);
                                                    return (
                                                        <Button
                                                            key={i}
                                                            variant={'ghost'}
                                                            size="sm"
                                                            className="w-full justify-center"
                                                            disabled
                                                        >
                                                            {format(monthDate, 'MMM')}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                  )}
                              </PopoverContent>
                          </Popover>
                          <Button variant="outline" size="icon" onClick={handleNextDate} aria-label="Next period" className="h-10 w-10">
                              <ChevronRight className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                          {sortedTasks.length} {sortedTasks.length === 1 ? 'Result' : 'Results'}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                          {resultsDescription}
                      </p>
                    </div>
                </div>

                <div id="view-mode-toggle" className="flex items-center gap-x-2 gap-y-2 flex-wrap justify-start sm:justify-end">
                  <Select value={sortDescriptor} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-auto sm:w-[180px] h-10">
                          <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="status-asc">Status (Asc)</SelectItem>
                          <SelectItem value="status-desc">Status (Desc)</SelectItem>
                          <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                          <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                          <SelectItem value="deployment-desc">Deployment (Desc)</SelectItem>
                          <SelectItem value="deployment-asc">Deployment (Asc)</SelectItem>
                      </SelectContent>
                  </Select>

                   <div className="flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                        <Button
                          variant={dateView === 'all' ? 'default' : 'ghost'}
                          onClick={() => setDateView('all')}
                          className={cn(
                            "h-8 shadow-sm",
                            dateView === 'all' && 'bg-card text-foreground hover:bg-card'
                          )}
                        >All Tasks</Button>
                        <Button
                          variant={dateView === 'monthly' ? 'default' : 'ghost'}
                          onClick={() => setDateView('monthly')}
                          className={cn(
                            "h-8 shadow-sm",
                            dateView === 'monthly' && 'bg-card text-foreground hover:bg-card'
                          )}
                        >Monthly</Button>
                   </div>

                  <div className="flex items-center gap-2">
                    <div className="flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          viewMode === 'grid' && 'bg-card text-foreground shadow-sm hover:bg-card'
                        )}
                        onClick={() => handleViewModeChange('grid')}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="sr-only">Grid View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          viewMode === 'table' && 'bg-card text-foreground shadow-sm hover:bg-card'
                        )}
                        onClick={() => handleViewModeChange('table')}
                      >
                        <List className="h-4 w-4" />
                        <span className="sr-only">Table View</span>
                      </Button>
                    </div>
                  </div>
                  <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          variant={favoritesOnly ? 'secondary' : 'outline'}
                          size="icon"
                          onClick={handleFavoritesToggle}
                          className="h-10 w-10"
                      >
                          <Heart className={cn("h-4 w-4", favoritesOnly && "fill-red-500 text-red-500")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{favoritesOnly ? 'Show all tasks' : 'Show favorites only'}</p>
                    </TooltipContent>
                  </Tooltip>
                  </TooltipProvider>
                   <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          variant={isSelectMode ? 'secondary' : 'outline'}
                          size="icon"
                          onClick={handleToggleSelectMode}
                          className="h-10 w-10 relative overflow-hidden"
                      >
                          <span className="sr-only">{isSelectMode ? 'Cancel Selection' : 'Select Tasks'}</span>
                          <CheckSquare className={cn(
                              "h-4 w-4 transition-all duration-300",
                              isSelectMode ? "-rotate-45 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                          )} />
                          <X className={cn(
                              "h-4 w-4 transition-all duration-300 absolute",
                              isSelectMode ? "rotate-0 scale-100 opacity-100" : "rotate-45 scale-0 opacity-0"
                          )} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isSelectMode ? 'Cancel bulk selection' : 'Select multiple tasks'}</p>
                    </TooltipContent>
                  </Tooltip>
                  </TooltipProvider>
              </div>
            </div>

            {isSelectMode && (
              <div className="sticky top-[68px] z-30 mb-4">
                <Card className="border-primary/50 bg-background/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-tasks"
                        checked={
                          sortedTasks.length > 0 &&
                          selectedTaskIds.length === sortedTasks.length
                            ? true
                            : selectedTaskIds.length > 0
                            ? 'indeterminate'
                            : false
                        }
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all tasks"
                        disabled={sortedTasks.length === 0}
                      />
                      <Label
                        htmlFor="select-all-tasks"
                        className="text-sm font-medium"
                      >
                        {selectedTaskIds.length > 0
                          ? `${selectedTaskIds.length} of ${sortedTasks.length} selected`
                          : sortedTasks.length > 0
                          ? `Select all tasks`
                          : 'No tasks to select'}
                      </Label>
                    </div>

                    <div
                      className={cn(
                        'flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-opacity duration-300 w-full sm:w-auto',
                        selectedTaskIds.length > 0
                          ? 'opacity-100'
                          : 'opacity-0 pointer-events-none h-0 sm:h-auto overflow-hidden'
                      )}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTagsDialogOpen(true)}
                      >
                        <Tag className="mr-2 h-4 w-4" /> Add Tags
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkCopyText}
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copy as Text
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkExportPdf}
                      >
                        <Download className="mr-2 h-4 w-4" /> Export as PDF
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" /> Move to Bin
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Move to Bin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to move the selected{' '}
                              {selectedTaskIds.length} task(s) to the bin? You
                              can restore them later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleBulkDelete}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Move to Bin
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Tags to {selectedTaskIds.length} Tasks</DialogTitle>
                  <DialogDescription>
                    The selected tags will be added to all chosen tasks. Existing tags will not be removed.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <MultiSelect
                      selected={tagsToApply}
                      onChange={setTagsToApply}
                      options={tagsOptions}
                      placeholder="Select or create tags to add..."
                      creatable
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTagsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleBulkApplyTags}>Apply Tags</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          {sortedTasks.length > 0 ? (
            <div onClick={handleTaskLinkClick}>
              {viewMode === 'grid' ? (
                <TasksGrid tasks={sortedTasks} onTaskDelete={refreshData} onTaskUpdate={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} pinnedTaskIds={pinnedTaskIds} onPinToggle={handlePinToggle} />
              ) : (
                <TasksTable tasks={sortedTasks} onTaskDelete={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} />
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                <FolderSearch className="h-16 w-16 mb-4 text-muted-foreground/50"/>
                <p className="text-lg font-semibold">No tasks found.</p>
                <p className="mt-1">
                    Try adjusting your filters or create a new task.
                </p>
                <Button asChild className="mt-4" size="sm">
                    <a href="/tasks/new" onClick={handleNewTaskClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Task
                    </a>
                </Button>
            </div>
          )}
      </div>

      {uiConfig.remindersEnabled && remindersCount > 0 && (
        <ReminderStack 
            reminders={pinnedReminders} 
            generalReminders={generalReminders}
            uiConfig={uiConfig} 
            onUnpin={handleUnpinFromStack}
            onDismissGeneralReminder={handleDismissGeneralReminder}
            isOpen={isReminderStackOpen}
            onOpenChange={setIsReminderStackOpen}
        />
     )}
    </div>
  );
}

    
