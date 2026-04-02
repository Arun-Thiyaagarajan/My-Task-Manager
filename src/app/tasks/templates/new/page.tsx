'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, MonitorSmartphone } from 'lucide-react';
import { TaskForm } from '@/components/task-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { addTaskTemplate, getDevelopers, getTaskTemplates, getTesters, getUiConfig } from '@/lib/data';
import { getCachedTasks as getTasks } from '@/lib/cached-data';
import type { Task, Person } from '@/lib/types';

export default function NewTaskTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [developersList, setDevelopersList] = useState<Person[]>([]);
  const [testersList, setTestersList] = useState<Person[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showTemplateNameError, setShowTemplateNameError] = useState(false);
  const [templateNameErrorMessage, setTemplateNameErrorMessage] = useState('Template name is required.');

  useEffect(() => {
    const config = getUiConfig();
    document.title = `Create Template | ${config.appName || 'My Task Manager'}`;
    setDevelopersList(getDevelopers());
    setTestersList(getTesters());
    setAllTasks(getTasks());
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const handleSaveTemplate = (data: any) => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setShowTemplateNameError(true);
      setTemplateNameErrorMessage('Template name is required.');
      toast({
        variant: 'destructive',
        title: 'Template name required',
        description: 'Add a template name before saving.',
      });
      return;
    }

    const normalizedTemplateName = trimmedName.replace(/\s+/g, ' ').toLowerCase();
    const hasDuplicateName = getTaskTemplates().some(
      (templateItem) => templateItem.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedTemplateName
    );
    if (hasDuplicateName) {
      setShowTemplateNameError(true);
      setTemplateNameErrorMessage('A template with this name already exists.');
      toast({
        variant: 'destructive',
        title: 'Duplicate template name',
        description: 'Choose a unique template name before saving.',
      });
      return;
    }

    try {
      setShowTemplateNameError(false);
      setTemplateNameErrorMessage('Template name is required.');
      const createdTemplate = addTaskTemplate({
        name: trimmedName,
        description: templateDescription.trim(),
        taskData: data,
      });

      toast({
        variant: 'success',
        title: 'Template saved',
        description: `"${createdTemplate.name}" is ready to use from new task flows.`,
      });

      window.dispatchEvent(new Event('navigation-start'));
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save template',
        description: error instanceof Error ? error.message : 'Something went wrong while saving the template.',
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading template builder..." />;
  }

  if (isMobile) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MonitorSmartphone className="h-6 w-6" />
            </div>
            <CardTitle>Template creation is desktop only</CardTitle>
            <CardDescription>
              You can use existing templates on mobile, but creating or managing templates is available on desktop for a cleaner setup experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('navigation-start'));
                router.push('/');
              }}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-none lg:border lg:shadow-sm">
        <CardContent className="p-0 lg:p-6">
          <TaskForm
            allTasks={allTasks}
            onSubmit={handleSaveTemplate}
            submitButtonText="Save Template"
            formTitle="Create a Template"
            developersList={developersList}
            testersList={testersList}
            showTemplateTools={false}
            validationMode="template"
            draftStorageKey="taskflow_draft_template_new"
            editorToolbarStorageKey="taskflow_editor_toolbar_template_form"
            topContent={(
              <Card className="border-border/60 bg-background/90 shadow-sm">
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Copy className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">Template Setup</span>
                  </div>
                  <CardTitle className="text-xl tracking-tight">Create a task template</CardTitle>
                  <CardDescription>
                    Build a reusable task preset here. The saved template can later be applied from task creation on desktop and mobile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Template name <span className="text-destructive font-semibold">*</span>
                    </label>
                    <Input
                      value={templateName}
                      onChange={(event) => {
                        setTemplateName(event.target.value);
                        if (event.target.value.trim()) {
                          setShowTemplateNameError(false);
                          setTemplateNameErrorMessage('Template name is required.');
                        }
                      }}
                      placeholder="My template"
                      className={showTemplateNameError ? "h-11 border-destructive/60 focus-visible:ring-destructive/30" : "h-11"}
                    />
                    {showTemplateNameError && (
                      <p className="text-xs font-medium text-destructive">{templateNameErrorMessage}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={templateDescription}
                      onChange={(event) => setTemplateDescription(event.target.value)}
                      placeholder="Add an optional note for when this template should be used"
                      className="min-h-[108px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
