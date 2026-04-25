import { AlertTriangle } from 'lucide-react';

import { NotFoundRedirect } from '@/components/not-found-redirect';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-[1.5rem] border border-amber-500/25 bg-amber-500/[0.06] p-6 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Page unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We could not find this page. You are being redirected to Tasks.
        </p>
        <NotFoundRedirect />
      </div>
    </div>
  );
}
