'use client';

import * as React from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const OFFLINE_MESSAGES = [
  'Looks like the internet took a coffee break ☕',
  "You're stranded... but don't worry, we packed snacks 🍿",
  'Signal lost. Sending pigeons... 🐦',
  'Oops! The web went on vacation 🌴',
  "No internet. Time to pretend you're productive 😄",
] as const;

function getRandomOfflineMessage(currentMessage?: string) {
  let nextMessage = OFFLINE_MESSAGES[Math.floor(Math.random() * OFFLINE_MESSAGES.length)];
  while (nextMessage === currentMessage) {
    nextMessage = OFFLINE_MESSAGES[Math.floor(Math.random() * OFFLINE_MESSAGES.length)];
  }
  return nextMessage;
}

export function OfflineScreen() {
  const isMobile = useIsMobile();
  const [isOffline, setIsOffline] = React.useState(false);
  const [funMessage, setFunMessage] = React.useState(() => getRandomOfflineMessage());
  const [isCheckingConnection, setIsCheckingConnection] = React.useState(false);

  React.useEffect(() => {
    const syncNetworkState = () => {
      const offline = !window.navigator.onLine;
      setIsOffline(offline);
      if (offline) {
        setFunMessage((current) => getRandomOfflineMessage(current));
      } else {
        setIsCheckingConnection(false);
      }
    };

    syncNetworkState();
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);

    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
    };
  }, []);

  const handleRetry = React.useCallback(() => {
    setIsCheckingConnection(true);

    window.setTimeout(() => {
      if (window.navigator.onLine) {
        setIsOffline(false);
        setIsCheckingConnection(false);
        return;
      }

      setFunMessage((current) => getRandomOfflineMessage(current));
      setIsOffline(true);
      setIsCheckingConnection(false);
    }, 300);
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[220] overflow-hidden bg-background/90 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.2),_transparent_45%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.18),_transparent_35%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-card/95 p-6 text-card-foreground shadow-2xl shadow-primary/10 sm:p-8">
            <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/10 bg-primary/5 blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-primary/15 bg-background/80 shadow-lg shadow-primary/10 sm:h-24 sm:w-24">
                <div className="relative">
                  <CloudOff className="h-10 w-10 text-primary/85 sm:h-12 sm:w-12" />
                  <WifiOff className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full bg-card p-0.5 text-muted-foreground sm:h-6 sm:w-6" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  You&apos;re offline
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Please check your connection and try again.
                </p>
                <p className="mx-auto max-w-md rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm font-medium leading-6 text-primary/90 shadow-sm shadow-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {funMessage}
                </p>
              </div>

              <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8">
                <Button
                  type="button"
                  onClick={handleRetry}
                  disabled={isCheckingConnection}
                  className="h-11 w-full rounded-2xl shadow-lg shadow-primary/20 sm:h-12"
                >
                  <RefreshCw className={isCheckingConnection ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                  {isCheckingConnection ? 'Checking connection...' : 'Retry'}
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  {isMobile
                    ? 'We will quietly reconnect as soon as your signal comes back.'
                    : 'This screen will disappear automatically once your connection is restored.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
