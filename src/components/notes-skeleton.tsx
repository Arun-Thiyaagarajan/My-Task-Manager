'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NotesSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-start lg:items-center justify-between mb-6 flex-col lg:flex-row gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="hidden sm:flex h-6 w-24 rounded-full" />
        </div>
        <div className="hidden lg:flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
      </div>

      <Skeleton className="w-full h-11 rounded-lg mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="flex flex-col h-48 overflow-hidden animate-pulse">
            <CardHeader className="p-4 pb-2 border-b">
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="p-4 flex-grow space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
            <CardFooter className="p-2 border-t flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
