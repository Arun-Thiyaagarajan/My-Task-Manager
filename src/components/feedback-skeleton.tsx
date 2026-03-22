'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function FeedbackSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-1/3 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Left Column Skeleton */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-muted/20 py-6 px-6 sm:px-8">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-full">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-3/4 rounded-lg" />
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <Skeleton className="h-10 w-20 rounded-lg" />
                  <Skeleton className="h-10 w-20 rounded-lg" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-8">
              <div className="space-y-3">
                <Skeleton className="h-3 w-32 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-dashed">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </CardContent>
          </Card>
          
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>

        {/* Right Column (Conversation) Skeleton */}
        <div className="flex flex-col h-[600px] lg:h-[calc(100vh-200px)]">
          <Card className="flex-1 flex flex-col border-none shadow-2xl bg-card rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4 px-6 shrink-0">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <div className="flex-1 p-6 space-y-6">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-none" />
              </div>
              <div className="flex gap-3 flex-row-reverse">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-none" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 w-1/2 rounded-2xl rounded-tl-none" />
              </div>
            </div>
            <div className="p-6 bg-muted/10 border-t shrink-0">
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
