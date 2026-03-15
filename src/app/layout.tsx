
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';
import { Inter } from 'next/font/google';
import { FloatingNotes } from '@/components/floating-notes';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PullToRefresh } from '@/components/pull-to-refresh';
import type { Metadata, Viewport } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'A Sleek & Simple Task Manager',
  manifest: '/manifest.json',
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
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
        suppressHydrationWarning={true}
      >
        <Providers>
            <div className="relative flex min-h-screen flex-col">
            <Header />
            <PullToRefresh>
              <main className="flex-1 pb-20 lg:pb-0">{children}</main>
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
