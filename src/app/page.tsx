'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getTasks } from '@/lib/data';
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
import { REPOSITORIES, TASK_STATUSES } from '@/lib/constants';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

type ViewMode = 'grid' | 'table';

export default function Home() {
  const tasks = getTasks();
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredTasks = tasks.filter((task: Task) => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const repoMatch = repoFilter === 'all' || task.repository === repoFilter;
    return statusMatch && repoMatch;
  });

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tasks
        </h1>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {TASK_STATUSES.map(status => (
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
              {REPOSITORIES.map(repo => (
                <SelectItem key={repo} value={repo}>
                  {repo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={cn(viewMode === 'grid' && 'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground')}>
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Grid View</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('table')} className={cn(viewMode === 'table' && 'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground')}>
                <List className="h-4 w-4" />
                <span className="sr-only">Table View</span>
            </Button>
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        viewMode === 'grid' ? <TasksGrid tasks={filteredTasks} /> : <TasksTable tasks={filteredTasks} />
      ) : (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-lg font-semibold">No tasks found.</p>
          <p className="mt-1">Try adjusting your filters or create a new task.</p>
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
