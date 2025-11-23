
'use client';

import { useState, useEffect } from 'react';
import { getTasks, getUiConfig, getDevelopers, getTesters } from '@/lib/data';
import type { Task, Person, UiConfig, Environment } from '@/lib/types';
import { REPOSITORIES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, PieChartIcon, ListChecks, CheckCircle2, Loader2, Bug, GitMerge, Server, Code2, ClipboardCheck, LineChart, Tag, GitBranch } from 'lucide-react';
import { Bar, Pie, PieChart, Line, BarChart as RechartsBarChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getAvatarColor, cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);

  useEffect(() => {
    const refreshData = () => {
        setTasks(getTasks());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        const config = getUiConfig();
        setUiConfig(config);
        document.title = `Dashboard | ${config.appName || 'My Task Manager'}`;
        setIsLoading(false);
    };
    
    refreshData();

    window.addEventListener('storage', refreshData);
    window.addEventListener('config-changed', refreshData);

    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('config-changed', refreshData);
    };
  }, []);

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));
  const TASK_STATUSES = uiConfig.taskStatuses;
  const ENVIRONMENTS: Environment[] = uiConfig.environments || [];


  // Key Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'Done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const qaTasks = tasks.filter(task => task.status === 'QA').length;

  const summaryStats = [
    { title: 'Total Tasks', value: totalTasks, icon: ListChecks, color: 'text-muted-foreground', borderColor: 'border-border' },
    { title: 'Completed', value: completedTasks, icon: CheckCircle2, color: 'text-chart-2', borderColor: 'border-chart-2' },
    { title: 'In Progress', value: inProgressTasks, icon: Loader2, color: 'text-primary', borderColor: 'border-primary' },
    { title: 'In QA', value: qaTasks, icon: Bug, color: 'text-chart-4', borderColor: 'border-chart-4' },
  ];

  // Chart data calculations
  const tasksByStatusData = TASK_STATUSES.map(status => ({
    name: status,
    count: tasks.filter(task => task.status === status).length,
    fill: `var(--color-${status.toLowerCase().replace(' ', '-')})`,
  }));

  const tasksByStatusConfig = TASK_STATUSES.reduce((acc, status) => {
    acc[status] = { label: status, color: `hsl(var(--chart-${(TASK_STATUSES.indexOf(status) % 5) + 1}))` };
    return acc;
  }, {} as ChartConfig);

  const developersById = new Map(developers.map(d => [d.id, d]));
  const tasksByDeveloperId = tasks.reduce((acc, task) => {
    (task.developers || []).forEach(devId => {
      acc[devId] = (acc[devId] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const tasksByDeveloperData = Object.entries(tasksByDeveloperId).map(([devId, value]) => {
      const developer = developersById.get(devId);
      const name = developer ? developer.name : 'Unknown';
      return {
          name,
          tasks: value,
          fill: `#${getAvatarColor(name)}`,
      };
  });

  const tasksByDeveloperConfig = tasksByDeveloperData.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
  }, {} as ChartConfig);


  // Deployments by Environment
  const deploymentsByEnvData = ENVIRONMENTS.map((env, index) => ({
    name: env.name,
    count: tasks.filter(task => {
        const isSelected = task.deploymentStatus?.[env.name] ?? false;
        if (env.name === 'dev') return isSelected;
        const hasDate = task.deploymentDates && task.deploymentDates[env.name];
        return isSelected && !!hasDate;
    }).length,
    fill: `var(--color-deployments-${index})`
  }));

  const deploymentsByEnvConfig = ENVIRONMENTS.reduce((acc, env, index) => {
    acc[`deployments-${index}`] = { label: env.name, color: `hsl(var(--chart-${(index % 5) + 1}))` };
    return acc;
  }, {
    count: { label: 'Deployments' }
  } as ChartConfig);

  // Monthly Task Trends
  const monthlyData: { name: string; created: number; completed: number }[] = [];
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

  for (let i = 0; i < 6; i++) {
    const month = startOfMonth(subMonths(new Date(), 5 - i));
    monthlyData.push({
      name: format(month, 'MMM'),
      created: 0,
      completed: 0,
    });
  }

  tasks.forEach(task => {
    const createdAt = new Date(task.createdAt);
    if (createdAt >= sixMonthsAgo) {
      const monthIndex = 5 - (new Date().getMonth() - createdAt.getMonth() + 12 * (new Date().getFullYear() - createdAt.getFullYear()));
      if (monthIndex >= 0 && monthIndex < 6) {
        monthlyData[monthIndex].created += 1;
      }
    }
    // Using updatedAt for completed tasks is a proxy. A dedicated `completedAt` field would be better.
    if (task.status === 'Done') {
        const completedAt = new Date(task.updatedAt);
         if (completedAt >= sixMonthsAgo) {
            const monthIndex = 5 - (new Date().getMonth() - completedAt.getMonth() + 12 * (new Date().getFullYear() - completedAt.getFullYear()));
            if (monthIndex >= 0 && monthIndex < 6) {
              monthlyData[monthIndex].completed += 1;
            }
        }
    }
  });
  
  const monthlyChartConfig = {
      created: { label: 'Created', color: 'hsl(var(--chart-1))' },
      completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
  } satisfies ChartConfig;

  // Tasks by Tag
  const tasksByTag = tasks.reduce((acc, task) => {
    (task.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const tasksByTagData = Object.entries(tasksByTag).map(([name, value]) => ({ name, tasks: value }));
  const tasksByTagConfig = tasksByTagData.reduce((acc, item, index) => {
    acc[item.name] = { label: item.name, color: `hsl(var(--chart-${(index % 5) + 1}))` };
    return acc;
  }, {} as ChartConfig);

  // Tasks by Repository
  const tasksByRepo = tasks.reduce((acc, task) => {
    (Array.isArray(task.repositories) ? task.repositories : []).forEach(repo => {
        acc[repo] = (acc[repo] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const tasksByRepoData = Object.entries(tasksByRepo).map(([name, value]) => ({ name, tasks: value }));
  const tasksByRepoConfig = tasksByRepoData.reduce((acc, item, index) => {
    acc[item.name] = { label: item.name, color: `hsl(var(--chart-${(index % 5) + 1}))` };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
        Dashboard
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        An overview of your team's progress and activity.
      </p>
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
                    <Card key={index} className={cn("border-t-4 transition-all hover:shadow-xl hover:-translate-y-1", stat.borderColor)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                             <stat.icon className={cn("h-5 w-5", stat.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart className="h-5 w-5 text-chart-1" />
                            Tasks by {fieldLabels.get('status') || 'Status'}
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
                                    
                                 />
                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                 <ChartTooltip content={<ChartTooltipContent />} />
                                 <Bar dataKey="count" radius={4}>
                                     {tasksByStatusData.map((entry) => (
                                         <Cell key={entry.name} fill={tasksByStatusConfig[entry.name]?.color} />
                                     ))}
                                 </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LineChart className="h-5 w-5 text-chart-3" />
                            Monthly Task Trends
                        </CardTitle>
                         <CardDescription>Tasks created vs. completed over the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ChartContainer config={monthlyChartConfig} className="h-full w-full">
                            <RechartsLineChart data={monthlyData} accessibilityLayer>
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={2} dot={false} />
                            </RechartsLineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code2 className="h-5 w-5 text-chart-5" />
                            Tasks per {fieldLabels.get('developers') || 'Developers'}
                        </CardTitle>
                         <CardDescription>Breakdown of task assignments to Developers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={tasksByDeveloperConfig} className="h-[300px] w-full">
                            <RechartsBarChart data={tasksByDeveloperData} layout="vertical" accessibilityLayer>
                                 <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    
                                 />
                                 <XAxis type="number" hide />
                                 <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" nameKey="tasks" />} />
                                 <Bar dataKey="tasks" radius={4} layout="vertical">
                                     {tasksByDeveloperData.map((entry) => (
                                         <Cell key={entry.name} fill={entry.fill} />
                                     ))}
                                 </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-chart-2" />
                            {fieldLabels.get('deploymentStatus') || 'Deployments'} by Environment
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
                                 <Bar dataKey="count" radius={4}>
                                    {deploymentsByEnvData.map((entry, index) => (
                                         <Cell key={entry.name} fill={deploymentsByEnvConfig[`deployments-${index}`]?.color} />
                                    ))}
                                 </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-chart-4" />
                            Tasks by Tag
                        </CardTitle>
                         <CardDescription>Distribution of tasks across different tags.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={tasksByTagConfig} className="h-[300px] w-full">
                            <RechartsBarChart data={tasksByTagData} accessibilityLayer>
                                 <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    
                                 />
                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                 <ChartTooltip content={<ChartTooltipContent />} />
                                 <Bar dataKey="tasks" radius={4}>
                                     {tasksByTagData.map((entry) => (
                                         <Cell key={entry.name} fill={tasksByTagConfig[entry.name]?.color} />
                                     ))}
                                 </Bar>
                            </RechartsBarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitBranch className="h-5 w-5 text-chart-1" />
                            Tasks by Repository
                        </CardTitle>
                         <CardDescription>Distribution of tasks across different repositories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={tasksByRepoConfig} className="h-[300px] w-full">
                            <RechartsBarChart data={tasksByRepoData} accessibilityLayer>
                                 <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    
                                 />
                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                 <ChartTooltip content={<ChartTooltipContent />} />
                                 <Bar dataKey="tasks" radius={4}>
                                     {tasksByRepoData.map((entry) => (
                                         <Cell key={entry.name} fill={tasksByRepoConfig[entry.name]?.color} />
                                     ))}
                                 </Bar>
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

    