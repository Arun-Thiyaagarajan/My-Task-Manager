
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getTasks, addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester, moveMultipleTasksToBin, getBinnedTasks, getAppData, setAppData, getLogs, addLog, restoreMultipleTasks, clearExpiredReminders, deleteGeneralReminder, getGeneralReminders, addTagsToMultipleTasks, addEnvironment, DATA_KEY, getAuthMode, importWorkspaceData } from '@/lib/data';
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
import { INITIAL_REPOSITORY_CONFIGS } from '@/lib/constants';
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
} from 'lucide-react';
import { cn, fuzzySearch } from '@/lib/utils';
import type { Task, Person, UiConfig, RepositoryConfig, Log, GeneralReminder, BackupFrequency, Environment } from '@/lib/types';
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
import { useRouter, useSearchParams } from 'next/navigation';
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


type ViewMode = 'grid' | 'table';
type DateView = 'all' | 'monthly' | 'yearly';

const PINNED_TASKS_STORAGE_KEY = 'taskflow_pinned_tasks';
const TUTORIAL_PROMPTED_KEY = 'taskflow_tutorial_prompted';
const LAST_BACKUP_KEY = 'taskflow_last_auto_backup';

export default function Home() {
  const activeCompanyId = useActiveCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = '/';
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [generalReminders, setGeneralReminders] = useState<GeneralReminder[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [dateView, setDateView] = useState<DateView>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [executedSearchQuery, setExecutedSearchQuery] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [repoFilter, setRepoFilter] = useState<string[]>([]);
  const [deploymentFilter, setDeploymentFilter] = useState<string[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState('status-asc');
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

  // Search Loading & Error States
  const [isSearching, setIsSearching] = useState(false);
  const [showSlowSearchMessage, setShowSlowSearchMessage] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Import Progress States
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Background Filtering State
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  
  useEffect(() => {
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
        router.replace(`${pathname}?${newQuery}`, { scroll: false });
    }
  }, [executedSearchQuery, sortDescriptor, viewMode, dateView, selectedDate, favoritesOnly, statusFilter, repoFilter, deploymentFilter, tagsFilter, router, pathname, searchParams]);

  useEffect(() => {
    setViewMode((searchParams.get('viewMode') as ViewMode) || 'grid');
    setDateView((searchParams.get('dateView') as DateView) || 'all');
    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : new Date();
    setSelectedDate(isValid(date) ? date : new Date());
    const queryParam = searchParams.get('search') || '';
    setSearchQuery(queryParam);
    setExecutedSearchQuery(queryParam);
    setStatusFilter(searchParams.getAll('status') || []);
    setRepoFilter(searchParams.getAll('repo') || []);
    setDeploymentFilter(searchParams.getAll('deployment') || []);
    setTagsFilter(searchParams.getAll('tags') || []);
    setFavoritesOnly(searchParams.get('favorites') === 'true');
    setSortDescriptor(searchParams.get('sort') || 'status-asc');
  }, []);

  const handlePreviousDate = useCallback(() => {
      if (dateView === 'monthly') {
          setSelectedDate(subMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(subYears(selectedDate, 1));
      }
  }, [dateView, selectedDate]);

  const handleNextDate = useCallback(() => {
      if (dateView === 'monthly') {
          setSelectedDate(addMonths(selectedDate, 1));
      } else if (dateView === 'yearly') {
          setSelectedDate(addYears(selectedDate, 1));
      }
  }, [dateView, selectedDate]);

  const refreshData = useCallback(() => {
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
  }, [activeCompanyId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setCommandKey(navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl');
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

  // Handle slow search messaging
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching) {
        timer = setTimeout(() => setShowSlowSearchMessage(true), 3000);
    } else {
        setShowSlowSearchMessage(false);
    }
    return () => clearTimeout(timer);
  }, [isSearching]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        triggerSearch();
    }
  };

  const triggerSearch = useCallback(() => {
    setIsSearching(true);
    setSearchError(null);
    window.dispatchEvent(new Event('sync-start'));
    
    setTimeout(() => {
        setExecutedSearchQuery(searchQuery);
    }, 50);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setExecutedSearchQuery('');
    setIsSearching(false);
    searchInputRef.current?.focus();
  }, []);

  // Asynchronous Filtering Logic
  useEffect(() => {
    const filterWork = () => {
        try {
            const results = tasks.filter((task: Task) => {
                if (favoritesOnly && !task.isFavorite) return false;

                const statusMatch = statusFilter.length === 0 || statusFilter.includes(task.status);
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
            setFilteredTasks(results);
            setSearchError(null);
        } catch (e) {
            console.error("Filtering logic failed:", e);
            setSearchError("Search temporarily unavailable. Please try again later.");
        } finally {
            setIsSearching(false);
            window.dispatchEvent(new Event('sync-end'));
        }
    };

    const rafId = requestAnimationFrame(filterWork);
    return () => cancelAnimationFrame(rafId);
  }, [tasks, statusFilter, repoFilter, tagsFilter, developers, testers, executedSearchQuery, dateView, selectedDate, deploymentFilter, favoritesOnly]);

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

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
        const [sortBy, sortDirection] = sortDescriptor.split('-');
        const taskStatuses = uiConfig?.taskStatuses || [];

        if (sortBy === 'title') {
        if (sortDirection === 'asc') return a.title.localeCompare(b.title);
        return b.title.localeCompare(a.title);
        }

        if (sortBy === 'status') {
        const aIndex = taskStatuses.indexOf(a.status);
        const bIndex = taskStatuses.indexOf(b.status);
        return sortDirection === 'asc' ? aIndex - bIndex : bIndex - aIndex;
        }

        if (sortBy === 'deployment') {
        const scoreA = getDeploymentScore(a);
        const scoreB = getDeploymentScore(b);
        return sortDirection === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        }

        return 0;
    });
  }, [filteredTasks, sortDescriptor, uiConfig]);

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
            : sortedTasks;
        
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
  }, [isSelectMode, selectedTaskIds, sortedTasks, toast]);

  useEffect(() => {
    if (!activeCompanyId) return;
    
    const config = getUiConfig();
    if (config.tutorialEnabled && !localStorage.getItem(TUTORIAL_PROMPTED_KEY)) {
      setTimeout(() => setShowTutorialPrompt(true), 1000);
    }
    
    const savedOpenGroups = localStorage.getItem('taskflow_open_groups');
    if (savedOpenGroups) setOpenGroups(JSON.parse(savedOpenGroups));
    
    const savedPinnedTasks = localStorage.getItem(PINNED_TASKS_STORAGE_KEY);
    if (savedPinnedTasks) setPinnedTaskIds(JSON.parse(savedPinnedTasks));
    
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
    
    const storageHandler = (event: StorageEvent) => {
        if (event.key === DATA_KEY) {
            refreshData();
        }
    };

    window.addEventListener('storage', storageHandler);
    window.addEventListener('config-changed', refreshData);
    window.addEventListener('company-changed', refreshData);
    
    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('config-changed', refreshData);
      window.removeEventListener('company-changed', refreshData);
    };
  }, [activeCompanyId, toast, refreshData]);
  
  useEffect(() => {
    if (isLoading || !uiConfig) return;

    const backupFrequency = uiConfig.autoBackupFrequency || 'off';
    if (backupFrequency === 'off') return;

    const lastBackupStr = localStorage.getItem(LAST_BACKUP_KEY);
    const now = new Date();
    
    let nextBackupDate: Date;

    if (!lastBackupStr) {
        nextBackupDate = new Date(now);
        nextBackupDate.setHours(uiConfig.autoBackupFrequency === 'daily' ? (uiConfig.autoBackupTime ?? 6) : 6, 0, 0, 0);
        if (now > nextBackupDate) nextBackupDate.setDate(nextBackupDate.getDate() + 1);
    } else {
        nextBackupDate = new Date(lastBackupStr);
        switch (backupFrequency) {
            case 'daily': nextBackupDate.setDate(nextBackupDate.getDate() + 1); break;
            case 'weekly': nextBackupDate.setDate(nextBackupDate.getDate() + 7); break;
            case 'monthly': nextBackupDate.setMonth(nextBackupDate.getMonth() + 1); break;
            case 'yearly': nextBackupDate.setFullYear(nextBackupDate.getFullYear() + 1); break;
        }
        nextBackupDate.setHours(uiConfig.autoBackupTime ?? 6, 0, 0, 0);
    }

    if (now >= nextBackupDate) {
        setTimeout(() => {
            handleExport('all_tasks');
            toast({
                title: 'Automatic Backup',
                description: `A ${backupFrequency} backup has been created.`,
                duration: 10000,
            });
        }, 5000);
    }
  }, [isLoading, uiConfig, handleExport, toast]);

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
    setFavoritesOnly(prev => !prev);
  }, []);
  
  useEffect(() => {
    localStorage.setItem('taskflow_open_groups', JSON.stringify(openGroups));
  }, [openGroups]);

  const pinnedReminders = tasks
    .filter(t => pinnedTaskIds.includes(t.id) && t.reminder)
    .sort((a, b) => pinnedTaskIds.indexOf(a.id) - pinnedTaskIds.indexOf(b.id));

  const handleToggleSelectAll = useCallback((checked: boolean | 'indeterminate') => {
    setSelectedTaskIds(checked === true ? sortedTasks.map(t => t.id) : []);
  }, [sortedTasks]);

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

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const parsedJson = JSON.parse(text);
            const mode = getAuthMode();

            window.dispatchEvent(new Event('sync-start'));
            if (mode === 'authenticate') {
                setIsImporting(true);
                setImportProgress(0);
                
                try {
                    const success = await importWorkspaceData(parsedJson, (progress) => {
                        setImportProgress(progress);
                    });
                    
                    if (success) {
                        toast({ 
                            variant: 'success', 
                            title: 'Import Complete', 
                            description: 'Your data has been successfully imported to your cloud workspace.' 
                        });
                    }
                } catch (error: any) {
                    toast({ 
                        variant: 'destructive', 
                        title: 'Import Failed', 
                        description: 'Some tasks could not be imported. Please try again.' 
                    });
                } finally {
                    setIsImporting(false);
                    setImportProgress(0);
                }
            } else {
                try {
                    await importWorkspaceData(parsedJson);
                    toast({ variant: 'success', title: 'Local Import Successful', description: 'Your browser storage has been updated.' });
                } catch (error: any) {
                    toast({ 
                        variant: 'destructive', 
                        title: 'Import Failed', 
                        description: 'Some tasks could not be imported. Please try again.' 
                    });
                }
            }
            refreshData();
            
        } catch (error: any) {
            console.error("Error importing file:", error);
            toast({ variant: 'destructive', title: 'Import Failed', description: "The imported file is invalid or corrupted. Please check the file and try again." });
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
        variant: 'destructive',
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
    await generateTaskPdf(selectedTasks, uiConfig, developers, testers, 'save');
    toast({ variant: 'success', title: 'PDF Exported' });
  }, [selectedTaskIds, tasks, uiConfig, developers, testers, toast]);
  
  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading tasks..." />;
  }

  const mode = getAuthMode();
  const TASK_STATUSES = uiConfig?.taskStatuses || [];

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {isImporting && (
          <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
              <Card className="w-full max-w-md shadow-2xl border-primary/20">
                  <CardContent className="pt-8 pb-10 flex flex-col items-center gap-6">
                      <div className="relative">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase">{importProgress}%</span>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold tracking-tight">Importing to Cloud</h2>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                            Your data is being imported to the cloud. This may take a few minutes for large datasets.
                        </p>
                      </div>
                      <div className="w-full px-4">
                        <Progress value={importProgress} className="h-2" />
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-6">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight text-foreground">Tasks</h1>
                <Badge variant="outline" className={cn(mode === 'authenticate' ? "text-primary border-primary/20 bg-primary/5" : "text-muted-foreground", "h-6 px-3 text-[10px] font-bold uppercase tracking-wider")}>
                    {mode === 'authenticate' ? 'Cloud Sync' : 'Local Storage'}
                </Badge>
            </div>
            {uiConfig?.appName && <p className="text-muted-foreground text-sm font-medium">{uiConfig.appName}</p>}
        </div>
        
        <div className="flex flex-col items-stretch sm:items-center sm:flex-row gap-3 w-full sm:w-auto">
            <Dialog open={showTutorialPrompt} onOpenChange={setShowTutorialPrompt}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="items-center text-center">
                        <div className="p-3 bg-primary/10 rounded-full w-fit mb-2">
                           <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">Welcome!</DialogTitle>
                        <DialogDescription>Want a quick tour?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-row justify-center sm:justify-center gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setShowTutorialPrompt(false)}>Maybe later</Button>
                        <Button onClick={() => { setShowTutorialPrompt(false); startTutorial(); }}>Start Tutorial</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {uiConfig?.remindersEnabled && (pinnedReminders.length + generalReminders.length) > 0 && (
              <Button 
                variant="outline" 
                className="h-11 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-300 transition-all w-full sm:w-auto font-bold" 
                onClick={() => setIsReminderStackOpen(true)}
              >
                <BellRing className="mr-2 h-4 w-4 shrink-0" />
                 <span className="truncate">Important Reminders</span>
                <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none shadow-none">{pinnedReminders.length + generalReminders.length}</Badge>
              </Button>
            )}

            <div className="grid grid-cols-2 lg:flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isImporting} className="w-full sm:w-auto h-11 font-bold">
                        <Upload className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleExport('current_view')}>Export Current View</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleExport('all_tasks')}>Export All Tasks</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDownloadTemplate}>Download Import Template</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full sm:w-auto h-11 font-bold">
                    <Download className="mr-2 h-4 w-4" />
                    Import
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                
                <Button asChild id="new-task-btn" disabled={isImporting} className="col-span-2 lg:col-auto w-full sm:w-auto h-11 shadow-lg font-bold">
                    <Link href="/tasks/new">
                        <Plus className="mr-2 h-5 w-5" /> New Task
                    </Link>
                </Button>
            </div>
        </div>
      </div>
      
      <div className="space-y-6">
          <div className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full flex lg:hidden items-center justify-between h-12 px-4 font-black shadow-sm border"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              >
                <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {(statusFilter.length > 0 || repoFilter.length > 0 || deploymentFilter.length > 0 || tagsFilter.length > 0) && (
                        <Badge className="bg-primary text-primary-foreground h-5 px-1.5 min-w-5">
                            {statusFilter.length + repoFilter.length + deploymentFilter.length + tagsFilter.length}
                        </Badge>
                    )}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isFiltersOpen && "rotate-180")} />
              </Button>

              <div className={cn(
                  "transition-all duration-300 overflow-hidden",
                  "lg:block", 
                  isFiltersOpen ? "block opacity-100 max-h-[1000px]" : "hidden lg:opacity-100 lg:max-h-none opacity-0 max-h-0"
              )}>
                <Card id="task-filters" className="border-none shadow-lg lg:shadow-none bg-card lg:bg-transparent">
                    <CardContent className="p-4 lg:p-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="relative flex flex-col w-full col-span-1 sm:col-span-2 lg:col-span-1">
                                <div className="relative flex items-center w-full">
                                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Search tasks..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        className="w-full pl-10 pr-24 h-11"
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
                                                    <div className="flex items-center gap-2">
                                                        <CornerDownLeft className="h-3 w-3" />
                                                        <span>Press Enter to search</span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>
                            <MultiSelect selected={statusFilter} onChange={setStatusFilter} options={(TASK_STATUSES || []).map(s => ({ value: s, label: s }))} placeholder="Status..." />
                            <MultiSelect selected={repoFilter} onChange={setRepoFilter} options={(uiConfig?.repositoryConfigs || []).map(r => ({ value: r.name, label: r.name }))} placeholder="Repository..." />
                            {(uiConfig?.fields || []).find(f => f.key === 'tags')?.isActive && (
                                <MultiSelect selected={tagsFilter} onChange={setTagsFilter} options={[...new Set(tasks.flatMap(t => t.tags || []))].map(t => ({value: t, label: t}))} placeholder="Tags..." />
                            )}
                            <MultiSelect selected={deploymentFilter} onChange={setDeploymentFilter} options={(uiConfig?.environments || []).flatMap(env => [{ value: env.name, label: `On ${env.name}` }, { value: `not_${env.name}`, label: `Not on ${env.name}` }])} placeholder="Deployment..." />
                        </div>
                    </CardContent>
                </Card>
              </div>
          </div>
          
           {searchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Search failed</AlertTitle>
                    <AlertDescription>{searchError}</AlertDescription>
                </Alert>
           )}

           <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6">
                <div className="flex items-center gap-4">
                    {(dateView === 'monthly' || dateView === 'yearly') && !favoritesOnly && (
                      <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" onClick={handlePreviousDate} className="h-10 w-10"><ChevronLeft className="h-4 w-4" /></Button>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" className="text-base font-semibold w-36 md:w-44 whitespace-nowrap h-10">
                                      {dateView === 'monthly' ? format(selectedDate, 'MMMM yyyy') : format(selectedDate, 'yyyy')}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={selectedDate} onSelect={(day) => day && setSelectedDate(day)} initialFocus />
                              </PopoverContent>
                          </Popover>
                          <Button variant="outline" size="icon" onClick={handleNextDate} className="h-10 w-10"><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                  )}
                    <div>
                      <h2 className="text-lg font-black tracking-tight">
                        {favoritesOnly ? 'Favorite Tasks' : `${sortedTasks.length} Results`}
                      </h2>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {favoritesOnly 
                          ? `Showing ${sortedTasks.length} favorited items.` 
                          : (dateView === 'all' ? 'Based on active filters.' : dateView === 'monthly' ? `Start date in ${format(selectedDate, 'MMM yyyy')}` : `Start date in ${format(selectedDate, 'yyyy')}`)}
                      </p>
                    </div>
                </div>

                <div id="view-mode-toggle" className="flex items-center gap-x-2 gap-y-2 flex-wrap justify-start sm:justify-end">
                  <Select value={sortDescriptor} onValueChange={setSortDescriptor}>
                      <SelectTrigger className="w-auto sm:w-[180px] h-10 font-semibold"><SelectValue placeholder="Sort by" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="status-asc">Status (Asc)</SelectItem>
                          <SelectItem value="status-desc">Status (Desc)</SelectItem>
                          <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                          <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                      </SelectContent>
                  </Select>

                   <div className="flex h-10 items-center justify-center rounded-md bg-muted p-1">
                        <Button variant={dateView === 'all' ? 'default' : 'ghost'} onClick={() => setDateView('all')} className={cn("h-8 shadow-sm px-3 font-bold", dateView === 'all' && 'bg-card text-foreground')}>All</Button>
                        <Button variant={dateView === 'monthly' ? 'default' : 'ghost'} onClick={() => setDateView('monthly')} className={cn("h-8 shadow-sm px-3 font-bold", dateView === 'monthly' && 'bg-card text-foreground')}>Monthly</Button>
                   </div>

                  <div className="flex items-center gap-2">
                    <div className="flex h-10 items-center justify-center rounded-md bg-muted p-1">
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", viewMode === 'grid' && 'bg-card text-foreground shadow-sm')} onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", viewMode === 'table' && 'bg-card text-foreground shadow-sm')} onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={favoritesOnly ? 'secondary' : 'outline'} size="icon" onClick={handleFavoritesToggle} className="h-10 w-10"><Heart className={cn("h-4 w-4", favoritesOnly && "fill-red-500 text-red-500")} /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{favoritesOnly ? 'All tasks' : 'Favorites only'}</p></TooltipContent>
                  </Tooltip>
                  </TooltipProvider>
                   <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={isSelectMode ? 'secondary' : 'outline'} size="icon" onClick={handleToggleSelectMode} className="h-10 w-10 relative overflow-hidden"><CheckSquare className={cn("h-4 w-4 transition-all duration-300", isSelectMode ? "opacity-0" : "opacity-100")} /><X className={cn("h-4 w-4 transition-all duration-300 absolute", isSelectMode ? "opacity-100" : "opacity-0")} /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isSelectMode ? 'Cancel selection' : 'Select multiple'}</p></TooltipContent>
                  </Tooltip>
                  </TooltipProvider>
              </div>
            </div>

            {isSelectMode && (
              <div className="sticky top-[68px] z-30 mb-4">
                <Card className="border-primary/50 bg-background/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="select-all-tasks" checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length} onCheckedChange={handleToggleSelectAll} />
                      <Label htmlFor="select-all-tasks" className="text-sm font-medium">{selectedTaskIds.length > 0 ? `${selectedTaskIds.length} selected` : `Select all`}</Label>
                    </div>

                    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto', selectedTaskIds.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                      <Button variant="outline" size="sm" onClick={() => setIsTagsDialogOpen(true)}><Tag className="mr-2 h-4 w-4" /> Tags</Button>
                      <Button variant="outline" size="sm" onClick={handleBulkCopyText}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
                      <Button variant="outline" size="sm" onClick={handleBulkExportPdf}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Move to Bin?</AlertDialogTitle><AlertDialogDescription>Move {selectedTaskIds.length} tasks to the bin?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div className="relative">
                {isSearching && (
                    <div className="absolute inset-x-0 -top-12 flex flex-col items-center justify-center z-20 pointer-events-none">
                        <div className="bg-background/95 backdrop-blur-sm px-5 py-2 rounded-full border shadow-lg flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                            <div className="flex flex-col leading-none">
                                <span className="text-xs font-bold tracking-tight">
                                    {showSlowSearchMessage ? "Still searching..." : "Searching tasks..."}
                                </span>
                                {showSlowSearchMessage && (
                                    <span className="text-[9px] text-muted-foreground mt-0.5">Thanks for your patience</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className={cn(
                    "transition-all duration-500",
                    isSearching ? "opacity-40 grayscale-[0.5] blur-[0.5px]" : "opacity-100 grayscale-0 blur-0"
                )}>
                    {sortedTasks.length > 0 ? (
                        <div>
                        {viewMode === 'grid' ? (
                            <TasksGrid tasks={sortedTasks} onTaskDelete={refreshData} onTaskUpdate={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} pinnedTaskIds={pinnedTaskIds} onPinToggle={handlePinToggle} currentQueryString={searchParams.toString()} favoritesOnly={favoritesOnly} />
                        ) : (
                            <TasksTable tasks={sortedTasks} onTaskDelete={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} openGroups={openGroups} setOpenGroups={setOpenGroups} currentQueryString={searchParams.toString()} favoritesOnly={favoritesOnly} />
                        )}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                            {favoritesOnly ? (
                                <>
                                    <Heart className="h-16 w-16 mb-4 opacity-20 text-red-500" />
                                    <p className="text-lg font-semibold">No favorite tasks found.</p>
                                    <p className="text-sm mt-1 max-w-xs mx-auto text-center font-medium">Tap the heart icon on any task card to add it to your personal favorites list.</p>
                                    <div className="flex gap-2 mt-6">
                                        <Button variant="outline" size="sm" onClick={() => setFavoritesOnly(false)} className="font-bold">View All Tasks</Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <FolderSearch className="h-16 w-16 mb-4 opacity-50"/>
                                    <p className="text-lg font-semibold">No tasks found.</p>
                                    <Button asChild className="mt-4 font-bold" size="sm"><Link href="/tasks/new"><Plus className="mr-2 h-4 w-4" /> Create Task</Link></Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
      </div>

      {uiConfig?.remindersEnabled && (pinnedReminders.length + generalReminders.length) > 0 && (
        <ReminderStack reminders={pinnedReminders} generalReminders={generalReminders} uiConfig={uiConfig} onUnpin={handleUnpinFromStack} onDismissGeneralReminder={handleDismissGeneralReminder} isOpen={isReminderStackOpen} onOpenChange={setIsReminderStackOpen} />
     )}
    </div>
  );
}
