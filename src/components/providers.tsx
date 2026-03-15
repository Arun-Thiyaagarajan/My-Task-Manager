'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { UnsavedChangesProvider } from '@/hooks/use-unsaved-changes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReleaseNotesManager } from '@/components/release-notes-manager';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useTaskFlowData } from '@/hooks/use-taskflow-data';

function DataSyncProvider({ children }: { children: React.ReactNode }) {
  useTaskFlowData();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('Service Worker registration failed:', err);
        });
      });
    }
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