'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Lock, X } from 'lucide-react';

import { SharedTaskView } from '@/components/shared-task-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getSharedTaskLinkByToken, getUiConfig } from '@/lib/data';
import { buildSharedFieldMetadata, decryptTaskShareSnapshot, hydrateTaskFromShareSnapshot, type SharedFieldMetadata, type SharedTaskLinkDocument } from '@/lib/task-share';
import type { Task, UiConfig } from '@/lib/types';

export default function SharedTaskTokenPage() {
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [fieldMetadata, setFieldMetadata] = useState<Map<string, SharedFieldMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lockedShareLink, setLockedShareLink] = useState<SharedTaskLinkDocument | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const applySharedLink = (sharedLink: SharedTaskLinkDocument, fallbackUiConfig: UiConfig, snapshot = sharedLink.snapshot) => {
    if (!snapshot) return;

    const resolvedUiConfig: UiConfig = {
      ...fallbackUiConfig,
      ...sharedLink.viewConfig,
    };
    const resolvedTask = hydrateTaskFromShareSnapshot(sharedLink.taskId, snapshot);
    const resolvedFieldMetadata = {
      ...buildSharedFieldMetadata(resolvedUiConfig),
      ...(snapshot.fm || {}),
    };

    setUiConfig(resolvedUiConfig);
    setTask(resolvedTask);
    setFieldMetadata(new Map(Object.entries(resolvedFieldMetadata)));
    document.title = `${resolvedTask.title} | Shared Task`;
  };

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
        if (sharedLink.passwordProtected && sharedLink.encryptedPayload) {
          setLockedShareLink(sharedLink);
          return;
        }

        applySharedLink(sharedLink, fallbackUiConfig);
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
    if (lockedShareLink && uiConfig) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/5 px-6 text-center">
          <div className="w-full max-w-sm rounded-[2.5rem] border bg-background p-8 shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Password Protected</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
              Enter the share password to view this task.
            </p>
            <div className="mt-6 space-y-3">
              <Input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter password"
                onKeyDown={async (event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (!lockedShareLink.encryptedPayload) return;
                  setIsUnlocking(true);
                  try {
                    const snapshot = await decryptTaskShareSnapshot(lockedShareLink.encryptedPayload, password);
                    applySharedLink(lockedShareLink, uiConfig, snapshot);
                    setLockedShareLink(null);
                    setPassword('');
                  } catch {
                    setPasswordError('Incorrect password. Please try again.');
                  } finally {
                    setIsUnlocking(false);
                  }
                }}
              />
              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            </div>
            <Button
              className="mt-6 h-12 w-full rounded-2xl font-bold shadow-sm"
              disabled={!password.trim() || isUnlocking}
              onClick={async () => {
                if (!lockedShareLink.encryptedPayload) return;
                setIsUnlocking(true);
                try {
                  const snapshot = await decryptTaskShareSnapshot(lockedShareLink.encryptedPayload, password);
                  applySharedLink(lockedShareLink, uiConfig, snapshot);
                  setLockedShareLink(null);
                  setPassword('');
                } catch {
                  setPasswordError('Incorrect password. Please try again.');
                } finally {
                  setIsUnlocking(false);
                }
              }}
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock Task'}
            </Button>
          </div>
        </div>
      );
    }

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
