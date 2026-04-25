'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getUserPreferences, updateUserPreferences } from '@/lib/data';
import { normalizeStartPagePath } from '@/lib/start-page';

export function NotFoundRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const currentPath = normalizeStartPagePath(pathname);
    const startPage = getUserPreferences().startPage;
    const isSavedStartPage = !!startPage && normalizeStartPagePath(startPage.path) === currentPath;

    if (isSavedStartPage) {
      void updateUserPreferences({ startPage: null });
    }

    toast({
      variant: 'warning',
      title: 'Page unavailable',
      description: isSavedStartPage
        ? 'Your saved start page could not be found, so it was cleared and Tasks was opened.'
        : 'That page could not be found, so Tasks was opened instead.',
    });

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('navigation-start'));
      router.replace('/');
    }, 350);

    return () => window.clearTimeout(timer);
  }, [pathname, router, toast]);

  return (
    <Button className="mt-5 rounded-xl" onClick={() => router.replace('/')}>
      <Home className="mr-2 h-4 w-4" />
      Go to Tasks
    </Button>
  );
}
