
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTasks, addTask, addDeveloper, getDevelopers, getUiConfig, updateTask, getTesters, addTester } from '@/lib/data';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Person, UiConfig } from '@/lib/types';
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
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useActiveCompany } from '@/hooks/use-active-company';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { taskSchema } from '@/lib/validators';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

type ViewMode = 'grid' | 'table';

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
    localStorage.setItem('taskflow_view_mode', mode);
    setViewMode(mode);
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
      if (!dateFilter?.from) return true;
      if (!task.devEndDate) return false;

      const taskDate = new Date(task.devEndDate);

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

    return 0;
  });

  const handleExport = (tasksToExport: Task[], fileName: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(tasksToExport, null, 2)
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
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify([], null, 2)
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
              const importedTasks: Partial<Task>[] = JSON.parse(text);

              if (!Array.isArray(importedTasks)) {
                  throw new Error("Invalid format: JSON file must contain an array of tasks.");
              }

              let createdCount = 0;
              let updatedCount = 0;
              const allTasks = getTasks();
              const existingTaskIds = new Set(allTasks.map(t => t.id));

              for (const taskData of importedTasks) {
                  // This is a superficial check, the main validation is in the form
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

                  const existingDevelopers = getDevelopers();
                  if (validatedData.developers) {
                    validatedData.developers.forEach(devNameOrId => {
                        if (!existingDevelopers.some(d => d.id === devNameOrId || d.name === devNameOrId)) {
                            addDeveloper({ name: devNameOrId });
                        }
                    });
                  }
                  
                  const existingTesters = getTesters();
                   if (validatedData.testers) {
                    validatedData.testers.forEach(testerNameOrId => {
                        if (!existingTesters.some(t => t.id === testerNameOrId || t.name === testerNameOrId)) {
                            addTester({ name: testerNameOrId });
                        }
                    });
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
                <DropdownMenuItem onSelect={() => handleExport(sortedTasks, 'MyTaskManager_Export.json')}>
                    Export Current View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport(getTasks(), 'MyTaskManager_All_Tasks.json')}>
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

      <Card className="mb-6">
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
                      <span>Filter by Dev End Date</span>
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
        </CardContent>
      </Card>
      
      <div className="flex justify-end items-center gap-4 mb-6">
          <Select value={sortDescriptor} onValueChange={setSortDescriptor}>
              <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="status-asc">Status (Asc)</SelectItem>
                  <SelectItem value="status-desc">Status (Desc)</SelectItem>
                  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z-A)</SelectItem>
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
    </div>
  );
}
