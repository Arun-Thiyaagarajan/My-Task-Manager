'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { X } from 'lucide-react';

import { SharedTaskView } from '@/components/shared-task-view';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getSharedTaskLinkByToken, getUiConfig } from '@/lib/data';
import { buildSharedFieldMetadata, hydrateTaskFromShareSnapshot, type SharedFieldMetadata } from '@/lib/task-share';
import type { Task, UiConfig } from '@/lib/types';

export default function SharedTaskTokenPage() {
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [fieldMetadata, setFieldMetadata] = useState<Map<string, SharedFieldMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = params.token as string;
    const fallbackUiConfig = getUiConfig();

    setUiConfig(fallbackUiConfig);

    const load = async () => {
      try {
        const sharedLink = await getSharedTaskLinkByToken(token);
        if (!sharedLink) {
          setTask(null);
          return;
        }

        const resolvedUiConfig: UiConfig = {
          ...fallbackUiConfig,
          ...sharedLink.viewConfig,
        };
        const resolvedTask = hydrateTaskFromShareSnapshot(sharedLink.taskId, sharedLink.snapshot);
        const resolvedFieldMetadata = {
          ...buildSharedFieldMetadata(resolvedUiConfig),
          ...(sharedLink.snapshot.fm || {}),
        };

        setUiConfig(resolvedUiConfig);
        setTask(resolvedTask);
        setFieldMetadata(new Map(Object.entries(resolvedFieldMetadata)));
        document.title = `${resolvedTask.title} | Shared Task`;
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [params.token]);

  if (isLoading) {
    return <LoadingSpinner text="Opening secure shared task..." size="lg" />;
  }

  if (!task || !uiConfig) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/5 px-6 text-center">
        <div className="w-full max-w-sm rounded-[2.5rem] border bg-background p-8 shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <X className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Link Unavailable</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
            This shared task link is invalid, unavailable, or no longer active.
          </p>
          <Button variant="outline" className="mt-8 h-12 w-full rounded-2xl font-bold shadow-sm" onClick={() => window.location.assign('/')}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return <SharedTaskView task={task} uiConfig={uiConfig} fieldMetadata={fieldMetadata} />;
}
