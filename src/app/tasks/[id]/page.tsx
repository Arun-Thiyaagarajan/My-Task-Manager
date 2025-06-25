'use client';

import { useState, useEffect } from 'react';
import { getTaskById } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, Users, CalendarDays, Loader2, Bug, StickyNote, Paperclip, Link2, FileText } from 'lucide-react';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PrLinksGroup } from '@/components/pr-links-group';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { Task } from '@/lib/types';


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
    }
  }, [taskId]);

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

  const renderDateRange = (start?: string, end?: string) => {
      if (!start && !end) return 'Not set';
      const startDate = start ? format(new Date(start), 'PPP') : '...';
      const endDate = end ? format(new Date(end), 'PPP') : '...';
      return `${startDate} - ${endDate}`;
  }

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

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <TaskStatusBadge status={task.status} />
              <CardTitle className="text-3xl font-bold mt-2">
                {task.title}
              </CardTitle>
              <CardDescription>
                Last updated on {format(new Date(task.updatedAt), 'PPP')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <GitMerge className="h-4 w-4" />
                    <div className="flex flex-wrap gap-1">
                        {task.repositories.map(repo => <Badge variant="secondary" key={repo}>{repo}</Badge>)}
                    </div>
                  </div>
                  {azureWorkItemUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                       <a
                          href={azureWorkItemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors"
                        >
                          Azure ID: {task.azureWorkItemId}
                        </a>
                    </div>
                  )}
                  {task.qaIssueIds && task.qaIssueIds.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Bug className="h-4 w-4 text-muted-foreground mt-1" />
                       <div className="flex flex-wrap gap-1">
                        {task.qaIssueIds.map(id => (
                            <Badge variant="secondary" key={id}>{id}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
              <Separator className="my-4"/>
              <p className="text-foreground/80 whitespace-pre-wrap">
                {task.description}
              </p>
            </CardContent>
          </Card>
          
          {task.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 whitespace-pre-wrap">
                  {task.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.attachments.map((att, index) => (
                  <a
                    key={index}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-md border bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    {att.type === 'link' ? (
                      <Link2 className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                    <span className="text-primary hover:underline underline-offset-4 truncate">{att.name}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Pull Request Links</CardTitle>
            </CardHeader>
            <CardContent>
              <PrLinksGroup prLinks={task.prLinks} repositories={task.repositories} />
            </CardContent>
          </Card>

        </div>
        <div className="lg:w-1/3 space-y-6">
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
                                            <AvatarImage src={`https://placehold.co/40x40/${getAvatarColor(dev)}/ffffff.png?text=${getInitials(dev)}`} />
                                            <AvatarFallback>{getInitials(dev)}</AvatarFallback>
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
                        <CalendarDays className="h-5 w-5" />
                        Important Dates
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <p className="font-medium text-muted-foreground">Development</p>
                        <p className="text-foreground/90">{renderDateRange(task.devStartDate, task.devEndDate)}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">QA / Testing</p>
                        <p className="text-foreground/90">{renderDateRange(task.qaStartDate, task.qaEndDate)}</p>
                    </div>
                    <div>
                        <p className="font-medium text-muted-foreground">Stage Deployment</p>
                        <p className="text-foreground/90">{task.stageDate ? format(new Date(task.stageDate), 'PPP') : 'Not set'}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">Production Deployment</p>
                        <p className="text-foreground/90">{task.productionDate ? format(new Date(task.productionDate), 'PPP') : 'Not set'}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">{task.othersEnvironmentName || 'Others'} Deployment</p>
                        <p className="text-foreground/90">{task.othersDate ? format(new Date(task.othersDate), 'PPP') : 'Not set'}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
