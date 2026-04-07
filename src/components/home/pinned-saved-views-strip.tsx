'use client';

import { BookmarkPlus, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { PinnedSavedViewsStripProps } from '@/components/home/types';

export function PinnedSavedViewsStrip({
  savedTaskViewsCount,
  visiblePinnedSavedTaskViews,
  activeSavedViewId,
  onApplySavedTaskView,
  onClearActiveSavedView,
}: PinnedSavedViewsStripProps) {
  return (
    <div className="flex min-h-11 items-center gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-background/70 px-3 py-1.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)]">
      <div className="flex shrink-0 items-center gap-2 pr-1 text-sm font-medium text-muted-foreground">
        <BookmarkPlus className="h-4 w-4 text-primary" />
        <span>Saved views</span>
      </div>
      {visiblePinnedSavedTaskViews.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          {visiblePinnedSavedTaskViews.map((view) => {
            const isActive = activeSavedViewId === view.id;

            return (
              <div
                key={view.id}
                className={cn(
                  'flex h-9 items-center gap-1 rounded-xl border px-2.5 shadow-sm transition-all',
                  isActive
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : 'border-border/60 bg-background'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isActive) {
                      onApplySavedTaskView(view);
                    }
                  }}
                  className={cn(
                    'max-w-[180px] truncate text-sm font-medium outline-none transition-colors',
                    isActive ? 'cursor-default text-primary' : 'hover:text-primary'
                  )}
                >
                  {view.name}
                </button>
                {isActive ? (
                  <button
                    type="button"
                    onClick={() => onClearActiveSavedView(view.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-primary/80 transition-colors hover:bg-primary/12 hover:text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear active saved view</span>
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-9 min-w-0 items-center rounded-xl border border-dashed border-border/60 bg-background/55 px-3 text-sm text-muted-foreground">
          {savedTaskViewsCount > 0
            ? 'Pin a saved view to keep it here.'
            : 'Create and pin a saved view to keep it here.'}
        </div>
      )}
    </div>
  );
}
