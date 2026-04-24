'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function SkeletonCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Card className={`border-border/70 ${className}`}>{children}</Card>;
}

export function TaskDetailSkeleton() {
  return (
    <div className="container relative isolate mx-auto overflow-hidden px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-24 -z-10 h-[calc(100%-6rem)] rounded-[2rem] border border-border/30 bg-muted/[0.035]" />

      <div className="mb-7 flex items-center justify-between sm:mb-8">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Skeleton className="h-10 w-10 rounded-xl sm:h-9 sm:w-24" />
          <Skeleton className="h-10 w-10 rounded-xl sm:h-9 sm:w-28" />
          <Skeleton className="hidden h-9 w-24 rounded-xl md:block" />
          <Skeleton className="h-10 w-10 rounded-xl sm:h-9 sm:w-20" />
          <Skeleton className="h-10 w-10 rounded-xl sm:h-9 sm:w-24" />
        </div>
      </div>

      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-3 rounded-[1.15rem] border border-border/65 bg-muted/[0.08] px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_30px_-28px_rgba(15,23,42,0.18)] md:px-4 md:py-3.5">
          <Skeleton className="h-10 w-10 rounded-[1rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-4 w-[72%] rounded-md" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-9 w-16 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>

      <div id="task-detail-main" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <SkeletonCard className="group/card relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.009),rgba(255,255,255,0.002))] shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_60px_-38px_rgba(15,23,42,0.3)]">
            <CardHeader className="px-5 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-32 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-[82%] rounded-xl sm:h-11" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-[84%] rounded-md" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-[96px] rounded-[1.1rem]" />
                <Skeleton className="h-[96px] rounded-[1.1rem]" />
              </div>
            </CardContent>
          </SkeletonCard>

          <SkeletonCard className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
            <CardHeader className="space-y-2 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-sm" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-sm" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 rounded-sm" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 rounded-sm" />
                  <Skeleton className="h-20 w-full rounded-[1rem]" />
                </div>
              </div>
            </CardContent>
          </SkeletonCard>
        </div>

        <div className="space-y-6">
          <SkeletonCard className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
            <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              <Skeleton className="h-6 w-28 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              <Skeleton className="h-16 rounded-[1rem]" />
              <Skeleton className="h-16 rounded-[1rem]" />
              <Skeleton className="h-16 rounded-[1rem]" />
            </CardContent>
          </SkeletonCard>

          <SkeletonCard className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
            <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              <Skeleton className="h-6 w-24 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`meta-skeleton-${index}`} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-4 w-28 rounded-sm" />
                </div>
              ))}
            </CardContent>
          </SkeletonCard>

          <SkeletonCard className="hidden rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)] lg:block">
            <CardHeader className="space-y-2 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              <Skeleton className="h-6 w-32 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              <Skeleton className="h-14 rounded-[1rem]" />
              <Skeleton className="h-14 rounded-[1rem]" />
              <Skeleton className="h-14 rounded-[1rem]" />
            </CardContent>
          </SkeletonCard>
        </div>
      </div>

      <div className="mt-8 space-y-6 lg:hidden">
        <SkeletonCard className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
          <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
            <Skeleton className="h-6 w-32 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
            <Skeleton className="h-20 rounded-[1rem]" />
            <Skeleton className="h-20 rounded-[1rem]" />
          </CardContent>
        </SkeletonCard>

        <SkeletonCard className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
          <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
            <Skeleton className="h-6 w-32 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
            <Skeleton className="h-14 rounded-[1rem]" />
            <Skeleton className="h-14 rounded-[1rem]" />
            <Skeleton className="h-14 rounded-[1rem]" />
          </CardContent>
        </SkeletonCard>
      </div>

      <div className="mt-8 lg:mt-10">
        <SkeletonCard className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.005),rgba(255,255,255,0.001))] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-32px_rgba(15,23,42,0.24)]">
          <CardContent className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-[52%] rounded-md" />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`relationship-skeleton-${index}`}
                    className="rounded-2xl border border-border/65 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-20 rounded-sm" />
                          <Skeleton className="h-5 w-28 rounded-md" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <div className="space-y-2.5">
                      <Skeleton className="h-14 w-full rounded-xl" />
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </SkeletonCard>
      </div>
    </div>
  );
}
