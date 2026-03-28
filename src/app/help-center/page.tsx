'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CheckSquare,
  ChevronRight,
  Compass,
  FileClock,
  Filter,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  NotebookPen,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCircle2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFirebase } from '@/firebase';

type FeatureItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  category: string;
  icon: LucideIcon;
  accent: string;
  tags: string[];
};

const featureItems: FeatureItem[] = [
  {
    id: 'task-workspace',
    title: 'Task Workspace',
    subtitle: 'Filters, search, views, and new tasks',
    description: 'Jump to the main task page to work with filters, favorites, view modes, and task creation.',
    href: '/',
    category: 'Core Workflow',
    icon: Filter,
    accent: 'text-primary',
    tags: ['tasks', 'filters', 'search', 'favorites', 'new task', 'workspace'],
  },
  {
    id: 'bulk-actions',
    title: 'Bulk Actions',
    subtitle: 'Select all, tags, copy, PDF, delete',
    description: 'Use multi-select on the task page to apply tags, export PDF, copy content, or move tasks to the bin.',
    href: '/',
    category: 'Core Workflow',
    icon: CheckSquare,
    accent: 'text-amber-500',
    tags: ['bulk', 'select all', 'pdf', 'copy', 'delete', 'tags'],
  },
  {
    id: 'global-search',
    title: 'Global Search',
    subtitle: 'Spotlight search for tasks, notes, and settings',
    description: 'Open the global search overlay to jump across tasks, notes, settings, and key app destinations from anywhere.',
    href: '/',
    category: 'Core Workflow',
    icon: Search,
    accent: 'text-blue-500',
    tags: ['global search', 'spotlight', 'cmd k', 'ctrl k', 'search anything', 'command palette'],
  },
  {
    id: 'notes',
    title: 'Notes Workspace',
    subtitle: 'Quick notes, full notes, and search',
    description: 'Open the notes workspace for lightweight documentation, rich note editing, and note search.',
    href: '/notes',
    category: 'Documentation',
    icon: NotebookPen,
    accent: 'text-cyan-500',
    tags: ['notes', 'note', 'documentation', 'floating notes', 'quick note'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Visual overview of tasks and deployments',
    description: 'Use the dashboard for high-level charts and status summaries across your workspace.',
    href: '/dashboard',
    category: 'Insights',
    icon: LayoutDashboard,
    accent: 'text-green-600',
    tags: ['dashboard', 'charts', 'analytics', 'overview'],
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    subtitle: 'New and imported work',
    description: 'Review tasks that were recently added or imported to the active workspace.',
    href: '/insights',
    category: 'Insights',
    icon: Sparkles,
    accent: 'text-indigo-500',
    tags: ['recent', 'activity', 'insights', 'imports'],
  },
  {
    id: 'reminders',
    title: 'General Reminders',
    subtitle: 'Workspace-wide reminders and follow-ups',
    description: 'Manage workspace-level reminders that do not belong to a single task.',
    href: '/reminders',
    category: 'Coordination',
    icon: Bell,
    accent: 'text-amber-600',
    tags: ['reminders', 'general reminders', 'workspace notes', 'follow up'],
  },
  {
    id: 'inbox',
    title: 'Inbox',
    subtitle: 'Notifications and cloud updates',
    description: 'See support updates, notification activity, and cloud-related alerts from the header inbox.',
    href: '/',
    category: 'Coordination',
    icon: Inbox,
    accent: 'text-blue-500',
    tags: ['inbox', 'notifications', 'alerts', 'cloud sync'],
  },
  {
    id: 'settings',
    title: 'Workspace Settings',
    subtitle: 'Fields, environments, team, branding',
    description: 'Configure storage mode, appearance, task fields, environments, and team management in one place.',
    href: '/settings',
    category: 'Administration',
    icon: Settings,
    accent: 'text-purple-500',
    tags: ['settings', 'fields', 'appearance', 'team', 'environments', 'branding'],
  },
  {
    id: 'cloud-sync',
    title: 'Cloud Sync',
    subtitle: 'Authentication and synchronized data',
    description: 'Learn how to move from local mode to cloud sync and keep workspace data across sessions.',
    href: '/about?section=faq',
    category: 'Administration',
    icon: ShieldCheck,
    accent: 'text-primary',
    tags: ['cloud sync', 'sign in', 'authentication', 'firebase', 'local mode'],
  },
  {
    id: 'logs',
    title: 'Activity Logs',
    subtitle: 'History of workspace changes',
    description: 'Track what changed across tasks, settings, and related workspace activity.',
    href: '/logs',
    category: 'Administration',
    icon: FileClock,
    accent: 'text-sky-500',
    tags: ['logs', 'history', 'audit', 'changes'],
  },
  {
    id: 'bin',
    title: 'Bin',
    subtitle: 'Restore deleted tasks',
    description: 'Recover deleted tasks before the retention window expires.',
    href: '/bin',
    category: 'Administration',
    icon: Trash2,
    accent: 'text-zinc-500',
    tags: ['bin', 'trash', 'restore', 'deleted tasks'],
  },
  // {
  //   id: 'releases',
  //   title: 'Release Updates',
  //   subtitle: 'What changed in the app',
  //   description: 'Browse release notes and recent updates to understand new capabilities.',
  //   href: '/releases',
  //   category: 'Learn',
  //   icon: Rocket,
  //   accent: 'text-orange-500',
  //   tags: ['releases', 'what is new', 'updates', 'release notes'],
  // },
  {
    id: 'help-about',
    title: 'FAQ And Support',
    subtitle: 'Answers, tutorials, and support',
    description: 'Return to Help & About for FAQs, guidance, and support options.',
    href: '/about?section=faq',
    category: 'Learn',
    icon: HelpCircle,
    accent: 'text-green-600',
    tags: ['faq', 'support', 'help', 'tutorial'],
  },
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Account identity and workspace shortcuts',
    description: 'Manage personal details, access quick workspace shortcuts, and reach support surfaces from your profile.',
    href: '/profile',
    category: 'Learn',
    icon: UserCircle2,
    accent: 'text-rose-500',
    tags: ['profile', 'account', 'avatar', 'shortcuts'],
  },
];

type FeatureSuggestion = {
  id: string;
  title: string;
  subLabel: string;
  item: FeatureItem;
};

export default function HelpCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { userProfile } = useFirebase();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const isAdmin = userProfile?.role === 'admin';
  const from = searchParams.get('from');

  React.useEffect(() => {
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const availableFeatures = React.useMemo(() => {
    if (isAdmin) {
      return featureItems.map((item) =>
        item.id === 'help-about'
          ? {
              ...item,
              title: 'FAQ And Help',
              subtitle: 'Answers, tutorials, and guidance',
              description: 'Return to Help & About for FAQs, guided help, and product guidance.',
              tags: item.tags.filter((tag) => tag !== 'support'),
            }
          : item
      );
    }

    return featureItems;
  }, [isAdmin]);

  const filteredFeatures = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableFeatures;

    return availableFeatures.filter((item) => {
      const haystack = [
        item.title,
        item.subtitle,
        item.description,
        item.category,
        ...item.tags,
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [availableFeatures, searchQuery]);

  const searchSuggestions = React.useMemo((): FeatureSuggestion[] => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];

    return availableFeatures
      .filter((item) => {
        const haystack = [item.title, item.subtitle, ...item.tags].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subLabel: `${item.category} • ${item.subtitle}`,
        item,
      }));
  }, [availableFeatures, searchQuery]);

  const groupedFeatures = React.useMemo(() => {
    return filteredFeatures.reduce<Record<string, FeatureItem[]>>((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredFeatures]);

  const navigateToFeature = (href: string) => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push(href);
  };

  const handleBack = () => {
    window.dispatchEvent(new Event('navigation-start'));
    if (isMobile && from === 'profile') {
      router.push('/profile');
      return;
    }
    router.back();
  };

  const renderFeatureRow = (item: FeatureItem) => (
    <button
      key={item.id}
      onClick={() => navigateToFeature(item.href)}
      className="w-full text-left transition-colors hover:bg-muted/40 active:bg-muted"
    >
      <div className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0">
        <div className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm",
          item.accent
        )}>
          <item.icon className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary/20 ring-4 ring-background" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
            <Badge variant="outline" className="hidden sm:inline-flex h-5 rounded-full px-2 text-[9px] font-black uppercase tracking-wider">
              {item.category}
            </Badge>
          </div>
          <p className="truncate text-xs font-medium text-muted-foreground">{item.subtitle}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/40" />
      </div>
    </button>
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <div className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-primary/10 via-background to-amber-500/5 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_32%),radial-gradient(circle_at_bottom_left,hsl(var(--foreground)/0.06),transparent_28%)]" />
        <div className="relative p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack} className="mt-1 h-10 w-10 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary shadow-none hover:bg-primary/15">
                    Feature Explorer
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
                    Help Center
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Find the right page fast</h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Search TaskFlow features, jump to the right workspace page, and use this guide as a practical map of where things live.
                  </p>
                </div>
              </div>
            </div>
            {!isMobile && (
              <div className="hidden rounded-[1.75rem] border bg-background/80 p-4 shadow-sm backdrop-blur md:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/70">Tip</p>
                    <p className="text-sm font-semibold">Use page tutorials too</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                placeholder="Search features like notes, PDF export, reminders, cloud sync..."
                className="h-12 rounded-2xl border-primary/10 bg-background/80 pl-11 shadow-sm backdrop-blur"
              />
            </div>

            {isSearchFocused && searchSuggestions.length > 0 && (
              <div className="overflow-hidden rounded-[1.5rem] border bg-background/95 shadow-xl backdrop-blur">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => navigateToFeature(suggestion.item.href)}
                    className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted", suggestion.item.accent)}>
                      <suggestion.item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{suggestion.title}</p>
                      <p className="truncate text-[11px] font-medium uppercase tracking-tight text-muted-foreground">{suggestion.subLabel}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="mt-6 space-y-5">
          {Object.entries(groupedFeatures).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">{category}</p>
              <div className="overflow-hidden rounded-[2rem] border bg-card shadow-sm">
                {items.map(renderFeatureRow)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            {Object.entries(groupedFeatures).map(([category, items]) => (
              <Card key={category} className="overflow-hidden rounded-[2rem] border shadow-lg">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <CardTitle className="text-lg font-black tracking-tight">{category}</CardTitle>
                  <CardDescription className="text-xs font-medium uppercase tracking-[0.18em]">
                    {items.length} feature{items.length === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {items.map(renderFeatureRow)}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
                  <Zap className="h-5 w-5 text-primary" />
                  Popular Routes
                </CardTitle>
                <CardDescription>Common places people usually look for first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Tasks Page', href: '/', icon: Filter },
                  { label: 'Notes Workspace', href: '/notes', icon: NotebookPen },
                  { label: 'Settings', href: '/settings', icon: Settings },
                  { label: 'FAQ', href: '/about?section=faq', icon: BookOpen },
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant="outline"
                    onClick={() => navigateToFeature(item.href)}
                    className="h-11 w-full justify-between rounded-2xl px-4 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-black tracking-tight">Need another answer?</CardTitle>
                <CardDescription>These routes cover the most common support and learning surfaces.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => navigateToFeature('/about?section=faq')} className="h-12 rounded-2xl">
                    <BookOpen className="mr-2 h-4 w-4" />
                    FAQ
                  </Button>
                  <Button variant="outline" onClick={() => navigateToFeature('/about')} className="h-12 rounded-2xl">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & About
                  </Button>
                  <Button variant="outline" onClick={() => navigateToFeature('/settings')} className="h-12 rounded-2xl">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  <Button variant="outline" onClick={() => navigateToFeature('/profile')} className="h-12 rounded-2xl">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {filteredFeatures.length === 0 && (
        <Card className="mt-8 rounded-[2rem] border border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-bold">No matching features found</p>
              <p className="text-sm text-muted-foreground">Try broader terms like `notes`, `pdf`, `settings`, or `cloud sync`.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
