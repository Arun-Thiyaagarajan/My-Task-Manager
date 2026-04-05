'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  StickyNote,
  Settings2,
  FolderArchive,
  Bell,
  HelpCircle,
  User,
  History,
  ExternalLink,
  ArrowRight,
  Sparkles,
  LayoutTemplate,
  PlusCircle,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn, fuzzySearch } from '@/lib/utils';
import { getDeletedTaskTemplates, getTaskTemplates, getUiConfig } from '@/lib/data';
import { getCachedBinnedTasks as getBinnedTasks, getCachedNotes as getNotes, getCachedTasks as getTasks } from '@/lib/cached-data';
import { getStatusDisplayName } from '@/lib/status-config';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Note, Task, TaskTemplate } from '@/lib/types';

const SPOTLIGHT_EVENT = 'open-global-search';
const SPOTLIGHT_HISTORY_KEY = 'taskflow_spotlight_history';
const MAX_HISTORY_ITEMS = 12;

type SpotlightGroup = 'Tasks' | 'Notes' | 'Settings' | 'Others' | 'Recent' | 'Quick Access';
type SpotlightKind = 'task' | 'note' | 'settings' | 'other';

type SpotlightHistoryEntry = {
  id: string;
  count: number;
  lastOpenedAt: number;
};

type SpotlightItem = {
  id: string;
  kind: SpotlightKind;
  group: SpotlightGroup;
  title: string;
  subLabel: string;
  href: string;
  keywords?: string[];
  icon: LucideIcon;
  accentClassName?: string;
  updatedAt?: string;
  isBinned?: boolean;
  desktopOnly?: boolean;
  action?: 'toggle-tasks';
};

type IndexedSpotlightItem = SpotlightItem & {
  normalizedTitle: string;
  normalizedSubLabel: string;
  normalizedKeywords: string;
};

const toSpotlightItem = ({ normalizedTitle, normalizedSubLabel, normalizedKeywords, ...item }: IndexedSpotlightItem): SpotlightItem => item;

const SETTINGS_SECTIONS: Array<{
  id: string;
  title: string;
  subLabel: string;
  section: string;
  anchorId: string;
  icon: LucideIcon;
  accentClassName: string;
  keywords: string[];
}> = [
  {
    id: 'settings-fields',
    title: 'Field Configuration',
    subLabel: 'Task fields, visibility, status, repositories',
    section: 'fields',
    anchorId: 'settings-field-config-card',
    icon: Settings2,
    accentClassName: 'text-violet-500',
    keywords: ['fields', 'status', 'repositories', 'custom field', 'visibility', 'settings'],
  },
  {
    id: 'settings-appearance',
    title: 'Appearance',
    subLabel: 'Branding, theme, and time format',
    section: 'appearance',
    anchorId: 'settings-appearance-card',
    icon: Sparkles,
    accentClassName: 'text-sky-500',
    keywords: ['appearance', 'branding', 'theme', 'icon', 'time format'],
  },
  {
    id: 'settings-storage',
    title: 'Storage Mode',
    subLabel: 'Local mode, cloud sync, workspace storage',
    section: 'storage',
    anchorId: 'settings-storage-card',
    icon: FolderArchive,
    accentClassName: 'text-primary',
    keywords: ['storage', 'cloud', 'sync', 'local', 'backup'],
  },
  {
    id: 'settings-features',
    title: 'Features',
    subLabel: 'Reminders, notifications, sounds',
    section: 'features',
    anchorId: 'settings-features-card',
    icon: Bell,
    accentClassName: 'text-amber-500',
    keywords: ['features', 'reminders', 'sounds', 'notification', 'alerts'],
  },
  {
    id: 'settings-team',
    title: 'Team Management',
    subLabel: 'Developers, testers, workspace people',
    section: 'team',
    anchorId: 'settings-team-card',
    icon: User,
    accentClassName: 'text-indigo-500',
    keywords: ['team', 'developers', 'testers', 'people'],
  },
  {
    id: 'settings-environments',
    title: 'Environments',
    subLabel: 'Deployment environments and pipeline states',
    section: 'environments',
    anchorId: 'settings-environment-card',
    icon: History,
    accentClassName: 'text-emerald-500',
    keywords: ['environments', 'deployment', 'stage', 'production', 'dev'],
  },
  {
    id: 'settings-data',
    title: 'Data & Safety',
    subLabel: 'Import, export, clear data, recovery',
    section: 'data',
    anchorId: 'settings-data-card',
    icon: ExternalLink,
    accentClassName: 'text-rose-500',
    keywords: ['data', 'import', 'export', 'clear', 'restore', 'json'],
  },
];

const QUICK_LINKS: SpotlightItem[] = [
  {
    id: 'other-create-template',
    kind: 'other',
    group: 'Others',
    title: 'Create Template',
    subLabel: 'Start a new reusable task template',
    href: '/tasks/templates/new',
    icon: PlusCircle,
    accentClassName: 'text-primary',
    keywords: ['create template', 'new template', 'template builder', 'template create'],
    desktopOnly: true,
  },
  {
    id: 'other-templates',
    kind: 'other',
    group: 'Others',
    title: 'Templates',
    subLabel: 'Manage reusable task presets and the template bin',
    href: '/tasks/templates',
    icon: LayoutTemplate,
    accentClassName: 'text-indigo-500',
    keywords: ['templates', 'task template', 'presets', 'template bin'],
    desktopOnly: true,
  },
  {
    id: 'other-excel-import',
    kind: 'other',
    group: 'Others',
    title: 'Excel Import',
    subLabel: 'Desktop workbook review, template download, and import flow',
    href: '/tasks/import/excel',
    icon: FileSpreadsheet,
    accentClassName: 'text-emerald-500',
    keywords: ['excel', 'xlsx', 'import excel', 'export excel', 'template download'],
    desktopOnly: true,
  },
  {
    id: 'other-bin',
    kind: 'other',
    group: 'Others',
    title: 'Bin',
    subLabel: 'Recently deleted tasks and recovery',
    href: '/bin',
    icon: FolderArchive,
    accentClassName: 'text-zinc-500',
    keywords: ['trash', 'deleted tasks', 'restore'],
  },
  {
    id: 'other-reminders',
    kind: 'other',
    group: 'Others',
    title: 'Reminders',
    subLabel: 'Workspace reminders and follow-ups',
    href: '/reminders',
    icon: Bell,
    accentClassName: 'text-amber-500',
    keywords: ['reminders', 'general reminders', 'follow up'],
  },
  {
    id: 'other-help',
    kind: 'other',
    group: 'Others',
    title: 'Help Center',
    subLabel: 'Guides, FAQs, and feature help',
    href: '/help-center',
    icon: HelpCircle,
    accentClassName: 'text-sky-500',
    keywords: ['help', 'faq', 'guide', 'documentation', 'features'],
  },
  {
    id: 'other-profile',
    kind: 'other',
    group: 'Others',
    title: 'Profile',
    subLabel: 'Account, app shortcuts, and workspace actions',
    href: '/profile',
    icon: User,
    accentClassName: 'text-primary',
    keywords: ['profile', 'account', 'preferences'],
  },
];

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength = 120) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const getHistory = (): SpotlightHistoryEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SPOTLIGHT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is SpotlightHistoryEntry => Boolean(entry?.id && typeof entry.count === 'number' && typeof entry.lastOpenedAt === 'number'))
      : [];
  } catch {
    return [];
  }
};

const setHistory = (entries: SpotlightHistoryEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPOTLIGHT_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
};

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
};

function HighlightedText({ text, query, className }: { text: string; query: string; className?: string }) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return <span className={className}>{text}</span>;
  }

  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {text.slice(0, matchIndex)}
      <span className="rounded-sm bg-primary/15 px-0.5 text-foreground">{text.slice(matchIndex, matchIndex + normalizedQuery.length)}</span>
      {text.slice(matchIndex + normalizedQuery.length)}
    </span>
  );
}

export function openGlobalSpotlightSearch() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SPOTLIGHT_EVENT));
}

export function GlobalSpotlightSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [binnedTasks, setBinnedTasks] = React.useState<Task[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [templates, setTemplates] = React.useState<TaskTemplate[]>([]);
  const [deletedTemplates, setDeletedTemplates] = React.useState<TaskTemplate[]>([]);
  const [commandKey, setCommandKey] = React.useState('Ctrl');
  const [historyEntries, setHistoryEntries] = React.useState<SpotlightHistoryEntry[]>([]);
  const [uiConfigVersion, setUiConfigVersion] = React.useState(0);
  const [expandedTaskResults, setExpandedTaskResults] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshData = React.useCallback(() => {
    setTasks(getTasks());
    setBinnedTasks(getBinnedTasks());
    setNotes(getNotes());
    setTemplates(getTaskTemplates());
    setDeletedTemplates(getDeletedTaskTemplates());
    getUiConfig();
    setHistoryEntries(getHistory());
    setUiConfigVersion(version => version + 1);
  }, []);

  React.useEffect(() => {
    startTransition(() => {
      refreshData();
    });
  }, [refreshData, startTransition]);

  React.useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setCommandKey(isMac ? '⌘' : 'Ctrl');
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 45);

    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    setExpandedTaskResults(false);
  }, [debouncedQuery, open]);

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    const openSearch = () => {
      setOpen(true);
    };
    const syncSearchData = () => refreshData();

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (isInteractiveTarget(event.target)) return;
        event.preventDefault();
        setOpen(current => {
          const nextOpen = !current;
          return nextOpen;
        });
        return;
      }

      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener(SPOTLIGHT_EVENT, openSearch);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('storage', syncSearchData);
    window.addEventListener('company-changed', syncSearchData);
    window.addEventListener('config-changed', syncSearchData);
    window.addEventListener('notes-updated', syncSearchData);
    window.addEventListener('sync-complete', syncSearchData);

    return () => {
      window.removeEventListener(SPOTLIGHT_EVENT, openSearch);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('storage', syncSearchData);
      window.removeEventListener('company-changed', syncSearchData);
      window.removeEventListener('config-changed', syncSearchData);
      window.removeEventListener('notes-updated', syncSearchData);
      window.removeEventListener('sync-complete', syncSearchData);
    };
  }, [refreshData, startTransition]);

  const uiConfig = React.useMemo(() => getUiConfig(), [uiConfigVersion]);

  const searchableItems = React.useMemo<SpotlightItem[]>(() => {
    const taskItems: SpotlightItem[] = tasks.map(task => ({
      id: `task-${task.id}`,
      kind: 'task',
      group: 'Tasks',
      title: task.title || 'Untitled Task',
      subLabel: truncate([getStatusDisplayName(task.status, uiConfig), task.description].filter(Boolean).join(' · ') || 'Task'),
      href: `/tasks/${task.id}`,
      icon: FileText,
      accentClassName: 'text-primary',
      keywords: [task.status, task.description, ...(task.tags || []), ...(task.repositories || [])].filter(Boolean) as string[],
      updatedAt: task.updatedAt,
    }));

    const binnedTaskItems: SpotlightItem[] = binnedTasks.map(task => ({
      id: `task-binned-${task.id}`,
      kind: 'task',
      group: 'Tasks',
      title: task.title || 'Untitled Task',
      subLabel: truncate(['In Bin', getStatusDisplayName(task.status, uiConfig), task.description].filter(Boolean).join(' · ') || 'Deleted task'),
      href: `/tasks/${task.id}`,
      icon: FileText,
      accentClassName: 'text-zinc-500',
      keywords: ['bin', 'deleted', 'trash', task.status, task.description, ...(task.tags || []), ...(task.repositories || [])].filter(Boolean) as string[],
      updatedAt: task.deletedAt || task.updatedAt,
      isBinned: true,
    }));

    const noteItems: SpotlightItem[] = notes.map(note => ({
      id: `note-${note.id}`,
      kind: 'note',
      group: 'Notes',
      title: note.title || 'Untitled Note',
      subLabel: truncate(stripHtml(note.content || '') || 'Open note'),
      href: `/notes/${note.id}`,
      icon: StickyNote,
      accentClassName: 'text-amber-500',
      keywords: [note.title, note.content].filter(Boolean) as string[],
      updatedAt: note.updatedAt,
    }));

    const templateItems: SpotlightItem[] = templates.map(template => {
      const presetCount = Object.entries(template.taskData || {}).reduce((count, [, value]) => {
        if (value === undefined || value === null || value === '') return count;
        if (Array.isArray(value) && value.length === 0) return count;
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return count;
        return count + 1;
      }, 0);

      return {
        id: `template-${template.id}`,
        kind: 'other',
        group: 'Others',
        title: template.name,
        subLabel: truncate(
          [
            'Template',
            template.description?.trim(),
            presetCount > 0 ? `${presetCount} preset${presetCount === 1 ? '' : 's'}` : undefined,
          ]
            .filter(Boolean)
            .join(' · ') || 'Reusable task template'
        ),
        href: `/tasks/templates/${template.id}/edit`,
        icon: LayoutTemplate,
        accentClassName: 'text-indigo-500',
        keywords: [
          'template',
          'task template',
          template.description,
          template.taskData.status,
          ...(template.taskData.tags || []),
          ...(template.taskData.repositories || []),
        ].filter(Boolean) as string[],
        updatedAt: template.updatedAt,
        desktopOnly: true,
      };
    });

    const deletedTemplateItems: SpotlightItem[] = deletedTemplates.map(template => ({
      id: `template-deleted-${template.id}`,
      kind: 'other',
      group: 'Others',
      title: template.name,
      subLabel: truncate(
        ['Template in Bin', template.description?.trim(), 'Restore from template management']
          .filter(Boolean)
          .join(' · ') || 'Deleted template'
      ),
      href: '/tasks/templates?view=bin',
      icon: LayoutTemplate,
      accentClassName: 'text-zinc-500',
      keywords: [
        'template',
        'deleted template',
        'template bin',
        'restore',
        template.description,
        template.taskData.status,
        ...(template.taskData.tags || []),
        ...(template.taskData.repositories || []),
      ].filter(Boolean) as string[],
      updatedAt: template.deletedAt || template.updatedAt,
      isBinned: true,
      desktopOnly: true,
    }));

    const settingsItems: SpotlightItem[] = [
      ...SETTINGS_SECTIONS.map(section => ({
        id: section.id,
        kind: 'settings' as const,
        group: 'Settings' as const,
        title: section.title,
        subLabel: section.subLabel,
        href: isMobile ? `/settings?section=${section.section}` : `/settings#${section.anchorId}`,
        icon: section.icon,
        accentClassName: section.accentClassName,
        keywords: section.keywords,
      })),
      ...uiConfig.fields.map(field => ({
        id: `setting-field-${field.key}`,
        kind: 'settings' as const,
        group: 'Settings' as const,
        title: field.label,
        subLabel: `${field.group} · ${field.isActive ? 'Active' : 'Inactive'} field`,
        href: isMobile ? '/settings?section=fields' : '/settings#settings-field-config-card',
        icon: Settings2,
        accentClassName: field.isActive ? 'text-violet-500' : 'text-muted-foreground',
        keywords: [field.key, field.type, field.group, field.isActive ? 'active' : 'inactive'],
      })),
    ];

    return [...taskItems, ...binnedTaskItems, ...noteItems, ...templateItems, ...deletedTemplateItems, ...settingsItems, ...QUICK_LINKS]
      .filter(item => !(isMobile && item.desktopOnly));
  }, [binnedTasks, deletedTemplates, isMobile, notes, tasks, templates, uiConfig]);

  const searchableIndex = React.useMemo<IndexedSpotlightItem[]>(
    () =>
      searchableItems.map(item => ({
        ...item,
        normalizedTitle: item.title.toLowerCase(),
        normalizedSubLabel: item.subLabel.toLowerCase(),
        normalizedKeywords: (item.keywords || []).join(' ').toLowerCase(),
      })),
    [searchableItems]
  );

  const historyMap = React.useMemo(() => new Map(historyEntries.map(entry => [entry.id, entry])), [historyEntries]);

  const visibleGroups = React.useMemo<{ heading: SpotlightGroup; items: SpotlightItem[] }[]>(() => {
    if (!debouncedQuery) {
      const recent: SpotlightItem[] = historyEntries
        .map(entry => searchableIndex.find(item => item.id === entry.id))
        .filter((item): item is IndexedSpotlightItem => Boolean(item))
        .slice(0, 6)
        .map(item => ({ ...toSpotlightItem(item), group: 'Recent' as const }));

      const quickAccess: SpotlightItem[] = searchableIndex
        .filter(item => item.kind === 'settings' || item.kind === 'other')
        .sort((a, b) => {
          const aHistory = historyMap.get(a.id)?.count || 0;
          const bHistory = historyMap.get(b.id)?.count || 0;
          return bHistory - aHistory || a.title.localeCompare(b.title);
        })
        .slice(0, 8)
        .map(toSpotlightItem);

      return [
        { heading: 'Recent' as const, items: recent },
        { heading: 'Quick Access' as const, items: quickAccess },
      ].filter(section => section.items.length > 0);
    }

    const normalizedQuery = debouncedQuery.toLowerCase();

    const scoredItems = searchableIndex
      .map(item => {
        let score = 0;

        if (item.normalizedTitle === normalizedQuery) score += 400;
        if (item.normalizedTitle.startsWith(normalizedQuery)) score += 250;
        if (item.normalizedTitle.includes(normalizedQuery)) score += 150;
        if (item.normalizedSubLabel.includes(normalizedQuery)) score += 90;
        if (item.normalizedKeywords.includes(normalizedQuery)) score += 80;
        if (fuzzySearch(normalizedQuery, item.title)) score += 50;
        if (fuzzySearch(normalizedQuery, item.subLabel)) score += 30;

        const history = historyMap.get(item.id);
        if (history) {
          score += Math.min(history.count * 8, 40);
          if (Date.now() - history.lastOpenedAt < 1000 * 60 * 60 * 24 * 3) score += 20;
        }

        if (item.updatedAt) {
          const ageInDays = Math.max(0, (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
          score += Math.max(0, 18 - ageInDays);
        }

        return { item, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

    const grouped = new Map<SpotlightGroup, SpotlightItem[]>();
    scoredItems.forEach(({ item }) => {
      const existing = grouped.get(item.group) || [];
      existing.push(toSpotlightItem(item));
      grouped.set(item.group, existing);
    });

    const hasNonTaskMatches = ['Notes', 'Settings', 'Others'].some(group => (grouped.get(group as SpotlightGroup) || []).length > 0);
    const taskItems = grouped.get('Tasks') || [];
    const compactTaskLimit = hasNonTaskMatches ? 4 : 8;
    const expandedTaskLimit = hasNonTaskMatches ? 12 : 12;
    const taskLimit = expandedTaskResults ? expandedTaskLimit : compactTaskLimit;

    if (taskItems.length > taskLimit) {
      grouped.set('Tasks', [
        ...taskItems.slice(0, taskLimit),
        {
          id: 'tasks-expand-results',
          kind: 'other',
          group: 'Tasks',
          title: expandedTaskResults
            ? 'Show fewer tasks'
            : `Show ${Math.min(taskItems.length - taskLimit, 8)} more task${taskItems.length - taskLimit === 1 ? '' : 's'}`,
          subLabel: expandedTaskResults
            ? 'Collapse the task section and keep other matching destinations in view'
            : 'Expand task results without hiding matching settings and other destinations',
          href: '#',
          icon: ArrowRight,
          accentClassName: 'text-primary',
          action: 'toggle-tasks',
        },
      ]);
    } else if (taskItems.length > compactTaskLimit && expandedTaskResults) {
      grouped.set('Tasks', [
        ...taskItems.slice(0, expandedTaskLimit),
        {
          id: 'tasks-expand-results',
          kind: 'other',
          group: 'Tasks',
          title: 'Show fewer tasks',
          subLabel: 'Collapse the task section and keep other matching destinations in view',
          href: '#',
          icon: ArrowRight,
          accentClassName: 'text-primary',
          action: 'toggle-tasks',
        },
      ]);
    } else if (taskItems.length > 0) {
      grouped.set('Tasks', taskItems.slice(0, compactTaskLimit));
    }

    (['Notes', 'Settings', 'Others'] as SpotlightGroup[]).forEach(group => {
      const items = grouped.get(group) || [];
      if (items.length > 6) {
        grouped.set(group, items.slice(0, 6));
      }
    });

    return (['Tasks', 'Notes', 'Settings', 'Others'] as SpotlightGroup[])
      .map(group => ({ heading: group, items: grouped.get(group) || [] }))
      .filter(section => section.items.length > 0);
  }, [debouncedQuery, expandedTaskResults, historyEntries, historyMap, searchableIndex]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      window.setTimeout(() => setQuery(''), 60);
    }
  };

  const navigateToResult = React.useCallback((item: SpotlightItem) => {
    try {
      if (item.action === 'toggle-tasks') {
        setExpandedTaskResults(current => !current);
        return;
      }

      const nextHistory = getHistory();
      const existingIndex = nextHistory.findIndex(entry => entry.id === item.id);
      if (existingIndex >= 0) {
        nextHistory[existingIndex] = {
          ...nextHistory[existingIndex],
          count: nextHistory[existingIndex].count + 1,
          lastOpenedAt: Date.now(),
        };
      } else {
        nextHistory.unshift({ id: item.id, count: 1, lastOpenedAt: Date.now() });
      }

      setHistory(nextHistory.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt));
      setHistoryEntries(getHistory());
      setOpen(false);
      setQuery('');

      const targetUrl = new URL(item.href, window.location.origin);
      const isSamePath = targetUrl.pathname === window.location.pathname;

      if (isSamePath) {
        const nextHref = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
        const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (nextHref !== currentHref) {
          window.history.pushState(null, '', nextHref);
        }

        if (targetUrl.hash) {
          const anchorId = targetUrl.hash.slice(1);
          window.setTimeout(() => {
            document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }

        return;
      }

      window.dispatchEvent(new Event('navigation-start'));
      router.push(item.href, { scroll: false });

      if (targetUrl.hash) {
        const anchorId = targetUrl.hash.slice(1);
        window.setTimeout(() => {
          document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 220);
      }
    } catch {
      setOpen(false);
    }
  }, [router]);

  const placeholder = debouncedQuery ? undefined : 'Search anything...';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose={!isMobile}
        className={cn(
          'gap-0 overflow-hidden border-white/10 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl duration-200 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.985] data-[state=open]:zoom-in-[0.995] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[49%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[49%]',
          isMobile
            ? 'top-4 w-[calc(100vw-1rem)] max-w-none translate-y-0 rounded-[24px] border max-h-[72vh]'
            : 'top-[18vh] translate-y-0 rounded-[28px] border sm:max-w-2xl'
        )}
      >
        <DialogTitle className="sr-only">Global Spotlight Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search tasks, notes, settings, and workspace destinations, then navigate to the selected result.
        </DialogDescription>
        <Command shouldFilter={false} className="bg-transparent">
          <div className="border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-3 px-4 pt-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-tight">Spotlight Search</p>
                <p className="text-xs text-muted-foreground">Jump to tasks, notes, settings, and more.</p>
              </div>
              <div className="ml-auto hidden items-center gap-1 rounded-full border bg-background/80 px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:flex">
                <span>{commandKey}</span>
                <span>K</span>
              </div>
            </div>
            <CommandInput
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
              className="h-14 text-base"
            />
          </div>

          <CommandList className={cn(isMobile ? 'max-h-[min(52vh,24rem)]' : 'max-h-[min(60vh,34rem)]')}>
            {visibleGroups.length === 0 ? (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                    <Search className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold">No results found</p>
                  <p className="text-xs text-muted-foreground">Try searching tasks, notes, statuses, or settings.</p>
                </div>
              </CommandEmpty>
            ) : (
              visibleGroups.map((section, sectionIndex) => (
                <React.Fragment key={section.heading}>
                  {sectionIndex > 0 && <CommandSeparator />}
                  <CommandGroup heading={section.heading}>
                    {section.items.map(item => (
                      <CommandItem
                        key={`${section.heading}-${item.id}`}
                        value={`${section.heading} ${item.id} ${item.title} ${item.subLabel} ${(item.keywords || []).join(' ')}`}
                        onSelect={() => navigateToResult(item)}
                        className="group rounded-2xl px-3 py-3"
                      >
                        <div className={cn('mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/70 transition-colors group-aria-selected:bg-background', item.accentClassName)}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <HighlightedText
                              text={item.title}
                              query={debouncedQuery}
                              className="truncate text-sm font-semibold"
                            />
                            {item.isBinned && (
                              <Badge className="h-5 rounded-full border border-red-500/20 bg-red-500/10 px-2 text-[9px] font-black uppercase tracking-wide text-red-600 hover:bg-red-500/10 dark:text-red-300">
                                In Bin
                              </Badge>
                            )}
                            {item.group === 'Recent' && (
                              <Badge variant="outline" className="h-5 rounded-full px-2 text-[9px] uppercase tracking-wide">
                                Recent
                              </Badge>
                            )}
                          </div>
                          <HighlightedText
                            text={item.subLabel}
                            query={debouncedQuery}
                            className="block truncate text-xs text-muted-foreground"
                          />
                        </div>
                        <CommandShortcut className="hidden sm:inline-flex">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </React.Fragment>
              ))
            )}
          </CommandList>

          <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
            <p>Use arrows to move, Enter to open, Esc to close.</p>
            <p className="hidden sm:block">{pathname === '/' ? 'Tasks home ready' : 'Search stays global'}</p>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
