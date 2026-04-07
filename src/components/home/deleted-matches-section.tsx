'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatTimestamp } from '@/lib/utils';

import type { DeletedMatchesSectionProps } from '@/components/home/types';

export function DeletedMatchesSection({
  filteredBinnedTasks,
  timeFormat,
  onTaskOpen,
}: DeletedMatchesSectionProps) {
  return (
    <Card className="mt-6 border-amber-200/60 bg-amber-50/40 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/10">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground sm:text-base">Matching items in bin</h3>
              <p className="text-xs font-normal text-muted-foreground sm:text-sm">
                {filteredBinnedTasks.length} deleted {filteredBinnedTasks.length === 1 ? 'item matches' : 'items match'} your search.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="border-amber-300/60 bg-background/80 font-medium hover:bg-background">
            <Link href="/bin">
              <Trash2 className="mr-2 h-4 w-4" />
              Open Bin
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {filteredBinnedTasks.slice(0, 6).map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskOpen(task.id)}
              className="group w-full rounded-2xl border border-amber-200/70 bg-background/80 p-4 text-left transition-colors hover:bg-background"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                      {task.title}
                    </span>
                    <Badge variant="outline" className="border-amber-300/70 bg-amber-500/5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      In bin
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-normal text-muted-foreground">
                    {task.summary || task.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80">Deleted</p>
                  <p className="mt-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
                    {task.deletedAt ? formatTimestamp(task.deletedAt, timeFormat) : 'Recently'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
