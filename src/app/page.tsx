'use client';

import { useState } from 'react';
import { getTasks } from '@/lib/data';
import { TaskCard } from '@/components/task-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPOSITORIES, TASK_STATUSES } from '@/lib/constants';

export default function Home() {
  const tasks = getTasks();
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');

  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const repoMatch = repoFilter === 'all' || task.repository === repoFilter;
    return statusMatch && repoMatch;
  });

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tasks
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
      </div>
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No tasks found.</p>
          <p>Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}
