
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
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

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
    const dataForSheet = tasksToExport.map(task => ({
      'Title': task.title,
      'Description': task.description,
      'Status': task.status,
      'Developers': task.developers?.join(', ') ?? '',
      'Repositories': task.repositories?.join(', ') ?? '',
      'Azure Work Item ID': task.azureWorkItemId ?? '',
      'Dev Start Date': task.devStartDate ? format(new Date(task.devStartDate), 'yyyy-MM-dd') : '',
      'Dev End Date': task.devEndDate ? format(new Date(task.devEndDate), 'yyyy-MM-dd') : '',
      'QA Start Date': task.qaStartDate ? format(new Date(task.qaStartDate), 'yyyy-MM-dd') : '',
      'QA End Date': task.qaEndDate ? format(new Date(task.qaEndDate), 'yyyy-MM-dd') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, fileName);
    
    toast({
        variant: 'success',
        title: 'Export Successful',
        description: `${tasksToExport.length} tasks exported successfully.`
    });
  };

  const handleDownloadTemplate = () => {
      const headers = [
        ['Title', 'Description', 'Status', 'Developers', 'Repositories', 
        'Azure Work Item ID', 'Dev Start Date', 'Dev End Date', 'QA Start Date', 'QA End Date']
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(headers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
      XLSX.writeFile(workbook, "TaskFlow_Import_Template.xlsx");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array', cellDates: true });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json: any[] = XLSX.utils.sheet_to_json(worksheet);
              
              let importedCount = 0;
              const existingDevelopers = getDevelopers();

              for (const row of json) {
                  if (!row.Title || !row.Description || !row.Status || !TASK_STATUSES.includes(row.Status)) {
                      toast({
                          variant: 'destructive',
                          title: 'Invalid Data Found',
                          description: 'Redirecting to fix the invalid task. Please correct the errors and save.',
                      });
                      sessionStorage.setItem('failed_import_row', JSON.stringify(row));
                      router.push('/tasks/new');
                      if(fileInputRef.current) fileInputRef.current.value = '';
                      return; 
                  }
                  
                  const developers = row.Developers ? String(row.Developers).split(',').map(d => d.trim()).filter(Boolean) : [];
                  developers.forEach(dev => {
                      if (!existingDevelopers.includes(dev)) {
                          addDeveloper(dev);
                          existingDevelopers.push(dev);
                      }
                  });
                  
                  const taskData: Partial<Task> = {
                      title: row.Title,
                      description: row.Description,
                      status: row.Status,
                      developers: developers,
                      repositories: row.Repositories ? String(row.Repositories).split(',').map(r => r.trim()).filter(Boolean) : [],
                      azureWorkItemId: row['Azure Work Item ID'] ? String(row['Azure Work Item ID']) : undefined,
                      devStartDate: row['Dev Start Date'] ? new Date(row['Dev Start Date']).toISOString() : null,
                      devEndDate: row['Dev End Date'] ? new Date(row['Dev End Date']).toISOString() : null,
                      qaStartDate: row['QA Start Date'] ? new Date(row['QA Start Date']).toISOString() : null,
                      qaEndDate: row['QA End Date'] ? new Date(row['QA End Date']).toISOString() : null,
                  };
                  
                  addTask(taskData);
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

          } catch (error) {
              console.error("Error importing file:", error);
              toast({
                  variant: 'destructive',
                  title: 'Import Failed',
                  description: 'There was an error processing your file. Please ensure it is a valid Excel file.'
              });
          } finally {
              if(fileInputRef.current) {
                  fileInputRef.current.value = '';
              }
          }
      };
      reader.readAsArrayBuffer(file);
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
                <DropdownMenuItem onSelect={() => handleExport(filteredTasks, 'TaskFlow_Export.xlsx')}>
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
                accept=".xlsx, .xls"
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
          <div className="relative w-full sm:w-64">
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
