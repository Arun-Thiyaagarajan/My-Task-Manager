
'use client';

import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';
import { UnsavedChangesProvider } from '@/hooks/use-unsaved-changes';
import { TooltipProvider } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StickyNote } from 'lucide-react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useRouter } from 'next/navigation';


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

function FloatingNotesButton() {
  const { prompt } = useUnsavedChanges();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    prompt(() => router.push('/notes'));
  };

  return (
    <Button asChild className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40" size="icon">
      <a href="/notes" onClick={handleClick} aria-label="Open Notes">
        <StickyNote className="h-6 w-6" />
      </a>
    </Button>
  )
}

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
                <FloatingNotesButton />
              </div>
              <Toaster />
            </TooltipProvider>
          </UnsavedChangesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
