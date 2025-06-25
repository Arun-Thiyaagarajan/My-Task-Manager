
'use client';

import { useState, useEffect } from 'react';
import { getTaskById } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, Loader2, ListChecks, Paperclip, CheckCircle2, Clock } from 'lucide-react';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { PrLinksGroup } from '@/components/pr-links-group';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import type { Task } from '@/lib/types';
import { CommentsSection } from '@/components/comments-section';
import { ENVIRONMENTS } from '@/lib/constants';

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const taskId = params.id as string;

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      setTask(foundTask || null);
      setIsLoading(false);
      if (foundTask) {
        document.title = `${foundTask.title} | TaskFlow`;
      } else {
        document.title = 'Task Not Found | TaskFlow';
      }
    }
  }, [taskId]);
  
  const handleCommentsUpdate = (newComments: string[]) => {
    if (task) {
      setTask({ ...task, comments: newComments });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-lg font-semibold text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    );
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

  const azureWorkItemUrl = task.azureWorkItemId 
    ? `https://dev.azure.com/ideaelan/Infinity/_workitems/edit/${task.azureWorkItemId}` 
    : null;

  const hasDevQaDates = task.devStartDate || task.devEndDate || task.qaStartDate || task.qaEndDate;
  const hasAnyDeploymentDate = task.deploymentDates && Object.values(task.deploymentDates).some(d => d);

  return (
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
                  <TaskStatusBadge status={task.status} />
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
          
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                      <GitMerge className="h-5 w-5" />
                      Activity
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <Tabs defaultValue="deployments" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="deployments">Deployments</TabsTrigger>
                          <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
                      </TabsList>
                      <TabsContent value="deployments" className="pt-4">
                         <div className="space-y-3 text-sm">
                              {ENVIRONMENTS.map(env => {
                                  const isDeployed = task.deploymentStatus?.[env];
                                  const envName = env === 'others' && task.othersEnvironmentName ? task.othersEnvironmentName : env;

                                  if (env === 'others' && !isDeployed) return null;

                                  return (
                                      <div key={env} className="flex justify-between items-center">
                                          <span className={cn("capitalize", isDeployed ? "text-foreground font-medium" : "text-muted-foreground")}>
                                              {envName}
                                          </span>
                                          {isDeployed ? (
                                              <div className="flex items-center gap-2">
                                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                  <span className="text-foreground">Deployed</span>
                                              </div>
                                          ) : (
                                              <div className="flex items-center gap-2 text-muted-foreground">
                                                  <Clock className="h-4 w-4" />
                                                  <span>Pending</span>
                                              </div>
                                          )}
                                      </div>
                                  )
                              })}
                               {(!task.deploymentStatus || Object.values(task.deploymentStatus).every(s => !s)) && (
                                  <p className="text-muted-foreground text-center text-xs pt-2">No deployments recorded.</p>
                               )}
                          </div>
                      </TabsContent>
                      <TabsContent value="pull-requests" className="pt-2">
                           <PrLinksGroup prLinks={task.prLinks} repositories={task.repositories} />
                      </TabsContent>
                  </Tabs>
              </CardContent>
          </Card>

           <CommentsSection
              taskId={task.id}
              comments={task.comments || []}
              onCommentsUpdate={handleCommentsUpdate}
           />

           {task.attachments && task.attachments.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Paperclip className="h-5 w-5" />
                        Attachments
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
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Assigned Developers</h4>
                         {task.developers && task.developers.length > 0 ? (
                            <ul className="space-y-2">
                                {task.developers.map(dev => (
                                    <li key={dev} className="flex items-center gap-2.5">
                                        <Avatar className="h-7 w-7">
                                            <AvatarFallback
                                                className="font-semibold text-white text-[10px]"
                                                style={{ backgroundColor: `#${getAvatarColor(dev)}` }}
                                            >
                                                {getInitials(dev)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-foreground">{dev}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No developers assigned.</p>
                        )}
                    </div>
                    
                    <Separator />

                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Repositories</h4>
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
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Azure DevOps</h4>
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
                                    <span className="text-muted-foreground">Dev Start</span>
                                    <span>{format(new Date(task.devStartDate), 'PPP')}</span>
                                </div>
                            )}
                            {task.devEndDate && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dev End</span>
                                    <span>{format(new Date(task.devEndDate), 'PPP')}</span>
                                </div>
                            )}
                            {(task.devStartDate || task.devEndDate) && (task.qaStartDate || task.qaEndDate) && <Separator className="my-1"/>}
                            {task.qaStartDate && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">QA Start</span>
                                    <span>{format(new Date(task.qaStartDate), 'PPP')}</span>
                                </div>
                            )}
                            {task.qaEndDate && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">QA End</span>
                                    <span>{format(new Date(task.qaEndDate), 'PPP')}</span>
                                </div>
                            )}
                            {(hasDevQaDates || hasAnyDeploymentDate) && <Separator className="my-2"/>}
                            {task.deploymentDates?.dev && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dev Deployed</span>
                                    <span>{format(new Date(task.deploymentDates.dev), 'PPP')}</span>
                                </div>
                            )}
                            {task.deploymentDates?.stage && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Stage Deployed</span>
                                    <span>{format(new Date(task.deploymentDates.stage), 'PPP')}</span>
                                </div>
                            )}
                             {task.deploymentDates?.production && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Prod Deployed</span>
                                    <span>{format(new Date(task.deploymentDates.production), 'PPP')}</span>
                                </div>
                            )}
                             {task.deploymentDates?.others && task.othersEnvironmentName && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground capitalize">{task.othersEnvironmentName} Deployed</span>
                                    <span>{format(new Date(task.deploymentDates.others), 'PPP')}</span>
                                </div>
                            )}
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
  );
}
