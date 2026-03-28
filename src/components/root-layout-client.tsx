'use client';

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

/**
 * Handles client-side layout logic such as pathname-based conditional 
 * rendering of navigation components.
 */
export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSharedPage = pathname?.startsWith('/share/');
  const isTaskForm = pathname === '/tasks/new' || (pathname?.startsWith('/tasks/') && pathname?.endsWith('/edit'));

  return (
    <Providers>
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
