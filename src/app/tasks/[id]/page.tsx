
'use client';

import { useState, useEffect, Fragment } from 'react';
import { getTaskById, getFields } from '@/lib/data';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, ExternalLink, GitMerge, Pencil, Users, CalendarDays, Loader2, Bug, Paperclip, Link2, FileText, StickyNote, Info } from 'lucide-react';
import { TaskStatusBadge } from '@/components/task-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PrLinksGroup } from '@/components/pr-links-group';
import { DeleteTaskButton } from '@/components/delete-task-button';
import { Badge } from '@/components/ui/badge';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { Task, FormField } from '@/lib/types';
import { CommentsSection } from '@/components/comments-section';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';


export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [allFields, setAllFields] = useState<Record<string, FormField>>({});
  const [isLoading, setIsLoading] = useState(true);

  const taskId = params.id as string;

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId);
      const fields = getFields();
      setTask(foundTask || null);
      setAllFields(fields);
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

  const customFieldIds = Object.keys(allFields).filter(id => {
      const field = allFields[id];
      // Exclude core, always-visible fields and group fields (which are rendered separately)
      return field.isCustom && field.type !== 'group';
  });

  const customFieldsToDisplay = customFieldIds.map(id => ({
      ...allFields[id],
      value: task?.[id]
  })).filter(field => field.value !== undefined && field.value !== null && field.value !== '');

  const groupFields = Object.values(allFields).filter(field => field.type === 'group');

  const renderFieldValue = (field: FormField, value: any) => {
    if (value === undefined || value === null || value === '') return 'Not set';

    if (field.type === 'date' && value) {
        try {
            return format(new Date(value), 'PPP');
        } catch {
            return 'Invalid Date';
        }
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2); // Fallback for nested objects
    }
    return String(value);
  }


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

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-6">
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
          
          <Accordion type="multiple" defaultValue={['comments']} className="w-full space-y-4">
            {groupFields.map(groupFieldDef => {
                const groupData = task[groupFieldDef.id];
                if (!groupData) return null;

                const items = groupFieldDef.isRepeatable ? (Array.isArray(groupData) ? groupData : []) : [groupData];
                if (items.length === 0) return null;

                return (
                    <Card as="div" key={groupFieldDef.id}>
                        <AccordionItem value={groupFieldDef.id} className="border-none">
                            <AccordionTrigger className="p-6 hover:no-underline">
                                <CardTitle className="text-2xl flex-1 text-left">{groupFieldDef.label}</CardTitle>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                                {items.map((item, index) => (
                                    <div key={index} className={cn("rounded-lg border p-4", items.length > 1 && "bg-muted/40")}>
                                        {groupFieldDef.isRepeatable && <h4 className="font-semibold text-md mb-3">{groupFieldDef.label} #{index + 1}</h4>}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            {groupFieldDef.childFieldIds?.map(childId => {
                                                const childFieldDef = allFields[childId];
                                                if (!childFieldDef) return null;
                                                return (
                                                    <div key={childId}>
                                                        <p className="font-medium text-muted-foreground">{childFieldDef.label}</p>
                                                        <p className="text-foreground/90">{renderFieldValue(childFieldDef, item[childId])}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    </Card>
                );
            })}
             {customFieldsToDisplay.length > 0 && (
                <Card>
                    <AccordionItem value="additional-details" className="border-none">
                      <AccordionTrigger className="p-6 hover:no-underline">
                        <CardTitle className="text-2xl flex items-center gap-2 flex-1 text-left">
                            <Info className="h-5 w-5" />
                            Additional Details
                        </CardTitle>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {customFieldsToDisplay.map(field => (
                                <div key={field.id}>
                                    <p className="font-medium text-muted-foreground">{field.label}</p>
                                    <div className="text-foreground/90">
                                      {renderFieldValue(field, field.value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                </Card>
            )}
            <Card as="div">
                <AccordionItem value="comments" className="border-none">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <CardTitle className="text-2xl flex items-center gap-2 flex-1 text-left">
                            <StickyNote className="h-5 w-5" />
                            Comments
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pt-0 pb-6">
                        <CommentsSection
                            taskId={task.id}
                            comments={task.comments || []}
                            onCommentsUpdate={handleCommentsUpdate}
                            hideHeader
                        />
                    </AccordionContent>
                </AccordionItem>
            </Card>
          </Accordion>
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
                        <CalendarDays className="h-5 w-5" />
                        Important Dates
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {Object.values(allFields).filter(f => f.type === 'date' && task[f.id]).map(dateField => (
                        <div key={dateField.id}>
                            <p className="font-medium text-muted-foreground">{dateField.label}</p>
                            <p className="text-foreground/90">{renderFieldValue(dateField, task[dateField.id])}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
