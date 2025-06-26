
'use client';

import { useState, useEffect } from 'react';
import { getTasks } from '@/lib/data';
import type { Task, Developer } from '@/lib/types';
import { TASK_STATUSES, REPOSITORIES, ENVIRONMENTS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, PieChartIcon, ListChecks, CheckCircle2, Loader2, Bug, GitMerge, Server } from 'lucide-react';
import { Bar, Pie, PieChart, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getAvatarColor } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | TaskFlow';
    setTasks(getTasks());
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  // Key Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'Done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const qaTasks = tasks.filter(task => task.status === 'QA').length;

  const summaryStats = [
    { title: 'Total Tasks', value: totalTasks, icon: ListChecks },
    { title: 'Completed', value: completedTasks, icon: CheckCircle2 },
    { title: 'In Progress', value: inProgressTasks, icon: Loader2 },
    { title: 'In QA', value: qaTasks, icon: Bug },
  ];

  // Chart data calculations
  const tasksByStatusData = TASK_STATUSES.map(status => ({
    name: status,
    count: tasks.filter(task => task.status === status).length,
  }));

  const tasksByStatusConfig = {
    count: {
      label: 'Tasks',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;


  const developersWithTasks = tasks.reduce((acc, task) => {
    (task.developers || []).forEach(dev => {
      acc[dev] = (acc[dev] || 0) + 1;
    });
    return acc;
  }, {} as Record<Developer, number>);

  const tasksByDeveloperData = Object.entries(developersWithTasks).map(([name, value]) => ({
    name,
    value,
    fill: `#${getAvatarColor(name)}`,
  }));

  const tasksByDeveloperConfig = tasksByDeveloperData.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
  }, {} as ChartConfig);
  
  // New Chart: Tasks by Repository
  const tasksByRepoData = REPOSITORIES.map(repo => ({
    name: repo,
    count: tasks.filter(task => task.repositories?.includes(repo)).length,
  })).filter(item => item.count > 0);

  const tasksByRepoConfig = {
    count: {
      label: 'Tasks',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;
  
  // New Chart: Deployments by Environment
  const deploymentsByEnvData = ENVIRONMENTS.map(env => ({
    name: env,
    count: tasks.filter(task => {
        const isSelected = task.deploymentStatus?.[env] ?? false;
        // For 'dev', being selected is enough to be considered deployed.
        if (env === 'dev') return isSelected;
        // For other envs, a date is required.
        const hasDate = task.deploymentDates && task.deploymentDates[env];
        return isSelected && !!hasDate;
    }).length,
  }));

  const deploymentsByEnvConfig = {
    count: {
        label: 'Deployments',
        color: 'hsl(var(--chart-3))',
    },
  } satisfies ChartConfig;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">
        Dashboard
      </h1>
      {tasks.length === 0 ? (
         <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-lg font-semibold">No data to display.</p>
          <p className="mt-1">
            Create some tasks to see your dashboard metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryStats.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                             <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart className="h-5 w-5" />
                            Tasks by Status
                        </CardTitle>
                        <CardDescription>Distribution of tasks across all statuses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={tasksByStatusConfig} className="h-[300px] w-full">
                            <RechartsBarChart data={tasksByStatusData} accessibilityLayer>
                                 <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => value.slice(0, 10)}
                                 />
                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                 <ChartTooltip content={<ChartTooltipContent />} />
                                 <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5" />
                            Tasks per Developer
                        </CardTitle>
                         <CardDescription>Breakdown of task assignments to developers.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                       <ChartContainer config={tasksByDeveloperConfig} className="h-[300px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={tasksByDeveloperData} dataKey="value" nameKey="name" innerRadius={60}>
                                    {tasksByDeveloperData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend content={({ payload }) => (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-4 text-sm">
                                    {payload?.map((entry, index) => (
                                        <div key={`item-${index}`} className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span>{entry.value}</span>
                                        </div>
                                    ))}
                                    </div>
                                )} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitMerge className="h-5 w-5" />
                            Tasks by Repository
                        </CardTitle>
                        <CardDescription>Distribution of tasks across repositories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={tasksByRepoConfig} className="h-[300px] w-full">
                            <RechartsBarChart data={tasksByRepoData} layout="vertical" accessibilityLayer>
                                 <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} hide />
                                 <YAxis
                                    type="category"
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    width={100}
                                 />
                                 <ChartTooltip content={<ChartTooltipContent />} />
                                 <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            Deployments by Environment
                        </CardTitle>
                        <CardDescription>Count of completed deployments per environment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={deploymentsByEnvConfig} className="h-[300px] w-full">
                            <RechartsBarChart data={deploymentsByEnvData} accessibilityLayer>
                                 <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                                 />
                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                 <ChartTooltip content={<ChartTooltipContent />} />
                                 <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
