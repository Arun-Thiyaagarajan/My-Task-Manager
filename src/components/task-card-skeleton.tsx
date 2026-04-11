'use client';

import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function TaskCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-lg border-muted/30 bg-card/50 shadow-sm animate-pulse">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-5 w-1/2 rounded" />
            </div>
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col p-4 pt-2">
        <div className="mb-3 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>

        <div className="flex-grow space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>

          <div className="flex items-start gap-2">
            <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>

        <div className="mt-4">
          <Skeleton className="mb-2 h-3 w-20 rounded" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-black/5 bg-muted/5 p-4 dark:border-white/5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex -space-x-2">
            <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
            <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
          </div>
          <div className="flex -space-x-2">
            <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function TaskTableRowSkeleton({ isSelectMode, showRepositoryColumn = true }: { isSelectMode: boolean; showRepositoryColumn?: boolean }) {
    return (
        <tr className="border-b animate-pulse bg-card/30">
            {isSelectMode && (
                <td className="p-4"><Skeleton className="h-4 w-4 rounded" /></td>
            )}
            <td className="p-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                </div>
            </td>
            <td className="p-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
            <td className="p-4"><div className="flex -space-x-2"><Skeleton className="h-8 w-8 rounded-full border-2 border-background" /></div></td>
            <td className="p-4"><div className="flex -space-x-2"><Skeleton className="h-8 w-8 rounded-full border-2 border-background" /></div></td>
            {showRepositoryColumn && <td className="p-4"><div className="flex gap-1"><Skeleton className="h-5 w-16 rounded" /></div></td>}
            <td className="p-4"><div className="flex gap-1"><Skeleton className="h-4 w-10 rounded" /></div></td>
            <td className="p-4 text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-12 rounded" /></div></td>
        </tr>
    );
}
