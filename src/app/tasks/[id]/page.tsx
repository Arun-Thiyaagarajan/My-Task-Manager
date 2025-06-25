import { getTaskById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, Users } from 'lucide-react';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PrLinksGroup } from '@/components/pr-links-group';
import { AiTaskSuggester } from '@/components/ai-task-suggester';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskPageProps {
  params: {
    id: string;
  };
}

export default function TaskPage({ params }: TaskPageProps) {
  const task = getTaskById(params.id);

  if (!task) {
    notFound();
  }

  const azureWorkItemUrl = task.azureWorkItemId 
    ? `https://dev.azure.com/your-org/your-project/_workitems/edit/${task.azureWorkItemId}` 
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
            <DeleteTaskButton taskId={task.id} />
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
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground mb-4">
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
              </div>
              <Separator className="my-4"/>
              <p className="text-foreground/80 whitespace-pre-wrap">
                {task.description}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Pull Request Links</CardTitle>
            </CardHeader>
            <CardContent>
              <PrLinksGroup prLinks={task.prLinks} />
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
                                            <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(dev)}`} />
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
           <AiTaskSuggester task={task} />
        </div>
      </div>
    </div>
  );
}
