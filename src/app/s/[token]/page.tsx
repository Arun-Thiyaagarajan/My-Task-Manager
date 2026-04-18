'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Lock, LockOpen, Sparkles, X } from 'lucide-react';

import { SharedTaskView } from '@/components/shared-task-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getSharedTaskLinkByToken, getUiConfig } from '@/lib/data';
import { buildSharedFieldMetadata, decryptTaskShareSnapshot, hydrateTaskFromShareSnapshot, type SharedFieldMetadata, type SharedTaskLinkDocument } from '@/lib/task-share';
import type { Task, UiConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function SharedTaskTokenPage() {
  const passwordErrorMessages = [
    'That password did not unlock this preview. Please try again.',
    'Close, but not quite. Recheck the shared password and try once more.',
    'This link is still locked. Enter the correct password to continue.',
    'That one did not match. Try the shared password again.',
  ];
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [fieldMetadata, setFieldMetadata] = useState<Map<string, SharedFieldMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lockedShareLink, setLockedShareLink] = useState<SharedTaskLinkDocument | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordAttemptCount, setPasswordAttemptCount] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlockTransitioning, setIsUnlockTransitioning] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const unlockRevealTimerRef = useRef<number | null>(null);
  const unlockTransitionTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!lockedShareLink || task || isLoading) return;

    const timer = window.setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isLoading, lockedShareLink, task]);

  useEffect(() => {
    return () => {
      if (unlockRevealTimerRef.current) {
        window.clearTimeout(unlockRevealTimerRef.current);
      }
      if (unlockTransitionTimerRef.current) {
        window.clearTimeout(unlockTransitionTimerRef.current);
      }
    };
  }, []);

  const unlockSharedView = async () => {
    if (!lockedShareLink?.encryptedPayload) return;

    setIsUnlocking(true);
    try {
      const snapshot = await decryptTaskShareSnapshot(lockedShareLink.encryptedPayload, password);
      setIsUnlockTransitioning(true);
      setPassword('');
      setPasswordError('');
      setPasswordAttemptCount(0);

      unlockRevealTimerRef.current = window.setTimeout(() => {
        applySharedLink(lockedShareLink, uiConfig!, snapshot);
        setLockedShareLink(null);
      }, 220);

      unlockTransitionTimerRef.current = window.setTimeout(() => {
        setIsUnlockTransitioning(false);
      }, 760);
    } catch {
      const nextAttemptCount = passwordAttemptCount + 1;
      setPasswordAttemptCount(nextAttemptCount);
      setPasswordError(passwordErrorMessages[(nextAttemptCount - 1) % passwordErrorMessages.length]);
      window.setTimeout(() => {
        passwordInputRef.current?.focus();
        passwordInputRef.current?.select();
      }, 60);
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Opening secure shared task..." size="lg" />;
  }

  if (isUnlockTransitioning) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/88 backdrop-blur-lg transition-opacity duration-500">
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-primary/15 bg-background/92 px-8 py-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.5)] animate-in fade-in zoom-in-95 duration-300">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Lock className="absolute h-9 w-9 text-primary/35 animate-out fade-out zoom-out-75 duration-500" />
            <LockOpen className="h-10 w-10 text-primary animate-in zoom-in-75 fade-in duration-500" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-base font-semibold text-foreground">Unlocked successfully</p>
            <p className="text-sm text-muted-foreground">Opening your shared preview...</p>
          </div>
        </div>
      </div>
    );
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
              <div className="relative">
                <Input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter password"
                  className="h-12 rounded-2xl pr-12"
                  onKeyDown={async (event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    await unlockSharedView();
                  }}
                />
                {password ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setPassword('');
                      setPasswordError('');
                      passwordInputRef.current?.focus();
                    }}
                    aria-label="Clear password"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {passwordError ? (
                <div className="flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-left">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{passwordError}</p>
                </div>
              ) : password ? (
                <p className="text-sm text-muted-foreground">
                  Press <span className="font-medium text-foreground">Enter</span> to unlock quickly.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This preview is protected. Enter the shared password to continue.
                </p>
              )}
            </div>
            <Button
              className="mt-6 h-12 w-full rounded-2xl font-bold shadow-sm"
              disabled={!password.trim() || isUnlocking}
              onClick={() => void unlockSharedView()}
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

  return (
    <div className={cn('min-h-screen animate-in fade-in duration-300')}>
      <SharedTaskView task={task} uiConfig={uiConfig} fieldMetadata={fieldMetadata} />
    </div>
  );
}
