
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTasks, addTask, addDeveloper, getDevelopers } from '@/lib/data';
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
import { TASK_STATUSES, REPOSITORIES } from '@/lib/constants';
import {
  LayoutGrid,
  List,
  Plus,
  Loader2,
  Search,
  Calendar as CalendarIcon,
  Download,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Environment } from '@/lib/types';
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
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useActiveCompany } from '@/hooks/use-active-company';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { taskSchema } from '@/lib/validators';

type ViewMode = 'grid' | 'table';

export default function Home() {
  const activeCompanyId = useActiveCompany();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [deploymentFilter, setDeploymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(
    undefined
  );
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    if (activeCompanyId) {
        setTasks(getTasks());
    }
  };

  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }
    document.title = 'Tasks | TaskFlow';
    refreshData();
    setIsLoading(false);
    
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, [activeCompanyId]);

  const filteredTasks = tasks.filter((task: Task) => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    
    const repoMatch = repoFilter === 'all' || task.repositories?.includes(repoFilter);

    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      searchQuery.trim() === '' ||
      task.title.toLowerCase().includes(searchLower) ||
      task.id.toLowerCase().includes(searchLower) ||
      (task.azureWorkItemId && task.azureWorkItemId.includes(searchQuery)) ||
      task.developers?.some((dev) => dev.toLowerCase().includes(searchLower)) ||
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
      (task.deploymentStatus?.[deploymentFilter as Environment] ?? false);

    return statusMatch && repoMatch && searchMatch && dateMatch && deploymentMatch;
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
      link.download = "TaskFlow_Import_Template.json";
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

              let importedCount = 0;
              const existingDevelopers = getDevelopers();

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
                  
                  const developers = validationResult.data.developers || [];
                  developers.forEach(dev => {
                      if (!existingDevelopers.includes(dev)) {
                          addDeveloper(dev);
                          existingDevelopers.push(dev);
                      }
                  });
                  
                  addTask(validationResult.data);
                  importedCount++;
              }
              
              if(importedCount > 0) {
                refreshData();
                toast({
                    variant: 'success',
                    title: 'Import Complete',
                    description: `${importedCount} tasks imported successfully.`
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


  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-lg font-semibold text-muted-foreground">
            Loading tasks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tasks
        </h1>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Export
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => handleExport(filteredTasks, 'TaskFlow_Export.json')}>
                    Export Current View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDownloadTemplate}>
                    Download Import Template
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
            
            <Button asChild>
            <Link href="/tasks/new">
                <Plus className="mr-2 h-4 w-4" />
                New Task
            </Link>
            </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1 flex-wrap">
          <div className="relative w-full sm:w-auto md:flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
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
            <SelectTrigger className="w-full sm:w-[180px] bg-card">
              <SelectValue placeholder="Filter by repository" />
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
              <SelectTrigger className="w-full sm:w-[190px] bg-card">
              <SelectValue placeholder="Filter by deployment" />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="all">Any Deployment</SelectItem>
              <SelectItem value="dev">Deployed to Dev</SelectItem>
              <SelectItem value="stage">Deployed to Stage</SelectItem>
              <SelectItem value="production">Deployed to Production</SelectItem>
              </SelectContent>
          </Select>
          
          <Popover
            open={isDatePopoverOpen}
            onOpenChange={setIsDatePopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-full sm:w-[260px] justify-start text-left font-normal bg-card',
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('grid')}
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
            onClick={() => setViewMode('table')}
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

      {filteredTasks.length > 0 ? (
        viewMode === 'grid' ? (
          <TasksGrid tasks={filteredTasks} onTaskDelete={refreshData} />
        ) : (
          <TasksTable tasks={filteredTasks} onTaskDelete={refreshData} />
        )
      ) : (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-lg font-semibold">No tasks found.</p>
          <p className="mt-1">
            Try adjusting your filters or create a new task.
          </p>
          <Button asChild className="mt-4">
            <Link href="/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              Create First Task
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
