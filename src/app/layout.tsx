
'use client';

import './globals.css';
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
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isSharedPage = pathname?.startsWith('/share/');

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background antialiased',
        )}
        suppressHydrationWarning={true}
      >
        <Providers>
            <FaviconSync />
            <div className="relative flex min-h-screen flex-col">
            {!isSharedPage && <Header />}
            <NavigationLoader />
            <PullToRefresh>
              <main className={cn("flex-1", !isSharedPage && "pb-32 md:pb-0")}>
                {children}
              </main>
            </PullToRefresh>
            {!isSharedPage && <FloatingNotes />}
            <FileTransferIndicator />
            {!isSharedPage && <MobileBottomNav />}
            </div>
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
