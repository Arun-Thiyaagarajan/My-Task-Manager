'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { UnsavedChangesProvider } from '@/hooks/use-unsaved-changes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReleaseNotesManager } from '@/components/release-notes-manager';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useTaskFlowData } from '@/hooks/use-taskflow-data';
import { AppOpener } from '@/components/app-opener';
import { cn } from '@/lib/utils';

function DataSyncProvider({ children }: { children: React.ReactNode }) {
  useTaskFlowData();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [isAppReady, setIsAppReady] = useState(false);
  const [shouldRenderOpener, setShouldRenderOpener] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('Service Worker registration failed:', err);
        });
      });
    }

    // Minimum display time for the opener to feel professional
    const timer = setTimeout(() => {
      setIsAppReady(true);
      // Wait for the fade-out animation to finish before unmounting
      const unmountTimer = setTimeout(() => {
        setShouldRenderOpener(false);
      }, 600);
      return () => clearTimeout(unmountTimer);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <FirebaseClientProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UnsavedChangesProvider>
          <TooltipProvider>
            {shouldRenderOpener && (
              <div 
                className={cn(
                  "fixed inset-0 z-[9999] transition-opacity duration-500 ease-in-out",
                  isAppReady ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
              >
                <AppOpener />
              </div>
            )}
            <ReleaseNotesManager />
            <DataSyncProvider>
              {children}
            </DataSyncProvider>
          </TooltipProvider>
        </UnsavedChangesProvider>
      </ThemeProvider>
    </FirebaseClientProvider>
  );
}