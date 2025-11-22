
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';
import { UnsavedChangesProvider } from '@/hooks/use-unsaved-changes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StickyNote } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});


export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'A sleek and simple task tracker for multiple teams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UnsavedChangesProvider>
            <TooltipProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                 <div className="fixed bottom-6 right-6 z-50">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild size="icon" className="h-14 w-14 rounded-full shadow-lg">
                                <Link href="/notes">
                                    <StickyNote className="h-6 w-6" />
                                    <span className="sr-only">Go to Notes</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Notes</p>
                        </TooltipContent>
                    </Tooltip>
                 </div>
              </div>
              <Toaster />
            </TooltipProvider>
          </UnsavedChangesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
