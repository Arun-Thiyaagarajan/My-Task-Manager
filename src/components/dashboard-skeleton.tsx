'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-t-4 border-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-1" />
              <Skeleton className="h-3 w-64" />
            </CardHeader>
            <CardContent className="h-[300px] flex items-end gap-2 px-6 pb-10">
              <Skeleton className="h-[60%] w-full rounded-t-md" />
              <Skeleton className="h-[80%] w-full rounded-t-md" />
              <Skeleton className="h-[40%] w-full rounded-t-md" />
              <Skeleton className="h-[90%] w-full rounded-t-md" />
              <Skeleton className="h-[50%] w-full rounded-t-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
