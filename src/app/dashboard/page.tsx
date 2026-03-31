'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTasks, getUiConfig, getDevelopers, getTesters, getAuthMode, isInitialSyncComplete, getActiveCompanyId } from '@/lib/data';
import type { Task, Person, UiConfig, Environment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  BarChart3,
  Bug,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GitBranch,
  Layers3,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Server,
  Sparkles,
  Tag,
  TrendingUp,
  Users2,
} from 'lucide-react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { format, eachMonthOfInterval, endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';
import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { getStatusDisplayName, getStatusId } from '@/lib/status-config';

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'slate';
};

const toneStyles: Record<NonNullable<MetricCardProps['tone']>, string> = {
  blue: 'border-blue-500/20 bg-blue-500/[0.06] text-blue-600 dark:text-blue-400',
  green: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400',
  amber: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400',
  violet: 'border-violet-500/20 bg-violet-500/[0.06] text-violet-600 dark:text-violet-400',
  slate: 'border-border bg-muted/40 text-muted-foreground',
};

function MetricCard({ title, value, description, icon: Icon, tone = 'slate' }: MetricCardProps) {
  return (
    <Card className="group relative overflow-hidden border border-border/70 bg-background/85 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={cn('absolute inset-x-0 top-0 h-1 opacity-70', tone === 'blue' && 'bg-blue-500/70', tone === 'green' && 'bg-emerald-500/70', tone === 'amber' && 'bg-amber-500/70', tone === 'violet' && 'bg-violet-500/70', tone === 'slate' && 'bg-border')} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
            <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</div>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105', toneStyles[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { isUserLoading } = useFirebase();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const refreshData = () => {
      const authMode = getAuthMode();
      const companyId = getActiveCompanyId();

      if (isUserLoading || (authMode === 'authenticate' && (!companyId || !isInitialSyncComplete(companyId)))) {
        return;
      }

      setTasks(getTasks());
      setDevelopers(getDevelopers());
      setTesters(getTesters());
      const config = getUiConfig();
      setUiConfig(config);
      document.title = `Dashboard | ${config.appName || 'My Task Manager'}`;
      setIsLoading(false);
      window.dispatchEvent(new Event('navigation-end'));
    };

    refreshData();

    window.addEventListener('storage', refreshData);
    window.addEventListener('config-changed', refreshData);
    window.addEventListener('sync-complete', refreshData);

    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('config-changed', refreshData);
      window.removeEventListener('sync-complete', refreshData);
    };
  }, [isUserLoading]);

  const authMode = getAuthMode();
  const activeCompanyId = getActiveCompanyId();
  const isSyncing = authMode === 'authenticate' && (!activeCompanyId || !isInitialSyncComplete(activeCompanyId));
  const activeSkeletons = !mounted || isLoading || isUserLoading || isSyncing;

  const analytics = useMemo(() => {
    if (!uiConfig) return null;

    const now = new Date();
    const fieldLabels = new Map((uiConfig.fields || []).map(field => [field.key, field.label]));
    const environments: Environment[] = uiConfig.environments || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => getStatusId(task.status, uiConfig) === 'done').length;
    const inProgressTasks = tasks.filter(task => getStatusId(task.status, uiConfig) === 'in_progress').length;
    const qaTasks = tasks.filter(task => getStatusId(task.status, uiConfig) === 'qa').length;
    const holdTasks = tasks.filter(task => getStatusId(task.status, uiConfig) === 'hold').length;
    const activeTasks = Math.max(totalTasks - completedTasks - holdTasks, 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const wipRate = totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100) : 0;

    const last30Days = subDays(now, 30);
    const previous30Days = subDays(last30Days, 30);

    const createdLast30Days = tasks.filter(task => new Date(task.createdAt) >= last30Days).length;
    const createdPrevious30Days = tasks.filter(task => {
      const createdAt = new Date(task.createdAt);
      return createdAt >= previous30Days && createdAt < last30Days;
    }).length;

    const completedLast30Days = tasks.filter(task => getStatusId(task.status, uiConfig) === 'done' && new Date(task.updatedAt) >= last30Days).length;
    const completedPrevious30Days = tasks.filter(task => {
      const updatedAt = new Date(task.updatedAt);
      return getStatusId(task.status, uiConfig) === 'done' && updatedAt >= previous30Days && updatedAt < last30Days;
    }).length;

    const tasksWithoutTags = tasks.filter(task => !task.tags || task.tags.length === 0).length;
    const unassignedTasks = tasks.filter(task => (task.developers?.length || 0) === 0 && (task.testers?.length || 0) === 0).length;
    const avgCollaborators = totalTasks > 0
      ? (
        tasks.reduce((sum, task) => sum + new Set([...(task.developers || []), ...(task.testers || [])]).size, 0) / totalTasks
      ).toFixed(1)
      : '0.0';

    const monthlyRange = eachMonthOfInterval({
      start: startOfMonth(subMonths(now, 5)),
      end: endOfMonth(now),
    });

    const monthlyData = monthlyRange.map((month) => ({
      name: format(month, 'MMM'),
      created: tasks.filter(task => format(new Date(task.createdAt), 'yyyy-MM') === format(month, 'yyyy-MM')).length,
      completed: tasks.filter(task => getStatusId(task.status, uiConfig) === 'done' && format(new Date(task.updatedAt), 'yyyy-MM') === format(month, 'yyyy-MM')).length,
    }));

    const statusColorScale = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    const statusDistribution = uiConfig.taskStatuses
      .map((status, index) => ({
        name: status,
        count: tasks.filter(task => getStatusDisplayName(task.status, uiConfig) === status).length,
        fill: statusColorScale[index % statusColorScale.length],
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const developersById = new Map(developers.map(dev => [dev.id, dev.name]));
    const testersById = new Map(testers.map(tester => [tester.id, tester.name]));
    const workloadMap = new Map<string, { name: string; assigned: number; role: string }>();

    tasks.forEach(task => {
      (task.developers || []).forEach((developerId) => {
        const name = developersById.get(developerId) || 'Unknown Developer';
        const current = workloadMap.get(`dev:${developerId}`) || { name, assigned: 0, role: fieldLabels.get('developers') || 'Developers' };
        current.assigned += 1;
        workloadMap.set(`dev:${developerId}`, current);
      });

      (task.testers || []).forEach((testerId) => {
        const name = testersById.get(testerId) || 'Unknown Tester';
        const current = workloadMap.get(`tester:${testerId}`) || { name, assigned: 0, role: fieldLabels.get('testers') || 'Testers' };
        current.assigned += 1;
        workloadMap.set(`tester:${testerId}`, current);
      });
    });

    const workloadData = Array.from(workloadMap.values())
      .sort((a, b) => b.assigned - a.assigned)
      .slice(0, 8)
      .map((item, index) => ({
        ...item,
        fill: statusColorScale[index % statusColorScale.length],
      }));

    const repoMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    tasks.forEach(task => {
      (task.repositories || []).forEach(repo => {
        repoMap.set(repo, (repoMap.get(repo) || 0) + 1);
      });

      (task.tags || []).forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    const repositoryData = Array.from(repoMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const tagData = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const environmentData = environments.map((environment, index) => {
      const deployedCount = tasks.filter(task => task.deploymentStatus?.[environment.name] === true).length;
      return {
        name: environment.name,
        deployedCount,
        rate: totalTasks > 0 ? Math.round((deployedCount / totalTasks) * 100) : 0,
        fill: statusColorScale[index % statusColorScale.length],
      };
    });

    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map(task => ({
        id: task.id,
        title: task.title,
        status: getStatusDisplayName(task.status, uiConfig),
        updatedAt: format(new Date(task.updatedAt), 'dd MMM, hh:mm a'),
      }));

    const topStatus = statusDistribution[0];
    const mostLoadedPerson = workloadData[0];
    const bestEnvironment = [...environmentData].sort((a, b) => b.deployedCount - a.deployedCount)[0];

    const insightItems = [
      {
        title: `${completionRate}% completion rate`,
        detail: `${completedTasks} of ${totalTasks} tasks are currently finished.`,
        icon: CheckCircle2,
      },
      {
        title: `${createdLast30Days} tasks added in the last 30 days`,
        detail: `${createdLast30Days - createdPrevious30Days >= 0 ? '+' : ''}${createdLast30Days - createdPrevious30Days} compared with the previous 30-day window.`,
        icon: TrendingUp,
      },
      {
        title: mostLoadedPerson ? `${mostLoadedPerson.name} has the highest workload` : 'No team workload yet',
        detail: mostLoadedPerson ? `${mostLoadedPerson.assigned} assigned tasks across ${mostLoadedPerson.role.toLowerCase()}.` : 'Assign tasks to developers or testers to see workload analytics.',
        icon: Users2,
      },
      {
        title: topStatus ? `${topStatus.name} is your biggest stage` : 'No dominant stage yet',
        detail: topStatus ? `${topStatus.count} tasks are sitting in ${topStatus.name}.` : 'Start creating tasks to see stage distribution.',
        icon: Layers3,
      },
      {
        title: `${tasksWithoutTags} tasks are missing tags`,
        detail: tasksWithoutTags > 0 ? 'Adding tags will improve filtering, analytics, and search quality.' : 'Tag coverage looks good across the workspace.',
        icon: Tag,
      },
      {
        title: bestEnvironment ? `${bestEnvironment.name} leads deployments` : 'No deployment data yet',
        detail: bestEnvironment ? `${bestEnvironment.deployedCount} tasks have reached ${bestEnvironment.name}.` : 'Deployment analytics will appear as environment statuses are updated.',
        icon: Server,
      },
    ];

    return {
      fieldLabels,
      totalTasks,
      completedTasks,
      inProgressTasks,
      qaTasks,
      holdTasks,
      activeTasks,
      completionRate,
      wipRate,
      createdLast30Days,
      completedLast30Days,
      completedPrevious30Days,
      unassignedTasks,
      tasksWithoutTags,
      avgCollaborators,
      monthlyData,
      statusDistribution,
      workloadData,
      repositoryData,
      tagData,
      environmentData,
      recentTasks,
      insightItems,
    };
  }, [developers, tasks, testers, uiConfig]);

  if (activeSkeletons || !uiConfig || !analytics) {
    return <DashboardSkeleton />;
  }

  const monthlyChartConfig = {
    created: { label: 'Created', color: 'hsl(var(--chart-1))' },
    completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
  } satisfies ChartConfig;

  const statusChartConfig = analytics.statusDistribution.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as ChartConfig);

  const workloadChartConfig = analytics.workloadData.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as ChartConfig);

  const completionChartData = [
    { name: 'Completed', value: analytics.completedTasks, fill: 'hsl(var(--chart-2))' },
    { name: 'Active', value: Math.max(analytics.totalTasks - analytics.completedTasks, 0), fill: 'hsl(var(--chart-1))' },
  ];

  return (
    <div id="dashboard-page" className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_24%),linear-gradient(to_bottom,transparent,rgba(148,163,184,0.06))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-5rem] top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <div className="container relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.10] via-background to-chart-2/10 shadow-xl backdrop-blur-sm">
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <Badge variant="outline" className="rounded-full border-primary/20 bg-background/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur-sm">
                      <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                      Workspace Analytics
                    </Badge>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Stronger visibility into execution, delivery, and team load.
                      </h1>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Track status flow, throughput, ownership, deployments, and attention areas from one responsive dashboard.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
                        <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                        {analytics.createdLast30Days} created this month
                      </Badge>
                      <Badge className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        {analytics.completedLast30Days} recently completed
                      </Badge>
                    </div>
                  </div>
                  <div className="grid min-w-[220px] gap-3 rounded-3xl border border-white/10 bg-background/80 p-4 shadow-lg backdrop-blur-md sm:grid-cols-2 xl:grid-cols-1">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Completion Rate</p>
                      <p className="text-3xl font-semibold tracking-tight">{analytics.completionRate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Active Work Share</p>
                      <p className="text-3xl font-semibold tracking-tight">{analytics.wipRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-background/75 p-4 shadow-sm backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">This Month</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{analytics.createdLast30Days}</p>
                    <p className="mt-1 text-sm text-muted-foreground">tasks created in the last 30 days</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-background/75 p-4 shadow-sm backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Delivery Pulse</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{analytics.completedLast30Days}</p>
                    <p className="mt-1 text-sm text-muted-foreground">tasks completed in the last 30 days</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-background/75 p-4 shadow-sm backdrop-blur-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Collaboration Depth</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{analytics.avgCollaborators}</p>
                    <p className="mt-1 text-sm text-muted-foreground">average collaborators per task</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            <MetricCard
              title="Total Tasks"
              value={String(analytics.totalTasks)}
              description="All live work across the current workspace."
              icon={ListChecks}
              tone="slate"
            />
            <MetricCard
              title="Completed"
              value={String(analytics.completedTasks)}
              description="Tasks that have reached the final done stage."
              icon={CheckCircle2}
              tone="green"
            />
            <MetricCard
              title="In Progress"
              value={String(analytics.inProgressTasks)}
              description="Tasks currently in active implementation."
              icon={Loader2}
              tone="blue"
            />
            <MetricCard
              title="In QA"
              value={String(analytics.qaTasks)}
              description="Tasks currently sitting in validation or QA."
              icon={Bug}
              tone="amber"
            />
          </div>
        </div>

        {analytics.totalTasks === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border/70 bg-background/75 px-6 py-16 text-center shadow-sm backdrop-blur-sm">
            <p className="text-lg font-medium text-foreground">No data to display yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Create some tasks and the dashboard will fill in with analytics automatically.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Active Tasks"
                value={String(analytics.activeTasks)}
                description="Work currently in motion, excluding done and on hold."
                icon={Activity}
                tone="blue"
              />
              <MetricCard
                title="On Hold"
                value={String(analytics.holdTasks)}
                description="Tasks paused or blocked from forward movement."
                icon={Clock3}
                tone="amber"
              />
              <MetricCard
                title="Unassigned"
                value={String(analytics.unassignedTasks)}
                description="Tasks without developers or testers attached."
                icon={Users2}
                tone="violet"
              />
              <MetricCard
                title="Missing Tags"
                value={String(analytics.tasksWithoutTags)}
                description="Tasks that could use stronger metadata coverage."
                icon={Tag}
                tone="slate"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <TrendingUp className="h-5 w-5 text-chart-1" />
                    Delivery Trend
                  </CardTitle>
                  <CardDescription>Created versus completed tasks across the last six months.</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] sm:h-[360px]">
                  <ChartContainer config={monthlyChartConfig} className="h-full w-full">
                    <RechartsAreaChart data={analytics.monthlyData} accessibilityLayer margin={{ left: 4, right: 4, top: 12 }}>
                      <defs>
                        <linearGradient id="dashboardCreated" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="dashboardCompleted" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend wrapperStyle={{ paddingTop: 12 }} />
                      <Area type="monotone" dataKey="created" stroke="var(--color-created)" fill="url(#dashboardCreated)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="completed" stroke="var(--color-completed)" fill="url(#dashboardCompleted)" strokeWidth={2.5} />
                    </RechartsAreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <CheckCircle2 className="h-5 w-5 text-chart-2" />
                    Completion Snapshot
                  </CardTitle>
                  <CardDescription>A quick read on how much work has crossed the finish line.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="h-[220px]">
                    <ChartContainer
                      config={{
                        Completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
                        Active: { label: 'Active', color: 'hsl(var(--chart-1))' },
                      }}
                      className="h-full w-full"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={completionChartData}
                          dataKey="value"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {completionChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-muted/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Overall completion</p>
                        <p className="text-xs text-muted-foreground">Finished work against all active tasks</p>
                      </div>
                      <span className="text-2xl font-semibold tracking-tight">{analytics.completionRate}%</span>
                    </div>
                    <Progress value={analytics.completionRate} className="mt-4 h-2.5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <BarChart3 className="h-5 w-5 text-chart-3" />
                    Status Distribution
                  </CardTitle>
                  <CardDescription>Where work is clustering across your current statuses.</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ChartContainer config={statusChartConfig} className="h-full w-full">
                    <RechartsBarChart data={analytics.statusDistribution} layout="vertical" accessibilityLayer margin={{ left: 8, right: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={96}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" nameKey="count" />} />
                      <Bar dataKey="count" radius={8} layout="vertical">
                        {analytics.statusDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Sparkles className="h-5 w-5 text-chart-4" />
                    Actionable Insights
                  </CardTitle>
                  <CardDescription>Fast reads on throughput, ownership, and metadata quality.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.insightItems.map((insight) => (
                    <div key={insight.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-muted/20 p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm">
                        <insight.icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium tracking-tight">{insight.title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{insight.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Users2 className="h-5 w-5 text-chart-5" />
                    Team Workload
                  </CardTitle>
                  <CardDescription>Top developers and testers by number of assigned tasks.</CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {analytics.workloadData.length > 0 ? (
                    <ChartContainer config={workloadChartConfig} className="h-full w-full">
                      <RechartsBarChart data={analytics.workloadData} layout="vertical" accessibilityLayer margin={{ left: 8, right: 8 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={112} tickLine={false} axisLine={false} tickMargin={10} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" nameKey="assigned" />} />
                        <Bar dataKey="assigned" radius={8} layout="vertical">
                          {analytics.workloadData.map((entry) => (
                            <Cell key={`${entry.role}-${entry.name}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                      Assign developers or testers to tasks to unlock workload analytics.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Server className="h-5 w-5 text-chart-2" />
                    Environment Readiness
                  </CardTitle>
                  <CardDescription>How far task deployment has reached across your environments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.environmentData.length > 0 ? analytics.environmentData.map((environment) => (
                    <div key={environment.name} className="space-y-2 rounded-2xl border border-white/10 bg-muted/20 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium capitalize tracking-tight">{environment.name}</p>
                          <p className="text-xs text-muted-foreground">{environment.deployedCount} tasks deployed here</p>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          {environment.rate}%
                        </Badge>
                      </div>
                      <Progress value={environment.rate} className="h-2.5" />
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      Configure environments and update deployment status to see readiness analytics.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_1fr]">
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Tag className="h-5 w-5 text-chart-4" />
                    Top Tags
                  </CardTitle>
                  <CardDescription>The tags most frequently used across your tasks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.tagData.length > 0 ? analytics.tagData.map((tag, index) => (
                    <div key={tag.name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{tag.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{tag.count}</span>
                      </div>
                      <Progress value={(tag.count / analytics.tagData[0].count) * 100} className="h-2" />
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      No tag usage yet. Add tags to improve discoverability and reporting.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <GitBranch className="h-5 w-5 text-chart-1" />
                    Repository Focus
                  </CardTitle>
                  <CardDescription>Where current engineering work is concentrated.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.repositoryData.length > 0 ? analytics.repositoryData.map((repository) => (
                    <div key={repository.name} className="rounded-2xl border border-white/10 bg-muted/20 px-4 py-3 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium tracking-tight">{repository.name}</p>
                          <p className="text-xs text-muted-foreground">{repository.count} linked tasks</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 font-semibold">
                          {repository.count}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      Link repositories to tasks to reveal repo-level workload analytics.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <ClipboardCheck className="h-5 w-5 text-chart-3" />
                    Recently Updated
                  </CardTitle>
                  <CardDescription>The tasks that changed most recently.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.recentTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-white/10 bg-muted/20 px-4 py-3 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium tracking-tight">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{task.updatedAt}</p>
                        </div>
                        <Badge variant="outline" className="max-w-[45%] truncate rounded-full px-2.5 py-0.5 text-[11px]">
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
