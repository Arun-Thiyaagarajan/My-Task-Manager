
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { UnsavedChangesProvider } from '@/hooks/use-unsaved-changes';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UnsavedChangesProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </UnsavedChangesProvider>
    </ThemeProvider>
  );
}
