
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTasks, addTask, addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester, updateDeveloper, updateTester, updateUiConfig } from '@/lib/data';
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
import { TASK_STATUSES, INITIAL_REPOSITORY_CONFIGS } from '@/lib/constants';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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

  const handlePreviousMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  const refreshData = () => {
    if (activeCompanyId) {
        setTasks(getTasks());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        setUiConfig(getUiConfig());
    }
  };

  useEffect(() => {
    const savedViewMode = localStorage.getItem('taskflow_view_mode') as ViewMode;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'grid' || mode === 'table') {
      localStorage.setItem('taskflow_view_mode', mode);
      setViewMode(mode);
    }
  };

  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }
    document.title = 'Tasks | My Task Manager';
    refreshData();
    setIsLoading(false);
    
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
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

    if (sortBy === 'title') {
      if (sortDirection === 'asc') {
        return a.title.localeCompare(b.title);
      } else {
        return b.title.localeCompare(a.title);
      }
    }

    if (sortBy === 'status') {
      const aIndex = TASK_STATUSES.indexOf(a.status);
      const bIndex = TASK_STATUSES.indexOf(b.status);
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
        return scoreB - scoreA;
      }
    }

    return 0;
  });

  const handleExport = (tasksToExport: Task[], fileName: string, exportAllPeople: boolean) => {
    const allDevelopers = getDevelopers();
    const allTesters = getTesters();
    const currentUiConfig = getUiConfig();
    
    let developersToExport: Person[];
    let testersToExport: Person[];

    if (exportAllPeople) {
        developersToExport = allDevelopers;
        testersToExport = allTesters;
    } else {
        const devIdsInExport = new Set<string>();
        const testerIdsInExport = new Set<string>();
        tasksToExport.forEach(task => {
            (task.developers || []).forEach(id => devIdsInExport.add(id));
            (task.testers || []).forEach(id => testerIdsInExport.add(id));
        });

        developersToExport = allDevelopers.filter(d => devIdsInExport.has(d.id));
        testersToExport = allTesters.filter(t => testerIdsInExport.has(t.id));
    }

    // Still map IDs to names inside task objects for portability between systems
    const devIdToName = new Map(allDevelopers.map(d => [d.id, d.name]));
    const testerIdToName = new Map(allTesters.map(t => [t.id, t.name]));

    const tasksWithNames = tasksToExport.map(task => {
        const { developers, testers, ...restOfTask } = task;
        return {
            ...restOfTask,
            developers: (developers || []).map(id => devIdToName.get(id) || id),
            testers: (testers || []).map(id => testerIdToName.get(id) || id),
        };
    });
    
    // Remove IDs from exported people to avoid collisions, we'll match by name on import
    const cleanPerson = (p: Person) => ({ name: p.name, email: p.email || '', phone: p.phone || '' });

    const exportData = {
        repositoryConfigs: currentUiConfig.repositoryConfigs,
        developers: developersToExport.map(cleanPerson),
        testers: testersToExport.map(cleanPerson),
        tasks: tasksWithNames,
    };

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
        description: `${tasksToExport.length} tasks exported successfully.`
    });
  };

  const handleDownloadTemplate = () => {
      const templateData = {
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

              let importedTasks: Partial<Task>[];
              let importedDevelopers: Partial<Omit<Person, 'id'>>[] = [];
              let importedTesters: Partial<Omit<Person, 'id'>>[] = [];
              let importedRepoConfigs: RepositoryConfig[] | undefined = undefined;

              if (Array.isArray(parsedJson)) {
                  // Legacy format: array of tasks
                  importedTasks = parsedJson;
                  // In legacy, we have to extract names from tasks
                  const devNames = new Set<string>();
                  const testerNames = new Set<string>();
                  const isIdRegex = /^[a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  importedTasks.forEach(task => {
                      (task.developers || []).forEach(nameOrId => {
                          if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId)) devNames.add(nameOrId);
                      });
                      (task.testers || []).forEach(nameOrId => {
                          if (typeof nameOrId === 'string' && !isIdRegex.test(nameOrId)) testerNames.add(nameOrId);
                      });
                  });
                  devNames.forEach(name => importedDevelopers.push({ name }));
                  testerNames.forEach(name => importedTesters.push({ name }));

              } else if (parsedJson && Array.isArray(parsedJson.tasks)) {
                  // New format: object with tasks, developers, testers
                  importedTasks = parsedJson.tasks;
                  importedDevelopers = parsedJson.developers || [];
                  importedTesters = parsedJson.testers || [];
                  importedRepoConfigs = parsedJson.repositoryConfigs;
              } else {
                   throw new Error("Invalid format: JSON file must contain an array of tasks or an object with a 'tasks' array.");
              }

              // --- Pre-process Repository Configs ---
              if (importedRepoConfigs) {
                  const currentUiConfig = getUiConfig();
                  const existingRepoConfigsByName = new Map(currentUiConfig.repositoryConfigs.map(r => [r.name, r]));

                  importedRepoConfigs.forEach(importedRepo => {
                      if (!importedRepo.name || !importedRepo.baseUrl) return; // Skip invalid entries
                      const existingRepo = existingRepoConfigsByName.get(importedRepo.name);
                      if (existingRepo) {
                          // Update existing
                          existingRepo.baseUrl = importedRepo.baseUrl;
                      } else {
                          // Add new
                          currentUiConfig.repositoryConfigs.push({
                              id: `repo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                              name: importedRepo.name,
                              baseUrl: importedRepo.baseUrl,
                          });
                      }
                  });
                  
                  const repoField = currentUiConfig.fields.find(f => f.key === 'repositories');
                  if (repoField) {
                      repoField.options = currentUiConfig.repositoryConfigs.map(r => ({ id: r.id, value: r.name, label: r.name }));
                  }

                  updateUiConfig(currentUiConfig);
                  toast({
                      title: 'Repositories Updated',
                      description: 'Repository configurations have been imported.',
                      variant: 'success'
                  });
              }

              // --- Pre-process people ---
              const allExistingDevs = getDevelopers();
              const existingDevsByName = new Map(allExistingDevs.map(d => [d.name.toLowerCase(), d]));
              importedDevelopers.forEach(dev => {
                  if (!dev.name) return;
                  const existingDev = existingDevsByName.get(dev.name.toLowerCase());
                  const personData = { name: dev.name, email: dev.email, phone: dev.phone };
                  if (!existingDev) {
                      addDeveloper(personData);
                  } else {
                      // Always update with data from the imported file.
                      updateDeveloper(existingDev.id, personData);
                  }
              });

              const allExistingTesters = getTesters();
              const existingTestersByName = new Map(allExistingTesters.map(t => [t.name.toLowerCase(), t]));
              importedTesters.forEach(tester => {
                  if (!tester.name) return;
                  const existingTester = existingTestersByName.get(tester.name.toLowerCase());
                  const personData = { name: tester.name, email: tester.email, phone: tester.phone };
                  if (!existingTester) {
                      addTester(personData);
                  } else {
                      // Always update with data from the imported file.
                      updateTester(existingTester.id, personData);
                  }
              });

              // --- Process tasks ---
              let createdCount = 0;
              let updatedCount = 0;
              const allTasks = getTasks();
              const existingTaskIds = new Set(allTasks.map(t => t.id));

              // Get all people once after potential additions
              const finalAllDevs = getDevelopers();
              const finalAllTesters = getTesters();
              const devsByName = new Map(finalAllDevs.map(d => [d.name.toLowerCase(), d.id]));
              const allDevIds = new Set(finalAllDevs.map(d => d.id));
              const testersByName = new Map(finalAllTesters.map(t => [t.name.toLowerCase(), t.id]));
              const allTesterIds = new Set(finalAllTesters.map(t => t.id));

              for (const taskData of importedTasks) {
                  const validationResult = taskSchema.safeParse(taskData);
                  
                  if (!validationResult.success) {
                      toast({
                          variant: 'destructive',
                          title: 'Invalid Data Found',
                          description: 'Redirecting to fix the invalid task. Please correct the errors and save.',
                      });
                      sessionStorage.setItem('failed_import_row', JSON.stringify(taskData));
                      router.push('/tasks/new');
                      if(fileInputRef.current) fileInputRef.current.value = '';
                      return; 
                  }
                  
                  const validatedData = validationResult.data;
                  
                  // Convert names to IDs before saving
                  if (validatedData.developers) {
                    validatedData.developers = validatedData.developers
                        .map(nameOrId => {
                            if (allDevIds.has(nameOrId)) return nameOrId; // It's already an ID
                            return devsByName.get((nameOrId as string).toLowerCase()) || null;
                        })
                        .filter((id): id is string => !!id);
                  }

                  if (validatedData.testers) {
                    validatedData.testers = validatedData.testers
                        .map(nameOrId => {
                            if (allTesterIds.has(nameOrId)) return nameOrId; // It's already an ID
                            return testersByName.get((nameOrId as string).toLowerCase()) || null;
                        })
                        .filter((id): id is string => !!id);
                  }

                  if (validatedData.id && existingTaskIds.has(validatedData.id)) {
                      updateTask(validatedData.id, validatedData);
                      updatedCount++;
                  } else {
                      const newTask = addTask(validatedData);
                      existingTaskIds.add(newTask.id); 
                      createdCount++;
                  }
              }
              
              if(createdCount > 0 || updatedCount > 0) {
                refreshData();
                let description = '';
                if (createdCount > 0) description += `${createdCount} tasks created. `;
                if (updatedCount > 0) description += `${updatedCount} tasks updated.`;
                toast({
                    variant: 'success',
                    title: 'Import Complete',
                    description: description.trim()
                });
              } else if (importedTasks.length > 0) {
                 toast({
                    variant: 'default',
                    title: 'Import Complete',
                    description: 'No new tasks were created or updated.',
                 });
              } else {
                 toast({
                    variant: 'warning',
                    title: 'Empty File',
                    description: 'The imported file contained no tasks.',
                 });
              }

          } catch (error: any) {
              console.error("Error importing file:", error);
              toast({
                  variant: 'destructive',
                  title: 'Import Failed',
                  description: error.message || 'There was an error processing your file. Please ensure it is a valid JSON file.'
              });
          } finally {
              if(fileInputRef.current) {
                  fileInputRef.current.value = '';
              }
          }
      };
      reader.readAsText(file);
  };


  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading tasks..." />;
  }
  
  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
  const REPOSITORIES = uiConfig.repositoryConfigs?.map(r => r.name) ?? INITIAL_REPOSITORY_CONFIGS.map(r => r.name);

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
                <DropdownMenuItem onSelect={() => handleExport(sortedTasks, 'MyTaskManager_Export.json', false)}>
                    Export Current View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport(getTasks(), 'MyTaskManager_All_Tasks.json', true)}>
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
      
      <Tabs value={mainView} onValueChange={(value) => setMainView(value as MainView)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:max-w-xs">
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

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
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {mainView === 'monthly' ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Previous month">
                      <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                      <PopoverTrigger asChild>
                          <Button
                              variant="ghost"
                              className="text-xl font-semibold text-foreground text-center sm:w-48 whitespace-nowrap flex items-center gap-1 hover:bg-muted"
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
            ) : <div />}

            <div className={cn("flex items-center gap-4", mainView === 'monthly' ? 'self-end sm:self-center' : 'w-full justify-between')}>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {sortedTasks.length} {sortedTasks.length === 1 ? 'Result' : 'Results'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {resultsDescription}
                  </p>
                </div>
                <div className="flex items-center gap-4">
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
          </div>

          {sortedTasks.length > 0 ? (
            viewMode === 'grid' ? (
              <TasksGrid tasks={sortedTasks} onTaskDelete={refreshData} onTaskUpdate={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} />
            ) : (
              <TasksTable tasks={sortedTasks} onTaskDelete={refreshData} uiConfig={uiConfig} developers={developers} testers={testers} />
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
      </Tabs>
    </div>
  );
}
