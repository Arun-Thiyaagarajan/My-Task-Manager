
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { RootLayoutClient } from '@/components/root-layout-client';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'A sleek and simple task manager',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
    shortcut: '/favicon.ico',
  },
};

/**
 * Disables zooming on mobile devices to prevent UX disruptions 
 * from accidental pinch or double-tap gestures.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          inter.className,
          inter.variable,
          'min-h-screen bg-background font-sans antialiased',
        )}
        suppressHydrationWarning={true}
      >
        <RootLayoutClient>
            {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
