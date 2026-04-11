'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Code2,
  ExternalLink,
  GitMerge,
  Link2,
  ListChecks,
  Paperclip,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommentsSection } from '@/components/comments-section';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import { PrLinksGroup } from '@/components/pr-links-group';
import { Separator } from '@/components/ui/separator';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { TaskPriorityBadge } from '@/components/task-priority-badge';
import { TaskStatusBadge, getStatusConfig } from '@/components/task-status-badge';
import type { SharedFieldMetadata } from '@/lib/task-share';
import type { Environment, Task, UiConfig } from '@/lib/types';
import { getTaskDueBadgeLabel, getTaskDueLabel, getTaskDueToneClassName, hasDueReminder, parseTaskDate, getDueReminderPresetLabel } from '@/lib/task-planning';
import { cn, formatBytes, formatTimestamp, getAvatarColor, getInitials, getRepoBadgeStyle } from '@/lib/utils';
import { StatusIcon } from '@/lib/status-config';
import { getTaskRepositories, isRepositoryFieldActive, shouldShowPrLinks } from '@/lib/repository-config';

interface SharedTaskViewProps {
  task: Task;
  uiConfig: UiConfig;
  isLocalPreview?: boolean;
  fieldMetadata: Map<string, SharedFieldMetadata>;
}

export function SharedTaskView({
  task,
  uiConfig,
  fieldMetadata,
}: SharedTaskViewProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const statusConfig = getStatusConfig(task.status, uiConfig);
  const dueLabel = getTaskDueLabel(task);
  const dueBadgeLabel = getTaskDueBadgeLabel(task);
  const hasTaskDueReminder = hasDueReminder(task);
  const relevantEnvs = (task.relevantEnvironments || [])
    .map((name) => uiConfig.environments.find((environment) => environment.name === name))
    .filter((environment): environment is Environment => Boolean(environment));
  const visibleRepositories = getTaskRepositories(task, uiConfig);
  const showRepositories = isRepositoryFieldActive(uiConfig);
  const showPrSection = shouldShowPrLinks(uiConfig) && visibleRepositories.length > 0;
  const sharedUpdatedLabel = formatTimestamp(task.updatedAt, uiConfig.timeFormat);
  const dueDate = parseTaskDate(task.dueAt);
  const dueReminderDate = parseTaskDate(task.dueReminderAt);

  const fieldLabels = new Map<string, string>();
  fieldMetadata.forEach((value, key) => fieldLabels.set(key, value.l));

  const standardKeys = [
    'title',
    'description',
    'status',
    'priority',
    'repositories',
    'developers',
    'testers',
    'azureWorkItemId',
    'tags',
    'prLinks',
    'attachments',
    'deploymentStatus',
    'relevantEnvironments',
    'devStartDate',
    'devEndDate',
    'qaStartDate',
    'qaEndDate',
    'dueAt',
    'dueReminderAt',
    'dueReminderPreset',
    'comments',
    'summary',
  ];

  const customFieldEntries = Object.entries(task.customFields || {}).filter(([key]) => {
    if (key.endsWith('_alias')) return false;
    if (standardKeys.includes(key)) return false;
    return fieldMetadata.has(key);
  });

  const renderCustomFieldValue = (fieldKey: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground font-normal">N/A</span>;
    }

    const metadata = fieldMetadata.get(fieldKey);
    const aliasKey = `${fieldKey}_alias`;
    const alias = task.customFields?.[aliasKey];
    const isDateString = typeof value === 'string' && value.length >= 20 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

    if (metadata?.t === 'date' || isDateString) {
      try {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return <span className="font-normal">{format(date, 'PPP')}</span>;
        }
      } catch {}
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item: string) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      );
    }
    if (String(value).startsWith('http')) {
      return (
        <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {alias || String(value)}
        </a>
      );
    }

    return <RichTextViewer text={alias || String(value)} />;
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-20 selection:bg-primary selection:text-white">
      <div className="container mx-auto max-w-7xl space-y-8 px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-6 lg:col-span-2">
            <Card
              className={cn(
                'group/card relative overflow-hidden rounded-[1.5rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.009),rgba(255,255,255,0.002))] shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_60px_-38px_rgba(15,23,42,0.3)]',
                statusConfig.cardClassName
              )}
              style={statusConfig.cardStyle}
            >
              <StatusIcon
                status={task.status}
                uiConfig={uiConfig}
                className="absolute -bottom-12 -right-12 h-48 w-48 pointer-events-none opacity-20"
                style={statusConfig.backgroundIconStyle}
              />
              <div className="relative z-10 flex h-full flex-col">
                <CardHeader className="px-5 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <TaskPriorityBadge priority={task.priority} />
                        <Badge
                          variant="outline"
                          className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', getTaskDueToneClassName(task))}
                        >
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {dueLabel}
                        </Badge>
                      </div>
                      <CardTitle className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.2rem]">
                        {task.title}
                      </CardTitle>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="h-auto rounded-[1rem] p-0.5">
                        <TaskStatusBadge status={task.status} variant="prominent" uiConfig={uiConfig} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                  <CardDescription className="mb-5 text-[0.95rem] font-normal leading-6 text-muted-foreground/85">
                    Last updated {sharedUpdatedLabel}
                  </CardDescription>
                  {task.summary ? (
                    <div className="mb-5 rounded-[1rem] border border-border/55 bg-muted/[0.042] p-4">
                      <p className="text-sm italic leading-6 text-muted-foreground">{task.summary}</p>
                    </div>
                  ) : null}
                  <div className="font-normal leading-7 text-foreground/90">
                    <RichTextViewer text={task.description} />
                  </div>
                </CardContent>
              </div>
            </Card>

            <div className={cn('grid grid-cols-1 gap-6', showPrSection ? 'md:grid-cols-2' : '')}>
              <Card className="rounded-[1.35rem] border-border/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.011),rgba(255,255,255,0.003))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
                <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-[1.06rem] font-semibold tracking-tight text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary/80" />
                    {fieldLabels.get('deploymentStatus') || 'Deployments'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  <div className="space-y-1.5 text-sm">
                    {relevantEnvs.length > 0 ? (
                      relevantEnvs.map((environment) => {
                        const isDeployed = task.deploymentStatus?.[environment.name] ?? false;
                        return (
                          <div
                            key={environment.id}
                            className="flex items-center justify-between rounded-[0.95rem] border border-transparent px-3 py-2.5"
                          >
                            <span className="capitalize font-medium text-foreground">{environment.name}</span>
                            <div className={cn('flex items-center gap-2 font-medium', isDeployed ? 'text-green-600 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-500')}>
                              {isDeployed ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Deployed</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4" />
                                  <span>Pending</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="pt-2 text-center text-xs font-normal text-muted-foreground">No relevant environments selected for this task.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {showPrSection ? (
                <Card className="rounded-[1.35rem] border-border/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.011),rgba(255,255,255,0.003))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
                  <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                    <CardTitle className="flex items-center gap-2 text-[1.06rem] font-semibold tracking-tight text-foreground">
                      <GitMerge className="h-5 w-5 text-primary/80" />
                      {fieldLabels.get('prLinks') || 'Pull Requests'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                    <PrLinksGroup
                      prLinks={task.prLinks}
                      repositories={visibleRepositories}
                      configuredEnvs={relevantEnvs.map((environment) => environment.name)}
                      repositoryConfigs={uiConfig.repositoryConfigs}
                      isEditing={false}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {customFieldEntries.length > 0 ? (
              <Card className="rounded-[1.35rem] border-border/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.011),rgba(255,255,255,0.003))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
                <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-[1.06rem] font-semibold tracking-tight text-foreground">
                    <ListChecks className="h-5 w-5 text-primary/80" />
                    {fieldLabels.get('customFields') || 'Other Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  {customFieldEntries.map(([key, value]) => (
                    <div key={key} className="rounded-[1rem] border border-border/62 bg-muted/[0.028] px-4 py-3">
                      <h4 className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                        {fieldLabels.get(key) || key}
                      </h4>
                      <div className="min-w-0 text-sm leading-6 text-foreground">{renderCustomFieldValue(key, value)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {(task.attachments || []).length > 0 ? (
              <Card className="rounded-[1.35rem] border-border/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.011),rgba(255,255,255,0.003))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
                <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-[1.06rem] font-semibold tracking-tight text-foreground">
                    <Paperclip className="h-5 w-5 text-primary/80" />
                    {fieldLabels.get('attachments') || 'Attachments'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(task.attachments || []).map((attachment, index) => (
                      <div
                        key={`${attachment.url}-${index}`}
                        className="group/attachment flex items-center justify-between rounded-[1rem] border border-border/55 bg-background/78 p-3 transition-[background-color,border-color,box-shadow] duration-200 hover:border-border/80 hover:bg-accent/45 hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.15)]"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-border/55 bg-muted/[0.5]">
                            {attachment.type === 'image' ? (
                              <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" />
                            ) : (
                              <Link2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (attachment.type === 'image') {
                                  setPreviewImage({ url: attachment.url, name: attachment.name });
                                  return;
                                }
                                window.open(attachment.url, '_blank', 'noopener,noreferrer');
                              }}
                              className="truncate text-left text-sm font-semibold text-foreground transition-colors group-hover/attachment:text-primary group-hover/attachment:underline"
                            >
                              {attachment.name}
                            </button>
                            <div className="mt-0.5 flex items-center gap-2">
                              {attachment.size ? <span className="text-[10px] font-medium uppercase text-muted-foreground">{formatBytes(attachment.size)}</span> : null}
                              {attachment.uploadedAt ? (
                                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                                  • {format(new Date(attachment.uploadedAt), 'MMM d')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (attachment.type === 'image') {
                              setPreviewImage({ url: attachment.url, name: attachment.name });
                              return;
                            }
                            window.open(attachment.url, '_blank', 'noopener,noreferrer');
                          }}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/attachment:opacity-100" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <CommentsSection taskId={task.id} comments={task.comments || []} onCommentsUpdate={() => {}} readOnly={true} />
          </div>

          <div className="flex flex-col gap-6">
            <Card className="rounded-[1.35rem] border-border/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.011),rgba(255,255,255,0.003))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
              <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-[1.06rem] font-semibold tracking-tight text-foreground">
                  <ListChecks className="h-5 w-5 text-primary/80" />
                  Task Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Code2 className="h-4 w-4" /> {fieldLabels.get('developers') || 'Developers'}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {(task.developers || []).map((name, index) => (
                      <div key={`${name}-${index}`} className="flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[8px] font-bold text-white" style={{ backgroundColor: `#${getAvatarColor(name)}` }}>
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold">{name}</span>
                      </div>
                    ))}
                    {!task.developers?.length ? <p className="text-xs font-normal italic text-muted-foreground">None assigned.</p> : null}
                  </div>
                </div>
                <Separator className="opacity-50" />
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <ClipboardCheck className="h-4 w-4" /> {fieldLabels.get('testers') || 'Testers'}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {(task.testers || []).map((name, index) => (
                      <div key={`${name}-${index}`} className="flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[8px] font-bold text-white" style={{ backgroundColor: `#${getAvatarColor(name)}` }}>
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold">{name}</span>
                      </div>
                    ))}
                    {!task.testers?.length ? <p className="text-xs font-normal italic text-muted-foreground">None assigned.</p> : null}
                  </div>
                </div>
                {showRepositories ? (
                  <>
                    <Separator className="opacity-50" />
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <GitMerge className="h-4 w-4" /> {fieldLabels.get('repositories') || 'Repositories'}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleRepositories.map((repository) => (
                          <Badge key={repository} variant="repo" style={getRepoBadgeStyle(repository)} className="text-[10px] font-bold uppercase">
                            {repository}
                          </Badge>
                        ))}
                        {!visibleRepositories.length ? <p className="text-xs font-normal italic text-muted-foreground">No repositories linked.</p> : null}
                      </div>
                    </div>
                  </>
                ) : null}
                {task.azureWorkItemId ? (
                  <>
                    <Separator className="opacity-50" />
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <ExternalLink className="h-4 w-4" /> {fieldLabels.get('azureWorkItemId') || 'Azure DevOps'}
                      </h4>
                      {fieldMetadata.get('azureWorkItemId')?.u ? (
                        <a
                          href={`${fieldMetadata.get('azureWorkItemId')?.u}${task.azureWorkItemId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Work Item #{task.azureWorkItemId}</span>
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-foreground">#{task.azureWorkItemId}</span>
                      )}
                    </div>
                  </>
                ) : null}
                {(task.devStartDate || task.devEndDate || task.qaStartDate || task.qaEndDate) ? (
                  <>
                    <Separator className="opacity-50" />
                    <div>
                      <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Clock className="h-4 w-4" /> Timeline
                      </h4>
                      <div className="space-y-1.5 text-xs font-medium">
                        {task.devStartDate ? <div className="flex justify-between"><span>Dev Commenced</span><span className="font-bold">{format(new Date(task.devStartDate), 'PPP')}</span></div> : null}
                        {task.devEndDate ? <div className="flex justify-between"><span>Dev Completed</span><span className="font-bold">{format(new Date(task.devEndDate), 'PPP')}</span></div> : null}
                        {task.qaStartDate ? <div className="flex justify-between"><span>QA Started</span><span className="font-bold">{format(new Date(task.qaStartDate), 'PPP')}</span></div> : null}
                        {task.qaEndDate ? <div className="flex justify-between"><span>QA Verified</span><span className="font-bold">{format(new Date(task.qaEndDate), 'PPP')}</span></div> : null}
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[1.35rem] border-border/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.011),rgba(255,255,255,0.003))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
              <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-[1.06rem] font-semibold tracking-tight text-foreground">
                  <CalendarIcon className="h-5 w-5 text-primary/80" />
                  Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <div className="rounded-[1.1rem] border border-border/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.35)]">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Priority</p>
                  <div className="mt-1">
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-border/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.35)]">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Due Date</p>
                  <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={cn('inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-sm font-medium', getTaskDueToneClassName(task))}>
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="max-w-[min(46vw,14rem)] truncate sm:max-w-[19rem]">{dueBadgeLabel}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>{dueLabel}</p>
                        {dueDate ? (
                          <p className="truncate">
                            <span className="font-medium text-foreground/75">Due:</span> {formatTimestamp(dueDate, uiConfig.timeFormat)}
                          </p>
                        ) : null}
                        {task.dueCompletedAt ? (
                          <p className="truncate">
                            <span className="font-medium text-foreground/75">Completed:</span> {formatTimestamp(task.dueCompletedAt, uiConfig.timeFormat)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                {hasTaskDueReminder && dueReminderDate ? (
                  <div className="rounded-[1.1rem] border border-border/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.35)]">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Reminder</p>
                    <div className="mt-1 space-y-1 text-sm text-foreground">
                      <p>{getDueReminderPresetLabel(task.dueReminderPreset)}</p>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(dueReminderDate, uiConfig.timeFormat)}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-20 max-w-7xl space-y-4 px-6 text-center opacity-40">
        <Separator />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
          Published via {uiConfig.appName || 'TaskFlow'}
        </p>
      </div>

      <ImagePreviewDialog
        isOpen={!!previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
        imageUrl={previewImage?.url || null}
        imageName={previewImage?.name || null}
      />
    </div>
  );
}
