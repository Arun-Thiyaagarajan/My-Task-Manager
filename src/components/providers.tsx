
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { UnsavedChangesProvider } from '@/hooks/use-unsaved-changes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReleaseNotesManager } from '@/components/release-notes-manager';
import { FirebaseClientProvider } from '@/firebase/client-provider';

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
            {children}
          </TooltipProvider>
        </UnsavedChangesProvider>
      </ThemeProvider>
    </FirebaseClientProvider>
  );
}
