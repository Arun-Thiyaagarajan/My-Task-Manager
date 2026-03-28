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
  type LucideIcon,
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn, fuzzySearch } from '@/lib/utils';
import { getNotes, getTasks, getUiConfig } from '@/lib/data';
import { getStatusDisplayName } from '@/lib/status-config';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Note, Task } from '@/lib/types';

const SPOTLIGHT_EVENT = 'open-global-search';
const SPOTLIGHT_HISTORY_KEY = 'taskflow_spotlight_history';
const MAX_HISTORY_ITEMS = 12;

type SpotlightGroup = 'Tasks' | 'Notes' | 'Settings' | 'Others' | 'Recent';
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
};

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
    keywords: ['fields', 'status', 'repositories', 'custom field', 'visibility'],
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
    subLabel: 'Reminders, tutorials, notifications, sounds',
    section: 'features',
    anchorId: 'settings-features-card',
    icon: Bell,
    accentClassName: 'text-amber-500',
    keywords: ['features', 'reminders', 'sounds', 'tutorial', 'notification'],
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
    keywords: ['help', 'faq', 'guide', 'documentation'],
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
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [commandKey, setCommandKey] = React.useState('Ctrl');
  const [historyEntries, setHistoryEntries] = React.useState<SpotlightHistoryEntry[]>([]);
  const [uiConfigVersion, setUiConfigVersion] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshData = React.useCallback(() => {
    setTasks(getTasks());
    setNotes(getNotes());
    getUiConfig();
    setHistoryEntries(getHistory());
    setUiConfigVersion(version => version + 1);
  }, []);

  React.useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setCommandKey(isMac ? '⌘' : 'Ctrl');
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    refreshData();
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    return () => window.clearTimeout(focusTimer);
  }, [open, refreshData]);

  React.useEffect(() => {
    const openSearch = () => setOpen(true);
    const syncSearchData = () => refreshData();

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (isInteractiveTarget(event.target)) return;
        event.preventDefault();
        setOpen(current => !current);
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
  }, [refreshData]);

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

    return [...taskItems, ...noteItems, ...settingsItems, ...QUICK_LINKS];
  }, [isMobile, notes, tasks, uiConfig]);

  const historyMap = React.useMemo(() => new Map(historyEntries.map(entry => [entry.id, entry])), [historyEntries]);

  const visibleGroups = React.useMemo(() => {
    if (!debouncedQuery) {
      const recent = historyEntries
        .map(entry => searchableItems.find(item => item.id === entry.id))
        .filter((item): item is SpotlightItem => Boolean(item))
        .slice(0, 6)
        .map(item => ({ ...item, group: 'Recent' as const }));

      const quickAccess = searchableItems
        .filter(item => item.kind === 'settings' || item.kind === 'other')
        .sort((a, b) => {
          const aHistory = historyMap.get(a.id)?.count || 0;
          const bHistory = historyMap.get(b.id)?.count || 0;
          return bHistory - aHistory || a.title.localeCompare(b.title);
        })
        .slice(0, 8);

      return [
        { heading: 'Recent', items: recent },
        { heading: 'Quick Access', items: quickAccess },
      ].filter(section => section.items.length > 0);
    }

    const normalizedQuery = debouncedQuery.toLowerCase();

    const scoredItems = searchableItems
      .map(item => {
        const title = item.title.toLowerCase();
        const subLabel = item.subLabel.toLowerCase();
        const keywords = (item.keywords || []).join(' ').toLowerCase();
        let score = 0;

        if (title === normalizedQuery) score += 400;
        if (title.startsWith(normalizedQuery)) score += 250;
        if (title.includes(normalizedQuery)) score += 150;
        if (subLabel.includes(normalizedQuery)) score += 90;
        if (keywords.includes(normalizedQuery)) score += 80;
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
      if (existing.length < 8) {
        existing.push(item);
        grouped.set(item.group, existing);
      }
    });

    return (['Tasks', 'Notes', 'Settings', 'Others'] as SpotlightGroup[])
      .map(group => ({ heading: group, items: grouped.get(group) || [] }))
      .filter(section => section.items.length > 0);
  }, [debouncedQuery, historyEntries, historyMap, searchableItems]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      window.setTimeout(() => setQuery(''), 120);
    }
  };

  const navigateToResult = React.useCallback((item: SpotlightItem) => {
    try {
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
      window.dispatchEvent(new Event('navigation-start'));
      router.push(item.href, { scroll: false });

      if (item.href.includes('#')) {
        const anchorId = item.href.split('#')[1];
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
        hideClose
        className={cn(
          'gap-0 overflow-hidden border-white/10 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl',
          isMobile
            ? 'h-screen w-screen max-w-none rounded-none border-none'
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

          <CommandList className={cn(isMobile ? 'max-h-[calc(100vh-9rem)]' : 'max-h-[min(60vh,34rem)]')}>
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
                        key={item.id}
                        value={`${item.title} ${item.subLabel} ${(item.keywords || []).join(' ')}`}
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
