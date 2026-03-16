'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TaskDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-10 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/3 rounded-sm" />
                </div>
                <Skeleton className="h-10 w-28 rounded-full shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
              <Skeleton className="h-24 w-full rounded-md" />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-32 rounded-md" /></CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-32 rounded-md" /></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-3/4 rounded-sm" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><Skeleton className="h-6 w-40 rounded-md" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4"><Skeleton className="h-6 w-32 rounded-md" /></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <Skeleton className="h-3 w-20 rounded-sm" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4"><Skeleton className="h-6 w-24 rounded-md" /></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-24 rounded-sm" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-24 rounded-sm" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
