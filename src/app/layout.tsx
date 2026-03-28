
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { RootLayoutClient } from '@/components/root-layout-client';

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
          'min-h-screen bg-background antialiased',
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
