'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { NavigationLoader } from '@/components/navigation-loader';
import { FaviconSync } from '@/components/favicon-sync';
import { FileTransferIndicator } from '@/components/file-transfer-indicator';
import { GlobalSpotlightSearch } from '@/components/global-spotlight-search';
import { OfflineScreen } from '@/components/offline-screen';
import { GoogleAuthRedirectHandler } from '@/components/google-auth-redirect-handler';
import { AIAssistant } from '@/components/ai-assistant';
import { DueReminderWatcher } from '@/components/due-reminder-watcher';
import { clearExpiredReminders, getUserPreferences } from '@/lib/data';
import { normalizeStartPagePath } from '@/lib/start-page';

/**
 * Handles client-side layout logic such as pathname-based conditional 
 * rendering of navigation components.
 */
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialPathnameRef = useRef<string | null>(pathname || null);
  const hasHandledStartPageRef = useRef(false);
  const isSharedPage = pathname?.startsWith('/share/') || pathname?.startsWith('/s/');
  const isTaskDetailPage = Boolean(pathname?.match(/^\/tasks\/[^/]+$/));
  const isTaskForm =
    pathname === '/tasks/new' ||
    pathname === '/tasks/templates/new' ||
    pathname?.startsWith('/tasks/templates/') && pathname?.endsWith('/edit') ||
    pathname?.startsWith('/tasks/') && pathname?.endsWith('/edit');
  const enableMobilePullToRefresh = pathname === '/' || isTaskDetailPage;

  useEffect(() => {
    const runExpirySweep = () => {
      clearExpiredReminders();
    };

    runExpirySweep();

    const intervalId = window.setInterval(runExpirySweep, 1000);
    const handleFocus = () => runExpirySweep();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runExpirySweep();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (initialPathnameRef.current !== '/' || hasHandledStartPageRef.current) return;

    const tryOpenStartPage = () => {
      if (hasHandledStartPageRef.current) return;

      const startPage = getUserPreferences().startPage;
      const targetPath = normalizeStartPagePath(startPage?.path);

      if (!startPage || targetPath === '/') return;

      hasHandledStartPageRef.current = true;
      window.dispatchEvent(new Event('navigation-start'));
      router.replace(targetPath);
    };

    const firstTimer = window.setTimeout(tryOpenStartPage, 120);
    const stopTimer = window.setTimeout(() => {
      hasHandledStartPageRef.current = true;
    }, 2500);

    window.addEventListener('preferences-changed', tryOpenStartPage);
    window.addEventListener('sync-complete', tryOpenStartPage);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(stopTimer);
      window.removeEventListener('preferences-changed', tryOpenStartPage);
      window.removeEventListener('sync-complete', tryOpenStartPage);
    };
  }, [router]);

  return (
    <Providers>
        <GoogleAuthRedirectHandler />
        <FaviconSync />
        <DueReminderWatcher />
        <div className="relative flex min-h-screen flex-col">
        {!isSharedPage && <Header />}
        <NavigationLoader />
        <PullToRefresh enabled={enableMobilePullToRefresh}>
          <main className={cn("flex-1", (!isSharedPage && !isTaskForm) && "pb-32 md:pb-0")}>
            {children}
          </main>
        </PullToRefresh>
        {!isSharedPage && <AIAssistant />}
        {!isSharedPage && <GlobalSpotlightSearch />}
        <OfflineScreen />
        <FileTransferIndicator />
        {!isSharedPage && <MobileBottomNav />}
        </div>
        <Toaster />
    </Providers>
  );
}
