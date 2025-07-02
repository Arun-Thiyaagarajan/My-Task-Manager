
'use client';

import { useState, useEffect } from 'react';
import { getTaskById, getUiConfig, updateTask, getDevelopers, getTesters } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, ListChecks, Paperclip, CheckCircle2, Clock, Box, Check, Code2, ClipboardCheck } from 'lucide-react';
import { statusConfig, TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { PrLinksGroup } from '@/components/pr-links-group';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Task, FieldConfig, UiConfig, TaskStatus, Person } from '@/lib/types';
import { CommentsSection } from '@/components/comments-section';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TASK_STATUSES } from '@/lib/constants';
import { PersonProfileCard } from '@/components/person-profile-card';


export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [justUpdatedEnv, setJustUpdatedEnv] = useState<string | null>(null);
  const [personInView, setPersonInView] = useState<{person: Person, type: 'Developer' | 'Tester'} | null>(null);

  const taskId = params.id as string;

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      setTask(foundTask || null);
      setUiConfig(getUiConfig());
      setDevelopers(getDevelopers());
      setTesters(getTesters());
      setIsLoading(false);
      if (foundTask) {
        document.title = `${foundTask.title} | My Task Manager`;
      } else {
        document.title = 'Task Not Found | My Task Manager';
      }
    }
  }, [taskId]);
  
  const handleCommentsUpdate = (newComments: string[]) => {
    if (task) {
      setTask({ ...task, comments: newComments });
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task) return;

    const updatedTask = updateTask(task.id, { status: newStatus });
    if(updatedTask) {
        setTask(updatedTask);
        toast({
            variant: 'success',
            title: 'Status Updated',
            description: `Task status changed to "${newStatus}".`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update task status.',
        });
    }
  };

  const handleToggleDeployment = (env: string) => {
    if (!task) return;

    const isSelected = task.deploymentStatus?.[env] ?? false;
    const hasDate = task.deploymentDates && task.deploymentDates[env];
    const isDeployed = isSelected && (env === 'dev' || !!hasDate);

    const newIsDeployed = !isDeployed;

    const newDeploymentStatus = { ...task.deploymentStatus };
    const newDeploymentDates = { ...task.deploymentDates };

    if (newIsDeployed) {
      newDeploymentStatus[env] = true;
      if (env !== 'dev') {
        newDeploymentDates[env] = new Date().toISOString();
      }
    } else {
      newDeploymentStatus[env] = false;
      newDeploymentDates[env] = null;
    }

    const updatedTaskData = {
        deploymentStatus: newDeploymentStatus,
        deploymentDates: newDeploymentDates,
    };
    
    const updatedTask = updateTask(task.id, updatedTaskData);
    if(updatedTask) {
        setTask(updatedTask);
        setJustUpdatedEnv(env);
        toast({
            variant: 'success',
            title: 'Deployment Status Updated',
            description: `Status for ${env.charAt(0).toUpperCase() + env.slice(1)} set to ${newIsDeployed ? 'Deployed' : 'Pending'}.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update deployment status.',
        });
    }
  };

  const renderCustomFieldValue = (key: string, value: any) => {
      const fieldConfig = uiConfig?.fields.find(f => f.key === key);
      if (!fieldConfig) return <span className="text-muted-foreground">N/A</span>;
      
      switch (fieldConfig.type) {
          case 'date':
              return value ? format(new Date(value), 'PPP') : 'Not set';
          case 'checkbox':
              return value ? 'Yes' : 'No';
          case 'url':
              return <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{value}</a>
          case 'multiselect':
              return Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                      {value.map(v => <Badge key={v} variant="secondary">{v}</Badge>)}
                  </div>
              ) : String(value);
          default:
              return String(value);
      }
  }

  if (isLoading || !uiConfig) {
    return <LoadingSpinner text="Loading task details..." />;
  }

  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Task not found</h1>
            <p className="text-muted-foreground">The task you are looking for does not exist.</p>
            <Button onClick={() => router.push('/')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Home
            </Button>
        </div>
      </div>
    );
  }

  const fieldLabels = new Map(uiConfig.fields.map(f => [f.key, f.label]));

  const azureWorkItemUrl = task.azureWorkItemId 
    ? `https://dev.azure.com/ideaelan/Infinity/_workitems/edit/${task.azureWorkItemId}` 
    : null;

  const hasDevQaDates = task.devStartDate || task.devEndDate || task.qaStartDate || task.qaEndDate;
  
  const allConfiguredEnvs = uiConfig.environments || [];
  
  const hasAnyDeploymentDate = allConfiguredEnvs.some(env => {
    const isSelected = task.deploymentStatus?.[env] ?? false;
    const hasDate = task.deploymentDates && task.deploymentDates[env];
    return isSelected && hasDate;
  });

  const customFields = uiConfig.fields.filter(f => f.isCustom && f.isActive && task.customFields && task.customFields[f.key]);
  const groupedCustomFields = customFields.reduce((acc, field) => {
    const group = field.group || 'Other Custom Fields';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, FieldConfig[]>);

  const developersById = new Map(developers.map(d => [d.id, d]));
  const testersById = new Map(testers.map(t => [t.id, t]));

  const assignedDevelopers = (task.developers || []).map(id => developersById.get(id)).filter((d): d is Person => !!d);
  const assignedTesters = (task.testers || []).map(id => testersById.get(id)).filter((t): t is Person => !!t);

  return (
    <>
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="ghost" className="pl-1">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tasks
            </Link>
          </Button>
          <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/tasks/${task.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeleteTaskButton taskId={task.id} onSuccess={() => router.push('/')} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <CardTitle className="text-3xl font-bold flex-1">
                    {task.title}
                  </CardTitle>
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0">
                          <TaskStatusBadge status={task.status} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {TASK_STATUSES.map(s => (
                          <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)}>
                            <div className="flex items-center gap-2">
                              {statusConfig[s].icon}
                              <span>{s}</span>
                            </div>
                            {task.status === s && <Check className="ml-auto h-4 w-4" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription>
                  Last updated on {format(new Date(task.updatedAt), 'PPP')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 whitespace-pre-wrap">
                  {task.description}
                </p>
              </CardContent>
            </Card>

            {Object.keys(groupedCustomFields).map(groupName => (
              <Card key={groupName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                      <Box className="h-5 w-5" />
                      {groupName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {groupedCustomFields[groupName].map(field => (
                        <div key={field.key}>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-1">{field.label}</h4>
                            <div className="text-sm text-foreground">{renderCustomFieldValue(field.key, task.customFields?.[field.key])}</div>
                        </div>
                    ))}
                </CardContent>
              </Card>
            ))}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                          <CheckCircle2 className="h-5 w-5" />
                          {fieldLabels.get('deploymentStatus') || 'Deployments'}
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="space-y-1 text-sm">
                          {allConfiguredEnvs.length > 0 ? (
                              allConfiguredEnvs.map(env => {
                                  const isSelected = task.deploymentStatus?.[env] ?? false;
                                  const hasDate = task.deploymentDates && task.deploymentDates[env];
                                  const isDeployed = isSelected && (env === 'dev' || !!hasDate);

                                  return (
                                      <div
                                          key={env}
                                          className="flex justify-between items-center p-2 -m-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                          onClick={() => handleToggleDeployment(env)}
                                      >
                                          <span className="capitalize text-foreground font-medium">
                                              {env}
                                          </span>

                                          <div
                                              onAnimationEnd={() => setJustUpdatedEnv(null)}
                                              className={cn(
                                                  'flex items-center gap-2 font-medium',
                                                  isDeployed ? 'text-green-600 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-500',
                                                  justUpdatedEnv === env && 'animate-status-in'
                                              )}
                                          >
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
                             <p className="text-muted-foreground text-center text-xs pt-2">No environments configured in settings.</p>
                          )}
                      </div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                          <GitMerge className="h-5 w-5" />
                          {fieldLabels.get('prLinks') || 'Pull Requests'}
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <PrLinksGroup 
                        prLinks={task.prLinks} 
                        repositories={task.repositories}
                        configuredEnvs={uiConfig.environments}
                        repositoryConfigs={uiConfig.repositoryConfigs}
                      />
                  </CardContent>
              </Card>
            </div>
            
            {task.attachments && task.attachments.length > 0 && (
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <Paperclip className="h-5 w-5" />
                          {fieldLabels.get('attachments') || 'Attachments'}
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                  <ul className="space-y-3">
                      {task.attachments.map((att, index) => (
                      <li key={index}>
                          <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                          <ExternalLink className="h-4 w-4" />
                          <span className="truncate">{att.name}</span>
                          </a>
                      </li>
                      ))}
                  </ul>
                  </CardContent>
              </Card>
            )}
            
             <CommentsSection
                taskId={task.id}
                comments={task.comments || []}
                onCommentsUpdate={handleCommentsUpdate}
             />

          </div>

          <div className="lg:col-span-1 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                          <ListChecks className="h-5 w-5" />
                          Task Details
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{fieldLabels.get('developers') || 'Developers'}</h4>
                          <div className="flex flex-wrap gap-4">
                              {assignedDevelopers.length > 0 ? (
                                  assignedDevelopers.map((dev) => (
                                    <button 
                                      key={dev.id} 
                                      className="flex items-center gap-2 p-1 -m-1 rounded-md hover:bg-muted/50 transition-colors"
                                      onClick={() => setPersonInView({ person: dev, type: 'Developer' })}
                                    >
                                        <Avatar className="h-7 w-7">
                                        <AvatarFallback
                                            className="font-semibold text-white text-[10px]"
                                            style={{
                                            backgroundColor: `#${getAvatarColor(dev.name)}`,
                                            }}
                                        >
                                            {getInitials(dev.name)}
                                        </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-foreground">
                                        {dev.name}
                                        </span>
                                    </button>
                                  ))
                              ) : (
                              <p className="text-sm text-muted-foreground">
                                  No developers assigned.
                              </p>
                              )}
                          </div>
                      </div>

                      <Separator />
                      
                      <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{fieldLabels.get('testers') || 'Testers'}</h4>
                          <div className="flex flex-wrap gap-4">
                              {assignedTesters.length > 0 ? (
                                  assignedTesters.map((tester) => (
                                    <button 
                                      key={tester.id} 
                                      className="flex items-center gap-2 p-1 -m-1 rounded-md hover:bg-muted/50 transition-colors"
                                      onClick={() => setPersonInView({ person: tester, type: 'Tester' })}
                                    >
                                      <Avatar className="h-7 w-7">
                                      <AvatarFallback
                                          className="font-semibold text-white text-[10px]"
                                          style={{
                                          backgroundColor: `#${getAvatarColor(tester.name)}`,
                                          }}
                                      >
                                          {getInitials(tester.name)}
                                      </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium text-foreground">
                                      {tester.name}
                                      </span>
                                    </button>
                                  ))
                              ) : (
                              <p className="text-sm text-muted-foreground">
                                  No testers assigned.
                              </p>
                              )}
                          </div>
                      </div>
                      
                      <Separator />

                      <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{fieldLabels.get('repositories') || 'Repositories'}</h4>
                          <div className="flex flex-wrap gap-1">
                            {(task.repositories && task.repositories.length > 0) ? (task.repositories || []).map(repo => (
                              <Badge key={repo} variant="secondary">{repo}</Badge>
                            )) : (
                              <p className="text-sm text-muted-foreground">No repositories assigned.</p>
                            )}
                          </div>
                      </div>
                      
                      {azureWorkItemUrl && (
                          <>
                              <Separator />
                              <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{fieldLabels.get('azureWorkItemId') || 'Azure DevOps'}</h4>
                                  <a href={azureWorkItemUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
                                      <ExternalLink className="h-4 w-4" />
                                      <span>Work Item #{task.azureWorkItemId}</span>
                                  </a>
                              </div>
                          </>
                      )}

                      <Separator />

                      <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Important Dates</h4>
                          <div className="space-y-2 text-sm">
                              {task.devStartDate && (
                                  <div className="flex justify-between">
                                      <span className="text-muted-foreground">{fieldLabels.get('devStartDate') || 'Dev Start Date'}</span>
                                      <span>{format(new Date(task.devStartDate), 'PPP')}</span>
                                  </div>
                              )}
                              {task.devEndDate && (
                                  <div className="flex justify-between">
                                      <span className="text-muted-foreground">{fieldLabels.get('devEndDate') || 'Dev End Date'}</span>
                                      <span>{format(new Date(task.devEndDate), 'PPP')}</span>
                                  </div>
                              )}
                              {(task.devStartDate || task.devEndDate) && (task.qaStartDate || task.qaEndDate) && <Separator className="my-1"/>}
                              {task.qaStartDate && (
                                  <div className="flex justify-between">
                                      <span className="text-muted-foreground">{fieldLabels.get('qaStartDate') || 'QA Start Date'}</span>
                                      <span>{format(new Date(task.qaStartDate), 'PPP')}</span>
                                  </div>
                              )}
                              {task.qaEndDate && (
                                  <div className="flex justify-between">
                                      <span className="text-muted-foreground">{fieldLabels.get('qaEndDate') || 'QA End Date'}</span>
                                      <span>{format(new Date(task.qaEndDate), 'PPP')}</span>
                                  </div>
                              )}
                              {(hasDevQaDates || hasAnyDeploymentDate) && <Separator className="my-2"/>}

                              {task.deploymentDates && Object.entries(task.deploymentDates).map(([env, date]) => {
                                  if (!date) return null;
                                  return (
                                      <div key={env} className="flex justify-between">
                                          <span className="text-muted-foreground capitalize">{env} Deployed</span>
                                          <span>{format(new Date(date), 'PPP')}</span>
                                      </div>
                                  )
                              })}

                               {!(hasDevQaDates || hasAnyDeploymentDate) && (
                                  <p className="text-muted-foreground text-center text-xs">No dates have been set.</p>
                               )}
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
        </div>
      </div>
      <PersonProfileCard
        person={personInView?.person ?? null}
        type={personInView?.type ?? 'Developer'}
        isOpen={!!personInView}
        onOpenChange={(isOpen) => !isOpen && setPersonInView(null)}
      />
    </>
  );
}
