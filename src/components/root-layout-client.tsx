'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';
import { FloatingNotes } from '@/components/floating-notes';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { NavigationLoader } from '@/components/navigation-loader';
import { FaviconSync } from '@/components/favicon-sync';
import { FileTransferIndicator } from '@/components/file-transfer-indicator';
import { GlobalSpotlightSearch } from '@/components/global-spotlight-search';
import { OfflineScreen } from '@/components/offline-screen';
import { GoogleAuthRedirectHandler } from '@/components/google-auth-redirect-handler';
import { clearExpiredReminders } from '@/lib/data';

/**
 * Handles client-side layout logic such as pathname-based conditional 
 * rendering of navigation components.
 */
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSharedPage = pathname?.startsWith('/share/');
  const isTaskForm = pathname === '/tasks/new' || (pathname?.startsWith('/tasks/') && pathname?.endsWith('/edit'));

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

  return (
    <Providers>
        <GoogleAuthRedirectHandler />
        <FaviconSync />
        <div className="relative flex min-h-screen flex-col">
        {!isSharedPage && <Header />}
        <NavigationLoader />
        <PullToRefresh>
          <main className={cn("flex-1", (!isSharedPage && !isTaskForm) && "pb-32 md:pb-0")}>
            {children}
          </main>
        </PullToRefresh>
        {!isSharedPage && <FloatingNotes />}
        {!isSharedPage && <GlobalSpotlightSearch />}
        <OfflineScreen />
        <FileTransferIndicator />
        {!isSharedPage && <MobileBottomNav />}
        </div>
        <Toaster />
    </Providers>
  );
}
