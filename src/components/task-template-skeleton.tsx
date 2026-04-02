import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TaskTemplatesPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-12 w-72 rounded-xl" />
            <Skeleton className="h-5 w-[32rem] max-w-full rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-28 rounded-2xl" />
            <Skeleton className="h-12 w-28 rounded-2xl" />
            <Skeleton className="h-12 w-40 rounded-2xl" />
          </div>
        </div>

        <Card className="border-border/60 bg-background/95 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-44 rounded-2xl" />
                <Skeleton className="h-12 w-28 rounded-2xl" />
              </div>
              <div className="flex flex-1 flex-col gap-3 lg:max-w-3xl lg:flex-row lg:justify-end">
                <Skeleton className="h-12 flex-1 rounded-2xl" />
                <Skeleton className="h-12 w-40 rounded-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3.5 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card
              key={`template-page-skeleton-${index}`}
              className="overflow-hidden border-border/60 bg-gradient-to-br from-background/95 via-background/90 to-muted/[0.06] shadow-sm"
            >
              <CardContent className="space-y-4 p-4 sm:p-[1.125rem]">
                <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-48 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:max-w-[14rem] xl:justify-end">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-2.5">
                  <Skeleton className="h-9 w-20 rounded-xl" />
                  <Skeleton className="h-9 w-20 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TaskTemplateEditorSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-none lg:border lg:shadow-sm">
        <CardContent className="space-y-6 p-0 lg:p-6">
          <Card className="border-border/60 bg-background/90 shadow-sm">
            <CardHeader className="space-y-3 pb-4">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-full max-w-2xl rounded-lg" />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded-lg" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 rounded-[1.75rem] border border-border/60 bg-background/92 p-4 shadow-sm sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-64 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-2xl" />
            </div>

            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`template-editor-skeleton-${index}`} className="border-border/50 bg-background/70 shadow-sm">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <Skeleton className="h-5 w-40 rounded-lg" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20 rounded-lg" />
                      <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20 rounded-lg" />
                      <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end gap-3">
              <Skeleton className="h-12 w-28 rounded-2xl" />
              <Skeleton className="h-12 w-36 rounded-2xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
