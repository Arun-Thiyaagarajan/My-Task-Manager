
'use client';

import { useState, useEffect } from 'react';
import { getTasks, getUiConfig, getDevelopers, getTesters } from '@/lib/data';
import type { Task, Person, UiConfig } from '@/lib/types';
import { REPOSITORIES, ENVIRONMENTS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, PieChartIcon, ListChecks, CheckCircle2, Loader2, Bug, GitMerge, Server, Code2, ClipboardCheck } from 'lucide-react';
import { Bar, Pie, PieChart, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getAvatarColor, cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);

  useEffect(() => {
    document.title = 'Dashboard | My Task Manager';
    
    const refreshData = () => {
        setTasks(getTasks());
        setDevelopers(getDevelopers());
        setTesters(getTesters());
        setUiConfig(getUiConfig());
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
  }));

  const tasksByStatusConfig = {
    count: {
      label: 'Tasks',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

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
          value,
          fill: `#${getAvatarColor(name)}`,
      };
  });

  const tasksByDeveloperConfig = tasksByDeveloperData.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
  }, {} as ChartConfig);

  const testersById = new Map(testers.map(t => [t.id, t]));
  const tasksByTesterId = tasks.reduce((acc, task) => {
    (task.testers || []).forEach(testerId => {
        acc[testerId] = (acc[testerId] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const tasksByTesterData = Object.entries(tasksByTesterId).map(([testerId, value]) => {
      const tester = testersById.get(testerId);
      const name = tester ? tester.name : 'Unknown';
      return {
          name,
          value,
          fill: `#${getAvatarColor(name)}`,
      };
  });

  const tasksByTesterConfig = tasksByTesterData.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
  }, {} as ChartConfig);

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
                            <Code2 className="h-5 w-5 text-chart-5" />
                            Tasks per {fieldLabels.get('developers') || 'Developers'}
                        </CardTitle>
                         <CardDescription>Breakdown of task assignments to Developers.</CardDescription>
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
                            <ClipboardCheck className="h-5 w-5 text-chart-3" />
                            Tasks per {fieldLabels.get('testers') || 'Testers'}
                        </CardTitle>
                        <CardDescription>Breakdown of task assignments to Testers.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                       <ChartContainer config={tasksByTesterConfig} className="h-[300px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                <Pie data={tasksByTesterData} dataKey="value" nameKey="name" innerRadius={60}>
                                    {tasksByTesterData.map((entry, index) => (
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
