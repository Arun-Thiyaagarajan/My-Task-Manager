'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function MetricSkeleton() {
  return (
    <Card className="h-full overflow-hidden border border-border/70 bg-background/85 shadow-sm">
      <div className="h-1 bg-muted/60" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-full max-w-[12rem]" />
          </div>
          <Skeleton className="h-11 w-11 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <Card className="border border-border/70 bg-background/90 shadow-sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className={tall ? 'h-[280px] sm:h-[340px]' : 'h-[250px] sm:h-[320px]'}>
        <div className="flex h-full items-end gap-2 sm:gap-3">
          <Skeleton className="h-[42%] flex-1 rounded-t-2xl" />
          <Skeleton className="h-[68%] flex-1 rounded-t-2xl" />
          <Skeleton className="h-[52%] flex-1 rounded-t-2xl" />
          <Skeleton className="h-[84%] flex-1 rounded-t-2xl" />
          <Skeleton className="h-[58%] flex-1 rounded-t-2xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%),linear-gradient(to_bottom,transparent,rgba(148,163,184,0.05))]">
      <div className="container relative mx-auto max-w-7xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Card className="overflow-hidden border border-primary/10 bg-background/90 shadow-lg">
            <CardContent className="p-5 sm:p-7">
              <div className="space-y-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-7 w-40 rounded-full" />
                    <Skeleton className="h-10 w-full max-w-[28rem]" />
                    <Skeleton className="h-5 w-full max-w-[34rem]" />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Skeleton className="h-7 w-40 rounded-full" />
                      <Skeleton className="h-7 w-44 rounded-full" />
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-3xl border border-white/10 bg-background/80 p-4 sm:grid-cols-2 xl:w-[220px] xl:grid-cols-1">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-background/75 p-4 shadow-sm">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-3 h-8 w-16" />
                      <Skeleton className="mt-2 h-4 w-full max-w-[10rem]" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <MetricSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <MetricSkeleton key={`secondary-${index}`} />
          ))}
        </div>

        <Card className="border border-border/70 bg-background/90 shadow-sm">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-3xl" />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <div className="space-y-6">
                <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <MetricSkeleton key={`group-metric-${index}`} />
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChartCardSkeleton />
                  <ChartCardSkeleton />
                </div>
              </div>
              <div className="space-y-6">
                <Card className="border border-border/70 bg-background/90 shadow-sm">
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-56 max-w-full" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 rounded-2xl" />
                    ))}
                  </CardContent>
                </Card>
                <Card className="border border-border/70 bg-background/90 shadow-sm">
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 rounded-2xl" />
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <ChartCardSkeleton tall />
          <Card className="border border-border/70 bg-background/90 shadow-sm">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-[220px] rounded-3xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <ChartCardSkeleton />
          <Card className="border border-border/70 bg-background/90 shadow-sm">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <ChartCardSkeleton tall />
          <Card className="border border-border/70 bg-background/90 shadow-sm">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_1fr]">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border border-border/70 bg-background/90 shadow-sm">
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((__, innerIndex) => (
                  <Skeleton key={innerIndex} className="h-20 rounded-2xl" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
