
'use client';

import { useState, useEffect } from 'react';
import { getTaskById } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, Users, CalendarDays, Loader2, Cloud, ListChecks, Paperclip } from 'lucide-react';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { PrLinksGroup } from '@/components/pr-links-group';
import { EnvironmentStatus } from '@/components/environment-status';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { Task } from '@/lib/types';
import { CommentsSection } from '@/components/comments-section';

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
      // In a real app, this would also persist the change
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

           <CommentsSection
              taskId={task.id}
              comments={task.comments || []}
              onCommentsUpdate={handleCommentsUpdate}
           />
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5" />
                        Properties
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <span className="text-muted-foreground block">Repositories</span>
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
                         <div className="space-y-2">
                            <span className="text-muted-foreground block">Azure DevOps</span>
                            <a href={azureWorkItemUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                <ExternalLink className="h-4 w-4" />
                                <span>Work Item #{task.azureWorkItemId}</span>
                            </a>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Developers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {task.developers && task.developers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            <TooltipProvider>
                            {task.developers.map(dev => (
                                <Tooltip key={dev}>
                                    <TooltipTrigger>
                                        <Avatar>
                                            <AvatarFallback
                                                className="font-semibold text-white"
                                                style={{ backgroundColor: `#${getAvatarColor(dev)}` }}
                                            >
                                                {getInitials(dev)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{dev}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                            </TooltipProvider>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No developers assigned.</p>
                    )}
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5" />
                        Pull Requests
                    </CardTitle>
                </CardHeader>
                <CardContent>
                   <PrLinksGroup prLinks={task.prLinks} repositories={task.repositories} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Deployments
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <EnvironmentStatus deploymentStatus={task.deploymentStatus} othersEnvironmentName={task.othersEnvironmentName} />
                   {task.deploymentUpdate && (
                     <>
                      <Separator/>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Deployment Update</h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{task.deploymentUpdate}</p>
                      </div>
                     </>
                   )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Important Dates
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                    {(task.devStartDate || task.devEndDate) && (task.qaStartDate || task.qaEndDate) && <Separator />}
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
                     {!(task.devStartDate || task.devEndDate || task.qaStartDate || task.qaEndDate) && (
                        <p className="text-muted-foreground text-center text-xs">No dates have been set.</p>
                     )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
