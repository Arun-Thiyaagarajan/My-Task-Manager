'use client';

import Link from 'next/link';
import { ExternalLink, GitBranch, Link2, ListTree, Network, Shapes } from 'lucide-react';

import { TaskStatusBadge } from '@/components/task-status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Task, UiConfig } from '@/lib/types';

interface TaskRelationshipsSectionProps {
  task: Task;
  allTasks: Task[];
  uiConfig: UiConfig | null;
  action?: React.ReactNode;
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
}: {
  task: Task;
  uiConfig: UiConfig | null;
  tone?: 'default' | 'linked';
}) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        'group relative flex min-h-[116px] items-start justify-between gap-4 overflow-hidden rounded-[1.4rem] border px-4 py-4 transition-[transform,border-color,background-color,box-shadow] duration-250 hover:-translate-y-[1px] hover:shadow-[0_22px_42px_-30px_rgba(15,23,42,0.45)]',
        tone === 'linked'
          ? 'border-primary/12 bg-[linear-gradient(145deg,rgba(59,130,246,0.06),rgba(255,255,255,0.02))] hover:border-primary/22'
          : 'border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] hover:border-border/85'
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_68%)] opacity-80" />
      <div className="relative z-10 min-w-0 space-y-3">
        <div className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            {tone === 'linked' ? 'Linked Task' : 'Task'}
          </p>
          <p className="line-clamp-2 text-xl font-semibold tracking-tight text-foreground">
            {task.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} uiConfig={uiConfig} className="border-white/10 bg-background/55" />
          {task.priority ? (
            <Badge variant="outline" className="rounded-full border-border/55 bg-background/40 px-2.5 py-1 text-[11px] font-semibold capitalize">
              {task.priority}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/55 bg-background/45 text-muted-foreground transition-colors group-hover:text-foreground">
        <ExternalLink className="h-4.5 w-4.5" />
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
    <div className="flex min-h-[116px] items-center gap-4 rounded-[1.4rem] border border-dashed border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] px-4 py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/45 bg-background/45 text-muted-foreground/90">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground/92">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
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
        'rounded-[1.65rem] border p-4 sm:p-5',
        accent === 'linked'
          ? 'border-primary/12 bg-[linear-gradient(180deg,rgba(59,130,246,0.06),rgba(255,255,255,0.018))]'
          : accent === 'subtle'
            ? 'border-border/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012))]'
            : 'border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))]'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/45 text-primary/85 shadow-[0_10px_28px_-26px_rgba(15,23,42,0.35)]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">{eyebrow}</p>
            <h4 className="text-base font-semibold tracking-tight text-foreground">{title}</h4>
          </div>
        </div>
        {count ? (
          <Badge variant="secondary" className="rounded-full border border-white/5 bg-background/55 px-3 py-1 text-[11px] font-semibold">
            {count}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function TaskRelationshipsSection({ task, allTasks, uiConfig, action }: TaskRelationshipsSectionProps) {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.8rem] border border-border/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] px-5 py-5 shadow-[0_20px_46px_-38px_rgba(15,23,42,0.42)] sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-primary/20 bg-primary/[0.07] text-primary shadow-[0_16px_34px_-28px_rgba(59,130,246,0.55)]">
              <Shapes className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">Relationships</p>
              <h3 className="text-[1.18rem] font-semibold tracking-tight text-foreground">Task connections at a glance</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Keep parent work, subtasks, and cross-linked tasks in one cleaner view without adding noise to the rest of the page.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full border border-white/5 bg-background/55 px-3 py-1 text-[11px] font-semibold">
              {countLabel(subtasks.length, 'subtask', 'subtasks')}
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-white/5 bg-background/55 px-3 py-1 text-[11px] font-semibold">
              {countLabel(linkedTasks.length, 'link', 'links')}
            </Badge>
            {action}
          </div>
        </div>

        {!hasRelationships ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-background/35 px-5 py-6 text-sm text-muted-foreground">
            No relationships added yet. Add a parent task or link related tasks from the edit form to build the structure here.
          </div>
        ) : null}
      </div>

      {hasRelationships ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1.95fr]">
          <SectionPanel title="Parent Task" eyebrow="Hierarchy" icon={ListTree} accent="subtle">
            {parentTask ? (
              <RelationshipTaskCard task={parentTask} uiConfig={uiConfig} />
            ) : (
              <EmptyPanel
                icon={ListTree}
                title="No parent task"
                description="This task currently sits at the top level."
              />
            )}
          </SectionPanel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionPanel
              title="Subtasks"
              eyebrow="Breakdown"
              icon={GitBranch}
              count={countLabel(subtasks.length, 'item', 'items')}
              accent="default"
            >
              {subtasks.length > 0 ? (
                subtasks.map(subtask => <RelationshipTaskCard key={subtask.id} task={subtask} uiConfig={uiConfig} />)
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
                  <RelationshipTaskCard key={linkedTask.id} task={linkedTask} uiConfig={uiConfig} tone="linked" />
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
        </div>
      ) : null}
    </div>
  );
}
