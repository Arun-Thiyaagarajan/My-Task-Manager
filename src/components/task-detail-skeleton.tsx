'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TaskDetailSkeleton() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="hidden h-5 w-28 rounded-full sm:block" />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden rounded-[1.5rem] border-border/70">
            <CardHeader className="space-y-5 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-10 w-[78%] rounded-xl sm:h-11" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>
                <div className="flex items-center gap-2 self-start">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
              <Skeleton className="h-4 w-40 rounded-md" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-[86%] rounded-md" />
                <Skeleton className="h-4 w-[72%] rounded-md" />
              </div>
              <Skeleton className="h-24 w-full rounded-[1rem]" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="rounded-[1.4rem] border-border/70">
              <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
                <Skeleton className="h-6 w-36 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <Skeleton className="h-12 w-full rounded-[1rem]" />
                <Skeleton className="h-12 w-full rounded-[1rem]" />
                <Skeleton className="h-12 w-full rounded-[1rem]" />
              </CardContent>
            </Card>

            <Card className="rounded-[1.4rem] border-border/70">
              <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
                <Skeleton className="h-6 w-36 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <Skeleton className="h-16 w-full rounded-[1rem]" />
                <Skeleton className="h-16 w-full rounded-[1rem]" />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[1.4rem] border-border/70">
            <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
              <Skeleton className="h-6 w-44 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`detail-row-${index}`} className="rounded-[1rem] border border-border/60 p-4">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-[82%] rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="hidden space-y-6 lg:block">
            <Card className="rounded-[1.4rem] border-border/70">
              <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
                <Skeleton className="h-6 w-32 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <Skeleton className="h-14 w-full rounded-[1rem]" />
                <Skeleton className="h-14 w-full rounded-[1rem]" />
                <Skeleton className="h-14 w-full rounded-[1rem]" />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.4rem] border-border/70">
            <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
              <Skeleton className="h-6 w-32 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-28 rounded-sm" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.4rem] border-border/70">
            <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
              <Skeleton className="h-6 w-24 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`meta-row-${index}`} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-4 w-28 rounded-sm" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.4rem] border-border/70 lg:hidden">
            <CardHeader className="px-5 pb-4 pt-5 sm:px-6">
              <Skeleton className="h-6 w-32 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
              <Skeleton className="h-14 w-full rounded-[1rem]" />
              <Skeleton className="h-14 w-full rounded-[1rem]" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
