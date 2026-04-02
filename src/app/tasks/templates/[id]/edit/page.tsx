'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, MonitorSmartphone, PencilLine } from 'lucide-react';
import { TaskForm } from '@/components/task-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TaskTemplateEditorSkeleton } from '@/components/task-template-skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { DATA_KEY, getActiveCompanyId, getAuthMode, getDevelopers, getTaskTemplateById, getTaskTemplates, getTesters, getUiConfig, isInitialSyncComplete, updateTaskTemplate } from '@/lib/data';
import { getCachedTasks as getTasks } from '@/lib/cached-data';
import type { Task, Person, TaskTemplate } from '@/lib/types';

export default function EditTaskTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const templateId = params.id as string;
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [developersList, setDevelopersList] = useState<Person[]>([]);
  const [testersList, setTestersList] = useState<Person[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showTemplateNameError, setShowTemplateNameError] = useState(false);
  const [templateNameErrorMessage, setTemplateNameErrorMessage] = useState('Template name is required.');
  const [showSkeleton, setShowSkeleton] = useState(false);

  const loadTemplate = useCallback(() => {
    if (!templateId) return;

    const config = getUiConfig();
    const foundTemplate = getTaskTemplateById(templateId);
    const authMode = getAuthMode();
    const activeCompanyId = getActiveCompanyId();
    const shouldWaitForCloudData =
      authMode === 'authenticate' && (!activeCompanyId || !isInitialSyncComplete(activeCompanyId));

    document.title = `${foundTemplate ? `Edit ${foundTemplate.name}` : 'Template Not Found'} | ${config.appName || 'My Task Manager'}`;

    if (!foundTemplate && shouldWaitForCloudData) {
      setIsLoading(true);
      return;
    }

    setTemplate(foundTemplate);
    setTemplateName(foundTemplate?.name || '');
    setTemplateDescription(foundTemplate?.description || '');
    setDevelopersList(getDevelopers());
    setTestersList(getTesters());
    setAllTasks(getTasks());
    setIsLoading(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, [templateId]);

  useEffect(() => {
    if (!templateId) return;

    loadTemplate();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== DATA_KEY) return;
      loadTemplate();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sync-complete', loadTemplate);
    window.addEventListener('company-changed', loadTemplate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sync-complete', loadTemplate);
      window.removeEventListener('company-changed', loadTemplate);
    };
  }, [templateId]);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSkeleton(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const handleUpdateTemplate = (data: any) => {
    if (!template) return;

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
      (templateItem) =>
        templateItem.id !== template.id &&
        templateItem.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedTemplateName
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
      const updatedTemplate = updateTaskTemplate(template.id, {
        name: trimmedName,
        description: templateDescription.trim(),
        taskData: data,
      });

      if (!updatedTemplate) {
        toast({
          variant: 'destructive',
          title: 'Template not found',
          description: 'This template could not be updated.',
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Template updated',
        description: `"${updatedTemplate.name}" has been refreshed.`,
      });

      window.dispatchEvent(new Event('navigation-start'));
      router.push('/tasks/templates');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not update template',
        description: error instanceof Error ? error.message : 'Something went wrong while saving the template.',
      });
    }
  };

  if (isLoading) {
    return showSkeleton ? <TaskTemplateEditorSkeleton /> : <LoadingSpinner text="Loading template..." />;
  }

  if (isMobile) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MonitorSmartphone className="h-6 w-6" />
            </div>
            <CardTitle>Template editing is desktop only</CardTitle>
            <CardDescription>
              Use desktop to update templates. You can still apply saved templates from task creation on mobile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => {
              window.dispatchEvent(new Event('navigation-start'));
              router.push('/tasks/templates');
            }} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg border-border/60 shadow-sm">
          <CardContent className="space-y-4 py-10 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Template not found</h1>
            <p className="text-sm text-muted-foreground">The template you are trying to edit is no longer available.</p>
            <Button type="button" onClick={() => {
              window.dispatchEvent(new Event('navigation-start'));
              router.push('/tasks/templates');
            }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
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
            task={template.taskData}
            allTasks={allTasks}
            onSubmit={handleUpdateTemplate}
            submitButtonText="Save Template"
            formTitle="Edit Template"
            developersList={developersList}
            testersList={testersList}
            showTemplateTools={false}
            validationMode="template"
            draftStorageKey={`taskflow_draft_template_${template.id}`}
            editorToolbarStorageKey="taskflow_editor_toolbar_template_form"
            topContent={(
              <Card className="border-border/60 bg-background/90 shadow-sm">
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <PencilLine className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">Template Editor</span>
                  </div>
                  <CardTitle className="text-xl tracking-tight">Refine your template</CardTitle>
                  <CardDescription>
                    Update the template name, refine its presets, and keep this reusable setup polished for future task creation.
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
