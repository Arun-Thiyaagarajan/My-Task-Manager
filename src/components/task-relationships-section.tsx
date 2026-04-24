'use client';

import Link from 'next/link';
import { ExternalLink, GitBranch, Link2, ListTree, Network, Shapes } from 'lucide-react';

import { TaskStatusBadge } from '@/components/task-status-badge';
import { Badge } from '@/components/ui/badge';
import { AppTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Task, UiConfig } from '@/lib/types';

interface TaskRelationshipsSectionProps {
  task: Task;
  allTasks: Task[];
  uiConfig: UiConfig | null;
  action?: React.ReactNode;
  fromTaskId?: string | null;
  returnToTaskId?: string | null;
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function RelationshipTaskCard({
  task,
  uiConfig,
  tone = 'default',
  fromTaskId,
  returnToTaskId,
}: {
  task: Task;
  uiConfig: UiConfig | null;
  tone?: 'default' | 'linked';
  fromTaskId?: string | null;
  returnToTaskId?: string | null;
}) {
  const href = (() => {
    const params = new URLSearchParams();
    if (fromTaskId) params.set('fromTaskId', fromTaskId);
    if (returnToTaskId) params.set('returnToTaskId', returnToTaskId);
    const query = params.toString();
    return query ? `/tasks/${task.id}?${query}` : `/tasks/${task.id}`;
  })();

  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-0 items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:shadow-[0_16px_34px_-28px_rgba(15,23,42,0.32)] sm:gap-3 sm:px-3.5',
        tone === 'linked'
          ? 'border-primary/18 bg-primary/[0.045] hover:border-primary/28'
          : 'border-border/70 bg-muted/[0.16] hover:border-border/95 hover:bg-muted/[0.22]'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[0.58rem] font-semibold uppercase tracking-[0.14em] sm:h-8.5 sm:w-8.5',
          tone === 'linked'
            ? 'border-primary/18 bg-primary/[0.08] text-primary'
            : 'border-border/65 bg-background/90 text-muted-foreground'
        )}
      >
        {tone === 'linked' ? <Link2 className="h-3.5 w-3.5" /> : <ListTree className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex flex-1 items-center gap-2.5 overflow-hidden sm:gap-3">
        <AppTooltip content={task.title} delayDuration={180} side="top" className="max-w-xs break-words text-sm">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground sm:text-[0.95rem]">
            {task.title}
          </p>
        </AppTooltip>
        <div className="flex shrink-0 items-center gap-1.5">
          <TaskStatusBadge
            status={task.status}
            uiConfig={uiConfig}
            className="h-6.5 shrink-0 border-border/65 bg-background px-2 text-[10px] sm:h-7 sm:px-2.5 sm:text-[11px]"
          />
          {task.priority ? (
            <Badge
              variant="outline"
              className="h-6.5 shrink-0 rounded-full border-border/60 bg-background px-2 py-0 text-[10px] font-semibold capitalize sm:h-7 sm:px-2.5 sm:text-[11px]"
            >
              {task.priority}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/65 bg-background text-muted-foreground transition-colors group-hover:text-foreground">
        <ExternalLink className="h-4 w-4" />
      </div>
    </Link>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ListTree;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-0 items-center gap-2.5 rounded-xl border border-dashed border-border/70 bg-muted/[0.12] px-3 py-2.5 sm:gap-3 sm:px-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/55 bg-background text-muted-foreground/90">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex flex-1 items-center gap-2.5 overflow-hidden sm:gap-3">
        <p className="shrink-0 text-sm font-semibold text-muted-foreground text-foreground/92">{title}</p>
      </div>
    </div>
  );
}

function SectionPanel({
  title,
  eyebrow,
  icon: Icon,
  count,
  children,
  accent = 'default',
}: {
  title: string;
  eyebrow: string;
  icon: typeof ListTree;
  count?: string;
  children: React.ReactNode;
  accent?: 'default' | 'subtle' | 'linked';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        accent === 'linked'
          ? 'border-primary/16 bg-primary/[0.035]'
          : accent === 'subtle'
            ? 'border-border/65 bg-muted/[0.12]'
            : 'border-border/70 bg-card'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-background text-primary/85 shadow-[0_8px_22px_-22px_rgba(15,23,42,0.22)]">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">{eyebrow}</p>
            <h4 className="text-base font-semibold tracking-tight text-foreground">{title}</h4>
          </div>
        </div>
        {count ? (
          <Badge variant="secondary" className="rounded-full border border-border/55 bg-background px-2.5 py-0.5 text-[11px] font-semibold">
            {count}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export function TaskRelationshipsSection({
  task,
  allTasks,
  uiConfig,
  action,
  fromTaskId,
  returnToTaskId,
}: TaskRelationshipsSectionProps) {
  const availableTasks = allTasks.filter(candidate => !candidate.deletedAt);
  const parentTask = task.parentTaskId
    ? availableTasks.find(candidate => candidate.id === task.parentTaskId) || null
    : null;
  const subtasks = sortTasks(availableTasks.filter(candidate => candidate.parentTaskId === task.id));
  const linkedTasks = sortTasks(
    (task.linkedTaskIds || [])
      .map(linkedTaskId => availableTasks.find(candidate => candidate.id === linkedTaskId))
      .filter((candidate): candidate is Task => !!candidate)
  );

  const hasRelationships = !!parentTask || subtasks.length > 0 || linkedTasks.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-26px_rgba(15,23,42,0.2)] sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/18 bg-primary/[0.07] text-primary shadow-[0_12px_26px_-24px_rgba(59,130,246,0.44)]">
              <Shapes className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">Relationships</p>
              <h3 className="text-[1.08rem] font-semibold tracking-tight text-foreground">Task connections at a glance</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Keep parent work, subtasks, and linked tasks visible without making the detail view feel heavy.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full border border-border/55 bg-background px-2.5 py-0.5 text-[11px] font-semibold">
              {countLabel(subtasks.length, 'subtask', 'subtasks')}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-border/55 bg-background px-2.5 py-0.5 text-[11px] font-semibold">
              {countLabel(linkedTasks.length, 'link', 'links')}
            </Badge>
            {action}
          </div>
        </div>

        {!hasRelationships ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/[0.12] px-4 py-4 text-sm text-muted-foreground">
            No relationships added yet. Add a parent task or link related tasks from the edit form to build the structure here.
          </div>
        ) : null}
      </div>

      {hasRelationships ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionPanel title="Parent Task" eyebrow="Hierarchy" icon={ListTree} accent="subtle">
            {parentTask ? (
              <RelationshipTaskCard
                task={parentTask}
                uiConfig={uiConfig}
                fromTaskId={task.id}
                returnToTaskId={fromTaskId || returnToTaskId || null}
              />
            ) : (
              <EmptyPanel
                icon={ListTree}
                title="No parent task"
                description="This task currently sits at the top level."
              />
            )}
          </SectionPanel>

          <SectionPanel
            title="Subtasks"
            eyebrow="Breakdown"
            icon={GitBranch}
            count={countLabel(subtasks.length, 'item', 'items')}
            accent="default"
          >
            {subtasks.length > 0 ? (
              subtasks.map(subtask => (
                <RelationshipTaskCard
                  key={subtask.id}
                  task={subtask}
                  uiConfig={uiConfig}
                  fromTaskId={task.id}
                  returnToTaskId={fromTaskId || returnToTaskId || null}
                />
              ))
            ) : (
              <EmptyPanel
                icon={GitBranch}
                title="No subtasks yet"
                description="Add child tasks when you want to split this work into smaller parts."
              />
            )}
          </SectionPanel>

          <SectionPanel
            title="Linked Tasks"
            eyebrow="Connections"
            icon={Network}
            count={countLabel(linkedTasks.length, 'item', 'items')}
            accent="linked"
          >
            {linkedTasks.length > 0 ? (
              linkedTasks.map(linkedTask => (
                <RelationshipTaskCard
                  key={linkedTask.id}
                  task={linkedTask}
                  uiConfig={uiConfig}
                  tone="linked"
                  fromTaskId={task.id}
                  returnToTaskId={fromTaskId || returnToTaskId || null}
                />
              ))
            ) : (
              <EmptyPanel
                icon={Link2}
                title="No linked tasks yet"
                description="Connect related work here when tasks should stay separate but still be associated."
              />
            )}
          </SectionPanel>
        </div>
      ) : null}
    </div>
  );
}
