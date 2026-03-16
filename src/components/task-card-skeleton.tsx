'use client';

import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function TaskCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden border-muted/30 bg-card/50 shadow-sm animate-pulse">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-grow space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-4 pt-2">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-sm" />
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-2 w-12 rounded-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-10 rounded-md" />
              <Skeleton className="h-4 w-10 rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center bg-muted/5">
        <div className="flex gap-2">
          <div className="flex -space-x-2">
            <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
            <Skeleton className="h-7 w-7 rounded-full border-2 border-background" />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function TaskTableRowSkeleton({ isSelectMode }: { isSelectMode: boolean }) {
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
            <td className="p-4"><div className="flex gap-1"><Skeleton className="h-5 w-16 rounded" /></div></td>
            <td className="p-4"><div className="flex gap-1"><Skeleton className="h-4 w-10 rounded" /></div></td>
            <td className="p-4 text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-12 rounded" /></div></td>
        </tr>
    );
}
