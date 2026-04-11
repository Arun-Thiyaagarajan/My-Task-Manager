'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { SharedTaskView } from '@/components/shared-task-view';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { buildSharedFieldMetadata, decodeTaskShareSnapshot, hydrateTaskFromShareSnapshot, type SharedFieldMetadata } from '@/lib/task-share';
import { getTaskById, getUiConfig } from '@/lib/data';
import type { Task, UiConfig } from '@/lib/types';
import { X } from 'lucide-react';

function SharedTaskContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [fieldMetadata, setFieldMetadata] = useState<Map<string, SharedFieldMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalPreview, setIsLocalPreview] = useState(false);

  useEffect(() => {
    const taskId = params.id as string;
    const payload = searchParams.get('p');
    const config = getUiConfig();

    setUiConfig(config);
    setIsLocalPreview(!payload);

    let resolvedTask: Task | null = null;
    let resolvedMetadata = buildSharedFieldMetadata(config);

    if (payload) {
      const snapshot = decodeTaskShareSnapshot(payload);
      if (snapshot) {
        resolvedTask = hydrateTaskFromShareSnapshot(taskId, snapshot);
        resolvedMetadata = {
          ...resolvedMetadata,
          ...(snapshot.fm || {}),
        };
      }
    }

    if (!resolvedTask) {
      const localTask = getTaskById(taskId);
      if (localTask) {
        resolvedTask = localTask;
        resolvedMetadata = buildSharedFieldMetadata(config, localTask);
      }
    }

    if (resolvedTask) {
      setTask(resolvedTask);
      setFieldMetadata(new Map(Object.entries(resolvedMetadata)));
      document.title = `${resolvedTask.title} | Shared Task`;
    }

    setIsLoading(false);
  }, [params.id, searchParams]);

  if (isLoading) {
    return <LoadingSpinner text="Connecting to shared task..." size="lg" />;
  }

  if (!task || !uiConfig) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/5 px-6 text-center">
        <div className="w-full max-w-sm rounded-[2.5rem] border bg-background p-8 shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <X className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Snapshot Unavailable</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
            This task publication may have expired or the link is invalid.
          </p>
          <Button variant="outline" className="mt-8 h-12 w-full rounded-2xl font-bold shadow-sm" onClick={() => router.push('/')}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SharedTaskView
      task={task}
      uiConfig={uiConfig}
      isLocalPreview={isLocalPreview}
      fieldMetadata={fieldMetadata}
    />
  );
}

export default function SharedTaskPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Connecting to shared task..." />}>
      <SharedTaskContent />
    </Suspense>
  );
}
