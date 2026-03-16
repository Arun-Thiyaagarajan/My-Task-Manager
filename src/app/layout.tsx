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
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'A Sleek & Simple Task Manager',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: 'https://placehold.co/32x32/4f46e5/white/png?text=%F0%9F%93%8B', sizes: '32x32', type: 'image/png' },
      { url: 'https://placehold.co/16x16/4f46e5/white/png?text=%F0%9F%93%8B', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: 'https://placehold.co/180x180/4f46e5/white/png?text=%F0%9F%93%8B', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskFlow',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
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
          'min-h-screen bg-background antialiased',
        )}
        suppressHydrationWarning={true}
      >
        <Providers>
            <FaviconSync />
            <div className="relative flex min-h-screen flex-col">
            <Header />
            <NavigationLoader />
            <PullToRefresh>
              <main className="flex-1 pb-24 md:pb-0">{children}</main>
            </PullToRefresh>
            <FloatingNotes />
            <MobileBottomNav />
            </div>
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
