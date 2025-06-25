'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { taskSchema } from '@/lib/validators';
import type { Task } from '@/lib/types';
import { REPOSITORIES, TASK_STATUSES, ENVIRONMENTS } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CalendarIcon, PlusCircle, Trash2, Link2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
import { MultiSelect, type SelectOption } from './ui/multi-select';
import { Checkbox } from './ui/checkbox';
import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea, ScrollBar } from './ui/scroll-area';


type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: TaskFormData) => void;
  submitButtonText: string;
  developersList: string[];
}

export function TaskForm({ task, onSubmit, submitButtonText, developersList }: TaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allDevelopers, setAllDevelopers] = useState<string[]>(developersList);

  useEffect(() => {
    setAllDevelopers(developersList);
  }, [developersList]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      attachments: task?.attachments ?? [],
      status: task?.status ?? 'To Do',
      repositories: task?.repositories ?? [],
      azureWorkItemId: task?.azureWorkItemId ?? '',
      developers: task?.developers ?? (task ? [] : ['Arun']),
      qaIssueIds: task?.qaIssueIds ?? '',
      deploymentStatus: {
        dev: task?.deploymentStatus?.dev ?? false,
        stage: task?.deploymentStatus?.stage ?? false,
        production: task?.deploymentStatus?.production ?? false,
        others: task?.deploymentStatus?.others ?? false,
      },
      othersEnvironmentName: task?.othersEnvironmentName ?? '',
      prLinks: task?.prLinks ?? {},
      devStartDate: task?.devStartDate ? new Date(task.devStartDate) : undefined,
      devEndDate: task?.devEndDate ? new Date(task.devEndDate) : undefined,
      qaStartDate: task?.qaStartDate ? new Date(task.qaStartDate) : undefined,
      qaEndDate: task?.qaEndDate ? new Date(task.qaEndDate) : undefined,
      stageDate: task?.stageDate ? new Date(task.stageDate) : undefined,
      productionDate: task?.productionDate ? new Date(task.productionDate) : undefined,
      othersDate: task?.othersDate ? new Date(task.othersDate) : undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attachments"
  });

  const isOthersDeployed = form.watch('deploymentStatus.others');
  const selectedRepos = form.watch('repositories');


  const handleFormSubmit = (data: TaskFormData) => {
    startTransition(() => {
        onSubmit(data);
    });
  };

  const repositoryOptions: SelectOption[] = REPOSITORIES.map(repo => ({ value: repo, label: repo }));
  const developerOptions: SelectOption[] = allDevelopers.map(dev => ({ value: dev, label: dev }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="E.g. Fix login button" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the task in detail..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
            <FormField
              control={form.control}
              name="azureWorkItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azure Work Item ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qaIssueIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>QA Issue IDs (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. T118-1, T118-2" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated issue IDs.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <Card className="p-4 space-y-6">
          <FormField
            control={form.control}
            name="repositories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repositories <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                    <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={repositoryOptions}
                        placeholder="Select repositories..."
                    />
                </FormControl>
                <FormDescription>Select all applicable repositories for this task.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="developers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Developers</FormLabel>
                 <FormControl>
                    <MultiSelect
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        options={developerOptions}
                        placeholder="Select or create developers..."
                        onCreate={(value) => {
                          setAllDevelopers((prev) => [...new Set([...prev, value])]);
                        }}
                    />
                </FormControl>
                <FormDescription>Assign developers to this task. Type a new name and press Enter to add.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Attachments</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', url: '', type: 'link' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Attachment
                </Button>
            </div>
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start border p-4 rounded-md relative">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow w-full">
                            <FormField
                                control={form.control}
                                name={`attachments.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Design Mockup" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`attachments.${index}.url`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`attachments.${index}.type`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="link">
                                                  <div className="flex items-center"><Link2 className="mr-2 h-4 w-4" /> Web Link</div>
                                                </SelectItem>
                                                <SelectItem value="file">
                                                  <div className="flex items-center"><FileText className="mr-2 h-4 w-4" /> File Link</div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="md:absolute md:top-2 md:right-2 mt-4 md:mt-0 shrink-0"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Remove attachment</span>
                        </Button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No attachments added.</p>
                )}
            </div>
        </Card>
        
        <Accordion type="single" collapsible className="w-full" defaultValue="advanced">
            <AccordionItem value="advanced">
                <AccordionTrigger className="text-base">Advanced Details</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Task Dates</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="devStartDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Development Start</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="devEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Development End</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="qaStartDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>QA Start</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="qaEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>QA End</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="stageDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Stage Updated Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="productionDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Production Updated Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="othersDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Others Updated Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-4">Deployment Status</h4>
                      <div className="space-y-4">
                        {ENVIRONMENTS.map(env => (
                            <React.Fragment key={env}>
                                <FormField
                                control={form.control}
                                name={`deploymentStatus.${env}`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="capitalize font-normal">
                                        Deployed to {env}
                                        </FormLabel>
                                    </div>
                                    </FormItem>
                                )}
                                />
                                {env === 'others' && isOthersDeployed && (
                                <div className="pl-4 pb-2 -mt-2">
                                    <FormField
                                    control={form.control}
                                    name="othersEnvironmentName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Environment Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. UAT, Demo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                </div>
                                )}
                            </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                         <h4 className="font-medium text-sm text-muted-foreground mb-4">Pull Request Links</h4>
                         {selectedRepos && selectedRepos.length > 0 ? (
                            <Tabs defaultValue={selectedRepos[0]} className="w-full">
                                <ScrollArea className="w-full whitespace-nowrap">
                                    <TabsList>
                                        {selectedRepos.map((repo) => (
                                        <TabsTrigger key={repo} value={repo}>
                                            {repo}
                                        </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>

                                {selectedRepos.map((repo) => (
                                    <TabsContent key={repo} value={repo}>
                                        <div className="space-y-4 pt-4 border-t">
                                        {ENVIRONMENTS.map((env) => (
                                            <FormField
                                                key={`${repo}-${env}`}
                                                control={form.control}
                                                name={`prLinks.${env}.${repo}`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="capitalize">{env}</FormLabel>
                                                    <FormControl>
                                                    <Input
                                                        placeholder="e.g. 19703, 19704"
                                                        {...field}
                                                        onChange={(e) => field.onChange(e.target.value ?? '')}
                                                        value={field.value ?? ''}
                                                    />
                                                    </FormControl>
                                                    <FormDescription>Comma-separated PR IDs for {env}.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                        ))}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                         ) : (
                            <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                                Select at least one repository to add PR links.
                            </div>
                         )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>


        <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}
