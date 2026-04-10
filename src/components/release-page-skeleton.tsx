'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ReleaseHistorySkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 max-w-[70vw] rounded-lg" />
        </div>
      </div>

      <div className="space-y-12">
        {[0, 1, 2].map((index) => (
          <div key={index} className="relative pl-16 sm:pl-0">
            <div className="absolute left-4 top-3 hidden h-full w-px -translate-x-1/2 bg-border/50 sm:block" />
            <div className="absolute left-4 top-0 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background bg-muted sm:left-1/2">
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>

            <div className={index % 2 === 0 ? 'sm:ml-auto sm:w-[45%] sm:pl-8' : 'sm:mr-auto sm:w-[45%] sm:pr-8'}>
              <div className={`mb-3 flex items-center gap-3 ${index % 2 !== 0 ? 'sm:justify-end' : ''}`}>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-md" />
              </div>

              <div className="rounded-[1.75rem] border bg-card p-6 shadow-sm">
                <div className="space-y-3">
                  <Skeleton className="h-7 w-52 rounded-xl" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-4/5 rounded-lg" />
                </div>

                <div className="mt-6 space-y-5">
                  {[0, 1].map((group) => (
                    <div key={group} className="space-y-3">
                      <div className={`flex items-center gap-2 ${index % 2 !== 0 ? 'sm:justify-end' : ''}`}>
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        {[0, 1].map((item) => (
                          <div key={item} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                            <div className={`mb-3 flex flex-wrap gap-2 ${index % 2 !== 0 ? 'sm:justify-end' : ''}`}>
                              <Skeleton className="h-6 w-28 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-full rounded-lg" />
                            <Skeleton className="mt-2 h-4 w-5/6 rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReleaseManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-border/60 bg-muted/[0.18] p-4">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="mt-3 h-8 w-16 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-border/60">
        <div className="border-b bg-muted/[0.22] px-4 py-3">
          <div className="grid grid-cols-[0.9fr_2fr_1fr_1.2fr_0.7fr_1fr] gap-4">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-4 w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="space-y-3 p-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid gap-4 rounded-2xl border border-border/50 bg-background p-4 md:grid-cols-[0.9fr_2fr_1fr_1.2fr_0.7fr_1fr]">
              <Skeleton className="h-5 w-16 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-lg" />
              <Skeleton className="h-5 w-8 rounded-lg" />
              <div className="flex items-center justify-end gap-2">
                {[0, 1, 2, 3].map((action) => (
                  <Skeleton key={action} className="h-9 w-9 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
