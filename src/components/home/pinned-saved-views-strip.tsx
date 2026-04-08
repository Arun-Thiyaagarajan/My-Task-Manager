'use client';

import { BookmarkPlus, CalendarIcon, Search, Sparkles, X } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { PinnedSavedViewsStripProps } from '@/components/home/types';

export function PinnedSavedViewsStrip({
  savedTaskViewsCount,
  visiblePinnedSavedTaskViews,
  activeSavedViewId,
  onApplySavedTaskView,
  onClearActiveSavedView,
  getSavedViewSummary,
  getSavedViewPreviewGroups,
  isLoading = false,
  skeletonCount = 0,
  isHighlighted = false,
}: PinnedSavedViewsStripProps) {
  const shouldShowSkeletons = isLoading && skeletonCount > 0;

  return (
    <div
      id="home-saved-views-strip"
      className={cn(
        "flex min-h-11 items-center gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-background/70 px-3 py-1.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] transition-all duration-300",
        isHighlighted && "border-primary/45 bg-primary/[0.06] ring-2 ring-primary/20"
      )}
    >
      <div className="flex shrink-0 items-center gap-2 pr-1 text-sm font-medium text-muted-foreground">
        <BookmarkPlus className="h-4 w-4 text-primary" />
        <span>Saved views</span>
      </div>
      {shouldShowSkeletons ? (
        <div className="flex min-w-0 items-center gap-2">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={`saved-view-skeleton-${index}`}
              className="flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-background px-2.5 shadow-sm"
            >
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>
      ) : visiblePinnedSavedTaskViews.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          {visiblePinnedSavedTaskViews.map((view) => {
            const isActive = activeSavedViewId === view.id;
            const previewGroups = getSavedViewPreviewGroups(view);

            return (
              <TooltipProvider key={view.id}>
                <Tooltip delayDuration={120}>
                  <TooltipTrigger asChild>
                    <div
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
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    className="w-[min(24rem,calc(100vw-2rem))] rounded-[1.4rem] border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.99),hsl(var(--card)/0.97))] p-0 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.48)]"
                  >
                    <div className="border-b border-border/50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{view.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                              <Sparkles className="h-3 w-3" />
                              {getSavedViewSummary(view)}
                            </span>
                            {view.state.searchQuery ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                <Search className="h-3 w-3" />
                                Search saved
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                              <CalendarIcon className="h-3 w-3" />
                              {view.state.dateView === 'all' ? 'All tasks' : view.state.dateView}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 px-4 py-3">
                      {previewGroups.length > 0 ? (
                        previewGroups.map((group) => (
                          <div key={`${view.id}-${group.label}`} className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/75">
                              {group.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.values.map((value) => (
                                <span
                                  key={`${view.id}-${group.label}-${value}`}
                                  className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground"
                                >
                                  <span className="truncate">{value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          This view keeps your current layout, sort, and date mode ready to reuse.
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
