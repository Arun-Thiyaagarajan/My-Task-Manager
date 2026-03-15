
'use client';

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
