'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUiConfig, getDevelopers, getTesters, getAuthMode, isInitialSyncComplete, getActiveCompanyId } from '@/lib/data';
import { getCachedTasks as getTasks } from '@/lib/cached-data';
import type { Task, Person, UiConfig, Environment } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
  ArrowRight,
  ChevronRight,
  PanelsTopLeft,
  Radar,
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
import { getStatusDisplayName, getStatusGroupConfigs, getStatusGroupId, getStatusId, getStatusGroupName, resolveStatusConfig } from '@/lib/status-config';
import { useIsMobile } from '@/hooks/use-mobile';

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
    <Card className="group relative h-full min-w-0 overflow-hidden border border-border/70 bg-background/85 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={cn('absolute inset-x-0 top-0 h-1 opacity-70', tone === 'blue' && 'bg-blue-500/70', tone === 'green' && 'bg-emerald-500/70', tone === 'amber' && 'bg-amber-500/70', tone === 'violet' && 'bg-violet-500/70', tone === 'slate' && 'bg-border')} />
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl transition-transform duration-500 group-hover:scale-125 sm:-right-8 sm:-top-8 sm:h-24 sm:w-24" />
      <CardContent className="relative flex h-full flex-col p-3.5 sm:p-5">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-semibold uppercase leading-4.5 tracking-[0.14em] text-muted-foreground [word-break:normal] [overflow-wrap:anywhere] sm:text-[11px] sm:leading-5">
              {title}
            </p>
            <div className="text-[2rem] font-semibold leading-none tracking-tight sm:text-3xl">{value}</div>
          </div>
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[1.15rem] border shadow-sm transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12 sm:rounded-2xl', toneStyles[tone])}>
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
        </div>
        <div className="mt-3 min-w-0 sm:mt-4">
          <p className="text-[13px] leading-6 text-muted-foreground [word-break:normal] [overflow-wrap:anywhere] sm:text-sm sm:leading-7">
              {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function resolvePersonDisplayName(
  rawValue: string,
  peopleById: Map<string, string>,
  peopleByName: Map<string, string>,
  fallbackLabel: string
) {
  if (!rawValue) return fallbackLabel;
  const trimmedValue = rawValue.trim();
  const resolvedName = peopleById.get(trimmedValue) || peopleByName.get(trimmedValue.toLowerCase());
  if (resolvedName) return resolvedName;

  // Older/imported data can already store a human-readable name directly.
  // If it does not clearly look like a name, keep the UI safe and avoid leaking IDs.
  const looksLikeHumanName = /^[A-Za-z][A-Za-z .'-]{1,}$/.test(trimmedValue);
  return looksLikeHumanName ? trimmedValue : fallbackLabel;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isUserLoading } = useFirebase();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [selectedStatusGroupId, setSelectedStatusGroupId] = useState<string>('');

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
    const developersByName = new Map(developers.map(dev => [dev.name.trim().toLowerCase(), dev.name]));
    const testersById = new Map(testers.map(tester => [tester.id, tester.name]));
    const testersByName = new Map(testers.map(tester => [tester.name.trim().toLowerCase(), tester.name]));

    const statusGroups = getStatusGroupConfigs(uiConfig);
    const tasksByGroup = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const statusConfig = resolveStatusConfig(task.status, uiConfig);
      const groupId = getStatusGroupId(statusConfig.group, uiConfig, statusConfig);
      const current = tasksByGroup.get(groupId) || [];
      current.push(task);
      tasksByGroup.set(groupId, current);
    });

    const statusGroupSummaries = statusGroups
      .map((group, index) => {
        const groupTasks = tasksByGroup.get(group.id) || [];
        const groupCompleted = groupTasks.filter(task => getStatusId(task.status, uiConfig) === 'done').length;
        const groupActive = groupTasks.length - groupCompleted;
        const groupCreatedLast30Days = groupTasks.filter(task => new Date(task.createdAt) >= last30Days).length;
        const groupCompletedLast30Days = groupTasks.filter(task => getStatusId(task.status, uiConfig) === 'done' && new Date(task.updatedAt) >= last30Days).length;
        const groupUnassigned = groupTasks.filter(task => (task.developers?.length || 0) === 0 && (task.testers?.length || 0) === 0).length;
        const groupTagCoverage = groupTasks.length > 0
          ? Math.round(((groupTasks.length - groupTasks.filter(task => !task.tags || task.tags.length === 0).length) / groupTasks.length) * 100)
          : 0;
        const statuses = uiConfig.taskStatuses
          .map((status) => ({
            name: status,
            count: groupTasks.filter(task => getStatusDisplayName(task.status, uiConfig) === status).length,
          }))
          .filter(status => status.count > 0)
          .sort((a, b) => b.count - a.count);
        const dominantStatus = statuses[0];

        const monthlyTrend = monthlyRange.map((month) => ({
          name: format(month, 'MMM'),
          created: groupTasks.filter(task => format(new Date(task.createdAt), 'yyyy-MM') === format(month, 'yyyy-MM')).length,
          completed: groupTasks.filter(task => getStatusId(task.status, uiConfig) === 'done' && format(new Date(task.updatedAt), 'yyyy-MM') === format(month, 'yyyy-MM')).length,
        }));

        const workload = new Map<string, { name: string; count: number; role: string }>();
        groupTasks.forEach(task => {
          (task.developers || []).forEach((developerId) => {
            const name = resolvePersonDisplayName(developerId, developersById, developersByName, 'Unknown Developer');
            const bucketKey = `dev:${name.toLowerCase()}`;
            const current = workload.get(bucketKey) || { name, count: 0, role: fieldLabels.get('developers') || 'Developers' };
            current.count += 1;
            workload.set(bucketKey, current);
          });
          (task.testers || []).forEach((testerId) => {
            const name = resolvePersonDisplayName(testerId, testersById, testersByName, 'Unknown Tester');
            const bucketKey = `tester:${name.toLowerCase()}`;
            const current = workload.get(bucketKey) || { name, count: 0, role: fieldLabels.get('testers') || 'Testers' };
            current.count += 1;
            workload.set(bucketKey, current);
          });
        });

        const topOwners = Array.from(workload.values()).sort((a, b) => b.count - a.count).slice(0, 4);
        const recentGroupTasks = [...groupTasks]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
          .map(task => ({
            id: task.id,
            title: task.title,
            status: getStatusDisplayName(task.status, uiConfig),
            updatedAt: format(new Date(task.updatedAt), 'dd MMM, hh:mm a'),
          }));

        return {
          id: group.id,
          name: group.name,
          order: group.order,
          total: groupTasks.length,
          active: groupActive,
          completed: groupCompleted,
          completionRate: groupTasks.length > 0 ? Math.round((groupCompleted / groupTasks.length) * 100) : 0,
          createdLast30Days: groupCreatedLast30Days,
          completedLast30Days: groupCompletedLast30Days,
          unassigned: groupUnassigned,
          tagCoverage: groupTagCoverage,
          dominantStatus: dominantStatus?.name || 'No active statuses',
          dominantStatusCount: dominantStatus?.count || 0,
          statuses,
          monthlyTrend,
          topOwners,
          recentTasks: recentGroupTasks,
          fill: statusColorScale[index % statusColorScale.length],
        };
      })
      .filter(group => group.total > 0)
      .sort((a, b) => a.order - b.order);

    const workloadMap = new Map<string, { name: string; assigned: number; role: string }>();

    tasks.forEach(task => {
      (task.developers || []).forEach((developerId) => {
        const name = resolvePersonDisplayName(developerId, developersById, developersByName, 'Unknown Developer');
        const bucketKey = `dev:${name.toLowerCase()}`;
        const current = workloadMap.get(bucketKey) || { name, assigned: 0, role: fieldLabels.get('developers') || 'Developers' };
        current.assigned += 1;
        workloadMap.set(bucketKey, current);
      });

      (task.testers || []).forEach((testerId) => {
        const name = resolvePersonDisplayName(testerId, testersById, testersByName, 'Unknown Tester');
        const bucketKey = `tester:${name.toLowerCase()}`;
        const current = workloadMap.get(bucketKey) || { name, assigned: 0, role: fieldLabels.get('testers') || 'Testers' };
        current.assigned += 1;
        workloadMap.set(bucketKey, current);
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
    const hasStructuredAnalytics =
      statusDistribution.length > 0 ||
      statusGroupSummaries.length > 0 ||
      workloadData.length > 0 ||
      repositoryData.length > 0 ||
      tagData.length > 0 ||
      environmentData.some(environment => environment.deployedCount > 0);

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
      statusGroupSummaries,
      workloadData,
      repositoryData,
      tagData,
      environmentData,
      recentTasks,
      insightItems,
      hasStructuredAnalytics,
    };
  }, [developers, tasks, testers, uiConfig]);

  useEffect(() => {
    if (!analytics?.statusGroupSummaries?.length) {
      setSelectedStatusGroupId('');
      return;
    }

    setSelectedStatusGroupId((current) => {
      if (current && analytics.statusGroupSummaries.some(group => group.id === current)) return current;
      return analytics.statusGroupSummaries[0]?.id || '';
    });
  }, [analytics]);

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
  const selectedStatusGroup = analytics.statusGroupSummaries.find(group => group.id === selectedStatusGroupId) || analytics.statusGroupSummaries[0] || null;
  const selectedGroupStatusConfig = (selectedStatusGroup?.statuses || []).reduce((acc, status, index) => {
    acc[status.name] = { label: status.name, color: `hsl(var(--chart-${(index % 5) + 1}))` };
    return acc;
  }, {} as ChartConfig);
  const selectedGroupTrendConfig = {
    created: { label: 'Created', color: 'hsl(var(--chart-1))' },
    completed: { label: 'Completed', color: 'hsl(var(--chart-2))' },
  } satisfies ChartConfig;
  const openTasksView = (filters: { statusGroup?: string[]; repo?: string[]; tags?: string[]; deployment?: string }) => {
    const params = new URLSearchParams();
    filters.statusGroup?.forEach((value) => params.append('statusGroup', value));
    filters.repo?.forEach((value) => params.append('repo', value));
    filters.tags?.forEach((value) => params.append('tags', value));
    if (filters.deployment) params.set('deployment', filters.deployment);
    router.push(`/?${params.toString()}`);
  };

  const handleOpenGroupTasks = (groupId: string) => {
    openTasksView({ statusGroup: [groupId] });
  };

  const handleOpenTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  return (
    <div id="dashboard-page" className="relative overflow-x-hidden overflow-y-visible">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] overflow-hidden [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.96)_58%,rgba(0,0,0,0.72)_78%,transparent_100%)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_24%),linear-gradient(to_bottom,transparent,rgba(148,163,184,0.06))]">
        <div className="absolute left-[-6rem] top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-5rem] top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/3 top-64 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <div className="container relative mx-auto max-w-7xl space-y-4 px-3 pb-4 pt-5 sm:space-y-6 sm:px-6 sm:pb-6 sm:pt-8 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.10] via-background to-chart-2/10 shadow-xl backdrop-blur-sm">
            <CardContent className="p-4 sm:p-7">
              <div className="flex flex-col gap-5 sm:gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-3">
                    <Badge variant="outline" className="max-w-full rounded-full border-primary/20 bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur-sm sm:text-[11px] sm:tracking-[0.24em]">
                      <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                      Workspace Analytics
                    </Badge>
                    <div className="space-y-2">
                      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        Stronger visibility into execution, delivery, and team load.
                      </h1>
                      <p className="max-w-2xl text-[13px] leading-5.5 text-muted-foreground sm:text-base sm:leading-6">
                        Track status flow, throughput, ownership, deployments, and attention areas from one responsive dashboard.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge className="max-w-full rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10 sm:text-[11px]">
                        <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                        {analytics.createdLast30Days} created this month
                      </Badge>
                      <Badge className="max-w-full rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 sm:text-[11px]">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        {analytics.completedLast30Days} recently completed
                      </Badge>
                    </div>
                  </div>
                  <div className="grid w-full gap-3 rounded-[1.4rem] border border-white/10 bg-background/80 p-3.5 shadow-lg backdrop-blur-md sm:min-w-[220px] sm:grid-cols-2 sm:rounded-3xl sm:p-4 xl:w-auto xl:grid-cols-1">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">Completion Rate</p>
                      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{analytics.completionRate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">Active Work Share</p>
                      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{analytics.wipRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-white/10 bg-background/75 p-3.5 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">This Month</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{analytics.createdLast30Days}</p>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground sm:text-sm">tasks created in the last 30 days</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-background/75 p-3.5 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">Delivery Pulse</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{analytics.completedLast30Days}</p>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground sm:text-sm">tasks completed in the last 30 days</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-background/75 p-3.5 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">Collaboration Depth</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{analytics.avgCollaborators}</p>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground sm:text-sm">average collaborators per task</p>
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
            {!analytics.hasStructuredAnalytics && (
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardContent className="flex flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium tracking-tight">Core task metrics are ready, but deeper analytics need richer task data.</p>
                    <p className="text-sm text-muted-foreground">
                      Add assignees, tags, repositories, deployments, or more status variety to unlock fuller insights.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Partial Analytics
                  </Badge>
                </CardContent>
              </Card>
            )}

            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 2xl:grid-cols-4">
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

            {analytics.statusGroupSummaries.length > 0 && selectedStatusGroup && (
              <div className="space-y-6">
                <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                          <PanelsTopLeft className="h-5 w-5 text-chart-5" />
                          Status Groups
                        </CardTitle>
                        <CardDescription>
                          Drill into each delivery stage group, then jump straight into the matching tasks view.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl border-primary/20 bg-primary/5 sm:w-auto"
                        onClick={() => handleOpenGroupTasks(selectedStatusGroup.id)}
                      >
                        Open {selectedStatusGroup.name} Tasks
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                      {analytics.statusGroupSummaries.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onMouseEnter={() => setSelectedStatusGroupId(group.id)}
                          onFocus={() => setSelectedStatusGroupId(group.id)}
                          onClick={() => handleOpenGroupTasks(group.id)}
                          className={cn(
                            'group h-full w-full min-w-0 rounded-[1.4rem] border p-3.5 text-left transition-all duration-300 cursor-pointer sm:rounded-3xl sm:p-4',
                            selectedStatusGroup.id === group.id
                              ? 'border-primary/40 bg-primary/[0.08] shadow-lg shadow-primary/10'
                              : 'border-border/70 bg-muted/20 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px] sm:tracking-[0.22em]">Group</p>
                              <p className="mt-2 break-words text-lg font-semibold tracking-tight sm:text-xl">{group.name}</p>
                            </div>
                            <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: group.fill }} />
                          </div>
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">Tasks</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{group.total}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">Done</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{group.completionRate}%</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground sm:text-xs">
                              <span className="min-w-0 break-words">{group.dominantStatus}</span>
                              <span className="shrink-0">{group.dominantStatusCount}</span>
                            </div>
                            <Progress value={group.completionRate} className="h-2.5" />
                          </div>
                          <div className="mt-4 flex flex-col items-start justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:text-xs">
                            <span>{group.createdLast30Days} recent additions</span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium transition-colors',
                                selectedStatusGroup.id === group.id
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground/90 group-hover:bg-primary/8 group-hover:text-primary'
                              )}
                            >
                              Open tasks
                              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                      <div className="space-y-6">
                    <div className="grid auto-rows-fr gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                      <MetricCard
                        title={`${selectedStatusGroup.name} Tasks`}
                        value={String(selectedStatusGroup.total)}
                            description="Total tasks currently in this grouped stage."
                            icon={Layers3}
                            tone="blue"
                          />
                          <MetricCard
                            title="Completion"
                            value={`${selectedStatusGroup.completionRate}%`}
                            description={`${selectedStatusGroup.completed} completed tasks in this group.`}
                            icon={CheckCircle2}
                            tone="green"
                          />
                          <MetricCard
                            title="Unassigned"
                            value={String(selectedStatusGroup.unassigned)}
                            description="Tasks here without developers or testers."
                            icon={Users2}
                            tone="violet"
                          />
                          <MetricCard
                            title="Tag Coverage"
                            value={`${selectedStatusGroup.tagCoverage}%`}
                            description="Share of tasks here with at least one tag."
                            icon={Tag}
                            tone="amber"
                          />
                        </div>

                        {!isMobile && (
                          <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="border-border/70 bg-background/80 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                                  <Radar className="h-4.5 w-4.5 text-chart-3" />
                                  Statuses in {selectedStatusGroup.name}
                                </CardTitle>
                                <CardDescription>Breakdown of statuses contained inside this group.</CardDescription>
                              </CardHeader>
                              <CardContent className="h-[250px] sm:h-[280px]">
                                <ChartContainer config={selectedGroupStatusConfig} className="h-full w-full">
                                  <RechartsBarChart data={selectedStatusGroup.statuses} layout="vertical" accessibilityLayer margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={88} tickLine={false} axisLine={false} tickMargin={8} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" nameKey="count" />} />
                                    <Bar dataKey="count" radius={8} layout="vertical">
                                      {selectedStatusGroup.statuses.map((status, index) => (
                                        <Cell key={status.name} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                                      ))}
                                    </Bar>
                                  </RechartsBarChart>
                                </ChartContainer>
                              </CardContent>
                            </Card>

                            <Card className="border-border/70 bg-background/80 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                                  <TrendingUp className="h-4.5 w-4.5 text-chart-1" />
                                  {selectedStatusGroup.name} Trend
                                </CardTitle>
                                <CardDescription>Created versus completed tasks for this group over time.</CardDescription>
                              </CardHeader>
                              <CardContent className="h-[250px] sm:h-[280px]">
                                <ChartContainer config={selectedGroupTrendConfig} className="h-full w-full">
                                  <RechartsAreaChart data={selectedStatusGroup.monthlyTrend} accessibilityLayer margin={{ left: 4, right: 4, top: 12 }}>
                                    <defs>
                                      <linearGradient id="selectedGroupCreated" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.02} />
                                      </linearGradient>
                                      <linearGradient id="selectedGroupCompleted" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.26} />
                                        <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area type="monotone" dataKey="created" stroke="var(--color-created)" fill="url(#selectedGroupCreated)" strokeWidth={2.5} />
                                    <Area type="monotone" dataKey="completed" stroke="var(--color-completed)" fill="url(#selectedGroupCompleted)" strokeWidth={2.5} />
                                  </RechartsAreaChart>
                                </ChartContainer>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        {!isMobile && (
                        <Card className="border-border/70 bg-background/80 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                              <Users2 className="h-4.5 w-4.5 text-chart-5" />
                              Top Owners
                            </CardTitle>
                            <CardDescription>People carrying the most work inside this group.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {selectedStatusGroup.topOwners.length > 0 ? selectedStatusGroup.topOwners.map((owner) => (
                              <div key={`${owner.role}-${owner.name}`} className="rounded-2xl border border-white/10 bg-muted/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium tracking-tight">{owner.name}</p>
                                    <p className="text-xs text-muted-foreground">{owner.role}</p>
                                  </div>
                                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 font-semibold">
                                    {owner.count}
                                  </Badge>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                                No owners are attached to tasks in this group yet.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        )}

                        <Card className="border-border/70 bg-background/80 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                              <ClipboardCheck className="h-4.5 w-4.5 text-chart-2" />
                              Recent in {selectedStatusGroup.name}
                            </CardTitle>
                            <CardDescription>The most recently updated tasks in this group.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {selectedStatusGroup.recentTasks.length > 0 ? selectedStatusGroup.recentTasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => handleOpenGroupTasks(selectedStatusGroup.id)}
                                className="w-full rounded-[1.15rem] border border-white/10 bg-muted/20 px-3.5 py-3 text-left shadow-sm transition-transform duration-300 hover:-translate-y-0.5 sm:rounded-2xl sm:px-4"
                              >
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-[15px] font-medium tracking-tight sm:text-base">{task.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{task.updatedAt}</p>
                                  </div>
                                  <Badge variant="outline" className="w-fit max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] sm:max-w-[45%]">
                                    {task.status}
                                  </Badge>
                                </div>
                              </button>
                            )) : (
                              <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                                No recent tasks are available for this group yet.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!isMobile && (
            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <TrendingUp className="h-5 w-5 text-chart-1" />
                    Delivery Trend
                  </CardTitle>
                  <CardDescription>Created versus completed tasks across the last six months.</CardDescription>
                </CardHeader>
                <CardContent className="h-[260px] sm:h-[360px]">
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
            )}

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              {!isMobile && (
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
                    <BarChart3 className="h-5 w-5 text-chart-3" />
                    Status Distribution
                  </CardTitle>
                  <CardDescription className="text-xs leading-5 sm:text-sm">
                    Where work is clustering across your current statuses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[220px] px-3 pb-4 sm:h-[320px] sm:px-6 sm:pb-6">
                  <ChartContainer config={statusChartConfig} className="h-full w-full">
                    <RechartsBarChart data={analytics.statusDistribution} layout="vertical" accessibilityLayer margin={{ left: 8, right: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={mounted && isMobile ? 62 : 78}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={mounted && isMobile ? 4 : 8}
                        fontSize={mounted && isMobile ? 11 : 12}
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
              )}

              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
                    <Sparkles className="h-5 w-5 text-chart-4" />
                    Actionable Insights
                  </CardTitle>
                  <CardDescription className="text-xs leading-5 sm:text-sm">
                    Fast reads on throughput, ownership, and metadata quality.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-2.5 pb-3 sm:space-y-3 sm:px-6 sm:pb-6">
                  {analytics.insightItems.map((insight) => (
                    <div key={insight.title} className="flex items-start gap-2 rounded-[1.15rem] border border-white/10 bg-muted/20 p-2.5 sm:gap-3 sm:rounded-2xl sm:p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary/20">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl">
                        <insight.icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[13px] font-medium leading-5 tracking-tight sm:text-base sm:leading-6">{insight.title}</p>
                        <p className="text-[11px] leading-4.5 text-muted-foreground sm:text-sm sm:leading-6">{insight.detail}</p>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/60 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:px-2.5 sm:py-1 sm:text-[11px] sm:tracking-[0.16em]">
                          Insight Snapshot
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {!isMobile && (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <Card className="border-border/70 bg-background/90 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Users2 className="h-5 w-5 text-chart-5" />
                    Team Workload
                  </CardTitle>
                  <CardDescription>Top developers and testers by number of assigned tasks.</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] sm:h-[340px]">
                  {analytics.workloadData.length > 0 ? (
                    <ChartContainer config={workloadChartConfig} className="h-full w-full">
                      <RechartsBarChart data={analytics.workloadData} layout="vertical" accessibilityLayer margin={{ left: 8, right: 8 }}>
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={88} tickLine={false} axisLine={false} tickMargin={8} />
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
                    <button
                      key={environment.name}
                      type="button"
                      onClick={() => openTasksView({ deployment: environment.name })}
                      className="group block w-full space-y-2 rounded-2xl border border-white/10 bg-muted/20 p-4 text-left shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/80"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium capitalize tracking-tight">{environment.name}</p>
                          <p className="text-xs text-muted-foreground">{environment.deployedCount} tasks deployed here</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                            {environment.rate}%
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </div>
                      <Progress value={environment.rate} className="h-2.5" />
                    </button>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      Configure environments and update deployment status to see readiness analytics.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            )}

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
                  {analytics.tagData.length > 0 ? analytics.tagData.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => openTasksView({ tags: [tag.name] })}
                      className="group block w-full space-y-2 rounded-2xl px-1 py-1 text-left transition-colors duration-300 hover:bg-muted/20"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{tag.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">{tag.count}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </div>
                      <Progress value={(tag.count / analytics.tagData[0].count) * 100} className="h-2" />
                    </button>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      No tag usage yet. Add tags to improve discoverability and reporting.
                    </div>
                  )}
                </CardContent>
              </Card>

              {!isMobile && (
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
                    <button
                      key={repository.name}
                      type="button"
                      onClick={() => openTasksView({ repo: [repository.name] })}
                      className="group w-full rounded-2xl border border-white/10 bg-muted/20 px-4 py-3 text-left shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/80"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium tracking-tight">{repository.name}</p>
                          <p className="text-xs text-muted-foreground">{repository.count} linked tasks</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 font-semibold">
                            {repository.count}
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      Link repositories to tasks to reveal repo-level workload analytics.
                    </div>
                  )}
                </CardContent>
              </Card>
              )}

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
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleOpenTask(task.id)}
                      className="group w-full rounded-[1.15rem] border border-white/10 bg-muted/20 px-3.5 py-3 text-left shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/80 sm:rounded-2xl sm:px-4"
                    >
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium tracking-tight sm:text-base">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{task.updatedAt}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end sm:pl-3">
                          <Badge
                            variant="outline"
                            className="max-w-[11rem] truncate rounded-full px-2.5 py-0.5 text-[11px] sm:max-w-[8.5rem] sm:shrink-0"
                          >
                            {task.status}
                          </Badge>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-background/70">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
                          </div>
                        </div>
                      </div>
                    </button>
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
