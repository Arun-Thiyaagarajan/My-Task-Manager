
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTasks, addTask, addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester, updateDeveloper, updateTester, updateUiConfig, moveMultipleTasksToBin, getBinnedTasks } from '@/lib/data';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Person, UiConfig, RepositoryConfig } from '@/lib/types';
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
  subMonths,
  addMonths,
  subYears,
  addYears,
  setMonth,
  getYear,
  getMonth,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useActiveCompany } from '@/hooks/use-active-company';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { taskSchema } from '@/lib/validators';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { generateTaskPdf, generateTasksText } from '@/lib/share-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


type ViewMode = 'grid' | 'table';
type MainView = 'all' | 'monthly';

export default function Home() {
  const activeCompanyId = useActiveCompany();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [deploymentFilter, setDeploymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(
    undefined
  );
  const [sortDescriptor, setSortDescriptor] = useState('status-asc');
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { prompt } = useUnsavedChanges();
  const [mainView, setMainView] = useState<MainView>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const handlePreviousMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  const refreshData = () => {
    if (activeCompanyId) {
        setTasks(getTasks());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        const config = getUiConfig();
        setUiConfig(config);
        document.title = config.appName || 'My Task Manager';
        setSelectedTaskIds([]);
    }
  };

  useEffect(() => {
    const savedViewMode = localStorage.getItem('taskflow_view_mode') as ViewMode;
    if (savedViewMode) setViewMode(savedViewMode);
    
    const savedMainView = localStorage.getItem('taskflow_main_view') as MainView;
    if (savedMainView) setMainView(savedMainView);

    const savedMonth = localStorage.getItem('taskflow_selected_month');
    if (savedMonth) setSelectedMonth(new Date(savedMonth));

  }, []);

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

  useEffect(() => {
    localStorage.setItem('taskflow_main_view', mainView);
    localStorage.setItem('taskflow_selected_month', selectedMonth.toISOString());
  }, [mainView, selectedMonth]);

  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }
    refreshData();
    setIsLoading(false);
    
    window.addEventListener('storage', refreshData);
    window.addEventListener('config-changed', refreshData);
    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('config-changed', refreshData);
    };
  }, [activeCompanyId]);

  const filteredTasks = tasks.filter((task: Task) => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    
    const repoMatch = repoFilter === 'all' || task.repositories?.includes(repoFilter);

    const developersById = new Map(developers.map(d => [d.id, d.name]));
    const testersById = new Map(testers.map(t => [t.id, t.name]));

    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      searchQuery.trim() === '' ||
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower) ||
      task.id.toLowerCase().includes(searchLower) ||
      (task.azureWorkItemId && task.azureWorkItemId.includes(searchQuery)) ||
      task.developers?.some((devId) => (developersById.get(devId) || '').toLowerCase().includes(searchLower)) ||
      task.testers?.some((testerId) => (testersById.get(testerId) || '').toLowerCase().includes(searchLower)) ||
      task.repositories?.some((repo) =>
        repo.toLowerCase().includes(searchLower)
      );

    const dateMatch = (() => {
      if (mainView === 'monthly') {
        if (!task.devStartDate) return false;
        const taskDate = new Date(task.devStartDate);
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        return taskDate >= start && taskDate <= end;
      }
      // 'all' view
      if (!dateFilter?.from) return true;
      if (!task.devStartDate) return false;

      const taskDate = new Date(task.devStartDate);

      const from = startOfDay(dateFilter.from);
      const to = dateFilter.to
        ? endOfDay(dateFilter.to)
        : endOfDay(dateFilter.from);

      return taskDate >= from && taskDate <= to;
    })();
    
    const deploymentMatch =
      deploymentFilter === 'all' ||
      (task.deploymentStatus?.[deploymentFilter as string] ?? false);

    return statusMatch && repoMatch && searchMatch && dateMatch && deploymentMatch;
  });

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

      if (sortDirection === 'asc') {
        return scoreA - scoreB;
      } else {
        return scoreB - aIndex;
      }
    }

    return 0;
  });

  const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedTaskIds(checked === true ? sortedTasks.map(t => t.id) : []);
  };

  const handleExport = (exportType: 'current_view' | 'all_tasks', fileName: string) => {
    const allDevelopers = getDevelopers();
    const allTesters = getTesters();
    const currentUiConfig = getUiConfig();

    let activeTasksToExport: Task[] = [];
    let binnedTasksToExport: Task[] = [];

    if (exportType === 'all_tasks') {
        activeTasksToExport = getTasks();
        binnedTasksToExport = getBinnedTasks();
    } else { // 'current_view'
        activeTasksToExport = sortedTasks;
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
            developers: (developers || []).map(id => devIdToName.get(id) || id),
            testers: (testers || []).map(id => testerIdToName.get(id) || id),
        };
    };

    const activeTasksWithNames = activeTasksToExport.map(mapPersonIdsToNames);
    const binnedTasksWithNames = binnedTasksToExport.map(mapPersonIdsToNames);

    const cleanPerson = (p: Person) => ({ name: p.name, email: p.email || '', phone: p.phone || '' });

    const exportData: any = {
        appName: currentUiConfig.appName,
        appIcon: currentUiConfig.appIcon,
        repositoryConfigs: currentUiConfig.repositoryConfigs,
        developers: developersToExport.map(cleanPerson),
        testers: testersToExport.map(cleanPerson),
        tasks: activeTasksWithNames,
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
  };

  const handleDownloadTemplate = () => {
      const templateData = {
          appName: "My Awesome Project",
          appIcon: "🚀",
          repositoryConfigs: [
              { name: "UI-Dashboard", baseUrl: "https://github.com/org/ui-dashboard/pull/" },
              { name: "Backend-API", baseUrl: "https://github.com/org/backend-api/pull/" }
          ],
          developers: [
              { name: "Grace Hopper", email: "grace@example.com", phone: "111-222-3333" }
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
            }
          ]
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(templateData, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "MyTaskManager_Import_Template.json";
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
              let importedAppName: string | undefined = undefined;
              let importedAppIcon: string | null | undefined = undefined;

              const isIdRegex = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

              if (Array.isArray(parsedJson)) {
                  importedTasks = parsedJson;
                  const devNames = new Set<string>();
                  const testerNames = new Set<string>();
                  importedTasks.forEach(task => {
                      (task.developers || []).forEach(nameOrId => { if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId)) devNames.add(nameOrId); });
                      (task.testers || []).forEach(nameOrId => { if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId)) testerNames.add(nameOrId); });
                  });
                  devNames.forEach(name => importedDevelopers.push({ name }));
                  testerNames.forEach(name => importedTesters.push({ name }));

              } else if (parsedJson && typeof parsedJson === 'object') {
                  importedTasks = parsedJson.tasks || [];
                  importedBinnedTasks = parsedJson.trash || [];
                  importedDevelopers = parsedJson.developers || [];
                  importedTesters = parsedJson.testers || [];
                  importedRepoConfigs = parsedJson.repositoryConfigs;
                  importedAppName = parsedJson.appName;
                  importedAppIcon = parsedJson.appIcon;

                  // Scan tasks for new people from object-based format too
                  const devNames = new Set<string>();
                  const testerNames = new Set<string>();
                  const allImportedTasks = [...importedTasks, ...importedBinnedTasks];
                  allImportedTasks.forEach(task => {
                      (task.developers || []).forEach(nameOrId => { if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId)) devNames.add(nameOrId); });
                      (task.testers || []).forEach(nameOrId => { if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId)) testerNames.add(nameOrId); });
                  });

                  const existingDevNames = new Set(importedDevelopers.map(d => d.name?.toLowerCase()));
                  devNames.forEach(name => {
                      if (!existingDevNames.has(name.toLowerCase())) {
                          importedDevelopers.push({ name });
                      }
                  });

                  const existingTesterNames = new Set(importedTesters.map(t => t.name?.toLowerCase()));
                  testerNames.forEach(name => {
                      if (!existingTesterNames.has(name.toLowerCase())) {
                          importedTesters.push({ name });
                      }
                  });

              } else {
                   throw new Error("Invalid format: The JSON file must be a valid JSON object or array.");
              }

              // --- Pre-process UI Config (Branding, Repos) ---
              const currentUiConfig = getUiConfig();
              let configUpdated = false;

              if (importedAppName || typeof importedAppIcon !== 'undefined') {
                  currentUiConfig.appName = importedAppName || currentUiConfig.appName;
                  currentUiConfig.appIcon = typeof importedAppIcon === 'undefined' ? currentUiConfig.appIcon : importedAppIcon;
                  configUpdated = true;
              }
              
              if (importedRepoConfigs) {
                  const existingRepoConfigsByName = new Map(currentUiConfig.repositoryConfigs.map(r => [r.name, r]));
                  importedRepoConfigs.forEach(importedRepo => {
                      if (!importedRepo.name || !importedRepo.baseUrl) return;
                      const existingRepo = existingRepoConfigsByName.get(importedRepo.name);
                      if (existingRepo) { existingRepo.baseUrl = importedRepo.baseUrl; } 
                      else { currentUiConfig.repositoryConfigs.push({ id: `repo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, name: importedRepo.name, baseUrl: importedRepo.baseUrl }); }
                  });
                  const repoField = currentUiConfig.fields.find(f => f.key === 'repositories');
                  if (repoField) { repoField.options = currentUiConfig.repositoryConfigs.map(r => ({ id: r.id, value: r.name, label: r.name })); }
                  configUpdated = true;
              }
              
              if (configUpdated) {
                updateUiConfig(currentUiConfig);
                window.dispatchEvent(new Event('company-changed')); // Triggers header update
              }


              // --- Pre-process people ---
              const allExistingDevs = getDevelopers();
              const existingDevsByName = new Map(allExistingDevs.map(d => [d.name.toLowerCase(), d]));
              let devCreatedCount = 0;
              let devUpdatedCount = 0;
              importedDevelopers.forEach(dev => {
                  if (!dev.name) return;
                  const existingDev = existingDevsByName.get(dev.name.toLowerCase());
                  const personData = { name: dev.name, email: dev.email, phone: dev.phone };
                  if (!existingDev) { 
                      addDeveloper(personData); 
                      devCreatedCount++;
                  } else { 
                      updateDeveloper(existingDev.id, personData); 
                      devUpdatedCount++;
                  }
              });

              const allExistingTesters = getTesters();
              const existingTestersByName = new Map(allExistingTesters.map(t => [t.name.toLowerCase(), t]));
              let testerCreatedCount = 0;
              let testerUpdatedCount = 0;
              importedTesters.forEach(tester => {
                  if (!tester.name) return;
                  const existingTester = existingTestersByName.get(tester.name.toLowerCase());
                  const personData = { name: tester.name, email: tester.email, phone: tester.phone };
                  if (!existingTester) {
                      addTester(personData);
                      testerCreatedCount++;
                  } else { 
                      updateTester(existingTester.id, personData); 
                      testerUpdatedCount++;
                  }
              });

              // --- Process tasks (active and binned) ---
              let createdCount = 0, updatedCount = 0, binnedCreatedCount = 0, binnedUpdatedCount = 0, failedCount = 0;
              const allTasks = getTasks();
              const allBinnedTasks = getBinnedTasks();
              const existingTaskIds = new Set(allTasks.map(t => t.id));
              const existingBinnedTaskIds = new Set(allBinnedTasks.map(t => t.id));

              const finalAllDevs = getDevelopers();
              const finalAllTesters = getTesters();
              const devsByName = new Map(finalAllDevs.map(d => [d.name.toLowerCase(), d.id]));
              const allDevIds = new Set(finalAllDevs.map(d => d.id));
              const testersByName = new Map(finalAllTesters.map(t => [t.name.toLowerCase(), t.id]));
              const allTesterIds = new Set(finalAllTesters.map(t => t.id));
              
              const processTaskArray = (tasksToProcess: Partial<Task>[], isBinned: boolean) => {
                for (const taskData of tasksToProcess) {
                    
                    // --- PRE-PROCESSING STEP TO HANDLE FLAT CUSTOM FIELDS ---
                    const knownTaskKeys = new Set([
                        'id', 'title', 'description', 'status', 'createdAt', 'updatedAt',
                        'summary', 'deletedAt', 'repositories', 'azureWorkItemId', 'prLinks',
                        'deploymentStatus', 'deploymentDates', 'developers', 'testers',
                        'comments', 'attachments', 'devStartDate', 'devEndDate', 'qaStartDate',
                        'qaEndDate', 'customFields'
                    ]);
            
                    const processedTaskData: Partial<Task> = { ...taskData };
                    if (!processedTaskData.customFields) {
                        processedTaskData.customFields = {};
                    }

                    for (const key of Object.keys(taskData)) {
                        if (!knownTaskKeys.has(key)) {
                            // It's a custom field, move it.
                            (processedTaskData.customFields as any)[key] = (processedTaskData as any)[key];
                            delete (processedTaskData as any)[key];
                        }
                    }
                    // --- END PRE-PROCESSING ---

                    const validationResult = taskSchema.safeParse(processedTaskData);
                    if (!validationResult.success) {
                        console.error("Task import validation failed:", validationResult.error.flatten().fieldErrors, "for task data:", processedTaskData);
                        failedCount++;
                        continue;
                    }

                    const validatedData = validationResult.data;
                    if (validatedData.developers) { validatedData.developers = validatedData.developers.map(nameOrId => allDevIds.has(nameOrId) ? nameOrId : devsByName.get((nameOrId as string).toLowerCase()) || null).filter((id): id is string => !!id); }
                    if (validatedData.testers) { validatedData.testers = validatedData.testers.map(nameOrId => allTesterIds.has(nameOrId) ? nameOrId : testersByName.get((nameOrId as string).toLowerCase()) || null).filter((id): id is string => !!id); }

                    const allKnownIds = new Set([...existingTaskIds, ...existingBinnedTaskIds]);
                    if (validatedData.id && allKnownIds.has(validatedData.id)) {
                        updateTask(validatedData.id, validatedData);
                        isBinned ? binnedUpdatedCount++ : updatedCount++;
                    } else {
                        addTask(validatedData, isBinned);
                        isBinned ? binnedCreatedCount++ : createdCount++;
                    }
                }
              }

              processTaskArray(importedTasks, false);
              processTaskArray(importedBinnedTasks, true);

              // --- Final Feedback ---
              refreshData();

              let summaryParts: string[] = [];
              if (configUpdated) summaryParts.push('App settings updated.');
              if (devCreatedCount > 0) summaryParts.push(`${devCreatedCount} developer(s) added.`);
              if (devUpdatedCount > 0) summaryParts.push(`${devUpdatedCount} developer(s) updated.`);
              if (testerCreatedCount > 0) summaryParts.push(`${testerCreatedCount} tester(s) added.`);
              if (testerUpdatedCount > 0) summaryParts.push(`${testerUpdatedCount} tester(s) updated.`);
              if (createdCount > 0) summaryParts.push(`${createdCount} active task(s) created.`);
              if (updatedCount > 0) summaryParts.push(`${updatedCount} active task(s) updated.`);
              if (binnedCreatedCount > 0) summaryParts.push(`${binnedCreatedCount} binned task(s) created.`);
              if (binnedUpdatedCount > 0) summaryParts.push(`${binnedUpdatedCount} binned task(s) updated.`);

              if (summaryParts.length > 0) {
                  toast({
                      variant: 'success',
                      title: 'Import Successful',
                      description: summaryParts.join(' '),
                  });
              } else if (parsedJson && (importedTasks.length > 0 || importedBinnedTasks.length > 0 || importedDevelopers.length > 0 || importedTesters.length > 0 || configUpdated)) {
                  toast({
                      variant: 'default',
                      title: 'Import Complete',
                      description: 'No new data was added or existing data updated.',
                  });
              } else {
                 toast({ variant: 'warning', title: 'Empty or Invalid File', description: 'The imported file contained no data to process.' });
              }

              if (failedCount > 0) {
                  toast({
                      variant: 'destructive',
                      title: 'Import Warning',
                      description: `${failedCount} task(s) failed to import due to validation errors.`,
                  });
              }
              
          } catch (error: any) {
              console.error("Error importing file:", error);
              toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'There was an error processing your file. Please ensure it is a valid JSON file.' });
          } finally {
              if(fileInputRef.current) { fileInputRef.current.value = ''; }
          }
      };
      reader.readAsText(file);
  };
  
  const handleBulkDelete = () => {
    moveMultipleTasksToBin(selectedTaskIds);
    toast({
        variant: 'success',
        title: 'Tasks Moved to Bin',
        description: `${selectedTaskIds.length} tasks have been moved to the bin.`,
    });
    refreshData();
    setIsSelectMode(false);
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
    await generateMultipleTasksPdf(selectedTasks, uiConfig, developers, testers, 'save');
    toast({
        variant: 'success',
        title: 'PDF Exported',
        description: `${selectedTasks.length} task(s) have been exported to a PDF.`,
    });
  };


  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading tasks..." />;
  }
  
  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
  const REPOSITORIES = uiConfig.repositoryConfigs?.map(r => r.name) ?? INITIAL_REPOSITORY_CONFIGS.map(r => r.name);
  const TASK_STATUSES = uiConfig.taskStatuses;

  const handleNewTaskClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    prompt(() => router.push('/tasks/new'));
  };

  const resultsDescription = mainView === 'all'
    ? 'Based on your current filters.'
    : `Tasks with a start date in ${format(selectedMonth, 'MMMM yyyy')}.`;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tasks
        </h1>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Export
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => handleExport('current_view', 'MyTaskManager_Export.json')}>
                    Export Current View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport('all_tasks', 'MyTaskManager_All_Tasks.json')}>
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
            
            <Button asChild size="sm">
            <a href="/tasks/new" onClick={handleNewTaskClick}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
            </a>
            </Button>
        </div>
      </div>
      
      <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="relative sm:col-span-2 lg:col-span-3 xl:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Filter by ${fieldLabels.get('status') || 'Status'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={repoFilter} onValueChange={setRepoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Filter by ${fieldLabels.get('repositories') || 'Repository'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Repositories</SelectItem>
                    {REPOSITORIES.map((repo) => (
                      <SelectItem key={repo} value={repo}>
                        {repo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={deploymentFilter} onValueChange={setDeploymentFilter}>
                    <SelectTrigger>
                    <SelectValue placeholder={`Filter by ${fieldLabels.get('deploymentStatus') || 'Deployment'}`} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Any Deployment</SelectItem>
                    <SelectItem value="dev">Deployed to Dev</SelectItem>
                    <SelectItem value="stage">Deployed to Stage</SelectItem>
                    <SelectItem value="production">Deployed to Production</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              
              {mainView === 'all' && (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Popover
                        open={isDatePopoverOpen}
                        onOpenChange={setIsDatePopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={'outline'}
                            className={cn(
                              'w-full sm:w-auto justify-start text-left font-normal',
                              !dateFilter && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFilter?.from ? (
                              dateFilter.to ? (
                                <>
                                  {format(dateFilter.from, 'LLL dd, y')} -{' '}
                                  {format(dateFilter.to, 'LLL dd, y')}
                                </>
                              ) : (
                                format(dateFilter.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Filter by Dev Start Date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 flex" align="start">
                          <div className="flex flex-col space-y-1 p-2 border-r">
                            <Button
                              variant="ghost"
                              className="justify-start px-2 font-normal text-sm"
                              onClick={() => {
                                setDateFilter(undefined);
                                setIsDatePopoverOpen(false);
                              }}
                            >
                              Any time
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start px-2 font-normal text-sm"
                              onClick={() => {
                                setDateFilter({ from: new Date(), to: new Date() });
                                setIsDatePopoverOpen(false);
                              }}
                            >
                              Today
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start px-2 font-normal text-sm"
                              onClick={() => {
                                setDateFilter({
                                  from: subDays(new Date(), 6),
                                  to: new Date(),
                                });
                                setIsDatePopoverOpen(false);
                              }}
                            >
                              Last 7 days
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start px-2 font-normal text-sm"
                              onClick={() => {
                                setDateFilter({
                                  from: startOfMonth(new Date()),
                                  to: endOfMonth(new Date()),
                                });
                                setIsDatePopoverOpen(false);
                              }}
                            >
                              This month
                            </Button>
                            <Button
                              variant="ghost"
                              className="justify-start px-2 font-normal text-sm"
                              onClick={() => {
                                setDateFilter({
                                  from: startOfYear(new Date()),
                                  to: endOfYear(new Date()),
                                });
                                setIsDatePopoverOpen(false);
                              }}
                            >
                              This year
                            </Button>
                          </div>
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateFilter?.from}
                            selected={dateFilter}
                            onSelect={setDateFilter}
                            numberOfMonths={1}
                          />
                        </PopoverContent>
                      </Popover>
                  </div>
              )}
            </CardContent>
          </Card>
          
           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 my-6">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {mainView === 'monthly' && (
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Previous month">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="text-lg font-semibold text-foreground text-center sm:w-48 whitespace-nowrap flex items-center gap-1 hover:bg-muted"
                                    >
                                        {format(selectedMonth, 'MMMM yyyy')}
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <div className="p-2">
                                        <div className="flex justify-between items-center pb-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => setSelectedMonth(subYears(selectedMonth, 1))}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="font-semibold text-sm">{getYear(selectedMonth)}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => setSelectedMonth(addYears(selectedMonth, 1))}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1">
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const monthDate = setMonth(new Date(getYear(selectedMonth), 0, 1), i);
                                                return (
                                                    <Button
                                                        key={i}
                                                        variant={getMonth(selectedMonth) === i ? 'default' : 'ghost'}
                                                        size="sm"
                                                        className="w-full justify-center"
                                                        onClick={() => {
                                                            setSelectedMonth(monthDate);
                                                            setIsMonthPickerOpen(false);
                                                        }}
                                                    >
                                                        {format(monthDate, 'MMM')}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            
                            <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
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

                <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end w-full md:w-auto">
                    <Tabs value={mainView} onValueChange={(v) => setMainView(v as MainView)}>
                        <TabsList>
                            <TabsTrigger value="all">All Tasks</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    <Select value={sortDescriptor} onValueChange={setSortDescriptor}>
                        <SelectTrigger className="w-full sm:w-[180px]">
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

                    <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleToggleSelectMode}
                          className={cn(isSelectMode && 'bg-accent text-accent-foreground')}
                        >
                            <CheckSquare className="h-4 w-4" />
                            <span className="sr-only">Select Tasks</span>
                        </Button>
                        <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewModeChange('grid')}
                        className={cn(
                            viewMode === 'grid' &&
                            'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground'
                        )}
                        >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="sr-only">Grid View</span>
                        </Button>
                        <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewModeChange('table')}
                        className={cn(
                            viewMode === 'table' &&
                            'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground'
                        )}
                        >
                        <List className="h-4 w-4" />
                        <span className="sr-only">Table View</span>
                        </Button>
                    </div>
                </div>
            </div>

            {isSelectMode && (
              <Card className="mb-6 bg-muted border-primary/50">
                <CardContent className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                    <Label htmlFor="select-all-tasks" className="text-sm font-medium">
                      {selectedTaskIds.length > 0
                        ? `${selectedTaskIds.length} of ${sortedTasks.length} selected`
                        : sortedTasks.length > 0
                        ? `Select all tasks`
                        : 'No tasks to select'}
                    </Label>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-2 transition-opacity duration-300 w-full sm:w-auto justify-end',
                      selectedTaskIds.length > 0
                        ? 'opacity-100'
                        : 'opacity-0 pointer-events-none h-0 sm:h-auto overflow-hidden'
                    )}
                  >
                    <Button variant="outline" size="sm" onClick={handleBulkCopyText}>
                      <Copy className="mr-2 h-4 w-4" /> Copy as Text
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkExportPdf}>
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
                            {selectedTaskIds.length} task(s) to the bin? You can restore
                            them later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDelete}>
                            Move to Bin
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

          {sortedTasks.length > 0 ? (
            viewMode === 'grid' ? (
              <TasksGrid tasks={sortedTasks} onTaskDelete={refreshData} onTaskUpdate={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} />
            ) : (
              <TasksTable tasks={sortedTasks} onTaskDelete={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds} isSelectMode={isSelectMode} />
            )
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
    </div>
  );
}

    
