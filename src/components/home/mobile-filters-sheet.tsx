'use client';

import { BookmarkPlus, Filter, Info, Sparkles, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import type { DesktopFiltersSheetProps } from '@/components/home/types';

export function MobileFiltersSheet({
  isOpen,
  onOpenChange,
  appliedFilterCount,
  currentViewLabel,
  desktopDraftFilterCount,
  canApplyFilters,
  canSaveView,
  hasUnappliedChanges,
  showSaveSuggestion,
  activeFilterSections,
  hiddenActiveFilterSectionsCount,
  buildFilterSummary,
  controls,
  onResetSelections,
  onApplyFilters,
  onSaveView,
  onDismissSaveSuggestion,
  onDiscardUnappliedChanges,
}: DesktopFiltersSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="inset-x-0 top-auto bottom-0 flex h-[80vh] max-h-[80vh] flex-col overflow-hidden rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 border-t border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.99),hsl(var(--card)/0.97))] px-0 py-0 shadow-[0_-24px_70px_-34px_rgba(15,23,42,0.42)] md:hidden"
      >
        <div className="border-b border-border/50 px-5 py-4">
          <SheetHeader className="space-y-0 text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-5 w-5 text-primary" />
                  Filters
                  {appliedFilterCount > 0 ? (
                    <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-[0_10px_24px_-18px_rgba(59,130,246,0.55)]">
                      <span className="mr-1.5 inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                      {appliedFilterCount} active
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="rounded-full border-border/60 bg-background/85 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {currentViewLabel}
                  </Badge>
                </SheetTitle>
              </div>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-2xl border-border/60 bg-background/90 shadow-sm"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close filters</span>
                </Button>
              </SheetClose>
            </div>
            <SheetDescription className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
              Refine tasks by status, group, repository, tags, and deployment without crowding the main page.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-5">
          {hasUnappliedChanges && (
            <button
              type="button"
              onClick={onDiscardUnappliedChanges}
              className="mb-4 flex w-full items-start gap-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-left transition-colors hover:bg-primary/12"
            >
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Info className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Draft filters preserved</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Apply filters to update the task list, or tap here to discard these preserved selections.
                </span>
              </span>
            </button>
          )}
          {activeFilterSections.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeFilterSections.slice(0, 3).map((section) => (
                <Badge
                  key={section.label}
                  variant="secondary"
                  className="max-w-full rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <span className="mr-1 text-muted-foreground">{section.label}:</span>
                  <span>{buildFilterSummary(section.values)}</span>
                </Badge>
              ))}
              {hiddenActiveFilterSectionsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  +{hiddenActiveFilterSectionsCount} more
                </Badge>
              )}
            </div>
          )}
          {controls}
        </div>

        <div className="border-t border-border/50 px-5 py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="space-y-3">
            {showSaveSuggestion && (
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--background)/0.96),hsl(var(--primary)/0.08))] p-3 shadow-[0_18px_40px_-28px_rgba(59,130,246,0.45)]">
                <button
                  type="button"
                  onClick={onDismissSaveSuggestion}
                  className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Dismiss save view suggestion</span>
                </button>
                <div className="flex items-start gap-3 pr-10">
                  <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Save these filters as a view?</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      This filter mix is new. Save it once and reuse it from saved views anytime.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                onClick={onResetSelections}
                disabled={desktopDraftFilterCount === 0 && appliedFilterCount === 0}
                className="justify-center rounded-xl px-3 font-medium text-muted-foreground sm:justify-center"
              >
                Reset selections
              </Button>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button
                  variant="outline"
                  onClick={onSaveView}
                  disabled={!canSaveView}
                  className="rounded-xl px-4 font-semibold"
                >
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save view
                </Button>
                <Button
                  onClick={onApplyFilters}
                  disabled={!canApplyFilters}
                  className="rounded-xl px-4 font-semibold"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
