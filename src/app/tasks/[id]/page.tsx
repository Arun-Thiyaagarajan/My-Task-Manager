import { getTaskById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, GitMerge } from 'lucide-react';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PrLinksGroup } from '@/components/pr-links-group';
import { AiTaskSuggester } from '@/components/ai-task-suggester';

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

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" className="pl-1">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tasks
          </Link>
        </Button>
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
                    <span>{task.repository}</span>
                  </div>
                  {task.azureId && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                       <a
                          href={task.azureId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors"
                        >
                          Azure Work Item
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
        <div className="lg:w-1/3">
           <AiTaskSuggester task={task} />
        </div>
      </div>
    </div>
  );
}
